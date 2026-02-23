"""
Admin Subtitle Sync Routes
Endpoints for syncing Content.available_subtitle_languages with SubtitleTrackDoc
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.logging_config import get_logger
from app.core.security import get_current_active_user
from app.models.content import Content
from app.models.user import User
from app.services.subtitle_sync_service import (
    sync_all_content_subtitle_languages,
    sync_content_subtitle_languages,
)

router = APIRouter(prefix="/admin/subtitles", tags=["admin", "subtitles"])
logger = get_logger(__name__)


@router.post("/sync/{content_id}")
async def sync_subtitle_languages(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Sync available_subtitle_languages for specific content.
    Admin only endpoint.
    """
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    result = await sync_content_subtitle_languages(content_id)

    if not result.get("success"):
        raise HTTPException(
            status_code=400,
            detail=result.get("error", "Sync failed")
        )

    return result


@router.post("/sync-all")
async def sync_all_subtitle_languages(
    limit: Optional[int] = Query(
        default=None,
        description="Optional limit on number of items to sync"
    ),
    dry_run: bool = Query(
        default=False,
        description="If true, only report what would change without updating"
    ),
    current_user: User = Depends(get_current_active_user),
):
    """
    Sync available_subtitle_languages for all content.
    Admin only endpoint.

    Args:
        limit: Optional limit on number of items to sync (for testing)
        dry_run: If true, reports changes without updating database

    Returns:
        Statistics about sync operation including details of changes
    """
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    logger.info(
        f"Starting bulk subtitle sync (dry_run={dry_run}, limit={limit})",
        extra={
            "user_id": str(current_user.id),
            "dry_run": dry_run,
            "limit": limit
        }
    )

    result = await sync_all_content_subtitle_languages(
        limit=limit,
        dry_run=dry_run
    )

    if "error" in result:
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Bulk sync failed")
        )

    return result


@router.patch("/offset/{content_id}")
async def set_subtitle_time_offset(
    content_id: str,
    offset_seconds: float = Query(
        ...,
        description="Seconds to subtract from subtitle cue times (0 to clear)"
    ),
    current_user: User = Depends(get_current_active_user),
):
    """
    Set subtitle_time_offset for multi-part movie content.

    Used when subtitles were imported for the full movie but the video
    file is split (e.g. LOTR Extended Edition PT.2). The offset equals
    the duration of all preceding parts so cues align with 0:00 playback.

    Args:
        content_id: Content document ID
        offset_seconds: Seconds to subtract (0 clears the offset)
    """
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    if offset_seconds < 0:
        raise HTTPException(
            status_code=400,
            detail="offset_seconds must be >= 0"
        )

    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    previous_offset = content.subtitle_time_offset
    content.subtitle_time_offset = offset_seconds if offset_seconds > 0 else None
    content.updated_at = datetime.utcnow()
    await content.save()

    logger.info(
        "Subtitle time offset updated",
        extra={
            "content_id": content_id,
            "title": content.title,
            "previous_offset": previous_offset,
            "new_offset": content.subtitle_time_offset,
            "admin_user": str(current_user.id),
        },
    )

    return {
        "content_id": content_id,
        "title": content.title,
        "subtitle_time_offset": content.subtitle_time_offset,
        "previous_offset": previous_offset,
    }
