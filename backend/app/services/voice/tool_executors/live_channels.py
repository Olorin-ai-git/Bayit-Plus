"""
Live Channels Tool Executor
Handles get_live_channels tool execution with channel number resolution
"""

import re
from typing import Any, Dict, Optional

from app.core.logging_config import get_logger
from app.models.content import LiveChannel

logger = get_logger(__name__)


def extract_channel_number(transcript: str) -> Optional[int]:
    """
    Extract channel number from transcript in Hebrew or English.

    Supports patterns like "Channel 11", "channel 11", "11"
    """
    hebrew_pattern = re.compile(r"ערוץ\s*(\d+)")
    english_pattern = re.compile(r"channel\s*(\d+)", re.IGNORECASE)
    bare_number = re.compile(r"^(\d{1,3})$")

    for pattern in [hebrew_pattern, english_pattern, bare_number]:
        match = pattern.search(transcript)
        if match:
            return int(match.group(1))
    return None


async def resolve_channel_by_number(channel_number: int) -> Optional[Dict[str, Any]]:
    """
    Resolve a channel by its order/number in the channel list.

    Args:
        channel_number: Channel number (1-based order index)

    Returns:
        Channel dict or None if not found
    """
    try:
        channels = await LiveChannel.find(
            {"is_active": True}
        ).sort("order").to_list(length=100)

        for ch in channels:
            ch_order = getattr(ch, "order", 0)
            if ch_order == channel_number:
                return {
                    "id": str(ch.id),
                    "name": ch.name,
                    "name_he": getattr(ch, "name_he", ch.name),
                    "category": getattr(ch, "category", "general"),
                    "logo_url": getattr(ch, "logo", ""),
                    "stream_url": ch.stream_url,
                }
        return None
    except Exception as e:
        logger.error(
            "Channel number resolution failed",
            extra={"channel_number": channel_number, "error": str(e)},
            exc_info=True,
        )
        return None


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

        query = {"is_active": True}
        if category:
            query["category"] = category

        channels = await LiveChannel.find(query).sort("order").to_list(length=20)

        return {
            "channels": [
                {
                    "id": str(ch.id),
                    "name": ch.name,
                    "name_he": getattr(ch, "name_he", ch.name),
                    "category": getattr(ch, "category", "general"),
                    "logo_url": getattr(ch, "logo", "")
                }
                for ch in channels
            ],
            "total_found": len(channels),
            "_action": {
                "type": "navigate",
                "payload": {"path": "/live"},
            },
        }

    except Exception as e:
        logger.error(
            "Failed to get live channels",
            extra={"error": str(e)},
            exc_info=True
        )
        return {"channels": [], "total_found": 0, "error": str(e)}
