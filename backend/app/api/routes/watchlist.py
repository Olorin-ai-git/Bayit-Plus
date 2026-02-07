"""
Watchlist API - Deprecation Shim
Routes delegate to unified playlist. Includes Deprecation header for old clients.
"""

from fastapi import APIRouter, Depends, Response

from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.playlist import ContentType, PlaylistItem, get_next_position, recalculate_positions
from app.models.user import User
from app.api.routes.playlist_helpers import get_content_metadata

logger = get_logger(__name__)
router = APIRouter()

DEPRECATION_HEADER = "Use /api/v1/playlist instead. This endpoint will be removed."


def _add_deprecation(response: Response) -> None:
    response.headers["Deprecation"] = "true"
    response.headers["Sunset"] = "2026-06-01"
    response.headers["Link"] = '</api/v1/playlist>; rel="successor-version"'


@router.get("")
async def get_watchlist(
    response: Response,
    current_user: User = Depends(get_current_active_user),
):
    """Get user's watchlist (deprecated - use /playlist)."""
    _add_deprecation(response)
    user_id = str(current_user.id)
    items = await PlaylistItem.find(
        PlaylistItem.user_id == user_id
    ).sort("-added_at").to_list()

    result = []
    for item in items:
        content_meta = await get_content_metadata(
            item.content_id, item.content_type
        )
        if content_meta:
            data = {
                "id": item.content_id,
                "title": content_meta.get("title", item.title),
                "thumbnail": content_meta.get("thumbnail", item.thumbnail),
                "type": item.content_type.value,
                "addedAt": item.added_at.isoformat(),
            }
            if "duration" in content_meta and content_meta["duration"]:
                data["duration"] = content_meta["duration"]
            result.append(data)

    return {"items": result}


@router.post("")
async def add_to_watchlist(
    data: dict,
    response: Response,
    current_user: User = Depends(get_current_active_user),
):
    """Add to watchlist (deprecated - use /playlist/items)."""
    _add_deprecation(response)
    user_id = str(current_user.id)
    content_id = data.get("content_id", "")
    content_type_str = data.get("content_type", "vod")

    existing = await PlaylistItem.find_one(
        PlaylistItem.user_id == user_id,
        PlaylistItem.content_id == content_id,
    )
    if existing:
        return {"message": "Already in watchlist", "id": str(existing.id)}

    try:
        parsed_type = ContentType(content_type_str)
    except ValueError:
        parsed_type = ContentType.VOD

    content_meta = await get_content_metadata(content_id, parsed_type)
    title = content_meta["title"] if content_meta else content_id

    position = await get_next_position(user_id)
    item = PlaylistItem(
        user_id=user_id,
        content_id=content_id,
        content_type=parsed_type,
        title=title,
        thumbnail=content_meta.get("thumbnail") if content_meta else None,
        duration=content_meta.get("duration") if content_meta else None,
        position=position,
    )
    await item.insert()
    return {"message": "Added to watchlist", "id": str(item.id)}


@router.delete("/{content_id}")
async def remove_from_watchlist(
    content_id: str,
    response: Response,
    current_user: User = Depends(get_current_active_user),
):
    """Remove from watchlist (deprecated - use DELETE /playlist/items/{id})."""
    _add_deprecation(response)
    user_id = str(current_user.id)
    item = await PlaylistItem.find_one(
        PlaylistItem.user_id == user_id,
        PlaylistItem.content_id == content_id,
    )
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not in watchlist")

    await item.delete()
    await recalculate_positions(user_id)
    return {"message": "Removed from watchlist"}


@router.get("/check/{content_id}")
async def check_watchlist(
    content_id: str,
    response: Response,
    current_user: User = Depends(get_current_active_user),
):
    """Check watchlist status (deprecated - use GET /playlist/check/{id})."""
    _add_deprecation(response)
    item = await PlaylistItem.find_one(
        PlaylistItem.user_id == str(current_user.id),
        PlaylistItem.content_id == content_id,
    )
    return {"in_watchlist": item is not None}


@router.post("/toggle/{content_id}")
async def toggle_watchlist(
    content_id: str,
    response: Response,
    content_type: str = "vod",
    current_user: User = Depends(get_current_active_user),
):
    """Toggle watchlist (deprecated - use POST /playlist/toggle/{id})."""
    _add_deprecation(response)
    user_id = str(current_user.id)

    existing = await PlaylistItem.find_one(
        PlaylistItem.user_id == user_id,
        PlaylistItem.content_id == content_id,
    )

    if existing:
        await existing.delete()
        await recalculate_positions(user_id)
        return {"in_watchlist": False, "message": "Removed from watchlist"}

    try:
        parsed_type = ContentType(content_type)
    except ValueError:
        parsed_type = ContentType.VOD

    content_meta = await get_content_metadata(content_id, parsed_type)
    title = content_meta["title"] if content_meta else content_id

    position = await get_next_position(user_id)
    item = PlaylistItem(
        user_id=user_id,
        content_id=content_id,
        content_type=parsed_type,
        title=title,
        thumbnail=content_meta.get("thumbnail") if content_meta else None,
        duration=content_meta.get("duration") if content_meta else None,
        position=position,
    )
    await item.insert()
    return {"in_watchlist": True, "message": "Added to watchlist"}
