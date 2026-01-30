from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from app.core.security import get_current_active_user, get_optional_user
from app.models.content import Content
from app.models.user import User
from app.models.watchlist import WatchHistory

router = APIRouter()


class ProgressUpdate(BaseModel):
    content_id: str
    content_type: str  # vod, podcast
    position: float  # seconds
    duration: float  # seconds


@router.get("")
async def get_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
):
    """Get user's watch history."""
    skip = (page - 1) * limit

    items = (
        await WatchHistory.find(WatchHistory.user_id == str(current_user.id))
        .sort("-last_watched_at")
        .skip(skip)
        .limit(limit)
        .to_list()
    )

    result = []
    for item in items:
        content = await Content.get(item.content_id)
        if content:
            result.append(
                {
                    "id": str(content.id),
                    "title": content.title,
                    "thumbnail": content.thumbnail,
                    "duration": content.duration,
                    "type": item.content_type,
                    "progress": item.progress_percent,
                    "position": item.position,
                    "completed": item.completed,
                    "lastWatched": item.last_watched_at.isoformat(),
                }
            )

    total = await WatchHistory.find(
        WatchHistory.user_id == str(current_user.id)
    ).count()

    return {
        "items": result,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/continue")
async def get_continue_watching(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get content to continue watching (in progress, not completed).
    Returns empty list if user not authenticated.
    """
    # Return empty list if not authenticated
    if not current_user:
        return {"items": []}

    items = (
        await WatchHistory.find(
            WatchHistory.user_id == str(current_user.id),
            WatchHistory.completed == False,
            WatchHistory.progress_percent > 5,  # At least 5% watched
        )
        .sort("-last_watched_at")
        .limit(10)
        .to_list()
    )

    result = []
    for item in items:
        content = await Content.get(item.content_id)
        if content:
            result.append(
                {
                    "id": str(content.id),
                    "title": content.title,
                    "thumbnail": content.thumbnail,
                    "duration": content.duration,
                    "type": item.content_type,
                    "progress": item.progress_percent,
                    "position": item.position,
                }
            )

    return {"items": result}


@router.post("/progress")
async def update_progress(
    data: ProgressUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update watch progress for content."""
    # Find or create history entry
    history = await WatchHistory.find_one(
        WatchHistory.user_id == str(current_user.id),
        WatchHistory.content_id == data.content_id,
    )

    progress_percent = (data.position / data.duration * 100) if data.duration > 0 else 0
    completed = progress_percent >= 90  # Consider completed at 90%

    if history:
        history.position = data.position
        history.duration = data.duration
        history.progress_percent = progress_percent
        history.completed = completed
        history.last_watched_at = datetime.now(timezone.utc)
        await history.save()
    else:
        history = WatchHistory(
            user_id=str(current_user.id),
            content_id=data.content_id,
            content_type=data.content_type,
            position=data.position,
            duration=data.duration,
            progress_percent=progress_percent,
            completed=completed,
        )
        await history.insert()

    return {
        "message": "Progress updated",
        "progress": progress_percent,
        "completed": completed,
    }


@router.patch("/{content_id}/restart")
async def restart_video(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Restart video from beginning - resets progress to 00:00."""
    history = await WatchHistory.find_one(
        WatchHistory.user_id == str(current_user.id),
        WatchHistory.content_id == content_id,
    )
    if not history:
        raise HTTPException(status_code=404, detail="Not in history")

    history.position = 0
    history.progress_percent = 0
    history.completed = False
    history.last_watched_at = datetime.now(timezone.utc)
    await history.save()

    return {
        "message": "Video restarted",
        "position": 0,
        "progress": 0,
    }


@router.delete("/{content_id}")
async def remove_from_history(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Remove content from watch history."""
    history = await WatchHistory.find_one(
        WatchHistory.user_id == str(current_user.id),
        WatchHistory.content_id == content_id,
    )
    if not history:
        raise HTTPException(status_code=404, detail="Not in history")

    await history.delete()
    return {"message": "Removed from history"}


@router.delete("")
async def clear_history(
    current_user: User = Depends(get_current_active_user),
):
    """Clear all watch history."""
    await WatchHistory.find(WatchHistory.user_id == str(current_user.id)).delete()
    return {"message": "History cleared"}
