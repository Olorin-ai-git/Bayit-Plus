"""Reapply fixes from previous audits without re-scanning."""
import logging
from typing import Optional

from app.models.librarian import AuditReport

logger = logging.getLogger(__name__)

async def _try_reapply_from_recent_audit(dry_run: bool = False) -> Optional[dict]:
    """
    Try to reapply fixes from the most recent audit that has tracked data.

    This runs WITHOUT the LLM - it directly calls executor functions for items
    that failed in previous audits and are marked as reapply_eligible.

    Returns dict with results or None if no eligible items found.
    """
    from app.services.ai_agent.issue_tracker import get_reapply_items
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_fix_missing_metadata,
        execute_fix_missing_poster,
    )
    from app.services.ai_agent.executors.metadata.titles import execute_clean_title

    try:
        # Find most recent audit with tracked data
        recent_audits = await AuditReport.find(
            {"status": {"$in": ["completed", "partial", "failed"]}}
        ).sort([("audit_date", -1)]).limit(5).to_list()

        source_audit = None
        tracked_items = []

        for audit in recent_audits:
            items = await get_reapply_items(str(audit.id))
            if items:
                source_audit = audit
                tracked_items = items
                break

        if not tracked_items:
            logger.info("No items found for reapply from recent audits")
            return None

        logger.info(
            f"Found {len(tracked_items)} items to reapply from audit {source_audit.id}"
        )

        # Apply fixes directly without LLM
        results = {"source_audit_id": str(source_audit.id), "fixes_applied": 0, "fixes_failed": 0, "details": []}

        for item in tracked_items:
            tool_name = item.get("tool_name")
            content_id = item.get("content_id")
            tool_input = item.get("tool_input", {"content_id": content_id})

            if dry_run:
                results["details"].append({"tool": tool_name, "content_id": content_id, "status": "skipped_dry_run"})
                continue

            try:
                if tool_name == "fix_missing_metadata":
                    result = await execute_fix_missing_metadata(content_id=content_id)
                elif tool_name == "fix_missing_poster":
                    result = await execute_fix_missing_poster(content_id=content_id)
                elif tool_name == "clean_title":
                    result = await execute_clean_title(content_id=content_id)
                else:
                    result = {"success": False, "error": f"Unknown tool: {tool_name}"}

                if result.get("success"):
                    results["fixes_applied"] += 1
                    results["details"].append({"tool": tool_name, "content_id": content_id, "status": "success"})
                else:
                    results["fixes_failed"] += 1
                    results["details"].append({"tool": tool_name, "content_id": content_id, "status": "failed", "error": result.get("error")})

            except Exception as e:
                results["fixes_failed"] += 1
                results["details"].append({"tool": tool_name, "content_id": content_id, "status": "error", "error": str(e)})

        logger.info(f"Reapply completed: {results['fixes_applied']} applied, {results['fixes_failed']} failed")
        return results

    except Exception as e:
        logger.error(f"Error in reapply from recent audit: {e}")
        return None

