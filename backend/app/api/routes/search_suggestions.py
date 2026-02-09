"""
Search Suggestions API Routes.

Provides discovery endpoints for:
- Trending searches
- Category suggestions
- Autocomplete
"""

from fastapi import APIRouter, HTTPException, Query, status

from app.core.logging_config import get_logger
from app.models.search_analytics import SearchQuery
from app.services.search import create_search_pipeline

router = APIRouter(prefix="/search", tags=["search", "suggestions"])
logger = get_logger(__name__)

# Service instance
_pipeline = create_search_pipeline()


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
    - Query "Gal" -> ["Gal Gadot", "Gal Gadot Movies", "Galaxy Quest"]
    """
    try:
        suggestions = await _pipeline.get_suggestions(query, limit)
        return {"query": query, "suggestions": suggestions}
    except Exception as e:
        logger.error("Suggestions failed", extra={"error": str(e)}, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred while fetching suggestions",
        )


@router.get("/trending")
async def get_trending_searches(
    limit: int = Query(10, ge=1, le=20, description="Maximum trending searches")
):
    """
    Get trending search queries for suggestions panel.

    Returns popular searches from the last 7 days, used to populate
    the trending searches section in the search suggestions UI.
    """
    try:
        popular = await SearchQuery.get_popular_queries(limit=limit, days=7)
        trending = [item.get("query", "") for item in popular if item.get("query")]
        return {"trending": trending}
    except Exception as e:
        logger.error("Failed to get trending searches", extra={"error": str(e)}, exc_info=True)
        return {"trending": []}


@router.get("/categories")
async def get_search_categories():
    """
    Get predefined search categories with metadata.

    Returns category suggestions for the search suggestions panel.
    Each category includes a label, icon, and pre-applied filters.
    """
    try:
        # Icons reference @olorin/shared-icons names (rendered by frontend)
        categories = [
            {
                "id": "movies",
                "label": "Movies",
                "icon": "vod",
                "filters": {"content_types": ["vod"]},
            },
            {
                "id": "series",
                "label": "Series",
                "icon": "live",
                "filters": {"content_types": ["vod"]},
            },
            {
                "id": "kids",
                "label": "Kids",
                "icon": "baby",
                "filters": {"is_kids_content": True},
            },
            {
                "id": "comedy",
                "label": "Comedy",
                "icon": "vod",
                "filters": {"genres": ["Comedy"]},
            },
            {
                "id": "drama",
                "label": "Drama",
                "icon": "vod",
                "filters": {"genres": ["Drama"]},
            },
            {
                "id": "documentaries",
                "label": "Documentaries",
                "icon": "vod",
                "filters": {"genres": ["Documentary"]},
            },
        ]

        return {"categories": categories}
    except Exception as e:
        logger.error("Failed to get categories", extra={"error": str(e)}, exc_info=True)
        return {"categories": []}
