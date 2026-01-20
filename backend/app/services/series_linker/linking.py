"""
Episode Linking Module

Provides the core episode-to-series linking functionality.
"""

import logging
from datetime import datetime
from typing import Optional

from app.models.content import Content
from app.models.librarian import LibrarianAction
from app.services.series_linker.constants import LinkingResult
from beanie import PydanticObjectId

logger = logging.getLogger(__name__)


async def link_episode_to_series(
    episode_id: str,
    series_id: str,
    season: Optional[int] = None,
    episode_num: Optional[int] = None,
    audit_id: Optional[str] = None,
    dry_run: bool = False,
    reason: str = "",
) -> LinkingResult:
    """
    Link an episode to its parent series.

    Updates the episode's series_id, season, and episode fields,
    and logs the action to the audit trail if audit_id is provided.

    Args:
        episode_id: The episode Content ID
        series_id: The parent series Content ID
        season: Season number (optional, uses episode's existing value)
        episode_num: Episode number (optional, uses episode's existing value)
        audit_id: Audit ID for tracking
        dry_run: If True, don't actually make changes
        reason: Reason for the linking (for audit log)

    Returns:
        LinkingResult with success status and details
    """
    try:
        episode = await Content.find_one(Content.id == PydanticObjectId(episode_id))
        series = await Content.find_one(Content.id == PydanticObjectId(series_id))

        if not episode:
            return LinkingResult(
                success=False,
                episode_id=episode_id,
                error=f"Episode {episode_id} not found",
            )

        if not series:
            return LinkingResult(
                success=False,
                episode_id=episode_id,
                error=f"Series {series_id} not found",
            )

        if not series.is_series:
            return LinkingResult(
                success=False,
                episode_id=episode_id,
                series_id=series_id,
                error=f"Content {series_id} is not a series",
            )

        before_state = {
            "series_id": episode.series_id,
            "season": episode.season,
            "episode": episode.episode,
        }

        final_season = season if season is not None else episode.season
        final_episode = episode_num if episode_num is not None else episode.episode

        if dry_run:
            return LinkingResult(
                success=True,
                episode_id=episode_id,
                series_id=series_id,
                series_title=series.title,
                action=f"[DRY RUN] Would link to '{series.title}' S{final_season}E{final_episode}",
                confidence=1.0,
                dry_run=True,
            )

        episode.series_id = series_id
        if final_season is not None:
            episode.season = final_season
        if final_episode is not None:
            episode.episode = final_episode
        episode.updated_at = datetime.utcnow()

        await episode.save()

        after_state = {
            "series_id": series_id,
            "season": final_season,
            "episode": final_episode,
        }

        if audit_id:
            action = LibrarianAction(
                audit_id=audit_id,
                action_type="link_episode",
                content_id=episode_id,
                content_type="episode",
                issue_type="unlinked_episode",
                description=reason or f"Linked '{episode.title}' to '{series.title}'",
                before_state=before_state,
                after_state=after_state,
                confidence_score=1.0,
                auto_approved=True,
                timestamp=datetime.utcnow(),
            )
            await action.insert()

        logger.info(
            f"Linked '{episode.title}' to '{series.title}' (S{final_season}E{final_episode})"
        )

        return LinkingResult(
            success=True,
            episode_id=episode_id,
            series_id=series_id,
            series_title=series.title,
            action=f"Linked to '{series.title}' S{final_season}E{final_episode}",
            confidence=1.0,
            dry_run=False,
        )

    except Exception as e:
        logger.error(f"Error linking episode to series: {e}", exc_info=True)
        return LinkingResult(
            success=False,
            episode_id=episode_id,
            error=str(e),
        )
