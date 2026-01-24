"""
Search Suggestions API Routes.

Provides discovery endpoints for:
- Trending searches
- Category suggestions
- Autocomplete
"""

import logging

from fastapi import APIRouter, HTTPException, Query, status

from app.models.search_analytics import SearchQuery
from app.services.unified_search_service import UnifiedSearchService

router = APIRouter(prefix="/search", tags=["search", "suggestions"])
logger = logging.getLogger(__name__)

# Service instance
unified_search = UnifiedSearchService()


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


@router.get("/trending")
async def get_trending_searches(
    limit: int = Query(10, ge=1, le=20, description="Maximum trending searches")
):
    """
    Get trending search queries for suggestions panel.

    Returns popular searches from the last 7 days, used to populate
    the trending searches section in the search suggestions UI.

    Example response:
    {"trending": ["Fauda", "Shtisel", "Tehran", ...]}
    """
    try:
        # Get popular searches from last 7 days
        popular = await SearchQuery.get_popular_queries(limit=limit, days=7)

        # Extract just the query strings
        trending = [item.get("query", "") for item in popular if item.get("query")]

        return {"trending": trending}

    except Exception as e:
        logger.error(f"Failed to get trending searches: {e}", exc_info=True)
        # Return empty array on error (graceful degradation)
        return {"trending": []}


@router.get("/categories")
async def get_search_categories():
    """
    Get predefined search categories with metadata.

    Returns category suggestions for the search suggestions panel.
    Each category includes a label, emoji, and pre-applied filters.

    Example response:
    {
      "categories": [
        {"id": "movies", "label": "Movies", "emoji": "🎬", "filters": {"content_types": ["vod"]}},
        ...
      ]
    }
    """
    try:
        # Predefined categories with filters
        categories = [
            {
                "id": "movies",
                "label": "Movies",
                "emoji": "🎬",
                "filters": {"content_types": ["vod"]},
            },
            {
                "id": "series",
                "label": "Series",
                "emoji": "📺",
                "filters": {"content_types": ["vod"]},
            },
            {
                "id": "kids",
                "label": "Kids",
                "emoji": "👶",
                "filters": {"is_kids_content": True},
            },
            {
                "id": "comedy",
                "label": "Comedy",
                "emoji": "😂",
                "filters": {"genres": ["Comedy"]},
            },
            {
                "id": "drama",
                "label": "Drama",
                "emoji": "🎭",
                "filters": {"genres": ["Drama"]},
            },
            {
                "id": "documentaries",
                "label": "Documentaries",
                "emoji": "🎥",
                "filters": {"genres": ["Documentary"]},
            },
        ]

        return {"categories": categories}

    except Exception as e:
        logger.error(f"Failed to get categories: {e}", exc_info=True)
        # Return empty array on error (graceful degradation)
        return {"categories": []}
