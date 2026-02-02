"""
Admin Subtitle Sync Routes
Endpoints for syncing Content.available_subtitle_languages with SubtitleTrackDoc
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_active_user
from app.models.user import User
from app.services.subtitle_sync_service import (
    sync_all_content_subtitle_languages,
    sync_content_subtitle_languages,
)

router = APIRouter(prefix="/admin/subtitles", tags=["admin", "subtitles"])
logger = logging.getLogger(__name__)


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
