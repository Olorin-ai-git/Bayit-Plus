"""
Audible Integration API Routes

Handles OAuth authentication, account linking, and library syncing.

All endpoints require Premium or Family subscription tier. Basic tier users
will receive HTTP 403 Forbidden responses.

Configuration: Audible integration requires OAuth credentials to be configured
in environment variables or secret manager. If not configured, endpoints
return HTTP 503 Service Unavailable.
"""

from datetime import datetime, timedelta
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user import User
from app.models.user_audible_account import UserAudibleAccount
from app.services.audible_service import audible_service, AudibleAudiobook, AudibleAPIError
from app.services.audible_oauth_helpers import generate_pkce_pair, generate_state_token
from app.services.audible_state_manager import store_state_token, validate_state_token
from app.api.dependencies.premium_features import (
    require_premium_or_family,
    require_audible_configured,
)
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


class AudibleAudiobookResponse(BaseModel):
    """Response model for Audible audiobook"""
    asin: str
    title: str
    author: str
    narrator: Optional[str] = None
    image: Optional[str] = None
    description: Optional[str] = None
    duration_minutes: Optional[int] = None
    rating: Optional[float] = None
    is_owned: bool = False
    source: str = "audible"  # Source identifier


class AudibleConnectionResponse(BaseModel):
    """Response for Audible account connection status"""
    connected: bool
    audible_user_id: Optional[str] = None
    synced_at: Optional[datetime] = None
    last_sync_error: Optional[str] = None


router = APIRouter(prefix="/user/audible", tags=["audible_integration"])


@router.post("/oauth/authorize", response_model=AudibleOAuthUrlResponse)
async def get_audible_oauth_url(
    request: Request,
    req: AudibleOAuthRequest,
    current_user: User = Depends(require_premium_or_family),
    _: bool = Depends(require_audible_configured),
):
    """
    Generate Audible OAuth authorization URL with PKCE support.

    **Premium Feature**: Requires Premium or Family subscription.

    Returns URL for user to authorize Bayit+ to access their Audible library.
    Uses PKCE (Proof Key for Code Exchange) for enhanced security.

    Raises:
        HTTPException: 403 if user is not premium/family tier
        HTTPException: 503 if Audible integration is not configured
    """
    try:
        # Generate PKCE pair for authorization code flow
        code_verifier, code_challenge = generate_pkce_pair()

        # Generate CSRF protection state token
        state = generate_state_token()

        # Store state token with PKCE pair for validation on callback
        store_state_token(state, current_user.id, code_verifier, code_challenge)

        # Get OAuth URL with PKCE code_challenge
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
    """
    Handle Audible OAuth callback with PKCE validation.

    **Premium Feature**: Requires Premium or Family subscription.

    Validates CSRF state token and exchanges authorization code for tokens.
    Stores encrypted tokens in database for future API calls.

    Raises:
        HTTPException: 403 if user is not premium/family tier
        HTTPException: 503 if Audible integration is not configured
        HTTPException: 400 if CSRF state validation fails or token exchange fails
    """
    user_id = current_user.id

    try:
        # Validate CSRF state token and retrieve PKCE code_verifier
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

        # Exchange authorization code for tokens using PKCE
        token = await audible_service.exchange_code_for_token(callback.code, code_verifier)

        existing = await UserAudibleAccount.find_one(
            UserAudibleAccount.user_id == user_id
        )

        if existing:
            existing.audible_user_id = token.user_id
            existing.access_token = token.access_token
            existing.refresh_token = token.refresh_token
            existing.expires_at = token.expires_at
            existing.state_token = None  # Clear used state token
            existing.synced_at = datetime.utcnow()
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
            "synced_at": datetime.utcnow().isoformat(),
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
    """
    Check if user has connected their Audible account.

    **Premium Feature**: Requires Premium or Family subscription.

    Raises:
        HTTPException: 403 if user is not premium/family tier
    """
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
    """
    Disconnect user's Audible account from Bayit+.

    **Premium Feature**: Requires Premium or Family subscription.

    Removes stored tokens and prevents library syncing.

    Raises:
        HTTPException: 403 if user is not premium/family tier
    """
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


