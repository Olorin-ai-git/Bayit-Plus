"""
Playlist REST API
CRUD endpoints for user playlist management.
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Path

from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.playlist import CONTENT_ID_PATTERN, MAX_PLAYLIST_ITEMS, PlaylistItem, UserPlaylist
from app.models.user import User
from .playlist_helpers import (
    PlaylistAddRequest,
    PlaylistReorderRequest,
    enrich_playlist_item,
    get_content_metadata,
)

logger = get_logger(__name__)
router = APIRouter()


@router.get("")
async def get_playlist(
    current_user: User = Depends(get_current_active_user),
):
    """Get user's playlist with enriched content data."""
    playlist = await UserPlaylist.find_one(
        UserPlaylist.user_id == str(current_user.id)
    )

    if not playlist:
        return {"items": []}

    return {"items": [enrich_playlist_item(item) for item in playlist.items]}


@router.post("/items")
async def add_to_playlist(
    data: PlaylistAddRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Add content to playlist."""
    user_id = str(current_user.id)
    playlist = await UserPlaylist.get_or_create(user_id)

    if any(item.content_id == data.content_id for item in playlist.items):
        return {
            "message": "Already in playlist",
            "item_count": len(playlist.items),
            "items": [enrich_playlist_item(i) for i in playlist.items],
        }

    if len(playlist.items) >= MAX_PLAYLIST_ITEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Playlist full ({MAX_PLAYLIST_ITEMS} items max)",
        )

    content_meta = await get_content_metadata(data.content_id, data.content_type)
    if not content_meta:
        raise HTTPException(status_code=404, detail="Content not found")

    new_item = PlaylistItem(
        content_id=data.content_id,
        content_type=data.content_type,
        title=content_meta["title"],
        thumbnail=content_meta.get("thumbnail"),
        duration=content_meta.get("duration"),
        position=len(playlist.items),
    )
    playlist.items.append(new_item)
    playlist.updated_at = datetime.utcnow()
    await playlist.save()

    logger.info(
        "Playlist item added via API",
        extra={"user_id": user_id, "content_id": data.content_id},
    )
    return {
        "message": "Added to playlist",
        "item_count": len(playlist.items),
        "items": [enrich_playlist_item(i) for i in playlist.items],
    }


@router.delete("/items/{content_id}")
async def remove_from_playlist(
    content_id: str = Path(..., pattern=CONTENT_ID_PATTERN),
    current_user: User = Depends(get_current_active_user),
):
    """Remove content from playlist."""
    user_id = str(current_user.id)
    playlist = await UserPlaylist.find_one(UserPlaylist.user_id == user_id)

    if not playlist:
        raise HTTPException(status_code=404, detail="Not in playlist")

    original_count = len(playlist.items)
    playlist.items = [i for i in playlist.items if i.content_id != content_id]

    if len(playlist.items) == original_count:
        raise HTTPException(status_code=404, detail="Not in playlist")

    playlist.recalculate_positions()
    playlist.updated_at = datetime.utcnow()
    await playlist.save()

    logger.info(
        "Playlist item removed via API",
        extra={"user_id": user_id, "content_id": content_id},
    )
    return {
        "message": "Removed from playlist",
        "item_count": len(playlist.items),
        "items": [enrich_playlist_item(i) for i in playlist.items],
    }


@router.delete("")
async def clear_playlist(
    current_user: User = Depends(get_current_active_user),
):
    """Clear all items from playlist."""
    user_id = str(current_user.id)
    playlist = await UserPlaylist.find_one(UserPlaylist.user_id == user_id)

    if playlist:
        playlist.items = []
        playlist.updated_at = datetime.utcnow()
        await playlist.save()

    logger.info("Playlist cleared via API", extra={"user_id": user_id})
    return {"message": "Playlist cleared", "item_count": 0, "items": []}


@router.put("/items/reorder")
async def reorder_playlist_item(
    data: PlaylistReorderRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Reorder an item in the playlist."""
    user_id = str(current_user.id)
    playlist = await UserPlaylist.find_one(UserPlaylist.user_id == user_id)

    if not playlist:
        raise HTTPException(status_code=404, detail="Playlist not found")

    item_idx = next(
        (i for i, item in enumerate(playlist.items) if item.content_id == data.content_id),
        None,
    )
    if item_idx is None:
        raise HTTPException(status_code=404, detail="Item not in playlist")

    new_pos = max(0, min(data.new_position, len(playlist.items) - 1))
    item = playlist.items.pop(item_idx)
    playlist.items.insert(new_pos, item)

    playlist.recalculate_positions()
    playlist.updated_at = datetime.utcnow()
    await playlist.save()

    logger.info(
        "Playlist reordered via API",
        extra={"user_id": user_id, "content_id": data.content_id, "new_position": new_pos},
    )
    return {
        "message": "Reordered",
        "item_count": len(playlist.items),
        "items": [enrich_playlist_item(i) for i in playlist.items],
    }
