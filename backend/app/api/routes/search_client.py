"""
Client-Friendly Search API Routes.

Provides simplified endpoints matching the parameter conventions
expected by iOS, tvOS, Android, Web, and Mobile RN clients.

Maps client params to the internal unified search pipeline:
- q -> query
- content_type -> content_types
- category -> genres
- language -> subtitle_languages
- sort -> sort_by + sort_order
- has_subtitles, has_dubbing -> filters
- year_from/year_to -> year_min/year_max
- duration_min/duration_max -> (metadata filter)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from app.core.logging_config import get_logger
from app.core.security import get_optional_user
from app.models.search_analytics import SearchQuery
from app.models.user import User
from app.services.search import (
    SearchFilters,
    SearchResults,
    SortField,
    SortOrder,
    create_search_pipeline,
)

router = APIRouter(prefix="/search", tags=["search"])
logger = get_logger(__name__)

_pipeline = create_search_pipeline()

_SORT_MAP = {
    "relevance": (SortField.RELEVANCE, SortOrder.DESC),
    "newest": (SortField.DATE, SortOrder.DESC),
    "oldest": (SortField.DATE, SortOrder.ASC),
    "title_asc": (SortField.TITLE, SortOrder.ASC),
    "title_desc": (SortField.TITLE, SortOrder.DESC),
    "popularity": (SortField.POPULARITY, SortOrder.DESC),
    "a_z": (SortField.TITLE, SortOrder.ASC),
    "z_a": (SortField.TITLE, SortOrder.DESC),
    "popular": (SortField.POPULARITY, SortOrder.DESC),
}


@router.get("", response_model=SearchResults)
async def client_search(
    q: str = Query("", description="Search query text"),
    content_type: Optional[str] = Query(
        None, description="Content type filter",
    ),
    category: Optional[str] = Query(
        None, description="Category/genre filter",
    ),
    language: Optional[str] = Query(
        None, description="Language filter (he, en, ar, ru, fr, es)",
    ),
    year_from: Optional[int] = Query(
        None, ge=1900, le=2100, description="Minimum year",
    ),
    year_to: Optional[int] = Query(
        None, ge=1900, le=2100, description="Maximum year",
    ),
    has_subtitles: Optional[bool] = Query(
        None, description="Filter for content with subtitles",
    ),
    has_dubbing: Optional[bool] = Query(
        None, description="Filter for dubbed content",
    ),
    sort: str = Query("relevance", description="Sort option"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=50, description="Results per page"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Client-friendly unified search endpoint.

    Accepts simplified parameter names used by all client platforms.
    """
    content_types = [content_type] if content_type else ["vod"]
    genres = [category] if category else None
    subtitle_languages = [language] if language else None

    sort_field, sort_order = _SORT_MAP.get(
        sort, (SortField.RELEVANCE, SortOrder.DESC),
    )

    filters = SearchFilters(
        content_types=content_types,
        genres=genres,
        year_min=year_from,
        year_max=year_to,
        subtitle_languages=subtitle_languages if has_subtitles else None,
    )

    results = await _pipeline.search(
        query=q,
        filters=filters,
        page=page,
        limit=page_size,
        sort_by=sort_field,
        sort_order=sort_order,
        user_subscription_tier=(
            current_user.subscription_tier if current_user else None
        ),
    )

    await SearchQuery.log_search(
        query=q,
        search_type="text" if q.strip() else "metadata_only",
        result_count=results.total,
        execution_time_ms=results.execution_time_ms,
        filters=filters.model_dump(),
        user_id=str(current_user.id) if current_user else None,
        cache_hit=results.cache_hit,
        platform=None,
    )

    return JSONResponse(
        content=jsonable_encoder(results),
        headers={
            "Cache-Control": "no-store, max-age=0",
            "Pragma": "no-cache",
        },
    )
