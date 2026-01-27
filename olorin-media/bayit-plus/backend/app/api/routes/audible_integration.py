"""
Audible Integration API Routes

Handles OAuth authentication, account linking, and library syncing.

All endpoints require Premium or Family subscription tier. Basic tier users
will receive HTTP 403 Forbidden responses.

Configuration: Audible integration requires OAuth credentials to be configured
in environment variables or secret manager. If not configured, endpoints
return HTTP 503 Service Unavailable.
"""

import secrets
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


@router.post("/oauth/authorize")
async def get_audible_oauth_url(
    request: Request,
    req: AudibleOAuthRequest,
    current_user: User = Depends(require_premium_or_family),
    _: bool = Depends(require_audible_configured),
):
    """
    Generate Audible OAuth authorization URL.

    **Premium Feature**: Requires Premium or Family subscription.

    Returns URL for user to authorize Bayit+ to access their Audible library.

    Raises:
        HTTPException: 403 if user is not premium/family tier
        HTTPException: 503 if Audible integration is not configured
    """
    state = secrets.token_urlsafe(32)  # CSRF protection token

    oauth_url = await audible_service.get_oauth_url(state)

    return {
        "auth_url": oauth_url,
        "state": state,
    }


@router.post("/oauth/callback")
async def handle_audible_oauth_callback(
    request: Request,
    callback: AudibleOAuthCallback,
    current_user: User = Depends(require_premium_or_family),
    _: bool = Depends(require_audible_configured),
):
    """
    Handle Audible OAuth callback.

    **Premium Feature**: Requires Premium or Family subscription.

    Exchanges authorization code for access/refresh tokens.
    Stores encrypted tokens in database for future API calls.

    Raises:
        HTTPException: 403 if user is not premium/family tier
        HTTPException: 503 if Audible integration is not configured
        HTTPException: 400 if token exchange fails
    """
    user_id = current_user.id
    try:
        token = await audible_service.exchange_code_for_token(callback.code)

        existing = await UserAudibleAccount.find_one(
            UserAudibleAccount.user_id == user_id
        )

        if existing:
            existing.audible_user_id = token.user_id
            existing.access_token = token.access_token
            existing.refresh_token = token.refresh_token
            existing.expires_at = token.expires_at
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
            )
            await audible_account.insert()

        return {
            "status": "connected",
            "audible_user_id": token.user_id,
            "synced_at": datetime.utcnow().isoformat(),
        }

    except AudibleAPIError as e:
        logger.error(f"Audible API error during callback: {str(e)}", extra={
            "user_id": user_id,
            "endpoint": "oauth/callback"
        })
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="audible_service_unavailable",
        )
    except Exception as e:
        logger.error(f"Unexpected error during Audible callback: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="audible_callback_failed",
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
            error_msg = f"Token refresh failed: {str(e)}"
            account.last_sync_error = error_msg
            await account.save()
            logger.error(error_msg, extra={"user_id": user_id})
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
        error_msg = f"Sync failed: {str(e)}"
        account.last_sync_error = error_msg
        await account.save()
        logger.error(error_msg, extra={"user_id": user_id})
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
                logger.error(f"Token refresh failed: {str(e)}", extra={"user_id": user_id})
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
        logger.error(f"Search failed: {str(e)}", extra={
            "query": q,
            "user_id": current_user.id
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
        logger.error(f"Failed to fetch details: {str(e)}", extra={
            "asin": asin,
            "user_id": current_user.id
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
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate play URL: {str(e)}",
        )
