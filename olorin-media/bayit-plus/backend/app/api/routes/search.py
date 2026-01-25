"""
Unified Search API Routes (Core Endpoints).

Provides core search functionality:
- Unified text search across all content
- Subtitle dialogue search
- Filter options metadata

Additional search features in separate routers:
- search_analytics.py - Click tracking, popular queries, metrics
- search_suggestions.py - Autocomplete, trending, categories
- search_scenes.py - Scene/timestamp search
- search_llm.py - LLM natural language search
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import get_optional_user
from app.models.search_analytics import SearchQuery
from app.models.user import User
from app.services.unified_search_service import (SearchFilters, SearchResults,
                                                 UnifiedSearchService)

router = APIRouter(prefix="/search", tags=["search"])
logger = logging.getLogger(__name__)

# Service instance
unified_search = UnifiedSearchService()


@router.get("/unified", response_model=SearchResults)
async def unified_search_endpoint(
    query: str = Query("", description="Search query text"),
    content_types: List[str] = Query(
        ["vod"], description="Content types: vod, live, radio, podcast"
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
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=50, description="Results per page"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Unified search across all content with advanced filtering.

    Features:
    - Full-text search on titles, descriptions, cast, director
    - Subtitle dialogue search (when enabled)
    - Multi-criteria filtering (genre, year, rating, language)
    - Pagination support
    - Result caching

    Examples:
    - Search for "Fauda" → Returns series and all seasons
    - Search with genre="Comedy" and year_min=1990 → Filtered results
    - Search with search_in_subtitles=true → Searches dialogue text
    """
    try:
        # Build filters
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

        # Execute search
        results = await unified_search.search(
            query=query,
            filters=filters,
            page=page,
            limit=limit,
            user_subscription_tier=(
                current_user.subscription_tier if current_user else None
            ),
        )

        # Log search analytics
        await SearchQuery.log_search(
            query=query,
            search_type=(
                "subtitle"
                if search_in_subtitles
                else ("text" if query.strip() else "metadata_only")
            ),
            result_count=results.total,
            execution_time_ms=results.execution_time_ms,
            filters=filters.dict(),
            user_id=str(current_user.id) if current_user else None,
            cache_hit=results.cache_hit,
            platform=None,  # Could be extracted from User-Agent header
        )

        return results

    except Exception as e:
        logger.error(f"Unified search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )


@router.get("/subtitles")
async def search_in_subtitles(
    query: str = Query(..., min_length=2, description="Text to search in subtitles"),
    content_types: List[str] = Query(["vod"], description="Content types to search"),
    language: Optional[str] = Query(None, description="Subtitle language filter"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Search for specific dialogue within subtitle files.

    Returns content with matching subtitle cues highlighted.
    Useful for finding specific quotes or topics discussed in content.

    Example:
    - Search "Shalom" → Returns all content with that word in subtitles
    - Shows timestamp and highlighted text for each match
    """
    try:
        filters = SearchFilters(content_types=content_types, search_in_subtitles=True)

        results = await unified_search.search(
            query=query, filters=filters, page=1, limit=limit
        )

        # Log analytics
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
        logger.error(f"Subtitle search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Subtitle search failed: {str(e)}",
        )


@router.get("/filters/options")
async def get_filter_options():
    """
    Get available filter options for advanced search.

    Returns:
    - All unique genres
    - Year range (min/max)
    - Available subtitle languages
    - Content types
    - Subscription tiers

    Use this to populate filter UI dropdowns and checkboxes.
    """
    try:
        options = await unified_search.get_filter_options()
        return options

    except Exception as e:
        logger.error(f"Failed to get filter options: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get filter options: {str(e)}",
        )
