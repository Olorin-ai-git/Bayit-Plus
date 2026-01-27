"""
Audiobooks Routes

User-facing audiobook discovery and admin playback endpoints.
Non-admin users can view audiobook metadata, but streaming is admin-only.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.core.security import get_current_active_user, get_current_admin_user, verify_content_access
from app.models.admin import AuditAction
from app.models.content import Content
from app.models.user import User
from app.api.routes.admin_content_utils import log_audit

router = APIRouter()


# ============ REQUEST/RESPONSE SCHEMAS ============


class AudiobookResponse(BaseModel):
    """User-safe audiobook response (no stream_url)."""
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
    requires_subscription: str = "basic"
    content_format: str = "audiobook"
    audio_quality: Optional[str] = None
    isbn: Optional[str] = None
    book_edition: Optional[str] = None
    publisher_name: Optional[str] = None
    view_count: int = 0
    avg_rating: float = 0.0
    is_featured: bool = False
    created_at: datetime
    updated_at: datetime


class AudiobookAdminStreamResponse(BaseModel):
    """Admin stream response with stream_url."""
    id: str
    title: str
    author: Optional[str] = None
    narrator: Optional[str] = None
    stream_url: str
    stream_type: str = "hls"
    duration: Optional[str] = None
    audio_quality: Optional[str] = None
    is_drm_protected: bool = False


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
    is_published: bool = True


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


# ============ USER-FACING ENDPOINTS ============


@router.get("/audiobooks")
async def get_audiobooks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=500),
    current_user: Optional[User] = Depends(get_current_active_user),
):
    """Get featured and trending audiobooks with pagination."""
    query = Content.find({"content_format": "audiobook", "is_published": True})

    if not current_user or not current_user.is_admin_user():
        query = query.find({"visibility_mode": {"$in": ["public", "passkey_protected"]}})

    total = await query.count()
    skip = (page - 1) * page_size
    items = await query.sort(
        [("is_featured", -1), ("featured_order.audiobooks", -1), ("created_at", -1)]
    ).skip(skip).limit(page_size).to_list()

    audiobooks = [
        AudiobookResponse(
            id=str(item.id),
            title=item.title,
            author=item.author,
            narrator=item.narrator,
            description=item.description,
            duration=item.duration,
            thumbnail=item.thumbnail or item.thumbnail_data,
            backdrop=item.backdrop or item.backdrop_data,
            year=item.year,
            rating=item.rating,
            genre_ids=[str(g) for g in item.genre_ids],
            audience_id=str(item.audience_id) if item.audience_id else None,
            requires_subscription=item.requires_subscription,
            content_format=item.content_format,
            audio_quality=item.audio_quality,
            isbn=item.isbn,
            book_edition=item.book_edition,
            publisher_name=item.publisher_name,
            view_count=item.view_count,
            avg_rating=item.avg_rating,
            is_featured=item.is_featured,
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


@router.get("/audiobooks/{audiobook_id}")
async def get_audiobook(
    audiobook_id: str,
    current_user: Optional[User] = Depends(get_current_active_user),
):
    """Get single audiobook metadata."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    await verify_content_access(audiobook, current_user, action="view")

    return AudiobookResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        description=audiobook.description,
        duration=audiobook.duration,
        thumbnail=audiobook.thumbnail or audiobook.thumbnail_data,
        backdrop=audiobook.backdrop or audiobook.backdrop_data,
        year=audiobook.year,
        rating=audiobook.rating,
        genre_ids=[str(g) for g in audiobook.genre_ids],
        audience_id=str(audiobook.audience_id) if audiobook.audience_id else None,
        requires_subscription=audiobook.requires_subscription,
        content_format=audiobook.content_format,
        audio_quality=audiobook.audio_quality,
        isbn=audiobook.isbn,
        book_edition=audiobook.book_edition,
        publisher_name=audiobook.publisher_name,
        view_count=audiobook.view_count,
        avg_rating=audiobook.avg_rating,
        is_featured=audiobook.is_featured,
        created_at=audiobook.created_at,
        updated_at=audiobook.updated_at,
    )


# ============ ADMIN PLAYBACK ENDPOINT ============


@router.post("/audiobooks/{audiobook_id}/stream")
async def get_audiobook_stream(
    audiobook_id: str,
    current_user: User = Depends(get_current_admin_user),
    request: Request = None,
):
    """Get audiobook stream URL (admin-only endpoint)."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    await verify_content_access(audiobook, current_user, action="stream")

    await log_audit(
        user_id=str(current_user.id),
        action=AuditAction.AUDIOBOOK_STREAM_STARTED,
        resource_type="audiobook",
        resource_id=audiobook_id,
        details={
            "title": audiobook.title,
            "author": audiobook.author,
            "narrator": audiobook.narrator,
        },
        request=request,
    )

    audiobook.view_count = audiobook.view_count + 1
    await audiobook.save()

    return AudiobookAdminStreamResponse(
        id=str(audiobook.id),
        title=audiobook.title,
        author=audiobook.author,
        narrator=audiobook.narrator,
        stream_url=audiobook.stream_url,
        stream_type=audiobook.stream_type,
        duration=audiobook.duration,
        audio_quality=audiobook.audio_quality,
        is_drm_protected=audiobook.is_drm_protected,
    )
