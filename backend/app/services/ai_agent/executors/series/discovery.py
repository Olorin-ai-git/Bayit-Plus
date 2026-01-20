"""
AI Agent Executors - Series Discovery

Functions for finding unlinked episodes that need to be connected to their parent series.
"""

import logging
from typing import Any, Dict

from app.core.config import settings
from app.models.content import Content

logger = logging.getLogger(__name__)


async def execute_find_unlinked_episodes(
    limit: int | None = None
) -> Dict[str, Any]:
    """
    Find episodes not linked to parent series.

    Args:
        limit: Maximum number of episodes to return. Defaults to config value.

    Returns:
        Dictionary with success status, count, and list of unlinked episodes.
    """
    try:
        effective_limit = limit or settings.SERIES_LINKER_AUTO_LINK_BATCH_SIZE

        episodes = await Content.find({
            "content_type": "episode",
            "$or": [{"series_id": None}, {"series_id": ""}]
        }).limit(effective_limit).to_list()

        return {
            "success": True,
            "count": len(episodes),
            "episodes": [
                {
                    "id": str(e.id),
                    "title": e.title,
                    "season": e.season,
                    "episode": e.episode
                }
                for e in episodes
            ]
        }
    except Exception as e:
        logger.error(f"Error finding unlinked episodes: {e}")
        return {"success": False, "error": str(e)}
