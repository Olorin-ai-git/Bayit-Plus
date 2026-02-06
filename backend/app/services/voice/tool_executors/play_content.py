"""
Play Content Tool Executor
Validates content exists, resolves latest episodes, and returns play action payload
"""

import re
from typing import Any, Dict, Optional

from app.core.logging_config import get_logger
from app.models.content import Content, LiveChannel

logger = get_logger(__name__)

LAST_EPISODE_PATTERNS = [
    re.compile(r"פרק\s*אחרון", re.IGNORECASE),
    re.compile(r"הפרק\s*האחרון", re.IGNORECASE),
    re.compile(r"last\s*episode", re.IGNORECASE),
    re.compile(r"latest\s*episode", re.IGNORECASE),
    re.compile(r"newest\s*episode", re.IGNORECASE),
    re.compile(r"último\s*episodio", re.IGNORECASE),
]


def is_last_episode_request(transcript: str) -> bool:
    """Check if transcript requests the latest episode."""
    return any(p.search(transcript) for p in LAST_EPISODE_PATTERNS)


async def resolve_latest_episode(series_id: str) -> Optional[Dict[str, Any]]:
    """
    Find the most recent episode for a series by created_at date.

    Args:
        series_id: The series content ID

    Returns:
        Dict with episode info or None if not found
    """
    try:
        episode = await Content.find_one(
            {"series_id": series_id, "is_published": True},
            sort=[("season", -1), ("episode", -1)],
        )
        if not episode:
            return None
        return {
            "content_id": str(episode.id),
            "title": episode.title,
            "season": episode.season,
            "episode": episode.episode,
        }
    except Exception as e:
        logger.error(
            "Latest episode resolution failed",
            extra={"series_id": series_id, "error": str(e)},
            exc_info=True,
        )
        return None


async def execute_play_content(
    content_id: str,
    content_type: str,
    timestamp: Optional[float] = None
) -> Dict[str, Any]:
    """
    Execute play_content tool - play content on Bayit+.

    Validates that the content exists in the database, then returns
    an action payload the frontend can use to start playback.

    Args:
        content_id: Content ID to play
        content_type: Type (vod, live, radio, podcast, audiobook)
        timestamp: Optional start time in seconds

    Returns:
        Dict with play action payload or error
    """
    try:
        logger.info(
            "Play content requested",
            extra={
                "content_id": content_id,
                "content_type": content_type,
                "timestamp": timestamp,
            }
        )

        content_title = await _resolve_content_title(content_id, content_type)
        if not content_title:
            return {
                "success": False,
                "error": "Content not found",
                "content_id": content_id,
            }

        result: Dict[str, Any] = {
            "success": True,
            "content_id": content_id,
            "content_type": content_type,
            "title": content_title,
            "_action": {
                "type": "play",
                "payload": {
                    "content_id": content_id,
                    "content_type": content_type,
                },
            },
        }
        if timestamp is not None:
            result["_action"]["payload"]["timestamp"] = timestamp
        return result
    except Exception as e:
        logger.error(
            "Failed to execute play_content",
            extra={"content_id": content_id, "error": str(e)},
            exc_info=True,
        )
        return {"success": False, "error": str(e)}


async def _resolve_content_title(
    content_id: str, content_type: str
) -> Optional[str]:
    """Look up content title from the database."""
    try:
        if content_type in ("live", "channel"):
            channel = await LiveChannel.get(content_id)
            return channel.name if channel else None
        content = await Content.get(content_id)
        return content.title if content else None
    except Exception:
        return None
