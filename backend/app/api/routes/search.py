"""Unified Search API Routes: text search, subtitle search, filter options."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse

from app.core.logging_config import get_logger
from app.core.security import get_current_admin_user, get_optional_user
from app.models.search_analytics import SearchQuery
from app.models.user import User
from app.services.actor_search import actor_search_helper
from app.services.search import (
    SearchFilters,
    SearchResults,
    SortField,
    SortOrder,
    create_search_pipeline,
)
from app.services.search_cache import get_cache

router = APIRouter(prefix="/search", tags=["search"])
logger = get_logger(__name__)

# Service instance
_pipeline = create_search_pipeline()


@router.get("/unified", response_model=SearchResults)
async def unified_search_endpoint(
    query: str = Query("", description="Search query text"),
    content_types: List[str] = Query(
        ["vod"], description="Content types: vod, live, radio, podcast, audiobook, series, movie, collection, actor"
    ),
    genres: Optional[List[str]] = Query(None, description="Filter by genres"),
    year_min: Optional[int] = Query(None, ge=1900, le=2100, description="Minimum year"),
    year_max: Optional[int] = Query(None, ge=1900, le=2100, description="Maximum year"),
    rating_min: Optional[float] = Query(
        None, ge=0, le=10, description="Minimum rating"
    ),
    subtitle_languages: Optional[List[str]] = Query(
        None, description="Required subtitle languages"
    ),
    subscription_tier: Optional[str] = Query(
        None, description="Filter by tier: basic, premium, family"
    ),
    is_kids_content: Optional[bool] = Query(None, description="Filter kids content"),
    search_in_subtitles: bool = Query(False, description="Enable subtitle text search"),
    sort_by: SortField = Query(SortField.RELEVANCE, description="Sort field"),
    sort_order: SortOrder = Query(SortOrder.DESC, description="Sort direction"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Results per page"),
    no_cache: bool = Query(False, description="Bypass search cache"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Unified search across all content with advanced filtering and sorting.

    Features:
    - Full-text search on titles, descriptions, cast, director
    - Fuzzy matching, phrase matching, Hebrew nikud handling
    - Subtitle dialogue search (when enabled)
    - Multi-criteria filtering (genre, year, rating, language)
    - Explicit sorting (relevance, date, rating, popularity, title, year)
    - Pagination support
    - Result caching
    """
    try:
        filters = SearchFilters(
            content_types=content_types,
            genres=genres,
            year_min=year_min,
            year_max=year_max,
            rating_min=rating_min,
            subtitle_languages=subtitle_languages,
            subscription_tier=subscription_tier,
            is_kids_content=is_kids_content,
            search_in_subtitles=search_in_subtitles,
        )

        is_beta_user = (
            current_user.is_beta_user
            if current_user and not current_user.is_admin_user()
            else None
        )

        # Separate actor content type -- actors are aggregated, not in the pipeline
        include_actors = "actor" in content_types
        pipeline_types = [ct for ct in content_types if ct != "actor"]

        # Only run the standard pipeline when non-actor types are requested
        if pipeline_types:
            filters.content_types = pipeline_types
            results = await _pipeline.search(
                query=query,
                filters=filters,
                page=page,
                limit=limit,
                sort_by=sort_by,
                sort_order=sort_order,
                user_subscription_tier=(
                    current_user.subscription_tier if current_user else None
                ),
                is_beta_user=is_beta_user,
                no_cache=no_cache,
            )
        else:
            results = SearchResults(
                results=[], total=0, page=page, page_size=limit,
                has_more=False, execution_time_ms=0,
            )

        # Merge actor results when requested (supports empty query for browsing)
        if include_actors:
            actor_results = await actor_search_helper(query, limit=limit)
            if actor_results:
                merged = actor_results + results.results
                results = SearchResults(
                    results=merged[:limit],
                    total=results.total + len(actor_results),
                    page=results.page,
                    page_size=results.page_size,
                    has_more=results.has_more,
                    execution_time_ms=results.execution_time_ms,
                )

        await SearchQuery.log_search(
            query=query,
            search_type=(
                "subtitle"
                if search_in_subtitles
                else ("text" if query.strip() else "metadata_only")
            ),
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
                "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
                "Pragma": "no-cache",
                "Expires": "0",
            },
        )

    except Exception as e:
        logger.error("Unified search failed", extra={"error": str(e)}, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred during search",
        )


@router.get("/subtitles")
async def search_in_subtitles(
    query: str = Query(..., min_length=2, description="Text to search in subtitles"),
    content_types: List[str] = Query(["vod"], description="Content types to search"),
    language: Optional[str] = Query(None, description="Subtitle language filter"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Search for specific dialogue within subtitle files."""
    try:
        filters = SearchFilters(content_types=content_types, search_in_subtitles=True)

        results = await _pipeline.search(
            query=query, filters=filters, page=1, limit=limit,
        )

        await SearchQuery.log_search(
            query=query,
            search_type="subtitle",
            result_count=results.total,
            execution_time_ms=results.execution_time_ms,
            filters={"language": language, "content_types": content_types},
            user_id=str(current_user.id) if current_user else None,
        )

        return results

    except Exception as e:
        logger.error("Subtitle search failed", extra={"error": str(e)}, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred during subtitle search",
        )


@router.get("/filters/options")
async def get_filter_options():
    """Get available filter options for advanced search UI."""
    try:
        return await _pipeline.get_filter_options()
    except Exception as e:
        logger.error("Failed to get filter options", extra={"error": str(e)}, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred while fetching filter options",
        )


@router.delete("/cache", status_code=status.HTTP_200_OK)
async def clear_search_cache(
    current_user: User = Depends(get_current_admin_user),
):
    """Clear the in-memory search cache. Admin only."""
    cache = get_cache()
    stats = cache.get_stats()
    cache.invalidate()
    logger.info(
        "Search cache cleared by admin",
        extra={"admin_id": str(current_user.id), "entries_cleared": stats["total_entries"]},
    )
    return {"cleared": stats["total_entries"]}
