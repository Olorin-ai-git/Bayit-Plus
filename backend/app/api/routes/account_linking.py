"""Account linking endpoints for multi-provider authentication."""
import jwt
from datetime import datetime, timezone
from typing import List, Literal

from beanie import WriteRules
from fastapi import APIRouter, Depends, HTTPException, Request, status
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from jwt import PyJWKClient
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.core.security import get_current_active_user
from app.models.user import User
from app.services.audit_logger import audit_logger

logger = get_logger(__name__)

router = APIRouter()

# Module-level PyJWKClient instance with cache expiry to prevent stale keys
_apple_jwks_client = PyJWKClient(
    settings.APPLE_JWKS_URL,
    cache_keys=True,
    max_cached_keys=16,
    lifespan=3600,
)


class LinkedProviderResponse(BaseModel):
    """Response model for linked provider information."""
    provider: str
    is_primary: bool
    linked_at: str
    provider_email: str | None = None


class LinkProviderRequest(BaseModel):
    """Request to link a new provider to the current user account."""
    provider: Literal["google", "apple"]
    id_token: str  # Google ID token or Apple identity token
    email: str | None = None  # Required for Apple
    full_name: str | None = None  # Optional for Apple


class UnlinkProviderRequest(BaseModel):
    """Request to unlink a provider from the current user account."""
    provider: Literal["google", "apple", "local"]


@router.get("/linked-providers", response_model=List[LinkedProviderResponse])
@limiter.limit("30/minute")
async def get_linked_providers(
    request: Request,
    current_user: User = Depends(get_current_active_user)
):
    """Get all authentication providers linked to the current user account."""
    providers = []

    # Local (email/password) provider
    if "local" in current_user.linked_providers or current_user.hashed_password:
        providers.append(LinkedProviderResponse(
            provider="local",
            is_primary=current_user.auth_provider == "local",
            linked_at=current_user.created_at.isoformat(),
            provider_email=current_user.email,
        ))

    # Google provider
    if "google" in current_user.linked_providers and current_user.google_id:
        providers.append(LinkedProviderResponse(
            provider="google",
            is_primary=current_user.auth_provider == "google",
            linked_at=current_user.created_at.isoformat(),
            provider_email=current_user.email,
        ))

    # Apple provider
    if "apple" in current_user.linked_providers and current_user.apple_id:
        providers.append(LinkedProviderResponse(
            provider="apple",
            is_primary=current_user.auth_provider == "apple",
            linked_at=current_user.created_at.isoformat(),
            provider_email=current_user.email,
        ))

    return providers


