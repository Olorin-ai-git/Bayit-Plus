"""
Playlist REST API
Unified playlist endpoints (merged watchlist + ordered playback queue).
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.playlist import (
    CONTENT_ID_PATTERN,
    ContentType,
    PlaylistItem,
    get_next_position,
    recalculate_positions,
)
from app.models.user import User
from .playlist_helpers import (
    PlaylistAddRequest,
    PlaylistBulkAddRequest,
    PlaylistReorderRequest,
    PlaylistToggleRequest,
    enrich_playlist_item,
    get_content_metadata,
)

logger = get_logger(__name__)
router = APIRouter()


@router.get("")
async def get_playlist(
    content_type: Optional[str] = Query(None, description="Filter by content type"),
    current_user: User = Depends(get_current_active_user),
):
    """Get user's playlist with enriched content data."""
    user_id = str(current_user.id)
    query = {"user_id": user_id}

    if content_type:
        query["content_type"] = content_type

    items = (
        await PlaylistItem.find(query)
        .sort("position")
        .to_list()
    )

    return {"items": [enrich_playlist_item(item) for item in items]}


@router.post("/items")
async def add_to_playlist(
    data: PlaylistAddRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Add content to playlist."""
    if data.content_type == ContentType.RADIO:
        raise HTTPException(
            status_code=400,
            detail="Radio stations cannot be added to playlists",
        )

    user_id = str(current_user.id)

    existing = await PlaylistItem.find_one(
        PlaylistItem.user_id == user_id,
        PlaylistItem.content_id == data.content_id,
    )
    if existing:
        items = await _get_user_items(user_id)
        return {
            "message": "Already in playlist",
            "item_count": len(items),
            "items": [enrich_playlist_item(i) for i in items],
        }

    current_count = await PlaylistItem.find(
        PlaylistItem.user_id == user_id
    ).count()
    if current_count >= settings.PLAYLIST_MAX_ITEMS:
        raise HTTPException(
            status_code=400,
            detail=f"Playlist full ({settings.PLAYLIST_MAX_ITEMS} items max)",
        )

    content_meta = await get_content_metadata(data.content_id, data.content_type)
    if not content_meta:
        raise HTTPException(status_code=404, detail="Content not found")

    position = await get_next_position(user_id)
    new_item = PlaylistItem(
        user_id=user_id,
        content_id=data.content_id,
        content_type=data.content_type,
        title=content_meta["title"],
        thumbnail=content_meta.get("thumbnail"),
        duration=content_meta.get("duration"),
        position=position,
    )
    await new_item.insert()

    logger.info(
        "Playlist item added via API",
        extra={"user_id": user_id, "content_id": data.content_id},
    )

    items = await _get_user_items(user_id)
    return {
        "message": "Added to playlist",
        "item_count": len(items),
        "items": [enrich_playlist_item(i) for i in items],
    }


@router.delete("/items/{content_id}")
async def remove_from_playlist(
    content_id: str = Path(..., pattern=CONTENT_ID_PATTERN),
    current_user: User = Depends(get_current_active_user),
):
    """Remove content from playlist."""
    user_id = str(current_user.id)
    item = await PlaylistItem.find_one(
        PlaylistItem.user_id == user_id,
        PlaylistItem.content_id == content_id,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Not in playlist")

    await item.delete()
    await recalculate_positions(user_id)

    logger.info(
        "Playlist item removed via API",
        extra={"user_id": user_id, "content_id": content_id},
    )

    items = await _get_user_items(user_id)
    return {
        "message": "Removed from playlist",
        "item_count": len(items),
        "items": [enrich_playlist_item(i) for i in items],
    }


@router.delete("")
async def clear_playlist(
    current_user: User = Depends(get_current_active_user),
):
    """Clear all items from playlist."""
    user_id = str(current_user.id)
    await PlaylistItem.find(PlaylistItem.user_id == user_id).delete()

    logger.info("Playlist cleared via API", extra={"user_id": user_id})
    return {"message": "Playlist cleared", "item_count": 0, "items": []}


@router.post("/items/bulk")
async def bulk_add_to_playlist(
    data: PlaylistBulkAddRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Add multiple items to playlist in order.
    Useful for "Play All" in collections - clears playlist and adds all items.

    Args:
        data: Bulk add request with list of content IDs
        current_user: Authenticated user

    Returns:
        Updated playlist with all items
    """
    if data.content_type == ContentType.RADIO:
        raise HTTPException(
            status_code=400,
            detail="Radio stations cannot be added to playlists",
        )

    user_id = str(current_user.id)

    # Clear existing playlist
    await PlaylistItem.find(PlaylistItem.user_id == user_id).delete()
    logger.info(f"Cleared playlist for bulk add (user: {user_id})")

    # Add all items in order
    added_count = 0
    for position, content_id in enumerate(data.content_ids):
        content_meta = await get_content_metadata(content_id, data.content_type)
        if not content_meta:
            logger.warning(
                f"Content not found during bulk add: {content_id}"
            )
            continue

        new_item = PlaylistItem(
            user_id=user_id,
            content_id=content_id,
            content_type=data.content_type,
            title=content_meta["title"],
            thumbnail=content_meta.get("thumbnail"),
            duration=content_meta.get("duration"),
            position=position,
        )
        await new_item.insert()
        added_count += 1

    logger.info(
        f"Bulk added {added_count} items to playlist",
        extra={"user_id": user_id, "requested": len(data.content_ids)},
    )

    items = await _get_user_items(user_id)
    return {
        "message": f"Added {added_count} items to playlist",
        "item_count": len(items),
        "items": [enrich_playlist_item(i) for i in items],
    }


@router.put("/items/reorder")
async def reorder_playlist_item(
    data: PlaylistReorderRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Reorder an item in the playlist."""
    user_id = str(current_user.id)
    items = await _get_user_items(user_id)

    if not items:
        raise HTTPException(status_code=404, detail="Playlist not found")

    target = next(
        (i for i in items if i.content_id == data.content_id), None
    )
    if not target:
        raise HTTPException(status_code=404, detail="Item not in playlist")

    # Remove target from list, insert at new position
    items = [i for i in items if i.content_id != data.content_id]
    new_pos = max(0, min(data.new_position, len(items)))
    items.insert(new_pos, target)

    # Update positions for all items
    for idx, item in enumerate(items):
        if item.position != idx:
            item.position = idx
            await item.save()

    logger.info(
        "Playlist reordered via API",
        extra={
            "user_id": user_id,
            "content_id": data.content_id,
            "new_position": new_pos,
        },
    )

    return {
        "message": "Reordered",
        "item_count": len(items),
        "items": [enrich_playlist_item(i) for i in items],
    }


@router.get("/check/{content_id}")
async def check_playlist(
    content_id: str = Path(..., pattern=CONTENT_ID_PATTERN),
    current_user: User = Depends(get_current_active_user),
):
    """Check if content is in playlist."""
    item = await PlaylistItem.find_one(
        PlaylistItem.user_id == str(current_user.id),
        PlaylistItem.content_id == content_id,
    )
    return {"in_playlist": item is not None}


@router.post("/toggle/{content_id}")
async def toggle_playlist(
    content_id: str = Path(..., pattern=CONTENT_ID_PATTERN),
    data: Optional[PlaylistToggleRequest] = None,
    current_user: User = Depends(get_current_active_user),
):
    """Toggle playlist status for content."""
    user_id = str(current_user.id)
    content_type_str = data.content_type if data else "vod"

    if content_type_str == "radio":
        raise HTTPException(
            status_code=400,
            detail="Radio stations cannot be added to playlists",
        )

    existing = await PlaylistItem.find_one(
        PlaylistItem.user_id == user_id,
        PlaylistItem.content_id == content_id,
    )

    if existing:
        await existing.delete()
        await recalculate_positions(user_id)
        return {"in_playlist": False, "message": "Removed from playlist"}

    try:
        parsed_type = ContentType(content_type_str)
    except ValueError:
        parsed_type = ContentType.VOD

    content_meta = await get_content_metadata(content_id, parsed_type)
    title = content_meta["title"] if content_meta else content_id

    position = await get_next_position(user_id)
    new_item = PlaylistItem(
        user_id=user_id,
        content_id=content_id,
        content_type=parsed_type,
        title=title,
        thumbnail=content_meta.get("thumbnail") if content_meta else None,
        duration=content_meta.get("duration") if content_meta else None,
        position=position,
    )
    await new_item.insert()

    return {"in_playlist": True, "message": "Added to playlist"}


async def _get_user_items(user_id: str) -> list[PlaylistItem]:
    """Get sorted playlist items for a user."""
    return (
        await PlaylistItem.find(PlaylistItem.user_id == user_id)
        .sort("position")
        .to_list()
    )
