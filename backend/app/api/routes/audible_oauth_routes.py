"""Audible OAuth routes - authorization, token exchange, connection status."""

from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from app.models.user import User
from app.models.user_audible_account import UserAudibleAccount
from app.services.audible_service import audible_service, AudibleAPIError
from app.services.audible_oauth_helpers import generate_pkce_pair, generate_state_token
from app.services.audible_state_manager import store_state_token, validate_state_token
from app.api.dependencies.premium_features import require_premium_or_family, require_audible_configured
from app.core.logging_config import get_logger

logger = get_logger(__name__)

class AudibleOAuthRequest(BaseModel):
    """Request for Audible OAuth authorization URL"""
    redirect_uri: str

class AudibleOAuthCallback(BaseModel):
    """Audible OAuth callback with authorization code"""
    code: str
    state: str

class AudibleOAuthUrlResponse(BaseModel):
    """Response containing OAuth authorization URL and PKCE/state details"""
    auth_url: str
    state: str
    code_challenge: str
    code_challenge_method: str = "S256"

class AudibleConnectionResponse(BaseModel):
    """Response for Audible account connection status"""
    connected: bool
    audible_user_id: Optional[str] = None
    synced_at: Optional[datetime] = None
    last_sync_error: Optional[str] = None


router = APIRouter(prefix="/user/audible", tags=["audible_oauth"])

@router.post("/oauth/authorize", response_model=AudibleOAuthUrlResponse)
async def get_audible_oauth_url(
    request: Request,
    req: AudibleOAuthRequest,
    current_user: User = Depends(require_premium_or_family),
    _: bool = Depends(require_audible_configured),
):
    """Generate Audible OAuth authorization URL with PKCE support."""
    try:
        code_verifier, code_challenge = generate_pkce_pair()
        state = generate_state_token()
        store_state_token(state, current_user.id, code_verifier, code_challenge)

        oauth_url = await audible_service.get_oauth_url(state, code_challenge)

        logger.info("Generated Audible OAuth authorization URL", extra={
            "user_id": current_user.id,
            "state": state[:10],
        })

        return AudibleOAuthUrlResponse(
            auth_url=oauth_url,
            state=state,
            code_challenge=code_challenge,
            code_challenge_method="S256",
        )

    except Exception as e:
        logger.error(f"Failed to generate OAuth URL: {str(e)}", extra={
            "user_id": current_user.id,
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="failed_to_generate_oauth_url",
        )

@router.post("/oauth/callback")
async def handle_audible_oauth_callback(
    request: Request,
    callback: AudibleOAuthCallback,
    current_user: User = Depends(require_premium_or_family),
    _: bool = Depends(require_audible_configured),
):
    """Handle Audible OAuth callback with PKCE validation."""
    user_id = current_user.id

    try:
        try:
            code_verifier, code_challenge = validate_state_token(callback.state, user_id)
        except ValueError as e:
            logger.warning(f"CSRF state validation failed: {str(e)}", extra={
                "user_id": user_id,
                "state": callback.state[:10] if callback.state else None,
            })
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="invalid_state_parameter",
            )

        token = await audible_service.exchange_code_for_token(callback.code, code_verifier)

        existing = await UserAudibleAccount.find_one(
            UserAudibleAccount.user_id == user_id
        )

        if existing:
            existing.audible_user_id = token.user_id
            existing.access_token = token.access_token
            existing.refresh_token = token.refresh_token
            existing.expires_at = token.expires_at
            existing.state_token = None
            existing.synced_at = datetime.now(timezone.utc)
            existing.last_sync_error = None
            await existing.save()
        else:
            audible_account = UserAudibleAccount(
                user_id=user_id,
                audible_user_id=token.user_id,
                access_token=token.access_token,
                refresh_token=token.refresh_token,
                expires_at=token.expires_at,
                state_token=None,
            )
            await audible_account.insert()

        logger.info("Audible account connected", extra={
            "user_id": user_id,
            "audible_user_id": token.user_id,
        })

        return {
            "status": "connected",
            "audible_user_id": token.user_id,
            "synced_at": datetime.now(timezone.utc).isoformat(),
        }

    except HTTPException:
        raise
    except AudibleAPIError as e:
        logger.error(f"Audible API error during callback", extra={
            "user_id": user_id,
            "endpoint": "oauth/callback",
            "error_code": getattr(e, "code", "unknown"),
        })
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="audible_service_unavailable",
        )
    except Exception as e:
        logger.error(f"Unexpected error during OAuth callback: {type(e).__name__}", extra={
            "user_id": user_id,
        })
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="audible_oauth_failed",
        )


@router.get("/connected", response_model=AudibleConnectionResponse)
async def check_audible_connection(
    current_user: User = Depends(require_premium_or_family),
):
    """Check if user has connected their Audible account."""
    user_id = current_user.id
    account = await UserAudibleAccount.find_one(
        UserAudibleAccount.user_id == user_id
    )

    if not account:
        return AudibleConnectionResponse(connected=False)

    return AudibleConnectionResponse(
        connected=True,
        audible_user_id=account.audible_user_id,
        synced_at=account.synced_at,
        last_sync_error=account.last_sync_error,
    )


@router.post("/disconnect")
async def disconnect_audible_account(
    current_user: User = Depends(require_premium_or_family),
):
    """Disconnect user's Audible account from Bayit+."""
    user_id = current_user.id
    account = await UserAudibleAccount.find_one(
        UserAudibleAccount.user_id == user_id
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Audible account connected",
        )

    await account.delete()

    return {"status": "disconnected"}
