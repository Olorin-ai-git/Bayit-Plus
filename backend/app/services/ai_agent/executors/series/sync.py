"""
AI Agent Executors - Series Sync

Functions for synchronizing series metadata to episodes.
"""

import logging
from typing import Any, Dict

from app.models.content import Content
from app.services.ai_agent.executors._shared import (
    get_content_or_error,
    handle_dry_run,
    log_librarian_action,
)

logger = logging.getLogger(__name__)


async def execute_sync_series_posters_to_episodes(
    series_id: str, audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """
    Sync series posters to all episodes.

    Updates poster_url, thumbnail, and backdrop for all episodes in a series.

    Args:
        series_id: The ID of the series to sync.
        audit_id: The audit ID for logging actions.
        dry_run: If True, simulate the operation without making changes.

    Returns:
        Dictionary with success status, updated count, and total episodes.
    """
    dry_run_result = handle_dry_run(
        dry_run, "sync posters for series {series_id}", series_id=series_id
    )
    if dry_run_result:
        return dry_run_result

    try:
        series, error = await get_content_or_error(series_id)
        if error:
            return error

        episodes = await Content.find({"series_id": series_id}).to_list()
        updated_count = 0

        for ep in episodes:
            changed = False

            # Update poster if series has one and it differs
            if series.poster_url and ep.poster_url != series.poster_url:
                ep.poster_url = series.poster_url
                changed = True

            # Update thumbnail if series has one and it differs
            if series.thumbnail and ep.thumbnail != series.thumbnail:
                ep.thumbnail = series.thumbnail
                changed = True

            # Update backdrop if series has one and it differs
            if series.backdrop and ep.backdrop != series.backdrop:
                ep.backdrop = series.backdrop
                changed = True

            if changed:
                await ep.save()
                updated_count += 1

        # Log action if any episodes were updated
        if updated_count > 0:
            await log_librarian_action(
                audit_id=audit_id,
                action_type="sync_series_posters",
                content_id=series_id,
                description=f"Synced posters from '{series.title}' to {updated_count} episodes",
                content_type="series",
                issue_type="inconsistent_artwork",
            )

        return {
            "success": True,
            "updated": updated_count,
            "total_episodes": len(episodes),
        }
    except Exception as e:
        logger.error(f"Error syncing series posters for {series_id}: {e}")
        return {"success": False, "error": str(e)}
