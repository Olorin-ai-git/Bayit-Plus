"""Apply specific fix types to content."""
import logging

logger = logging.getLogger(__name__)


async def _apply_title_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply dirty title fixes."""
    from app.services.ai_agent.executors.metadata.titles import execute_clean_title

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            result = await execute_clean_title(
                content_id=content_id, audit_id=audit_id, dry_run=dry_run
            )
            if result.get("success"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Title fix failed for {content_id}: {e}")
    return stats


async def _apply_metadata_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply missing metadata fixes."""
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_fix_missing_metadata,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            result = await execute_fix_missing_metadata(
                content_id=content_id,
                reason="Reapply fix from previous audit",
                audit_id=audit_id,
                dry_run=dry_run,
            )
            if result.get("success"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Metadata fix failed for {content_id}: {e}")
    return stats


async def _apply_poster_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply missing poster fixes."""
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_fix_missing_poster,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            result = await execute_fix_missing_poster(
                content_id=content_id,
                reason="Reapply fix from previous audit",
                audit_id=audit_id,
                dry_run=dry_run,
            )
            if result.get("success") or result.get("fixed"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Poster fix failed for {content_id}: {e}")
    return stats