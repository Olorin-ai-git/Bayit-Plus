"""
AI Agent Executors - Series Orchestration

High-level workflow functions that orchestrate multiple series operations.
"""

import logging
from typing import Any, Dict

from app.models.content import Content
from app.services.ai_agent.executors._shared import handle_dry_run

from .linking import execute_auto_link_episodes
from .sync import execute_sync_series_posters_to_episodes

logger = logging.getLogger(__name__)


async def execute_organize_all_series(
    audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """
    Organize all series: link episodes, sync posters, fix duplicates.

    This is a comprehensive workflow that:
    1. Auto-links unlinked episodes to their series
    2. Syncs series posters to all episodes

    Args:
        audit_id: The audit ID for logging actions.
        dry_run: If True, simulate the operation without making changes.

    Returns:
        Dictionary with success status and operation counts.
    """
    dry_run_result = handle_dry_run(dry_run, "organize all series")
    if dry_run_result:
        return dry_run_result

    try:
        # Step 1: Auto-link unlinked episodes
        link_result = await execute_auto_link_episodes(audit_id, dry_run=False)

        # Step 2: Sync posters for all series
        all_series = await Content.find({"is_series": True}).to_list()
        synced = 0

        for series in all_series:
            result = await execute_sync_series_posters_to_episodes(
                str(series.id), audit_id, dry_run=False
            )
            if result.get("success"):
                synced += result.get("updated", 0)

        return {
            "success": True,
            "linked_episodes": link_result.get("linked", 0),
            "synced_posters": synced,
            "series_processed": len(all_series),
        }
    except Exception as e:
        logger.error(f"Error organizing all series: {e}")
        return {"success": False, "error": str(e)}
