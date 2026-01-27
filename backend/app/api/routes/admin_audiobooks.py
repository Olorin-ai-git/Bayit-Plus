"""
Admin Audiobooks Management Routes

CRUD operations and management for audiobooks.
Admin-only endpoints requiring appropriate permissions.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.core.security import get_current_active_user
from app.models.admin import AuditAction, Permission
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.user import User
from app.api.routes.admin_content_utils import has_permission, log_audit

router = APIRouter()


# ============ REQUEST/RESPONSE SCHEMAS ============


class AudiobookCreateRequest(BaseModel):
    """Request model for creating an audiobook."""
    title: str = Field(..., min_length=1, max_length=500)
    author: str = Field(..., min_length=1, max_length=300)
    narrator: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[float] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    stream_url: str = Field(..., min_length=1)
    stream_type: str = "hls"
    is_drm_protected: bool = False
    drm_key_id: Optional[str] = None
    audio_quality: Optional[str] = None
    isbn: Optional[str] = None
    book_edition: Optional[str] = None
    publisher_name: Optional[str] = None
    section_ids: list[str] = Field(default_factory=list)
    primary_section_id: Optional[str] = None
    genre_ids: list[str] = Field(default_factory=list)
    audience_id: Optional[str] = None
    topic_tags: list[str] = Field(default_factory=list)
    requires_subscription: str = "basic"
    visibility_mode: str = "public"
    is_published: bool = False


class AudiobookUpdateRequest(BaseModel):
    """Request model for updating an audiobook."""
    title: Optional[str] = None
    author: Optional[str] = None
    narrator: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[float] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    stream_url: Optional[str] = None
    stream_type: Optional[str] = None
    is_drm_protected: Optional[bool] = None
    audio_quality: Optional[str] = None
    isbn: Optional[str] = None
    book_edition: Optional[str] = None
    publisher_name: Optional[str] = None
    genre_ids: Optional[list[str]] = None
    audience_id: Optional[str] = None
    topic_tags: Optional[list[str]] = None
    requires_subscription: Optional[str] = None
    visibility_mode: Optional[str] = None
    section_ids: Optional[list[str]] = None
    primary_section_id: Optional[str] = None


class AudiobookResponse(BaseModel):
    """Response model for audiobook with all fields."""
    id: str
    title: str
    author: Optional[str] = None
    narrator: Optional[str] = None
    description: Optional[str] = None
    duration: Optional[str] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[float] = None
    genre_ids: list[str] = Field(default_factory=list)
    audience_id: Optional[str] = None
    section_ids: list[str] = Field(default_factory=list)
    primary_section_id: Optional[str] = None
    requires_subscription: str = "basic"
    content_format: str = "audiobook"
    audio_quality: Optional[str] = None
    isbn: Optional[str] = None
    book_edition: Optional[str] = None
    publisher_name: Optional[str] = None
    is_published: bool = False
    is_featured: bool = False
    visibility_mode: str = "public"
    view_count: int = 0
    avg_rating: float = 0.0
    created_at: datetime
    updated_at: datetime


# ============ ADMIN CRUD ENDPOINTS ============


@router.post("/audiobooks", response_model=AudiobookResponse)
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

    return AudiobookResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        description=audiobook.description,
        duration=audiobook.duration,
        thumbnail=audiobook.thumbnail,
        backdrop=audiobook.backdrop,
        year=audiobook.year,
        rating=audiobook.rating,
        genre_ids=[str(g) for g in audiobook.genre_ids],
        audience_id=str(audiobook.audience_id) if audiobook.audience_id else None,
        section_ids=[str(s) for s in audiobook.section_ids],
        primary_section_id=str(audiobook.primary_section_id) if audiobook.primary_section_id else None,
        requires_subscription=audiobook.requires_subscription,
        content_format=audiobook.content_format,
        audio_quality=audiobook.audio_quality,
        isbn=audiobook.isbn,
        book_edition=audiobook.book_edition,
        publisher_name=audiobook.publisher_name,
        is_published=audiobook.is_published,
        is_featured=audiobook.is_featured,
        visibility_mode=audiobook.visibility_mode,
        view_count=audiobook.view_count,
        avg_rating=audiobook.avg_rating,
        created_at=audiobook.created_at,
        updated_at=audiobook.updated_at,
    )


@router.get("/audiobooks", response_model=dict)
async def list_audiobooks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=500),
    is_published: Optional[bool] = None,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """List all audiobooks with pagination."""
    query = Content.find({"content_format": "audiobook"})

    if is_published is not None:
        query = query.find({"is_published": is_published})

    total = await query.count()
    skip = (page - 1) * page_size
    items = await query.sort([("created_at", -1)]).skip(skip).limit(page_size).to_list()

    audiobooks = [
        AudiobookResponse(
            id=str(item.id),
            title=item.title,
            author=item.author,
            narrator=item.narrator,
            description=item.description,
            duration=item.duration,
            thumbnail=item.thumbnail,
            backdrop=item.backdrop,
            year=item.year,
            rating=item.rating,
            genre_ids=[str(g) for g in item.genre_ids],
            audience_id=str(item.audience_id) if item.audience_id else None,
            section_ids=[str(s) for s in item.section_ids],
            primary_section_id=str(item.primary_section_id) if item.primary_section_id else None,
            requires_subscription=item.requires_subscription,
            content_format=item.content_format,
            audio_quality=item.audio_quality,
            isbn=item.isbn,
            book_edition=item.book_edition,
            publisher_name=item.publisher_name,
            is_published=item.is_published,
            is_featured=item.is_featured,
            visibility_mode=item.visibility_mode,
            view_count=item.view_count,
            avg_rating=item.avg_rating,
            created_at=item.created_at,
            updated_at=item.updated_at,
        )
        for item in items
    ]

    return {
        "items": audiobooks,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/audiobooks/{audiobook_id}", response_model=AudiobookResponse)
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

    return AudiobookResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        description=audiobook.description,
        duration=audiobook.duration,
        thumbnail=audiobook.thumbnail,
        backdrop=audiobook.backdrop,
        year=audiobook.year,
        rating=audiobook.rating,
        genre_ids=[str(g) for g in audiobook.genre_ids],
        audience_id=str(audiobook.audience_id) if audiobook.audience_id else None,
        section_ids=[str(s) for s in audiobook.section_ids],
        primary_section_id=str(audiobook.primary_section_id) if audiobook.primary_section_id else None,
        requires_subscription=audiobook.requires_subscription,
        content_format=audiobook.content_format,
        audio_quality=audiobook.audio_quality,
        isbn=audiobook.isbn,
        book_edition=audiobook.book_edition,
        publisher_name=audiobook.publisher_name,
        is_published=audiobook.is_published,
        is_featured=audiobook.is_featured,
        visibility_mode=audiobook.visibility_mode,
        view_count=audiobook.view_count,
        avg_rating=audiobook.avg_rating,
        created_at=audiobook.created_at,
        updated_at=audiobook.updated_at,
    )


@router.patch("/audiobooks/{audiobook_id}", response_model=AudiobookResponse)
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

    return AudiobookResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        description=audiobook.description,
        duration=audiobook.duration,
        thumbnail=audiobook.thumbnail,
        backdrop=audiobook.backdrop,
        year=audiobook.year,
        rating=audiobook.rating,
        genre_ids=[str(g) for g in audiobook.genre_ids],
        audience_id=str(audiobook.audience_id) if audiobook.audience_id else None,
        section_ids=[str(s) for s in audiobook.section_ids],
        primary_section_id=str(audiobook.primary_section_id) if audiobook.primary_section_id else None,
        requires_subscription=audiobook.requires_subscription,
        content_format=audiobook.content_format,
        audio_quality=audiobook.audio_quality,
        isbn=audiobook.isbn,
        book_edition=audiobook.book_edition,
        publisher_name=audiobook.publisher_name,
        is_published=audiobook.is_published,
        is_featured=audiobook.is_featured,
        visibility_mode=audiobook.visibility_mode,
        view_count=audiobook.view_count,
        avg_rating=audiobook.avg_rating,
        created_at=audiobook.created_at,
        updated_at=audiobook.updated_at,
    )


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


# ============ ADMIN MANAGEMENT ENDPOINTS ============


@router.post("/audiobooks/{audiobook_id}/publish", response_model=AudiobookResponse)
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

    return AudiobookResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        description=audiobook.description,
        duration=audiobook.duration,
        thumbnail=audiobook.thumbnail,
        backdrop=audiobook.backdrop,
        year=audiobook.year,
        rating=audiobook.rating,
        genre_ids=[str(g) for g in audiobook.genre_ids],
        audience_id=str(audiobook.audience_id) if audiobook.audience_id else None,
        section_ids=[str(s) for s in audiobook.section_ids],
        primary_section_id=str(audiobook.primary_section_id) if audiobook.primary_section_id else None,
        requires_subscription=audiobook.requires_subscription,
        content_format=audiobook.content_format,
        audio_quality=audiobook.audio_quality,
        isbn=audiobook.isbn,
        book_edition=audiobook.book_edition,
        publisher_name=audiobook.publisher_name,
        is_published=audiobook.is_published,
        is_featured=audiobook.is_featured,
        visibility_mode=audiobook.visibility_mode,
        view_count=audiobook.view_count,
        avg_rating=audiobook.avg_rating,
        created_at=audiobook.created_at,
        updated_at=audiobook.updated_at,
    )


@router.post("/audiobooks/{audiobook_id}/unpublish", response_model=AudiobookResponse)
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

    return AudiobookResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        description=audiobook.description,
        duration=audiobook.duration,
        thumbnail=audiobook.thumbnail,
        backdrop=audiobook.backdrop,
        year=audiobook.year,
        rating=audiobook.rating,
        genre_ids=[str(g) for g in audiobook.genre_ids],
        audience_id=str(audiobook.audience_id) if audiobook.audience_id else None,
        section_ids=[str(s) for s in audiobook.section_ids],
        primary_section_id=str(audiobook.primary_section_id) if audiobook.primary_section_id else None,
        requires_subscription=audiobook.requires_subscription,
        content_format=audiobook.content_format,
        audio_quality=audiobook.audio_quality,
        isbn=audiobook.isbn,
        book_edition=audiobook.book_edition,
        publisher_name=audiobook.publisher_name,
        is_published=audiobook.is_published,
        is_featured=audiobook.is_featured,
        visibility_mode=audiobook.visibility_mode,
        view_count=audiobook.view_count,
        avg_rating=audiobook.avg_rating,
        created_at=audiobook.created_at,
        updated_at=audiobook.updated_at,
    )


@router.post("/audiobooks/{audiobook_id}/feature")
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

    return {"message": "Audiobook featured successfully", "audiobook_id": audiobook_id}
