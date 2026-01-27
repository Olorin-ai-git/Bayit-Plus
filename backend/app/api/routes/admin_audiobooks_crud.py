"""
Admin Audiobooks CRUD Operations

Create, Read, Update, Delete endpoints for audiobooks.
All operations require appropriate admin permissions.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.models.admin import AuditAction, Permission
from app.models.content import Content
from app.models.user import User
from app.api.routes.admin_content_utils import has_permission, log_audit
from app.api.routes.audiobook_schemas import (
    AudiobookCreateRequest,
    AudiobookUpdateRequest,
    AudiobookAdminListResponse,
    AudiobookAdminResponse,
)
from app.api.routes.audiobook_utils import audiobook_to_admin_response

router = APIRouter()


@router.post("/audiobooks", response_model=AudiobookAdminResponse, status_code=status.HTTP_201_CREATED)
async def create_audiobook(
    request_data: AudiobookCreateRequest,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
    request: Request = None,
):
    """Create a new audiobook."""
    audiobook = Content(
        title=request_data.title,
        author=request_data.author,
        narrator=request_data.narrator,
        description=request_data.description,
        duration=request_data.duration,
        year=request_data.year,
        rating=request_data.rating,
        thumbnail=request_data.thumbnail,
        backdrop=request_data.backdrop,
        stream_url=request_data.stream_url,
        stream_type=request_data.stream_type,
        is_drm_protected=request_data.is_drm_protected,
        drm_key_id=request_data.drm_key_id,
        content_format="audiobook",
        audio_quality=request_data.audio_quality,
        isbn=request_data.isbn,
        book_edition=request_data.book_edition,
        publisher_name=request_data.publisher_name,
        section_ids=request_data.section_ids,
        primary_section_id=request_data.primary_section_id,
        genre_ids=request_data.genre_ids,
        audience_id=request_data.audience_id,
        topic_tags=request_data.topic_tags,
        requires_subscription=request_data.requires_subscription,
        visibility_mode=request_data.visibility_mode,
        is_published=request_data.is_published,
    )
    await audiobook.insert()

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.AUDIOBOOK_CREATED,
        resource_type="audiobook",
        resource_id=str(audiobook.id),
        details={
            "title": audiobook.title,
            "author": audiobook.author,
            "narrator": audiobook.narrator,
            "requires_subscription": audiobook.requires_subscription,
            "visibility_mode": audiobook.visibility_mode,
        },
        request=request,
    )

    return audiobook_to_admin_response(audiobook)


@router.get("/audiobooks", response_model=AudiobookAdminListResponse)
async def list_audiobooks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=500),
    is_published: Optional[bool] = None,
    author: Optional[str] = Query(None, description="Filter by author"),
    narrator: Optional[str] = Query(None, description="Filter by narrator"),
    audio_quality: Optional[str] = Query(None, description="Filter by audio quality"),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """List audiobooks with pagination and filtering."""
    filters = {"content_format": "audiobook"}
    if is_published is not None:
        filters["is_published"] = is_published
    if author:
        filters["author"] = {"$regex": author, "$options": "i"}
    if narrator:
        filters["narrator"] = {"$regex": narrator, "$options": "i"}
    if audio_quality:
        filters["audio_quality"] = audio_quality

    query = Content.find(filters)
    total = await query.count()
    skip = (page - 1) * page_size
    items = await query.sort([("created_at", -1)]).skip(skip).limit(page_size).to_list()

    return AudiobookAdminListResponse(
        items=[audiobook_to_admin_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/audiobooks/{audiobook_id}", response_model=AudiobookAdminResponse)
async def get_audiobook(
    audiobook_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get single audiobook details."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    return audiobook_to_admin_response(audiobook)


@router.patch("/audiobooks/{audiobook_id}", response_model=AudiobookAdminResponse)
async def update_audiobook(
    audiobook_id: str,
    request_data: AudiobookUpdateRequest,
    current_user: User = Depends(has_permission(Permission.CONTENT_UPDATE)),
    request: Request = None,
):
    """Update audiobook details."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    update_data = request_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(audiobook, field, value)

    audiobook.updated_at = datetime.utcnow()
    await audiobook.save()

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.AUDIOBOOK_UPDATED,
        resource_type="audiobook",
        resource_id=audiobook_id,
        details={
            "title": audiobook.title,
            "author": audiobook.author,
            "updated_fields": list(update_data.keys()),
        },
        request=request,
    )

    return audiobook_to_admin_response(audiobook)


@router.delete("/audiobooks/{audiobook_id}")
async def delete_audiobook(
    audiobook_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_DELETE)),
    request: Request = None,
):
    """Delete an audiobook."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.AUDIOBOOK_DELETED,
        resource_type="audiobook",
        resource_id=audiobook_id,
        details={
            "title": audiobook.title,
            "author": audiobook.author,
        },
        request=request,
    )

    await audiobook.delete()

    return {"message": "Audiobook deleted successfully"}
