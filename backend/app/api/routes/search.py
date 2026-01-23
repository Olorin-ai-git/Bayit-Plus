"""
Unified Search API Routes.

Provides comprehensive search endpoints for:
- Text search
- Subtitle search
- Advanced filtering
- LLM natural language search
- Autocomplete suggestions
- Search analytics
"""

import logging
import re
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings
from app.core.rate_limiter import RATE_LIMITING_ENABLED, RATE_LIMITS, limiter
from app.core.security import get_current_premium_user, get_optional_user
from app.models.search_analytics import SearchQuery
from app.models.user import User
from app.models.content_embedding import SceneSearchQuery, SceneSearchResult
from app.services.olorin.search.searcher import scene_search
from app.services.unified_search_service import (SearchFilters, SearchResults,
                                                 UnifiedSearchService)
from app.services.vod_llm_search_service import VODLLMSearchService

router = APIRouter(prefix="/search", tags=["search"])
logger = logging.getLogger(__name__)

# ObjectId validation regex (24 hex characters)
OBJECT_ID_PATTERN = re.compile(r"^[0-9a-fA-F]{24}$")

# Service instances
unified_search = UnifiedSearchService()
llm_search = VODLLMSearchService()


class LLMSearchRequest(BaseModel):
    """Request model for LLM natural language search"""

    query: str = Field(..., min_length=1, description="Natural language query")
    include_user_context: bool = Field(True, description="Include user preferences")
    limit: int = Field(20, ge=1, le=50, description="Maximum results")


class ClickTrackingRequest(BaseModel):
    """Request model for tracking search result clicks"""

    search_query_id: Optional[str] = Field(
        None, description="Optional search query log ID"
    )
    content_id: str = Field(..., description="Clicked content ID")
    position: int = Field(..., ge=1, description="Position in results (1-indexed)")
    time_to_click_ms: int = Field(..., ge=0, description="Time from search to click")


class SceneSearchRequest(BaseModel):
    """Request model for scene search within content or series"""

    query: str = Field(..., min_length=2, max_length=500, description="Scene query")
    content_id: Optional[str] = Field(None, description="Search within specific content")
    series_id: Optional[str] = Field(None, description="Search across series episodes")
    language: str = Field("he", description="Content language")
    limit: int = Field(20, ge=1, le=100, description="Maximum results")
    min_score: float = Field(0.5, ge=0.0, le=1.0, description="Minimum relevance score")

    @field_validator("content_id", "series_id")
    @classmethod
    def validate_object_id(cls, v: Optional[str]) -> Optional[str]:
        """Validate that content_id and series_id are valid MongoDB ObjectIds."""
        if v is not None and not OBJECT_ID_PATTERN.match(v):
            raise ValueError(
                f"Invalid ObjectId format: '{v}'. Must be a 24-character hex string."
            )
        return v


class SceneSearchResponse(BaseModel):
    """Response model for scene search"""

    query: str
    results: List[SceneSearchResult]
    total_results: int


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


