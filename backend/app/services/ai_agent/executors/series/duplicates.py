"""
AI Agent Executors - Series Duplicates

Functions for finding and resolving duplicate episodes in series.
"""

import logging
from typing import Any, Dict, List, Optional

from app.models.content import Content
from app.services.ai_agent.executors._shared import handle_dry_run, log_librarian_action

logger = logging.getLogger(__name__)


async def execute_find_duplicate_episodes(
    series_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Find duplicate episodes in series.

    Detects episodes with the same series_id, season, and episode number.

    Args:
        series_id: Optional series ID to limit search to a specific series.

    Returns:
        Dictionary with success status, count, and list of duplicate groups.
    """
    try:
        query: Dict[str, Any] = {
            "content_type": "episode",
            "season": {"$ne": None},
            "episode": {"$ne": None},
        }
        if series_id:
            query["series_id"] = series_id

        episodes = await Content.find(query).to_list()
        duplicates: List[Dict[str, Any]] = []
        seen: Dict[str, str] = {}

        for ep in episodes:
            key = f"{ep.series_id}:{ep.season}:{ep.episode}"
            if key in seen:
                duplicates.append(
                    {
                        "season": ep.season,
                        "episode": ep.episode,
                        "ids": [seen[key], str(ep.id)],
                    }
                )
            else:
                seen[key] = str(ep.id)

        return {"success": True, "count": len(duplicates), "duplicates": duplicates}
    except Exception as e:
        logger.error(f"Error finding duplicate episodes: {e}")
        return {"success": False, "error": str(e)}


async def execute_resolve_duplicate_episodes(
    episode_ids: List[str], keep_id: str, audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """
    Resolve duplicate episodes by keeping one and deleting others.

    Args:
        episode_ids: List of all duplicate episode IDs.
        keep_id: The ID of the episode to keep.
        audit_id: The audit ID for logging actions.
        dry_run: If True, simulate the operation without making changes.

    Returns:
        Dictionary with success status, kept ID, and list of deleted IDs.
    """
    dry_run_result = handle_dry_run(
        dry_run,
        "keep episode {keep_id}, delete {delete_count} duplicates",
        keep_id=keep_id,
        delete_count=len(episode_ids) - 1,
    )
    if dry_run_result:
        return dry_run_result

    try:
        deleted: List[str] = []

        for ep_id in episode_ids:
            if ep_id != keep_id:
                episode = await Content.get(ep_id)
                if episode:
                    await episode.delete()
                    deleted.append(ep_id)

                    await log_librarian_action(
                        audit_id=audit_id,
                        action_type="delete_duplicate",
                        content_id=ep_id,
                        description=f"Deleted duplicate episode '{episode.title}' (keeping {keep_id})",
                        content_type="episode",
                        issue_type="duplicate_episode",
                    )

        return {"success": True, "kept": keep_id, "deleted": deleted}
    except Exception as e:
        logger.error(f"Error resolving duplicate episodes: {e}")
        return {"success": False, "error": str(e)}
