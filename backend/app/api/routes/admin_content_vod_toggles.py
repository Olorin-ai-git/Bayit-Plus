"""
Admin VOD Content Toggle Endpoints
Handle publish/feature status toggles for VOD content
"""

import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request

from app.models.admin import AuditAction, Permission
from app.models.content import Content
from app.models.user import User

from .admin_content_utils import has_permission, log_audit

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/content/{content_id}/publish")
async def toggle_content_publish(
    content_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Toggle content publish status."""
    try:
        content = await Content.get(content_id)
    except Exception as e:
        logger.error(f"Error fetching content {content_id}: {e}")
        raise HTTPException(status_code=404, detail=f"Content not found: {content_id}")
    if not content:
        raise HTTPException(status_code=404, detail=f"Content not found: {content_id}")

    try:
        content.is_published = not content.is_published
        if content.is_published and not content.published_at:
            content.published_at = datetime.utcnow()
        content.updated_at = datetime.utcnow()
        await content.save()

        action = (
            AuditAction.CONTENT_PUBLISHED
            if content.is_published
            else AuditAction.CONTENT_UNPUBLISHED
        )
        await log_audit(
            str(current_user.id),
            action,
            "content",
            content_id,
            {"title": content.title, "is_published": content.is_published},
            request,
        )
        return {
            "message": f"Content {'published' if content.is_published else 'unpublished'}",
            "is_published": content.is_published,
        }
    except Exception as e:
        logger.error(f"Error toggling publish status for {content_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to toggle publish status: {str(e)}"
        )


@router.post("/content/{content_id}/feature")
async def toggle_content_feature(
    content_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
):
    """Toggle content featured status."""
    try:
        content = await Content.get(content_id)
    except Exception as e:
        logger.error(f"Error fetching content {content_id}: {e}")
        raise HTTPException(status_code=404, detail=f"Content not found: {content_id}")
    if not content:
        raise HTTPException(status_code=404, detail=f"Content not found: {content_id}")

    try:
        content.is_featured = not content.is_featured
        content.updated_at = datetime.utcnow()
        await content.save()
        await log_audit(
            str(current_user.id),
            AuditAction.CONTENT_UPDATED,
            "content",
            content_id,
            {"title": content.title, "is_featured": content.is_featured},
            request,
        )
        return {
            "message": f"Content {'featured' if content.is_featured else 'unfeatured'}",
            "is_featured": content.is_featured,
        }
    except Exception as e:
        logger.error(f"Error toggling featured status for {content_id}: {e}")
        raise HTTPException(
            status_code=500, detail=f"Failed to toggle featured status: {str(e)}"
        )
