"""
Admin Live Channel Management Routes - CRUD operations for live TV channels
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.models.admin import AuditAction, Permission
from app.models.content import LiveChannel
from app.models.user import User

from .admin_content_schemas import (LiveChannelCreateRequest,
                                    LiveChannelUpdateRequest)
from .admin_content_utils import has_permission, log_audit

router = APIRouter()


def _channel_dict(ch):
    return {
        "id": str(ch.id),
        "name": ch.name,
        "description": ch.description,
        "thumbnail": ch.thumbnail,
        "logo": ch.logo,
        "category": ch.category,
        "culture_id": ch.culture_id,
        "stream_url": ch.stream_url,
        "stream_type": ch.stream_type,
        "is_drm_protected": ch.is_drm_protected,
        "epg_source": ch.epg_source,
        "current_show": ch.current_show,
        "next_show": ch.next_show,
        "is_active": ch.is_active,
        "order": ch.order,
        "requires_subscription": ch.requires_subscription,
        "supports_live_subtitles": ch.supports_live_subtitles,
        "primary_language": ch.primary_language,
        "available_translation_languages": ch.available_translation_languages,
        "created_at": ch.created_at.isoformat(),
        "updated_at": ch.updated_at.isoformat(),
    }


@router.get("/live-channels")
async def get_live_channels(
    is_active: Optional[bool] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=100, le=500),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get all live channels with pagination."""
    query = LiveChannel.find()
    if is_active is not None:
        query = query.find(LiveChannel.is_active == is_active)
    total = await query.count()
    items = (
        await query.sort(LiveChannel.order)
        .skip((page - 1) * page_size)
        .limit(page_size)
        .to_list()
    )
    return {
        "items": [_channel_dict(item) for item in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/live-channels/{channel_id}")
async def get_live_channel(
    channel_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get single live channel by ID."""
    try:
        channel = await LiveChannel.get(channel_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Channel not found")
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    return _channel_dict(channel)


@router.post("/live-channels")
async def create_live_channel(
    data: LiveChannelCreateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Create new live channel."""
    channel = LiveChannel(
        name=data.name,
        description=data.description,
        thumbnail=data.thumbnail,
        logo=data.logo,
        category=data.category,
        culture_id=data.culture_id,
        stream_url=data.stream_url,
        stream_type=data.stream_type,
        is_drm_protected=data.is_drm_protected,
        epg_source=data.epg_source,
        current_show=data.current_show,
        next_show=data.next_show,
        is_active=data.is_active,
        order=data.order,
        requires_subscription=data.requires_subscription,
        supports_live_subtitles=data.supports_live_subtitles,
        primary_language=data.primary_language,
        available_translation_languages=data.available_translation_languages,
    )
    await channel.insert()
    await log_audit(
        str(current_user.id),
        AuditAction.LIVE_CHANNEL_CREATED,
        "live_channel",
        str(channel.id),
        {"name": channel.name, "culture_id": channel.culture_id},
        request,
    )
    return {"id": str(channel.id), "name": channel.name}


@router.patch("/live-channels/{channel_id}")
async def update_live_channel(
    channel_id: str,
    data: LiveChannelUpdateRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Update live channel fields."""
    try:
        channel = await LiveChannel.get(channel_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Channel not found")
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    changes = {}
    if data.name is not None:
        changes["name"] = {"old": channel.name, "new": data.name}
        channel.name = data.name
    if data.description is not None:
        changes["description"] = {"old": channel.description, "new": data.description}
        channel.description = data.description
    if data.thumbnail is not None:
        changes["thumbnail"] = {"changed": True}
        channel.thumbnail = data.thumbnail
    if data.logo is not None:
        changes["logo"] = {"changed": True}
        channel.logo = data.logo
    if data.category is not None:
        changes["category"] = {"old": channel.category, "new": data.category}
        channel.category = data.category
    if data.culture_id is not None:
        changes["culture_id"] = {"old": channel.culture_id, "new": data.culture_id}
        channel.culture_id = data.culture_id
    if data.stream_url is not None:
        changes["stream_url"] = {"changed": True}
        channel.stream_url = data.stream_url
    if data.stream_type is not None:
        changes["stream_type"] = {"old": channel.stream_type, "new": data.stream_type}
        channel.stream_type = data.stream_type
    if data.is_drm_protected is not None:
        changes["is_drm_protected"] = {
            "old": channel.is_drm_protected,
            "new": data.is_drm_protected,
        }
        channel.is_drm_protected = data.is_drm_protected
    if data.epg_source is not None:
        changes["epg_source"] = {"old": channel.epg_source, "new": data.epg_source}
        channel.epg_source = data.epg_source
    if data.current_show is not None:
        changes["current_show"] = {
            "old": channel.current_show,
            "new": data.current_show,
        }
        channel.current_show = data.current_show
    if data.next_show is not None:
        changes["next_show"] = {"old": channel.next_show, "new": data.next_show}
        channel.next_show = data.next_show
    if data.is_active is not None:
        changes["is_active"] = {"old": channel.is_active, "new": data.is_active}
        channel.is_active = data.is_active
    if data.order is not None:
        changes["order"] = {"old": channel.order, "new": data.order}
        channel.order = data.order
    if data.requires_subscription is not None:
        changes["requires_subscription"] = {
            "old": channel.requires_subscription,
            "new": data.requires_subscription,
        }
        channel.requires_subscription = data.requires_subscription
    if data.supports_live_subtitles is not None:
        changes["supports_live_subtitles"] = {
            "old": channel.supports_live_subtitles,
            "new": data.supports_live_subtitles,
        }
        channel.supports_live_subtitles = data.supports_live_subtitles
    if data.primary_language is not None:
        changes["primary_language"] = {
            "old": channel.primary_language,
            "new": data.primary_language,
        }
        channel.primary_language = data.primary_language
    if data.available_translation_languages is not None:
        changes["available_translation_languages"] = {
            "old": channel.available_translation_languages,
            "new": data.available_translation_languages,
        }
        channel.available_translation_languages = data.available_translation_languages
    channel.updated_at = datetime.utcnow()
    await channel.save()
    await log_audit(
        str(current_user.id),
        AuditAction.LIVE_CHANNEL_UPDATED,
        "live_channel",
        channel_id,
        changes,
        request,
    )
    return {"message": "Channel updated", "id": channel_id}


@router.delete("/live-channels/{channel_id}")
async def delete_live_channel(
    channel_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
):
    """Delete live channel."""
    try:
        channel = await LiveChannel.get(channel_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Channel not found")
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")
    await log_audit(
        str(current_user.id),
        AuditAction.LIVE_CHANNEL_DELETED,
        "live_channel",
        channel_id,
        {"name": channel.name},
        request,
    )
    await channel.delete()
    return {"message": "Channel deleted"}


@router.post("/live-channels/reorder")
async def reorder_live_channels(
    order_data: dict,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Reorder live channels by dragging (bulk update)."""
    for cid, pos in order_data.items():
        try:
            if ch := await LiveChannel.get(cid):
                ch.order = pos
                await ch.save()
        except Exception:
            pass
    await log_audit(
        str(current_user.id),
        AuditAction.LIVE_CHANNEL_UPDATED,
        "live_channel",
        None,
        {"action": "bulk_reorder", "count": len(order_data)},
        request,
    )
    return {"message": "Channels reordered"}
