from datetime import datetime

from app.core.security import get_current_active_user
from app.models.content import Content, LiveChannel, Podcast
from app.models.user import User
from app.models.watchlist import WatchlistItem
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

router = APIRouter()


class WatchlistAdd(BaseModel):
    content_id: str
    content_type: str  # vod, live, podcast


@router.get("")
async def get_watchlist(
    current_user: User = Depends(get_current_active_user),
):
    """Get user's watchlist."""
    items = (
        await WatchlistItem.find(WatchlistItem.user_id == str(current_user.id))
        .sort("-added_at")
        .to_list()
    )

    result = []
    for item in items:
        content_data = None

        if item.content_type in ("vod", "movie", "series"):
            content = await Content.get(item.content_id)
            if content:
                content_data = {
                    "id": str(content.id),
                    "title": content.title,
                    "thumbnail": content.thumbnail,
                    "duration": content.duration,
                    "year": content.year,
                    "type": "series" if content.is_series else "movie",
                    "category": content.category_name,
                    "is_kids_content": content.is_kids_content,
                }
        elif item.content_type == "live":
            channel = await LiveChannel.get(item.content_id)
            if channel:
                content_data = {
                    "id": str(channel.id),
                    "title": channel.name,
                    "thumbnail": channel.thumbnail,
                    "type": "live",
                }
        elif item.content_type == "podcast":
            podcast = await Podcast.get(item.content_id)
            if podcast:
                content_data = {
                    "id": str(podcast.id),
                    "title": podcast.title,
                    "thumbnail": podcast.cover,
                    "author": podcast.author,
                    "type": "podcast",
                }

        if content_data:
            content_data["addedAt"] = item.added_at.isoformat()
            result.append(content_data)

    return {"items": result}


@router.post("")
async def add_to_watchlist(
    data: WatchlistAdd,
    current_user: User = Depends(get_current_active_user),
):
    """Add content to watchlist."""
    # Check if already in watchlist
    existing = await WatchlistItem.find_one(
        WatchlistItem.user_id == str(current_user.id),
        WatchlistItem.content_id == data.content_id,
    )
    if existing:
        return {"message": "Already in watchlist", "id": str(existing.id)}

    # Verify content exists
    if data.content_type in ("vod", "movie", "series"):
        content = await Content.get(data.content_id)
    elif data.content_type in ("live", "channel"):
        content = await LiveChannel.get(data.content_id)
    elif data.content_type == "podcast":
        content = await Podcast.get(data.content_id)
    else:
        raise HTTPException(status_code=400, detail="Invalid content type")

    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    # Add to watchlist
    item = WatchlistItem(
        user_id=str(current_user.id),
        content_id=data.content_id,
        content_type=data.content_type,
    )
    await item.insert()

    return {"message": "Added to watchlist", "id": str(item.id)}


@router.delete("/{content_id}")
async def remove_from_watchlist(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Remove content from watchlist."""
    item = await WatchlistItem.find_one(
        WatchlistItem.user_id == str(current_user.id),
        WatchlistItem.content_id == content_id,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Not in watchlist")

    await item.delete()
    return {"message": "Removed from watchlist"}


@router.get("/check/{content_id}")
async def check_watchlist(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Check if content is in watchlist."""
    item = await WatchlistItem.find_one(
        WatchlistItem.user_id == str(current_user.id),
        WatchlistItem.content_id == content_id,
    )
    return {"in_watchlist": item is not None}


@router.post("/toggle/{content_id}")
async def toggle_watchlist(
    content_id: str,
    content_type: str = "vod",
    current_user: User = Depends(get_current_active_user),
):
    """Toggle watchlist status for content."""
    existing = await WatchlistItem.find_one(
        WatchlistItem.user_id == str(current_user.id),
        WatchlistItem.content_id == content_id,
    )

    if existing:
        await existing.delete()
        return {"in_watchlist": False, "message": "Removed from watchlist"}
    else:
        item = WatchlistItem(
            user_id=str(current_user.id),
            content_id=content_id,
            content_type=content_type,
        )
        await item.insert()
        return {"in_watchlist": True, "message": "Added to watchlist"}
