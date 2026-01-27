"""Audible library management routes.

Handles library synchronization and retrieval of user's audiobooks.
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.core.security import get_current_active_user
from app.models.user import User
from app.models.user_audible_account import UserAudibleAccount
from app.services.audible_service import audible_service, AudibleAPIError
from app.api.dependencies.premium_features import (
    require_premium_or_family,
    require_audible_configured,
)
from app.core.logging_config import get_logger

logger = get_logger(__name__)


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
    source: str = "audible"


router = APIRouter(prefix="/user/audible", tags=["audible_library"])


@router.post("/library/sync")
async def sync_audible_library(
    current_user: User = Depends(require_premium_or_family),
    _: bool = Depends(require_audible_configured),
):
    """Sync user's Audible library into Bayit+."""
    user_id = current_user.id
    account = await UserAudibleAccount.find_one(
        UserAudibleAccount.user_id == user_id
    )

    if not account:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audible account not connected",
        )

    if account.expires_at < datetime.now(timezone.utc):
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

        account.synced_at = datetime.now(timezone.utc)
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
    """Get user's Audible library (synced books)."""
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
        if account.expires_at < datetime.now(timezone.utc):
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
