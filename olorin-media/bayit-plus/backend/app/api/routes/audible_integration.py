"""
Audible Integration API Routes

Handles OAuth authentication, account linking, and library syncing.
"""

import secrets
from datetime import datetime, timedelta
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core.config import settings
from app.core.security import get_current_active_user
from app.models.user_audible_account import UserAudibleAccount
from app.services.audible_service import audible_service, AudibleAudiobook


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
    user_id: str = Depends(get_current_active_user),
):
    """
    Generate Audible OAuth authorization URL.

    Returns URL for user to authorize Bayit+ to access their Audible library.
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
    user_id: str = Depends(get_current_active_user),
):
    """
    Handle Audible OAuth callback.

    Exchanges authorization code for access/refresh tokens.
    Stores encrypted tokens in database for future API calls.
    """
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

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to connect Audible account: {str(e)}",
        )


@router.get("/connected", response_model=AudibleConnectionResponse)
async def check_audible_connection(
    user_id: str = Depends(get_current_active_user),
):
    """
    Check if user has connected their Audible account.
    """
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
    user_id: str = Depends(get_current_active_user),
):
    """
    Disconnect user's Audible account from Bayit+.

    Removes stored tokens and prevents library syncing.
    """
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
    user_id: str = Depends(get_current_active_user),
):
    """
    Sync user's Audible library into Bayit+.

    Fetches user's audiobooks from Audible and creates local records.
    """
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
        except Exception as e:
            account.last_sync_error = str(e)
            await account.save()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to refresh Audible token",
            )

    try:
        audiobooks = await audible_service.get_user_library(
            account.access_token, limit=100
        )

        account.synced_at = datetime.utcnow()
        account.last_sync_error = None
        await account.save()

        return {
            "status": "synced",
            "audiobooks_count": len(audiobooks),
            "synced_at": account.synced_at.isoformat(),
        }

    except Exception as e:
        account.last_sync_error = str(e)
        await account.save()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Sync failed: {str(e)}",
        )


@router.get("/library", response_model=List[AudibleAudiobookResponse])
async def get_audible_library(
    skip: int = 0,
    limit: int = 20,
    user_id: str = Depends(get_current_active_user),
):
    """
    Get user's Audible library (synced books).

    Currently returns mock data. In production, would query cached sync results.
    """
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
            token = await audible_service.refresh_access_token(
                account.refresh_token
            )
            account.access_token = token.access_token
            account.expires_at = token.expires_at
            await account.save()

        audiobooks = await audible_service.get_user_library(
            account.access_token, limit=limit, offset=skip
        )

        return [
            AudibleAudiobookResponse(**book.dict())
            for book in audiobooks
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch Audible library: {str(e)}",
        )


@router.get("/search", response_model=List[AudibleAudiobookResponse])
async def search_audible_catalog(
    q: str,
    limit: int = 20,
    user_id: str = Depends(get_current_active_user),
):
    """
    Search Audible catalog for audiobooks.

    Works without Audible account connection.
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

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )


@router.get("/{asin}/details", response_model=AudibleAudiobookResponse)
async def get_audible_audiobook_details(
    asin: str,
    user_id: str = Depends(get_current_active_user),
):
    """
    Get detailed information about a specific Audible audiobook.
    """
    try:
        audiobook = await audible_service.get_audiobook_details(asin)

        if not audiobook:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audiobook not found",
            )

        return AudibleAudiobookResponse(**audiobook.dict())

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch audiobook details: {str(e)}",
        )


@router.get("/{asin}/play-url")
async def get_audible_play_url(
    asin: str,
    platform: str = "web",
    user_id: str = Depends(get_current_active_user),
):
    """
    Get deep link URL to open audiobook in Audible app.

    Supports: web, ios, android
    iOS: audible://www.audible.com/pd/{asin}
    Android: audible://www.audible.com/pd/{asin}
    Web: https://www.audible.com/pd/{asin}
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
