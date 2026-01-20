"""
Validation Module

Provides input validation and data quality checks for series linking.
"""

import logging
from typing import Any, Dict, List

from app.models.content import Content
from app.services.series_linker.constants import UnlinkedEpisode
from app.services.series_linker.episode_matcher import extract_series_info_from_title

logger = logging.getLogger(__name__)


async def find_unlinked_episodes(limit: int = 100) -> List[UnlinkedEpisode]:
    """
    Find episodes that have season/episode info but no series_id.

    Identifies content that appears to be an episode (has season or episode
    number) but is not linked to a parent series container.

    Args:
        limit: Maximum number of unlinked episodes to return

    Returns:
        List of UnlinkedEpisode objects with extracted series info
    """
    unlinked = []

    try:
        # Query for content that appears to be an episode but has no series_id
        # An episode has season OR episode number but no series_id
        query = {
            "$and": [
                {"is_published": True},
                {"is_series": {"$ne": True}},  # Not a series container
                {"series_id": None},
                {
                    "$or": [
                        {"season": {"$ne": None}},
                        {"episode": {"$ne": None}},
                    ]
                },
            ]
        }

        episodes = await Content.find(query).limit(limit).to_list()

        for ep in episodes:
            # Try to extract series name from title
            series_name, season, episode_num = extract_series_info_from_title(
                ep.title or ep.title_en or ""
            )

            unlinked.append(
                UnlinkedEpisode(
                    content_id=str(ep.id),
                    title=ep.title,
                    title_en=ep.title_en,
                    extracted_series_name=series_name,
                    season=ep.season or season,
                    episode=ep.episode or episode_num,
                    created_at=ep.created_at,
                )
            )

        logger.info(f"Found {len(unlinked)} unlinked episodes")

    except Exception as e:
        logger.error(f"Error finding unlinked episodes: {e}", exc_info=True)

    return unlinked


async def find_episodes_with_incomplete_data() -> List[Dict[str, Any]]:
    """
    Find episodes with missing season or episode numbers.

    Identifies episodes that are linked to a series but are missing
    their season and/or episode number, which may cause display issues.

    Returns:
        List of dicts with episode details and missing field information
    """
    results: List[Dict[str, Any]] = []

    try:
        # Find episodes that have series_id but missing season/episode
        query = {
            "series_id": {"$ne": None},
            "is_series": {"$ne": True},
            "$or": [
                {"season": None},
                {"episode": None},
            ],
        }

        episodes = await Content.find(query).limit(100).to_list()

        for ep in episodes:
            missing = []
            if ep.season is None:
                missing.append("season")
            if ep.episode is None:
                missing.append("episode")

            results.append(
                {
                    "content_id": str(ep.id),
                    "title": ep.title,
                    "series_id": ep.series_id,
                    "season": ep.season,
                    "episode": ep.episode,
                    "missing": missing,
                }
            )

    except Exception as e:
        logger.error(f"Error finding incomplete episodes: {e}")

    return results
