"""
Audiobooks Routes - Consumer-facing audiobook discovery and playback endpoints.

Browsing endpoints use optional auth (public access).
Streaming endpoints require authenticated user.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.security import (
    get_current_active_user,
    get_optional_user,
    verify_content_access,
)
from app.models.admin import AuditAction
from app.models.content import Content
from app.models.user import User
from app.api.routes.admin_content_utils import log_audit
from app.api.routes.audiobook_schemas import (
    AudiobookAuthorResponse,
    AudiobookAuthorsListResponse,
    AudiobookChapterResponse,
    AudiobookListResponse,
    AudiobookResponse,
    AudiobookStreamResponse,
    AudiobookWithChaptersResponse,
)
from app.api.routes.audiobook_utils import (
    audiobook_to_response,
    audiobook_to_stream_response,
)
from app.services import audiobook_cache_service as cache

logger = logging.getLogger(__name__)

router = APIRouter()


def _build_list_response(items, total, page, page_size) -> dict:
    """Serialize audiobook list to a cacheable dict."""
    return {
        "items": [audiobook_to_response(i).model_dump() for i in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("", response_model=AudiobookListResponse)
async def get_audiobooks(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=500),
    author: Optional[str] = Query(default=None),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get featured and trending audiobooks with pagination.

    Only returns parent audiobooks (those without series_id) to avoid
    showing individual chapters as separate cards. Filters out audiobooks
    with empty or missing titles (data quality check).

    Optionally filter by author name using the `author` query parameter.
    """
    cache_filters = {"page": page, "page_size": page_size, "author": author}
    cached = await cache.get_cached_list(cache_filters)
    if cached:
        return AudiobookListResponse(**cached)

    match_stage: dict = {
        "content_format": "audiobook",
        "is_published": True,
        "title": {"$exists": True, "$nin": ["", None]},
        "series_id": None,
    }

    if author:
        match_stage["author"] = author

    skip = (page - 1) * page_size

    # Single aggregation: $facet returns both count and paginated results
    pipeline = [
        {"$match": match_stage},
        {
            "$facet": {
                "metadata": [{"$count": "total"}],
                "items": [
                    {
                        "$sort": {
                            "is_featured": -1,
                            "featured_order.audiobooks": -1,
                            "created_at": -1,
                        }
                    },
                    {"$skip": skip},
                    {"$limit": page_size},
                ],
            }
        },
    ]

    collection = Content.get_pymongo_collection()
    cursor = collection.aggregate(pipeline)
    result = await cursor.to_list(length=1)

    facet = result[0] if result else {"metadata": [], "items": []}
    total = facet["metadata"][0]["total"] if facet["metadata"] else 0
    raw_items = facet["items"]

    # Hydrate into Content documents for audiobook_to_response
    items = [Content.model_validate(doc) for doc in raw_items]

    response_data = _build_list_response(items, total, page, page_size)
    await cache.set_cached_list(cache_filters, response_data)

    return AudiobookListResponse(**response_data)


@router.get("/authors", response_model=AudiobookAuthorsListResponse)
async def get_audiobook_authors(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get distinct audiobook authors with counts and representative thumbnails.

    Returns only authors from parent audiobooks (no chapters), sorted by
    audiobook count descending then alphabetically.
    """
    cached = await cache.get_cached_authors()
    if cached:
        return AudiobookAuthorsListResponse(**cached)

    pipeline = [
        {
            "$match": {
                "content_format": "audiobook",
                "is_published": True,
                "title": {"$exists": True, "$nin": ["", None]},
                "author": {"$exists": True, "$nin": ["", None]},
                "series_id": None,
                "$expr": {"$ne": ["$author", "$title"]},
            }
        },
        {
            "$group": {
                "_id": "$author",
                "audiobook_count": {"$sum": 1},
                "thumbnail": {"$first": "$thumbnail"},
            }
        },
        {"$sort": {"audiobook_count": -1, "_id": 1}},
    ]

    collection = Content.get_pymongo_collection()
    results = await collection.aggregate(pipeline).to_list(length=500)

    authors = [
        AudiobookAuthorResponse(
            name=doc["_id"],
            audiobook_count=doc["audiobook_count"],
            thumbnail=doc.get("thumbnail"),
        )
        for doc in results
    ]

    response = AudiobookAuthorsListResponse(authors=authors)
    await cache.set_cached_authors(response.model_dump())

    return response


@router.get("/{audiobook_id}", response_model=AudiobookResponse)
async def get_audiobook(
    audiobook_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get single audiobook metadata."""
    cached = await cache.get_cached_detail(audiobook_id)
    if cached:
        return AudiobookResponse(**cached)

    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    response = audiobook_to_response(audiobook)
    await cache.set_cached_detail(audiobook_id, response.model_dump())

    return response


@router.get("/{audiobook_id}/chapters", response_model=AudiobookWithChaptersResponse)
async def get_audiobook_with_chapters(
    audiobook_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get audiobook with its chapters for the player page.

    Returns parent audiobook metadata along with a list of chapters
    (parts) sorted by episode/chapter number.
    """
    cached = await cache.get_cached_chapters(audiobook_id)
    if cached:
        return AudiobookWithChaptersResponse(**cached)

    audiobook = await Content.get(audiobook_id)
    if not audiobook or audiobook.content_format != "audiobook":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audiobook not found",
        )

    chapters_query = Content.find({
        "content_format": "audiobook",
        "series_id": str(audiobook.id),
        "is_published": True,
    })

    chapters = await chapters_query.sort([("episode", 1)]).to_list()

    chapter_responses = [
        AudiobookChapterResponse(
            id=str(chapter.id),
            title=chapter.title or f"Chapter {idx + 1}",
            chapter_number=chapter.episode or idx + 1,
            duration=chapter.duration,
            progress=None,
            thumbnail=chapter.thumbnail,
            stream_url=chapter.stream_url,
            stream_type=chapter.stream_type,
        )
        for idx, chapter in enumerate(chapters)
    ]

    response = AudiobookWithChaptersResponse(
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
        stream_url=audiobook.stream_url,
        stream_type=audiobook.stream_type,
        chapters=chapter_responses,
        total_chapters=len(chapter_responses),
    )

    await cache.set_cached_chapters(audiobook_id, response.model_dump())

    return response


@router.post("/{audiobook_id}/stream", response_model=AudiobookStreamResponse)
async def get_audiobook_stream(
    audiobook_id: str,
    current_user: User = Depends(get_current_active_user),
    request: Request = None,
):
    """Get audiobook stream URL (requires authentication)."""
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
