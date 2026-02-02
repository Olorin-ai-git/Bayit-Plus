"""
Recommendations Tool Executor
Handles get_recommendations tool execution
"""

from typing import Any, Dict, Optional

from app.core.logging_config import get_logger
from app.services.unified_search_service import SearchFilters, UnifiedSearchService

logger = get_logger(__name__)


async def execute_get_recommendations(
    content_type: str = "vod",
    based_on: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Execute get_recommendations tool - get personalized content recommendations.

    Args:
        content_type: Type of content (vod, live, radio, podcast)
        based_on: Optional content ID to find similar content
        limit: Maximum number of results (max 10)

    Returns:
        Dict with results and total_found
    """
    try:
        search_service = UnifiedSearchService()

        # Limit to max 10
        limit = min(limit, 10)

        if based_on:
            # Find similar content based on specific item
            logger.info(
                "Finding similar content",
                extra={"content_id": based_on, "limit": limit}
            )
            # Use content type search (similarity search can be added later)
            filters = SearchFilters(
                content_types=[content_type],
            )
            results = await search_service.search(
                query="",
                filters=filters,
                limit=limit
            )
        else:
            # General recommendations based on content type
            logger.info(
                "Getting recommendations",
                extra={"content_type": content_type, "limit": limit}
            )
            filters = SearchFilters(
                content_types=[content_type],
            )
            results = await search_service.search(
                query="",
                filters=filters,
                limit=limit
            )

        return {
            "results": [
                {
                    "id": str(r.get("_id", "")),
                    "title": r.get("title", ""),
                    "year": r.get("year"),
                    "genres": r.get("genres", []),
                    "rating": r.get("rating"),
                    "description": r.get("description", "")[:200]
                }
                for r in results.get("results", [])
            ],
            "total_found": results.get("total_found", 0)
        }

    except Exception as e:
        logger.error(
            "Failed to get recommendations",
            extra={"error": str(e)},
            exc_info=True
        )
        return {"results": [], "total_found": 0, "error": str(e)}
