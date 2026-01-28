"""
Audiobooks Routes - User-facing audiobook discovery and admin playback endpoints.

Non-admin users can view audiobook metadata, but streaming is admin-only.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.security import (
    get_current_active_user,
    get_current_admin_user,
    get_optional_user,
    verify_content_access,
)
from app.models.admin import AuditAction
from app.models.content import Content
from app.models.user import User
from app.api.routes.admin_content_utils import log_audit
from app.api.routes.audiobook_schemas import (
    AudiobookChapterResponse,
    AudiobookListResponse,
    AudiobookStreamResponse,
    AudiobookWithChaptersResponse,
)
from app.api.routes.audiobook_utils import (
    audiobook_to_response,
    audiobook_to_stream_response,
)

router = APIRouter()


@router.get("", response_model=AudiobookListResponse)
async def get_audiobooks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=500),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get featured and trending audiobooks with pagination.

    Only returns parent audiobooks (those without series_id) to avoid
    showing individual chapters as separate cards. Filters out audiobooks
    with empty or missing titles (data quality check).
    """
    query = Content.find({
        "content_format": "audiobook",
        "is_published": True,
        "title": {"$exists": True, "$ne": "", "$ne": None},  # Filter out empty titles
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
        ],
    })

    if not current_user or not current_user.is_admin_user():
        query = query.find({"visibility_mode": {"$in": ["public", "passkey_protected"]}})

    total = await query.count()
    skip = (page - 1) * page_size
    items = await query.sort(
        [("is_featured", -1), ("featured_order.audiobooks", -1), ("created_at", -1)]
    ).skip(skip).limit(page_size).to_list()

    return AudiobookListResponse(
        items=[audiobook_to_response(item) for item in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{audiobook_id}")
async def get_audiobook(
    audiobook_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get single audiobook metadata."""
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    await verify_content_access(audiobook, current_user, action="view")
    return audiobook_to_response(audiobook)


@router.get("/{audiobook_id}/chapters", response_model=AudiobookWithChaptersResponse)
async def get_audiobook_with_chapters(
    audiobook_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get audiobook with its chapters for the player page.

    Returns parent audiobook metadata along with a list of chapters
    (parts) sorted by episode/chapter number.
    """
    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    await verify_content_access(audiobook, current_user, action="view")

    # Fetch chapters (items with series_id pointing to this audiobook)
    chapters_query = Content.find({
        "content_format": "audiobook",
        "series_id": str(audiobook.id),
        "is_published": True,
    })

    if not current_user or not current_user.is_admin_user():
        chapters_query = chapters_query.find({
            "visibility_mode": {"$in": ["public", "passkey_protected"]}
        })

    # Sort by episode (chapter number)
    chapters = await chapters_query.sort([("episode", 1)]).to_list()

    # Map chapters to response format
    chapter_responses = [
        AudiobookChapterResponse(
            id=str(chapter.id),
            title=chapter.title or f"Chapter {idx + 1}",
            chapter_number=chapter.episode or idx + 1,
            duration=chapter.duration,
            progress=None,  # Can be enriched with user progress later
            thumbnail=chapter.thumbnail,
        )
        for idx, chapter in enumerate(chapters)
    ]

    return AudiobookWithChaptersResponse(
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
        audio_quality=audiobook.audio_quality,
        isbn=audiobook.isbn,
        publisher_name=audiobook.publisher_name,
        view_count=audiobook.view_count or 0,
        avg_rating=audiobook.avg_rating or 0.0,
        is_featured=audiobook.is_featured or False,
        requires_subscription=audiobook.requires_subscription or "basic",
        chapters=chapter_responses,
        total_chapters=len(chapter_responses),
    )


@router.post("/{audiobook_id}/stream", response_model=AudiobookStreamResponse)
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

    await Content.find({"_id": audiobook.id}).update({"$inc": {"view_count": 1}})

    return audiobook_to_stream_response(audiobook)
