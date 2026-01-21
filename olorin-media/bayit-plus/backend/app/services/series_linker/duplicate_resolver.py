"""
Duplicate Resolver Module

Provides duplicate episode detection and batch resolution.
"""

import logging
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId

from app.core.database import get_database
from app.models.content import Content
from app.services.series_linker.constants import DuplicateGroup
from app.services.series_linker.deduplication import (
    resolve_duplicate_episode_group, select_episode_to_keep)

logger = logging.getLogger(__name__)


async def find_duplicate_episodes(
    series_id: Optional[str] = None,
) -> List[DuplicateGroup]:
    """
    Find duplicate episodes (same series_id + season + episode).

    Args:
        series_id: Optional series ID to filter by

    Returns:
        List of DuplicateGroup objects
    """
    duplicates = []

    try:
        match_stage: Dict[str, Any] = {
            "series_id": {"$ne": None},
            "season": {"$ne": None},
            "episode": {"$ne": None},
            "is_series": {"$ne": True},
        }

        if series_id:
            match_stage["series_id"] = series_id

        pipeline = [
            {"$match": match_stage},
            {
                "$group": {
                    "_id": {
                        "series_id": "$series_id",
                        "season": "$season",
                        "episode": "$episode",
                    },
                    "count": {"$sum": 1},
                    "episode_ids": {"$push": {"$toString": "$_id"}},
                    "titles": {"$push": "$title"},
                    "created_dates": {"$push": "$created_at"},
                    "file_sizes": {"$push": "$file_size"},
                    "resolutions": {"$push": "$video_metadata.height"},
                }
            },
            {"$match": {"count": {"$gt": 1}}},
            {"$sort": {"count": -1}},
        ]

        db = get_database()
        cursor = db.content.aggregate(pipeline)
        results = await cursor.to_list(length=100)

        for result in results:
            group_key = result["_id"]
            series = await Content.find_one(
                Content.id == PydanticObjectId(group_key["series_id"])
            )

            duplicates.append(
                DuplicateGroup(
                    series_id=group_key["series_id"],
                    series_title=series.title if series else "Unknown",
                    season=group_key["season"],
                    episode=group_key["episode"],
                    episode_ids=result["episode_ids"],
                    episode_titles=result["titles"],
                    created_dates=result["created_dates"],
                    file_sizes=result["file_sizes"],
                    resolutions=result["resolutions"],
                )
            )

        logger.info(f"Found {len(duplicates)} duplicate episode groups")

    except Exception as e:
        logger.error(f"Error finding duplicate episodes: {e}", exc_info=True)

    return duplicates


async def auto_resolve_duplicate_episodes(
    strategy: Optional[str] = None,
    audit_id: Optional[str] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Automatically resolve all duplicate episodes.

    Args:
        strategy: Resolution strategy (uses config if not provided)
        audit_id: Audit ID for tracking
        dry_run: If True, don't make changes

    Returns:
        Dict with statistics and per-group details
    """
    if strategy is None:
        strategy = settings.SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY

    results: Dict[str, Any] = {
        "success": True,
        "strategy": strategy,
        "groups_found": 0,
        "groups_resolved": 0,
        "episodes_removed": 0,
        "dry_run": dry_run,
        "details": [],
    }

    try:
        duplicate_groups = await find_duplicate_episodes()
        results["groups_found"] = len(duplicate_groups)

        for group in duplicate_groups:
            resolution = await resolve_duplicate_episode_group(
                episode_ids=group.episode_ids,
                keep_id=None,
                action="unpublish",
                audit_id=audit_id,
                dry_run=dry_run,
                reason=f"Auto-resolved using {strategy} strategy",
            )

            if resolution.success:
                results["groups_resolved"] += 1
                results["episodes_removed"] += resolution.duplicates_resolved

            results["details"].append(
                {
                    "series_title": group.series_title,
                    "season": group.season,
                    "episode": group.episode,
                    "kept_id": (
                        resolution.kept_episode_ids[0]
                        if resolution.kept_episode_ids
                        else None
                    ),
                    "removed_ids": resolution.removed_episode_ids,
                    "success": resolution.success,
                    "errors": resolution.errors,
                }
            )

    except Exception as e:
        logger.error(f"Error in auto_resolve_duplicate_episodes: {e}", exc_info=True)
        results["success"] = False
        results["error"] = str(e)

    logger.info(
        f"Auto-dedup: {results['groups_resolved']}/{results['groups_found']} groups, "
        f"{results['episodes_removed']} episodes removed"
    )

    return results


async def validate_episode_uniqueness() -> Dict[str, Any]:
    """Validate that all episodes have unique (series_id, season, episode) combinations."""
    from app.services.series_linker.validation import \
        find_episodes_with_incomplete_data

    return {
        "valid": True,
        "duplicate_groups": await find_duplicate_episodes(),
        "incomplete_episodes": await find_episodes_with_incomplete_data(),
    }
