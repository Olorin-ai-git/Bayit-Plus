"""
Continue Watching API Endpoints
Provides user's recently watched content with playback progress for widgets and web UI
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timedelta

from app.models.user import User
from app.models.playback_progress import PlaybackProgress
from app.models.content import Content
from app.schemas.continue_watching import (
    ContinueWatchingResponse,
    ContinueWatchingItem,
)
from app.core.security import get_current_user
from app.core.database import get_database
from olorin_shared.logging import get_logger

logger = get_logger(__name__)
router = APIRouter()


@router.get(
    "/continue-watching",
    response_model=ContinueWatchingResponse,
    summary="Get Continue Watching",
    description="Returns user's recently watched content with playback progress for widget and UI display",
)
async def get_continue_watching(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database),
) -> ContinueWatchingResponse:
    """
    Get user's continue watching list.

    Returns content that:
    - Has been watched in the last 30 days
    - Is not completed (progress < 95%)
    - Is ordered by most recently watched
    - Includes movies, series episodes, audiobooks, and podcasts

    Args:
        limit: Maximum number of items to return (default 10, widget uses 3)
        current_user: Authenticated user from JWT token
        db: Database session

    Returns:
        ContinueWatchingResponse with list of items

    Raises:
        HTTPException: If database query fails
    """
    try:
        # Query playback progress for user
        # Last 30 days, not completed, ordered by last updated
        cutoff_date = datetime.utcnow() - timedelta(days=30)

        progress_items = await PlaybackProgress.find(
            {"user_id": current_user.id}, 
            PlaybackProgress.updated_at >= cutoff_date, 
            PlaybackProgress.progress < 0.95,   # Not completed
            PlaybackProgress.position > 30,   # Watched at least 30 seconds
        ).sort("-updated_at").limit(limit).to_list()

        if not progress_items:
            logger.info(
                "No continue watching items found",
                user_id=str(current_user.id),
            )
            return ContinueWatchingResponse(items=[])

        # Fetch content details for each progress item
        content_ids = [p.content_id for p in progress_items]
        content_items = await Content.find(
            {"_id": {"$in": content_ids}}
        ).to_list()

        # Create lookup map
        content_map = {str(c.id): c for c in content_items}

        # Build response items
        items: List[ContinueWatchingItem] = []
        for progress in progress_items:
            content = content_map.get(str(progress.content_id))
            if not content:
                logger.warning(
                    "Content not found for progress entry",
                    content_id=str(progress.content_id),
                    user_id=str(current_user.id),
                )
                continue

            # Determine cover URL based on content type
            cover_url = _get_cover_url(content)

            # Create item
            item = ContinueWatchingItem(
                id=str(content.id),
                title=_get_display_title(content),
                type=content.type,
                cover_url=cover_url,
                duration=content.duration or 0,
                position=progress.position,
            )
            items.append(item)

        logger.info(
            "Continue watching retrieved",
            user_id=str(current_user.id),
            item_count=len(items),
        )

        return ContinueWatchingResponse(items=items)

    except Exception as e:
        logger.error(
            "Failed to fetch continue watching",
            user_id=str(current_user.id),
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch continue watching data",
        )


def _get_cover_url(content: Content) -> Optional[str]:
    """
    Get the appropriate cover URL for content.

    Priority:
    1. content.cover_url (direct URL)
    2. content.poster_path (TMDB path, needs CDN prefix)
    3. content.artwork (audiobook/podcast artwork)
    4. None (widget will show placeholder)
    """
    if content.cover_url:
        return content.cover_url

    if content.poster_path:
        # TMDB poster path - add CDN prefix
        return f"https://image.tmdb.org/t/p/w500{content.poster_path}"

    if hasattr(content, "artwork") and content.artwork:
        return content.artwork

    return None


def _get_display_title(content: Content) -> str:
    """
    Get the display title for content.

    For series episodes: "Series Name: S2E5 - Episode Title"
    For other content: Use title as-is
    """
    if content.type == "episode" and hasattr(content, "series_title"):
        season = getattr(content, "season_number", "")
        episode = getattr(content, "episode_number", "")
        episode_title = content.title

        if season and episode:
            return f"{content.series_title}: S{season}E{episode} - {episode_title}"
        return f"{content.series_title}: {episode_title}"

    return content.title


@router.post(
    "/continue-watching/{content_id}/mark-completed",
    summary="Mark Content as Completed",
    description="Removes content from continue watching by marking as completed",
)
async def mark_completed(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database),
) -> dict:
    """
    Mark content as completed, removing it from continue watching.

    Args:
        content_id: ID of content to mark as completed
        current_user: Authenticated user
        db: Database session

    Returns:
        Success message
    """
    try:
        progress = await PlaybackProgress.find_one(
            {"user_id": current_user.id, "content_id": content_id}
)

        if not progress:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Progress not found",
            )

        # Mark as completed (100% progress)
        progress.progress = 1.0
        progress.position = progress.duration or 0
        progress.updated_at = datetime.utcnow()
        await progress.save()

        logger.info(
            "Content marked as completed",
            user_id=str(current_user.id),
            content_id=content_id,
        )

        return {"message": "Content marked as completed"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to mark content as completed",
            user_id=str(current_user.id),
            content_id=content_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark content as completed",
        )


@router.delete(
    "/continue-watching/{content_id}",
    summary="Remove from Continue Watching",
    description="Removes specific content from continue watching list",
)
async def remove_from_continue_watching(
    content_id: str,
    current_user: User = Depends(get_current_user),
    db = Depends(get_database),
) -> dict:
    """
    Remove content from continue watching by deleting progress.

    Args:
        content_id: ID of content to remove
        current_user: Authenticated user
        db: Database session

    Returns:
        Success message
    """
    try:
        progress = await PlaybackProgress.find_one(
            {"user_id": current_user.id, "content_id": content_id}
)

        if not progress:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Progress not found",
            )

        await progress.delete()

        logger.info(
            "Content removed from continue watching",
            user_id=str(current_user.id),
            content_id=content_id,
        )

        return {"message": "Content removed from continue watching"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to remove content from continue watching",
            user_id=str(current_user.id),
            content_id=content_id,
            error=str(e),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove content",
        )