@router.post("/library/sync")
async def sync_audible_library(
    current_user: User = Depends(require_premium_or_family),
    _: bool = Depends(require_audible_configured),
):
    """
    Sync user's Audible library into Bayit+.

    **Premium Feature**: Requires Premium or Family subscription.

    Fetches user's audiobooks from Audible and creates local records.

    Raises:
        HTTPException: 403 if user is not premium/family tier
        HTTPException: 503 if Audible integration is not configured
    """
    user_id = current_user.id
    account = await UserAudibleAccount.find_one(
        UserAudibleAccount.user_id == user_id
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audible account not connected",
        )

    if account.expires_at < datetime.utcnow():
        try:
            token = await audible_service.refresh_access_token(
                account.refresh_token
            )
            account.access_token = token.access_token
            account.refresh_token = token.refresh_token
            account.expires_at = token.expires_at
            await account.save()
        except AudibleAPIError as e:
            account.last_sync_error = "Token refresh failed"
            await account.save()
            logger.error("Token refresh failed during sync", extra={
                "user_id": user_id,
                "error_type": type(e).__name__,
            })
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="audible_service_unavailable",
            )

    try:
        audiobooks = await audible_service.get_user_library(
            account.access_token, limit=100
        )

        account.synced_at = datetime.utcnow()
        account.last_sync_error = None
        await account.save()

        logger.info("Audible library synced", extra={
            "user_id": user_id,
            "count": len(audiobooks)
        })

        return {
            "status": "synced",
            "audiobooks_count": len(audiobooks),
            "synced_at": account.synced_at.isoformat(),
        }

    except AudibleAPIError as e:
        account.last_sync_error = "Sync failed"
        await account.save()
        logger.error("Library sync failed", extra={
            "user_id": user_id,
            "error_type": type(e).__name__,
        })
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="audible_service_unavailable",
        )


@router.get("/library", response_model=List[AudibleAudiobookResponse])
async def get_audible_library(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(require_premium_or_family),
):
    """
    Get user's Audible library (synced books).

    **Premium Feature**: Requires Premium or Family subscription.

    Raises:
        HTTPException: 403 if user is not premium/family tier
    """
    user_id = current_user.id
    account = await UserAudibleAccount.find_one(
        UserAudibleAccount.user_id == user_id
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audible account not connected",
        )

    try:
        if account.expires_at < datetime.utcnow():
            try:
                token = await audible_service.refresh_access_token(
                    account.refresh_token
                )
                account.access_token = token.access_token
                account.expires_at = token.expires_at
                await account.save()
            except AudibleAPIError as e:
                logger.error("Token refresh failed when fetching library", extra={
                    "user_id": user_id,
                    "error_type": type(e).__name__,
                })
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="audible_service_unavailable",
                )

        audiobooks = await audible_service.get_user_library(
            account.access_token, limit=limit, offset=skip
        )

        return [
            AudibleAudiobookResponse(**book.dict())
            for book in audiobooks
        ]

    except AudibleAPIError as e:
        logger.error(f"Failed to fetch library: {str(e)}", extra={"user_id": user_id})
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="audible_service_unavailable",
        )


@router.get("/search", response_model=List[AudibleAudiobookResponse])
async def search_audible_catalog(
    q: str,
    limit: int = 20,
    current_user: User = Depends(require_premium_or_family),
    _: bool = Depends(require_audible_configured),
):
    """
    Search Audible catalog for audiobooks.

    **Premium Feature**: Requires Premium or Family subscription.

    Works without Audible account connection (uses public API).

    Raises:
        HTTPException: 403 if user is not premium/family tier
        HTTPException: 503 if Audible integration is not configured
        HTTPException: 400 if search query is too short
    """
    if not q or len(q) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Search query must be at least 2 characters",
        )

    try:
        results = await audible_service.search_catalog(q, limit=limit)

        return [
            AudibleAudiobookResponse(**book.dict())
            for book in results
        ]

    except AudibleAPIError as e:
        logger.error("Audible catalog search failed", extra={
            "query": q,
            "user_id": current_user.id,
            "error_type": type(e).__name__,
        })
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="audible_service_unavailable",
        )


@router.get("/{asin}/details", response_model=AudibleAudiobookResponse)
async def get_audible_audiobook_details(
    asin: str,
    current_user: User = Depends(require_premium_or_family),
):
    """
    Get detailed information about a specific Audible audiobook.

    **Premium Feature**: Requires Premium or Family subscription.

    Raises:
        HTTPException: 403 if user is not premium/family tier
        HTTPException: 404 if audiobook not found
    """
    try:
        audiobook = await audible_service.get_audiobook_details(asin)

        if not audiobook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="audiobook_not_found",
            )

        return AudibleAudiobookResponse(**audiobook.dict())

    except AudibleAPIError as e:
        logger.error("Failed to fetch audiobook details", extra={
            "asin": asin,
            "user_id": current_user.id,
            "error_type": type(e).__name__,
        })
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="audible_service_unavailable",
        )
    except HTTPException:
        raise


@router.get("/{asin}/play-url")
async def get_audible_play_url(
    asin: str,
    platform: str = "web",
    current_user: User = Depends(require_premium_or_family),
):
    """
    Get deep link URL to open audiobook in Audible app.

    **Premium Feature**: Requires Premium or Family subscription.

    Supports: web, ios, android
    - iOS: audible://www.audible.com/pd/{asin}
    - Android: audible://www.audible.com/pd/{asin}
    - Web: https://www.audible.com/pd/{asin}

    Raises:
        HTTPException: 403 if user is not premium/family tier
    """
    try:
        url = audible_service.get_audible_app_url(asin)

        return {
            "url": url,
            "platform": platform,
            "action": "redirect_to_audible",
        }

    except Exception as e:
        logger.error("Failed to generate play URL", extra={
            "asin": asin,
            "user_id": current_user.id,
            "error_type": type(e).__name__,
        })
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="failed_to_generate_play_url",
        )
