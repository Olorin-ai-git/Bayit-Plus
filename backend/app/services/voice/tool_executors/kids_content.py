"""
Kids Content Tool Executor
Handles get_kids_content tool execution
"""

from typing import Any, Dict, Optional

from app.core.logging_config import get_logger
from app.services.kids_content_service import kids_content_service

logger = get_logger(__name__)


async def execute_get_kids_content(
    age_group: str,
    category: Optional[str] = None,
    limit: int = 10
) -> Dict[str, Any]:
    """
    Execute get_kids_content tool - get age-appropriate kids content.

    Args:
        age_group: Age group (toddler, preschool, elementary, preteen)
        category: Optional category filter
        limit: Maximum number of results (max 10)

    Returns:
        Dict with items and total_found
    """
    try:
        # Map age group to age_max
        age_map = {
            "toddler": 3,
            "preschool": 6,
            "elementary": 11,
            "preteen": 12
        }
        age_max = age_map.get(age_group, 12)

        logger.info(
            "Getting kids content",
            extra={"age_group": age_group, "age_max": age_max, "category": category}
        )

        # Limit to max 10
        limit = min(limit, 10)

        # Fetch content using kids_content_service
        response = await kids_content_service.fetch_all_content(
            age_max=age_max,
            category=category,
            limit=limit
        )

        return {
            "items": [
                {
                    "id": item.id,
                    "title": item.title,
                    "age_rating": item.age_rating,
                    "category": item.category,
                    "thumbnail": item.thumbnail,
                    "description": getattr(item, "description", "")[:200]
                }
                for item in response.items[:limit]
            ],
            "total_found": len(response.items),
            "_action": {
                "type": "navigate",
                "payload": {"path": "/children"},
            },
        }

    except Exception as e:
        logger.error(
            "Failed to get kids content",
            extra={"error": str(e)},
            exc_info=True
        )
        return {"items": [], "total_found": 0, "error": str(e)}
