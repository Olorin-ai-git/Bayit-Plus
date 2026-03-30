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
    """Response with token for demo portal."""
    token: str


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
            # password, not via demo-token. Re-register at auth service
            # with the demo password — auth service will return existing
            # user if email matches, or we handle the conflict.
            try:
                auth_response = await auth_client.register(
                    email=email,
                    password=password,
                    name=existing_user.name,
                )
            except ValueError as reg_err:
                logger.warning(
                    "Demo token auth failed for existing user",
                    extra={"email": email, "error": str(reg_err)},
                )
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Authentication failed. Try signing in through the app.",
                ) from reg_err

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

        return DemoTokenResponse(token=auth_response["access_token"])

    # New user — register at auth service
    try:
        auth_response = await auth_client.register(
            email=email,
            password=password,
            name=email.split("@")[0],
        )
    except ValueError as e:
        # Auth service may already have this email (registered via
        # another tenant). Try login instead.
        try:
            auth_response = await auth_client.login(
                email=email,
                password=password,
            )
        except ValueError:
            logger.warning(
                "Demo token registration failed",
                extra={"email": email, "error": str(e)},
            )
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not create demo account.",
            ) from e

    # Create local user in Bayit+ DB
    user = await auth_client.create_user_in_bayit_db(
        auth_service_user_id=auth_response["user_id"],
        email=auth_response["email"],
        name=auth_response.get("name", email.split("@")[0]),
        role=auth_response.get("role", "user"),
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

    return DemoTokenResponse(token=auth_response["access_token"])