@router.post("/link-provider", response_model=LinkedProviderResponse)
@limiter.limit("5/hour")
async def link_provider(
    request: Request,
    link_request: LinkProviderRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Link a new authentication provider (Google or Apple) to the current user account.

    Validates the provider token and links it to the account. Prevents duplicate linking
    and ensures email consistency.
    """
    if link_request.provider in current_user.linked_providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{link_request.provider.title()} is already linked to this account"
        )

    if link_request.provider == "google":
        # Validate Google ID token
        try:
            idinfo = id_token.verify_oauth2_token(
                link_request.id_token,
                google_requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            google_id = idinfo.get("sub")
            google_email = idinfo.get("email")

            if not google_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Google ID token: missing subject"
                )

            # Check if this Google account is already linked to another user
            existing = await User.find_one(User.google_id == google_id)
            if existing and str(existing.id) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This Google account is already linked to another Bayit+ account"
                )

            # Block if emails don't match (security: prevent account hijacking)
            if google_email and google_email != current_user.email:
                logger.error(
                    "Email mismatch detected - possible account hijacking attempt",
                    extra={
                        "user_email": current_user.email,
                        "provider_email": google_email,
                        "user_id": str(current_user.id),
                        "ip": request.client.host if request.client else None,
                    }
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The email associated with this Google account does not match your Bayit+ account email. Please use a Google account with the same email address."
                )

            # Atomic operation to prevent race conditions
            result = await User.find_one(
                User.id == current_user.id,
                User.linked_providers != link_request.provider
            ).update(
                {
                    "$set": {"google_id": google_id, "email_verified": True},
                    "$addToSet": {"linked_providers": link_request.provider}
                },
                WriteRules.WRITE
            )

            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Provider already linked or concurrent modification detected"
                )

            # Reload user to get updated state
            await current_user.sync()

            # Audit logging
            await audit_logger.log_event(
                event_type="account_link",
                status="success",
                details=f"Linked {link_request.provider} provider",
                user=current_user,
                request=request,
                metadata={
                    "provider": link_request.provider,
                    "provider_email": google_email,
                }
            )

            logger.info(
                f"Google account linked for user: {current_user.email}",
                extra={"user_id": str(current_user.id)}
            )

            return LinkedProviderResponse(
                provider="google",
                is_primary=False,
                linked_at=datetime.now(timezone.utc).isoformat(),
                provider_email=google_email,
            )

        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Google ID token: {str(e)}"
            )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            logger.error(f"Google token validation failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to validate Google account"
            )

    elif link_request.provider == "apple":
        # Validate Apple identity token
        try:
            signing_key = _apple_jwks_client.get_signing_key_from_jwt(link_request.id_token)

            decoded_token = jwt.decode(
                link_request.id_token,
                signing_key.key,
                algorithms=["RS256"],
                audience=settings.APPLE_BUNDLE_ID_IOS,
                issuer="https://appleid.apple.com",
                options={"verify_exp": True, "verify_iss": True},
            )

            # Validate token expiration margin (prevent time-of-check-time-of-use bugs)
            exp_timestamp = decoded_token.get("exp")
            if exp_timestamp:
                remaining_time = exp_timestamp - datetime.now(timezone.utc).timestamp()
                if remaining_time < 60:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Token expires too soon. Please obtain a fresh token."
                    )

            apple_id = decoded_token.get("sub")
            apple_email = decoded_token.get("email") or link_request.email

            if not apple_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Invalid Apple identity token: missing subject"
                )

            # Check if this Apple account is already linked to another user
            existing = await User.find_one(User.apple_id == apple_id)
            if existing and str(existing.id) != str(current_user.id):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="This Apple ID is already linked to another Bayit+ account"
                )

            # Block if emails don't match (security: prevent account hijacking)
            if apple_email and apple_email != current_user.email:
                logger.error(
                    "Email mismatch detected - possible account hijacking attempt",
                    extra={
                        "user_email": current_user.email,
                        "provider_email": apple_email,
                        "user_id": str(current_user.id),
                        "ip": request.client.host if request.client else None,
                    }
                )
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The email associated with this Apple ID does not match your Bayit+ account email. Please use an Apple ID with the same email address."
                )

            # Atomic operation to prevent race conditions
            result = await User.find_one(
                User.id == current_user.id,
                User.linked_providers != link_request.provider
            ).update(
                {
                    "$set": {"apple_id": apple_id, "email_verified": True},
                    "$addToSet": {"linked_providers": link_request.provider}
                },
                WriteRules.WRITE
            )

            if result.modified_count == 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Provider already linked or concurrent modification detected"
                )

            # Reload user to get updated state
            await current_user.sync()

            # Audit logging
            await audit_logger.log_event(
                event_type="account_link",
                status="success",
                details=f"Linked {link_request.provider} provider",
                user=current_user,
                request=request,
                metadata={
                    "provider": link_request.provider,
                    "provider_email": apple_email,
                }
            )

            logger.info(
                f"Apple account linked for user: {current_user.email}",
                extra={"user_id": str(current_user.id)}
            )

            return LinkedProviderResponse(
                provider="apple",
                is_primary=False,
                linked_at=datetime.now(timezone.utc).isoformat(),
                provider_email=apple_email,
            )

        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Apple identity token expired"
            )
        except jwt.InvalidTokenError as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid Apple identity token: {str(e)}"
            )
        except Exception as e:
            if isinstance(e, HTTPException):
                raise
            logger.error(f"Apple token validation failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to validate Apple account"
            )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unsupported provider: {link_request.provider}"
    )


@router.delete("/unlink-provider", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit("3/hour")
async def unlink_provider(
    request: Request,
    unlink_request: UnlinkProviderRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Unlink an authentication provider from the current user account.

    Safety: Prevents unlinking the last remaining provider to ensure the user
    can always sign in.
    """
    if unlink_request.provider not in current_user.linked_providers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{unlink_request.provider.title()} is not linked to this account"
        )

    # Prevent unlinking the last provider
    if len(current_user.linked_providers) <= 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot unlink the last authentication method. Please link another provider first."
        )

    # Unlink the provider
    if unlink_request.provider == "google":
        current_user.google_id = None
    elif unlink_request.provider == "apple":
        current_user.apple_id = None
    elif unlink_request.provider == "local":
        current_user.hashed_password = None

    current_user.linked_providers.remove(unlink_request.provider)

    # Update primary provider if necessary
    if current_user.auth_provider == unlink_request.provider:
        current_user.auth_provider = current_user.linked_providers[0]

    await current_user.save()

    # Audit logging
    await audit_logger.log_event(
        event_type="account_unlink",
        status="success",
        details=f"Unlinked {unlink_request.provider} provider",
        user=current_user,
        request=request,
        metadata={
            "provider": unlink_request.provider,
            "remaining_providers": current_user.linked_providers,
        }
    )

    logger.info(
        f"{unlink_request.provider.title()} account unlinked for user: {current_user.email}",
        extra={"user_id": str(current_user.id)}
    )

    return None
