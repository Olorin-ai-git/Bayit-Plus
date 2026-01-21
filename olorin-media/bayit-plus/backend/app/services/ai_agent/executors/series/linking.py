"""
AI Agent Executors - Series Linking

Functions for linking episodes to their parent series and auto-linking episodes.
"""

import logging
from typing import Any, Dict

from app.core.config import settings
from app.models.content import Content
from app.services.ai_agent.executors._shared import (get_content_or_error,
                                                     handle_dry_run,
                                                     log_librarian_action)

logger = logging.getLogger(__name__)


async def execute_link_episode_to_series(
    episode_id: str, series_id: str, audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """
    Link episode to parent series.

    Args:
        episode_id: The ID of the episode to link.
        series_id: The ID of the parent series.
        audit_id: The audit ID for logging actions.
        dry_run: If True, simulate the operation without making changes.

    Returns:
        Dictionary with success status and linking result.
    """
    dry_run_result = handle_dry_run(
        dry_run,
        "link episode {episode_id} to series {series_id}",
        episode_id=episode_id,
        series_id=series_id,
    )
    if dry_run_result:
        return dry_run_result

    try:
        episode, error = await get_content_or_error(episode_id)
        if error:
            return error

        series, error = await get_content_or_error(series_id)
        if error:
            return {"success": False, "error": "Series not found"}

        episode.series_id = series_id

        # Inherit series artwork if episode doesn't have its own
        if series.poster_url:
            episode.poster_url = series.poster_url
        if series.thumbnail:
            episode.thumbnail = series.thumbnail
        if series.backdrop:
            episode.backdrop = series.backdrop

        await episode.save()

        await log_librarian_action(
            audit_id=audit_id,
            action_type="link_episode",
            content_id=episode_id,
            description=f"Linked episode '{episode.title}' to series '{series.title}'",
            content_type="episode",
            issue_type="unlinked_episode",
        )

        return {"success": True, "linked": True}
    except Exception as e:
        logger.error(f"Error linking episode {episode_id} to series {series_id}: {e}")
        return {"success": False, "error": str(e)}


async def execute_auto_link_episodes(
    audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """
    Auto-link unlinked episodes to series by matching titles.

    Uses title pattern matching to find potential series matches.

    Args:
        audit_id: The audit ID for logging actions.
        dry_run: If True, simulate the operation without making changes.

    Returns:
        Dictionary with success status and number of linked episodes.
    """
    try:
        batch_size = settings.SERIES_LINKER_AUTO_LINK_BATCH_SIZE

        unlinked = (
            await Content.find(
                {
                    "content_type": "episode",
                    "$or": [{"series_id": None}, {"series_id": ""}],
                }
            )
            .limit(batch_size)
            .to_list()
        )

        linked_count = 0

        for episode in unlinked:
            # Extract base title by removing season/episode markers
            title_base = _extract_series_title(episode.title)

            # Search for matching series by title
            series = await Content.find_one(
                {
                    "is_series": True,
                    "$or": [{"title": title_base}, {"title_en": title_base}],
                }
            )

            if series and not dry_run:
                episode.series_id = str(series.id)
                await episode.save()

                await log_librarian_action(
                    audit_id=audit_id,
                    action_type="auto_link_episode",
                    content_id=str(episode.id),
                    description=f"Auto-linked episode '{episode.title}' to series '{series.title}'",
                    content_type="episode",
                    issue_type="unlinked_episode",
                )

                linked_count += 1

        return {"success": True, "linked": linked_count, "dry_run": dry_run}
    except Exception as e:
        logger.error(f"Error auto-linking episodes: {e}")
        return {"success": False, "error": str(e)}


def _extract_series_title(episode_title: str) -> str:
    """
    Extract the base series title from an episode title.

    Removes common season/episode markers like "S01E02" or "Episode 3".

    Args:
        episode_title: The full episode title.

    Returns:
        The extracted series title.
    """
    title = episode_title

    # Remove "S##E##" pattern (e.g., "Show Name S01E02")
    if " S" in title:
        title = title.split(" S")[0]
    # Remove "Episode ##" pattern
    elif " E" in title:
        title = title.split(" E")[0]

    return title.strip()
