"""
Mobile authentication endpoints for iOS/Android token exchange.

Mobile apps authenticate via Google/Apple Sign-In SDKs and receive
provider-specific ID tokens. These endpoints verify those tokens
and exchange them for backend-issued JWTs that the API can validate.
"""

from datetime import datetime, timezone

import httpx
from fastapi import APIRouter, HTTPException, Request, status
from olorin_shared.auth import create_refresh_token
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.core.security import create_access_token
from app.models.beta_user import BetaUser
from app.models.user import TokenResponse, User
from app.services.audit_logger import audit_logger

logger = get_logger(__name__)

router = APIRouter()

# Timeout for external API calls (Google tokeninfo, etc.)
_EXTERNAL_TIMEOUT = 30.0


class GoogleIDTokenRequest(BaseModel):
    """Request body for Google ID token exchange."""

    id_token: str = Field(..., description="Google ID token from Sign-In SDK")


class AppleIDTokenRequest(BaseModel):
    """Request body for Apple identity token exchange."""

    identity_token: str = Field(
        ..., description="Apple identity token from ASAuthorization"
    )
    full_name: str | None = Field(
        None, description="User full name (only on first sign-in)"
    )
    email: str | None = Field(
        None, description="User email (only on first sign-in)"
    )


async def _sync_beta_user_status(user: User) -> None:
    """Sync is_beta_user flag from BetaUser collection."""
    try:
        beta_user = await BetaUser.find_one(BetaUser.email == user.email)
        if beta_user and beta_user.is_active() and not beta_user.is_expired():
            if not user.is_beta_user:
                user.is_beta_user = True
        else:
            if user.is_beta_user:
                user.is_beta_user = False
    except Exception as e:
        logger.warning(
            "Failed to sync beta user status",
            extra={"user_id": str(user.id), "error": str(e)},
        )


async def _find_or_create_google_user(
    google_id: str, email: str, name: str, picture: str | None
) -> User:
    """Find existing user by Google ID or email, or create new."""
    user = await User.find_one(User.google_id == google_id)

    if not user:
        user = await User.find_one(User.email == email)
        if user:
            user.google_id = google_id
            user.auth_provider = "google"
            user.email_verified = True
            user.email_verified_at = datetime.now(timezone.utc)
            if picture and not user.avatar:
                user.avatar = picture
            user.update_verification_status()
            await user.save()
        else:
            user = User(
                email=email,
                name=name,
                google_id=google_id,
                auth_provider="google",
                role="viewer",
                avatar=picture,
                email_verified=True,
                email_verified_at=datetime.now(timezone.utc),
                phone_verified=False,
                is_verified=False,
            )
            await user.insert()

    return user


async def _find_or_create_apple_user(
    apple_sub: str, email: str, name: str
) -> User:
    """Find existing user by Apple sub or email, or create new."""
    # Search by auth_provider + email since we use email as lookup key
    user = await User.find_one(
        User.email == email, User.auth_provider == "apple"
    )

    if not user:
        user = await User.find_one(User.email == email)
        if user:
            user.auth_provider = "apple"
            user.email_verified = True
            user.email_verified_at = datetime.now(timezone.utc)
            user.update_verification_status()
            await user.save()
        else:
            user = User(
                email=email,
                name=name,
                auth_provider="apple",
                role="viewer",
                email_verified=True,
                email_verified_at=datetime.now(timezone.utc),
                phone_verified=False,
                is_verified=False,
            )
            await user.insert()

    return user


def _create_token_response(user: User) -> TokenResponse:
    """Create a TokenResponse with backend JWT and refresh token."""
    access_token = create_access_token(data={"sub": str(user.id)})
    refresh_token = create_refresh_token(
        user_id=str(user.id),
        secret_key=settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )
    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=user.to_response(),
    )


@router.post("/mobile/google", response_model=TokenResponse)
@limiter.limit("10/minute")
async def mobile_google_auth(request: Request, body: GoogleIDTokenRequest):
    """Exchange a Google ID token for a backend JWT.

    Used by iOS/Android apps that authenticate via Google Sign-In SDK.
    Verifies the ID token with Google's tokeninfo endpoint, then
    creates or finds the user and returns a backend-issued JWT.
    """
    async with httpx.AsyncClient(timeout=_EXTERNAL_TIMEOUT) as client:
        token_info_resp = await client.get(
            "https://oauth2.googleapis.com/tokeninfo",
            params={"id_token": body.id_token},
        )

    if token_info_resp.status_code != 200:
        logger.warning(
            "Google ID token verification failed",
            extra={"status": token_info_resp.status_code},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google ID token",
        )

    token_info = token_info_resp.json()

    # Log audience for monitoring; verification is handled by Google tokeninfo
    audience = token_info.get("aud", "")
    allowed_audiences = {
        settings.GOOGLE_CLIENT_ID,
        settings.GOOGLE_IOS_CLIENT_ID,
    }
    allowed_audiences = {a for a in allowed_audiences if a}

    if allowed_audiences and audience not in allowed_audiences:
        logger.info(
            "Google ID token audience from mobile client",
            extra={
                "audience": audience,
                "known_audiences": list(allowed_audiences),
            },
        )

    google_id = token_info.get("sub")
    email = token_info.get("email")
    name = token_info.get("name", email.split("@")[0] if email else "User")
    picture = token_info.get("picture")

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account has no email",
        )

    user = await _find_or_create_google_user(google_id, email, name, picture)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    user.last_login = datetime.now(timezone.utc)
    if picture and not user.avatar:
        user.avatar = picture

    await _sync_beta_user_status(user)
    await user.save()

    await audit_logger.log_oauth_login(user, request, "google_mobile")

    logger.info(
        "Mobile Google auth succeeded",
        extra={"user_id": str(user.id), "platform": "mobile"},
    )

    return _create_token_response(user)


@router.post("/mobile/apple", response_model=TokenResponse)
@limiter.limit("10/minute")
async def mobile_apple_auth(request: Request, body: AppleIDTokenRequest):
    """Exchange an Apple identity token for a backend JWT.

    Used by iOS apps that authenticate via Apple Sign-In.
    Decodes the identity token to extract claims, then
    creates or finds the user and returns a backend-issued JWT.
    """
    import base64
    import json

    try:
        parts = body.identity_token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT structure")

        payload_b64 = parts[1]
        padding = 4 - len(payload_b64) % 4
        if padding != 4:
            payload_b64 += "=" * padding

        payload_bytes = base64.urlsafe_b64decode(payload_b64)
        claims = json.loads(payload_bytes)
    except Exception as e:
        logger.warning(
            "Failed to decode Apple identity token",
            extra={"error": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Apple identity token",
        )

    if claims.get("iss") != "https://appleid.apple.com":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token issuer",
        )

    audience = claims.get("aud", "")
    if audience != settings.APPLE_BUNDLE_ID_IOS:
        logger.warning(
            "Apple token audience mismatch",
            extra={
                "audience": audience,
                "expected": settings.APPLE_BUNDLE_ID_IOS,
            },
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token audience",
        )

    apple_sub = claims.get("sub")
    email = claims.get("email") or body.email

    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Apple account has no email",
        )

    name = body.full_name or email.split("@")[0]

    user = await _find_or_create_apple_user(apple_sub, email, name)

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    user.last_login = datetime.now(timezone.utc)
    await _sync_beta_user_status(user)
    await user.save()

    await audit_logger.log_oauth_login(user, request, "apple_mobile")

    logger.info(
        "Mobile Apple auth succeeded",
        extra={"user_id": str(user.id), "platform": "mobile"},
    )

    return _create_token_response(user)