@router.post("/scene", response_model=SceneSearchResponse)
@limiter.limit("30/minute")
async def search_scenes(
    request: SceneSearchRequest,
    http_request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Search for specific scenes within content or series.

    Returns results with timestamps for deep-linking to specific moments.
    Useful for finding specific quotes, moments, or topics in videos.

    Rate limit: 30 requests per minute per IP address.

    Examples:
    - Search "Marty burns almanac" in Back to the Future → Exact scene timestamp
    - Search across all episodes of a series for a specific quote
    - Find where a specific topic is discussed in a documentary

    Returns:
    - Matched text with context
    - Timestamp for deep-linking
    - Episode info for series content (S2E5 format)
    """
    try:
        # Feature flag check - semantic search must be enabled
        olorin_settings = getattr(settings, "olorin", None)
        if olorin_settings and hasattr(olorin_settings, "semantic_search_enabled"):
            if not olorin_settings.semantic_search_enabled:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Scene search is currently disabled. Contact support if this persists.",
                )

        # Build scene search query
        query = SceneSearchQuery(
            query=request.query,
            content_id=request.content_id,
            series_id=request.series_id,
            language=request.language,
            limit=request.limit,
            min_score=request.min_score,
        )

        # Execute scene search
        results = await scene_search(query=query)

        # Log analytics
        await SearchQuery.log_search(
            query=request.query,
            search_type="scene",
            result_count=len(results),
            filters={
                "content_id": request.content_id,
                "series_id": request.series_id,
                "language": request.language,
            },
            user_id=str(current_user.id) if current_user else None,
        )

        return SceneSearchResponse(
            query=request.query,
            results=results,
            total_results=len(results),
        )

    except HTTPException:
        raise
    except ValueError as e:
        # Handle validation errors
        logger.warning(f"Scene search validation error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        logger.error(f"Scene search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Scene search failed. Please try again later.",
        )


@router.get("/suggestions")
async def get_search_suggestions(
    query: str = Query(..., min_length=2, description="Partial query for autocomplete"),
    limit: int = Query(5, ge=1, le=10, description="Maximum suggestions"),
):
    """
    Get autocomplete suggestions for search query.

    Returns:
    - Matching content titles
    - Matching cast/director names
    - Popular search terms

    Example:
    - Query "Gal" → ["Gal Gadot", "Gal Gadot Movies", "Galaxy Quest"]
    """
    try:
        suggestions = await unified_search.get_suggestions(query, limit)

        return {"query": query, "suggestions": suggestions}

    except Exception as e:
        logger.error(f"Suggestions failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get suggestions: {str(e)}",
        )


@router.post("/llm")
async def llm_natural_language_search(
    request: LLMSearchRequest, current_user: User = Depends(get_current_premium_user)
):
    """
    Natural language search using Claude AI (Premium Feature).

    Interprets complex queries and extracts search criteria automatically.

    Examples:
    - "Show me Hebrew movies from the 1980s with English subtitles"
    - "Find comedies starring Sacha Baron Cohen"
    - "What documentaries about the Holocaust are available?"
    - "Kids shows in Hebrew for ages 5-7"

    Returns:
    - Interpreted search criteria
    - Confidence score
    - Ranked results
    """
    try:
        # Build user context
        user_context = (
            {
                "preferred_language": (
                    current_user.preferred_language
                    if hasattr(current_user, "preferred_language")
                    else None
                ),
                "subscription_tier": current_user.subscription_tier,
            }
            if request.include_user_context
            else {}
        )

        # Execute LLM search
        results = await llm_search.search(
            query=request.query, user_context=user_context, limit=request.limit
        )

        # Log analytics
        if results.get("success"):
            interpretation = results.get("interpretation", {})
            await SearchQuery.log_search(
                query=request.query,
                search_type="llm",
                result_count=results.get("total_results", 0),
                execution_time_ms=results.get("execution_time_ms", 0),
                filters=interpretation.get("extracted_criteria", {}),
                user_id=str(current_user.id),
                llm_interpretation=interpretation.get("text"),
                llm_confidence=interpretation.get("confidence"),
            )

        return results

    except Exception as e:
        logger.error(f"LLM search failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"LLM search failed: {str(e)}",
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


@router.post("/analytics/click")
async def track_search_click(
    request: ClickTrackingRequest,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Track when a user clicks on a search result.

    Used for:
    - Click-through rate analysis
    - Result relevance optimization
    - Popular content identification
    """
    try:
        # If search_query_id is provided, update that record
        if request.search_query_id:
            query_log = await SearchQuery.get(request.search_query_id)
            if query_log:
                await query_log.log_click(
                    content_id=request.content_id,
                    position=request.position,
                    time_to_click_ms=request.time_to_click_ms,
                )

        return {"success": True, "message": "Click tracked successfully"}

    except Exception as e:
        logger.error(f"Failed to track click: {e}", exc_info=True)
        # Don't fail the request, just log the error
        return {"success": False, "message": "Failed to track click (non-critical)"}


@router.get("/analytics/popular")
async def get_popular_searches(
    limit: int = Query(10, ge=1, le=50), days: int = Query(7, ge=1, le=90)
):
    """
    Get most popular search queries.

    Useful for:
    - Content gap analysis
    - Trending topics
    - SEO optimization

    Note: May require admin authentication in production
    """
    try:
        popular = await SearchQuery.get_popular_queries(limit=limit, days=days)
        return {"queries": popular, "period_days": days}

    except Exception as e:
        logger.error(f"Failed to get popular searches: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get popular searches: {str(e)}",
        )


@router.get("/analytics/no-results")
async def get_no_result_queries(
    limit: int = Query(20, ge=1, le=100), days: int = Query(7, ge=1, le=90)
):
    """
    Get queries that returned no results (content gaps).

    Use this to identify:
    - Missing content
    - Potential acquisition targets
    - User expectations vs. actual catalog

    Note: May require admin authentication in production
    """
    try:
        no_results = await SearchQuery.get_no_result_queries(limit=limit, days=days)
        return {"queries": no_results, "period_days": days}

    except Exception as e:
        logger.error(f"Failed to get no-result queries: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get no-result queries: {str(e)}",
        )


@router.get("/analytics/metrics")
async def get_search_metrics(days: int = Query(7, ge=1, le=90)):
    """
    Get aggregated search metrics.

    Returns:
    - Total searches
    - Click-through rate
    - Search type distribution
    - Average performance

    Note: May require admin authentication in production
    """
    try:
        ctr = await SearchQuery.get_click_through_rate(days=days)
        search_types = await SearchQuery.get_search_type_distribution(days=days)

        return {
            "click_through_rate": ctr,
            "search_type_distribution": search_types,
            "period_days": days,
        }

    except Exception as e:
        logger.error(f"Failed to get search metrics: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get search metrics: {str(e)}",
        )
