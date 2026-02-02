"""
Live Channels Tool Executor
Handles get_live_channels tool execution
"""

from typing import Any, Dict, Optional

from app.core.logging_config import get_logger
from app.models.content import LiveChannel

logger = get_logger(__name__)


async def execute_get_live_channels(category: Optional[str] = None) -> Dict[str, Any]:
    """
    Execute get_live_channels tool - list live TV channels.

    Args:
        category: Optional category filter (news, sports, entertainment, kids)

    Returns:
        Dict with channels and total_found
    """
    try:
        logger.info(
            "Getting live channels",
            extra={"category": category}
        )

        query = {"available": True}
        if category:
            query["category"] = category

        channels = await LiveChannel.find(query).to_list(length=20)

        return {
            "channels": [
                {
                    "id": str(ch.id),
                    "name": ch.name,
                    "name_he": getattr(ch, "name_he", ch.name),
                    "category": getattr(ch, "category", "general"),
                    "logo_url": getattr(ch, "logo_url", "")
                }
                for ch in channels
            ],
            "total_found": len(channels)
        }

    except Exception as e:
        logger.error(
            "Failed to get live channels",
            extra={"error": str(e)},
            exc_info=True
        )
        return {"channels": [], "total_found": 0, "error": str(e)}
