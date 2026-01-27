"""Audible catalog search routes.

Handles catalog search and audiobook details retrieval.
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.models.user import User
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


router = APIRouter(prefix="/user/audible", tags=["audible_search"])


@router.get("/search", response_model=List[AudibleAudiobookResponse])
async def search_audible_catalog(
    q: str,
    limit: int = 20,
    current_user: User = Depends(require_premium_or_family),
    _: bool = Depends(require_audible_configured),
):
    """Search Audible catalog for audiobooks."""
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
    """Get detailed information about a specific Audible audiobook."""
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
    """Get deep link URL to open audiobook in Audible app."""
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
