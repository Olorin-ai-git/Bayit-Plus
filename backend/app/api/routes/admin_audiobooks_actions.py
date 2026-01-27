"""
Admin Audiobooks Management Actions

Publish, unpublish, and feature operations for audiobooks.
All operations require appropriate admin permissions.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.models.admin import AuditAction, Permission
from app.models.content import Content
from app.models.user import User
from app.api.routes.admin_content_utils import has_permission, log_audit
from app.api.routes.audiobook_schemas import AudiobookAdminResponse, FeatureResponse
from app.api.routes.audiobook_utils import audiobook_to_admin_response

router = APIRouter()


@router.post("/audiobooks/{audiobook_id}/publish", response_model=AudiobookAdminResponse)
async def publish_audiobook(
    audiobook_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
    request: Request = None,
):
    """Publish an audiobook."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    audiobook.is_published = True
    audiobook.published_at = datetime.utcnow()
    audiobook.updated_at = datetime.utcnow()
    await audiobook.save()

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.AUDIOBOOK_PUBLISHED,
        resource_type="audiobook",
        resource_id=audiobook_id,
        details={
            "title": audiobook.title,
            "author": audiobook.author,
        },
        request=request,
    )

    return audiobook_to_admin_response(audiobook)


@router.post("/audiobooks/{audiobook_id}/unpublish", response_model=AudiobookAdminResponse)
async def unpublish_audiobook(
    audiobook_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
    request: Request = None,
):
    """Unpublish an audiobook."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    audiobook.is_published = False
    audiobook.updated_at = datetime.utcnow()
    await audiobook.save()

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.AUDIOBOOK_UNPUBLISHED,
        resource_type="audiobook",
        resource_id=audiobook_id,
        details={
            "title": audiobook.title,
            "author": audiobook.author,
        },
        request=request,
    )

    return audiobook_to_admin_response(audiobook)


@router.post("/audiobooks/{audiobook_id}/feature", response_model=FeatureResponse)
async def feature_audiobook(
    audiobook_id: str,
    section_id: Optional[str] = Query(None),
    order: int = Query(default=1, ge=1),
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
    request: Request = None,
):
    """Feature an audiobook in a section."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    if section_id:
        if not audiobook.featured_order:
            audiobook.featured_order = {}
        audiobook.featured_order[section_id] = order

    audiobook.is_featured = True
    audiobook.updated_at = datetime.utcnow()
    await audiobook.save()

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.AUDIOBOOK_FEATURED,
        resource_type="audiobook",
        resource_id=audiobook_id,
        details={
            "title": audiobook.title,
            "author": audiobook.author,
            "section_id": section_id,
            "order": order,
        },
        request=request,
    )

    return FeatureResponse(message="Audiobook featured successfully", audiobook_id=audiobook_id)
