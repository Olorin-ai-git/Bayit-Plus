import re
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_active_user, get_optional_user
from app.models.content import EPGEntry, LiveChannel
from app.models.user import User

router = APIRouter()

_CHANNEL_SORT_MAP = {
    "order": "order",
    "name": "name",
    "newest": "-created_at",
    "oldest": "created_at",
}


@router.get("/channels")
async def get_channels(
    culture_id: Optional[str] = Query(None, description="Filter by culture ID"),
    category: Optional[str] = Query(None, description="Filter by category"),
    q: Optional[str] = Query(None, description="Search by channel name"),
    language: Optional[str] = Query(None, description="Filter by language"),
    sort: str = Query("order", description="Sort: order, name, newest, oldest"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get live TV channels, optionally filtered by culture and category."""
    # Build query conditions
    query_conditions = {"is_active": True}

    if culture_id:
        query_conditions["culture_id"] = culture_id

    if category:
        query_conditions["category"] = category

    if language:
        query_conditions["primary_language"] = language

    if q and q.strip():
        escaped_q = re.escape(q.strip())
        query_conditions["$or"] = [
            {"name": {"$regex": escaped_q, "$options": "i"}},
            {"description": {"$regex": escaped_q, "$options": "i"}},
        ]

    sort_field = _CHANNEL_SORT_MAP.get(sort, "order")

    # Limit to 50 channels per request for memory safety
    channels = (
        await LiveChannel.find(query_conditions).sort(sort_field).limit(50).to_list()
    )

    return {
        "channels": [
            {
                "id": str(channel.id),
                "name": channel.name,
                "description": channel.description,
                "thumbnail": channel.thumbnail,
                "logo": channel.logo,
                "category": channel.category,
                "culture_id": channel.culture_id,
                "currentShow": channel.current_show,
                "nextShow": channel.next_show,
                "stream_type": channel.stream_type,
                "is_ai_enhanced": getattr(channel, "is_ai_enhanced", False),
                "ai_features": getattr(channel, "ai_features", []),
                "supports_pip_widget": getattr(channel, "supports_pip_widget", False),
            }
            for channel in channels
        ],
        "total": len(channels),
    }


@router.get("/{channel_id}")
async def get_channel(
    channel_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get channel details with schedule."""
    channel = await LiveChannel.get(channel_id)
    if not channel or not channel.is_active:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Get today's schedule
    now = datetime.utcnow()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    schedule = (
        await EPGEntry.find(
            {"channel_id": channel_id}, 
            EPGEntry.start_time >= today_start, 
            EPGEntry.start_time < today_end, 
        )
        .sort("start_time")
        .to_list()
    )

    return {
        "id": str(channel.id),
        "name": channel.name,
        "description": channel.description,
        "thumbnail": channel.thumbnail,
        "logo": channel.logo,
        "stream_url": channel.stream_url,
        "stream_type": channel.stream_type,
        "currentShow": channel.current_show,
        "nextShow": channel.next_show,
        "supports_live_subtitles": channel.supports_live_subtitles,
        "primary_language": channel.primary_language,
        "available_translation_languages": channel.available_translation_languages,
        "schedule": [
            {
                "title": entry.title,
                "description": entry.description,
                "time": entry.start_time.strftime("%H:%M"),
                "endTime": entry.end_time.strftime("%H:%M"),
                "isNow": entry.start_time <= now < entry.end_time,
            }
            for entry in schedule
        ],
    }


@router.get("/{channel_id}/epg")
async def get_epg(
    channel_id: str,
    date: Optional[str] = None,  # YYYY-MM-DD
):
    """Get EPG (Electronic Program Guide) for a channel."""
    channel = await LiveChannel.get(channel_id)
    if not channel:
        raise HTTPException(status_code=404, detail="Channel not found")

    if date:
        target_date = datetime.strptime(date, "%Y-%m-%d")
    else:
        target_date = datetime.utcnow()

    day_start = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    day_end = day_start + timedelta(days=1)

    entries = (
        await EPGEntry.find(
            {"channel_id": channel_id}, 
            EPGEntry.start_time >= day_start, 
            EPGEntry.start_time < day_end, 
        )
        .sort("start_time")
        .to_list()
    )

    now = datetime.utcnow()

    return {
        "channel_id": channel_id,
        "date": day_start.strftime("%Y-%m-%d"),
        "entries": [
            {
                "title": entry.title,
                "description": entry.description,
                "start": entry.start_time.isoformat(),
                "end": entry.end_time.isoformat(),
                "category": entry.category,
                "thumbnail": entry.thumbnail,
                "isNow": entry.start_time <= now < entry.end_time,
            }
            for entry in entries
        ],
    }


@router.get("/{channel_id}/stream")
async def get_stream_url(
    channel_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get live stream URL with subscription check based on channel requirements."""
    channel = await LiveChannel.get(channel_id)
    if not channel or not channel.is_active:
        raise HTTPException(status_code=404, detail="Channel not found")

    # Admin users bypass subscription checks
    is_admin = current_user.role in ["super_admin", "admin"]

    # Check channel subscription requirements (skip for admins)
    if not is_admin:
        required_tier = channel.requires_subscription or "basic"

        # If channel requires no subscription (free), allow access
        if required_tier != "none":
            user_tier = current_user.subscription_tier

            # Define tier levels
            tier_levels = {"basic": 1, "premium": 2, "family": 3}

            # Check if user has required tier
            if not user_tier or tier_levels.get(user_tier, 0) < tier_levels.get(
                required_tier, 1
            ):
                raise HTTPException(
                    status_code=403,
                    detail=f"This channel requires {required_tier} subscription",
                )

    # Handle YouTube playlist channels with synchronized playback
    if channel.stream_type == "youtube-playlist":
        from app.services.youtube_epg_sync_service import youtube_epg_sync_service

        program_info = await youtube_epg_sync_service.get_current_program(channel_id)

        if program_info and program_info.get("current_program"):
            current = program_info["current_program"]
            next_prog = program_info.get("next_program")

            # Build dynamic stream URL with seek position
            youtube_id = current.get("youtube_id")
            seek_seconds = current.get("seek_to_seconds", 0)
            stream_url = (
                f"https://www.youtube.com/embed/{youtube_id}"
                f"?autoplay=1&enablejsapi=1&start={seek_seconds}"
            )

            return {
                "stream_url": stream_url,
                "stream_type": "youtube-playlist",
                "is_ai_enhanced": getattr(channel, "is_ai_enhanced", False),
                "ai_features": getattr(channel, "ai_features", []),
                "supports_pip_widget": getattr(channel, "supports_pip_widget", False),
                "current_program": {
                    "title": current.get("title"),
                    "title_en": current.get("title_en"),
                    "description": current.get("description"),
                    "youtube_id": youtube_id,
                    "started_at": current.get("started_at"),
                    "ends_at": current.get("ends_at"),
                    "seek_to_seconds": seek_seconds,
                    "thumbnail": current.get("thumbnail"),
                },
                "next_program": {
                    "title": next_prog.get("title"),
                    "title_en": next_prog.get("title_en"),
                    "youtube_id": next_prog.get("youtube_id"),
                    "starts_at": next_prog.get("starts_at"),
                } if next_prog else None,
                "attribution": getattr(channel, "attribution_text_en", None)
                    or getattr(channel, "attribution_text", None),
            }

    if not channel.stream_url:
        raise HTTPException(
            status_code=503,
            detail="Stream is temporarily unavailable for this channel",
        )

    return {
        "stream_url": channel.stream_url,
        "stream_type": channel.stream_type,
        "is_drm_protected": channel.is_drm_protected,
    }
