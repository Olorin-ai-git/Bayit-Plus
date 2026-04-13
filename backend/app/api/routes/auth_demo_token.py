"""
Demo Token endpoint for portal authentication.

Provides email-only authentication for demo.olorin.ai.
Proxies through auth.olorin.ai for RS256 token generation.
New users are auto-registered and allocated Free tier credits.
"""

import hashlib
import hmac

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, EmailStr

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.models.user import User
from app.services.auth_service_client import get_auth_service_client
from app.services.beta.credit_service import BetaCreditService
from app.services.olorin.metering.service import MeteringService
from app.core.database import get_database

logger = get_logger(__name__)

router = APIRouter()


class DemoTokenRequest(BaseModel):
    """Request body for demo token authentication."""
    email: EmailStr


class DemoTokenResponse(BaseModel):
    """Response with token for demo portal and bayit.tv email-only login."""
    token: str
    refresh_token: str | None = None
    user: dict | None = None


def _derive_demo_password(email: str) -> str:
    """
    Derive a deterministic password from email + server secret.

    Uses HMAC-SHA256 so the same email always produces the same
    password, enabling register-once / login-thereafter without
    the user managing a password.
    """
    secret = settings.SECRET_KEY.encode()
    digest = hmac.new(secret, email.lower().encode(), hashlib.sha256)
    return f"Demo!{digest.hexdigest()[:40]}"


async def _allocate_free_credits(user_id: str) -> None:
    """Allocate lifetime Free tier credits for a new demo user."""
    db = get_database()
    metering = MeteringService()
    credit_svc = BetaCreditService(
        settings=settings,
        metering_service=metering,
        db=db,
    )
    try:
        await credit_svc.allocate_credits(
            user_id=user_id,
            total_credits=settings.FREE_MONTHLY_CREDITS,
        )
        logger.info(
            "Demo user credits allocated",
            extra={
                "user_id": user_id,
                "credits": settings.FREE_MONTHLY_CREDITS,
            },
        )
    except ValueError:
        # Credits already allocated — not an error
        logger.debug(
            "Credits already allocated for demo user",
            extra={"user_id": user_id},
        )


@router.post("/demo-token", response_model=DemoTokenResponse)
@limiter.limit(RATE_LIMITS.get("demo_token", "5/minute"))
async def demo_token(request: Request, body: DemoTokenRequest) -> DemoTokenResponse:
    """
    Email-only authentication for the demo portal.

    - Existing users: logs in via auth.olorin.ai, returns RS256 token.
    - New users: registers at auth.olorin.ai, creates local User
      with olorin_tier="free", allocates lifetime credits.

    The demo portal AuthGate calls this with { email } and expects
    { token } back. The token is a standard RS256 Bearer token
    compatible with get_current_user.
    """
    email = body.email.lower()
    auth_client = get_auth_service_client()
    password = _derive_demo_password(email)

    existing_user = await User.find_one({"email": email})

    if existing_user:
        try:
            auth_response = await auth_client.login(
                email=email,
                password=password,
            )
        except ValueError:
            # User exists but was registered via Google/Apple/manual
            # password, not via demo-token. Use internal token issuance
            # to bypass password auth for existing users.
            try:
                auth_response = await auth_client.issue_token_internal(
                    email=email,
                )
            except ValueError as token_err:
                logger.warning(
                    "Demo token internal issuance failed for existing user",
                    extra={"email": email, "error": str(token_err)},
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication failed. Try signing in through the app.",
                ) from token_err

        # Sync auth_service_user_id
        if auth_response.get("user_id"):
            existing_user.auth_service_user_id = auth_response["user_id"]
            await existing_user.save()

        logger.info(
            "Demo token issued for existing user",
            extra={
                "user_id": str(existing_user.id),
                "email": email,
                "olorin_tier": existing_user.olorin_tier,
            },
        )

        return DemoTokenResponse(
            token=auth_response["access_token"],
            refresh_token=auth_response.get("refresh_token"),
            user=existing_user.to_response().dict(),
        )

    # New user — register at auth service, auto-verify, then login.
    # Demo/guest accounts skip email verification entirely.
    try:
        auth_response = await auth_client.register(
            email=email,
            password=password,
            name=email.split("@")[0],
        )
    except ValueError:
        # User may already exist in auth service (registered via
        # another tenant or previous attempt). Continue to login.
        auth_response = None

    # Auto-verify the demo user so login succeeds.
    # Demo accounts (guest-*@playground.olorin.ai) don't need email verification.
    auth_user = await User.find_one({"email": email})
    if auth_user and not auth_user.email_verified:
        auth_user.email_verified = True
        await auth_user.save()
        logger.info("Auto-verified demo user email", extra={"email": email})

    # If register returned tokens, use them directly.
    # Otherwise, login with the derived password to get tokens.
    if auth_response and auth_response.get("access_token"):
        token_response = auth_response
    else:
        try:
            token_response = await auth_client.login(
                email=email,
                password=password,
            )
        except ValueError as e:
            logger.warning(
                "Demo token login failed after register",
                extra={"email": email, "error": str(e)},
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not create demo account.",
            ) from e

    # Create local user in Bayit+ DB
    user = await auth_client.create_user_in_bayit_db(
        auth_service_user_id=token_response["user_id"],
        email=token_response["email"],
        name=token_response.get("name", email.split("@")[0]),
        role=token_response.get("role", "user"),
    )

    user.olorin_tier = "free"
    user.payment_pending = False
    await user.save()

    # Allocate Free tier credits
    await _allocate_free_credits(str(user.id))

    logger.info(
        "Demo token issued for new user",
        extra={
            "user_id": str(user.id),
            "email": email,
            "olorin_tier": "free",
        },
    )

    return DemoTokenResponse(
        token=token_response["access_token"],
        refresh_token=token_response.get("refresh_token"),
        user=user.to_response().dict(),
    )
