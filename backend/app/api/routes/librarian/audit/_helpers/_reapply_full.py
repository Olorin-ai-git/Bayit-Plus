"""Full reapply fixes implementation."""
import logging
from datetime import datetime
from typing import List, Optional

from app.models.librarian import AuditReport

from ._extraction import _extract_issues_from_database

logger = logging.getLogger(__name__)

async def _run_reapply_fixes(
    source_audit: AuditReport,
    fix_audit_id: str,
    fix_types: List[str],
    dry_run: bool,
):
    """Background task to reapply fixes from an audit."""
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_fix_missing_metadata,
        execute_fix_missing_poster,
        execute_flag_for_manual_review,
    )
    from app.services.ai_agent.executors.metadata.titles import execute_clean_title
    from app.services.ai_agent.executors.series.classification import (
        execute_fix_misclassified_series,
    )
    from app.services.ai_agent.executors.subtitles import (
        execute_check_subtitle_quota,
        execute_download_external_subtitle,
    )
    from app.services.ai_agent.issue_tracker import get_reapply_items

    start_time = datetime.utcnow()
    all_stats = {}

    try:
        # First, try to get tracked issues from the original audit
        # This uses data stored by the issue_tracker during the original audit
        tracked_items = await get_reapply_items(str(source_audit.id))

        # Also check the audit's stored issue fields
        audit_issues = _extract_issues_from_audit_report(source_audit)

        # If we have tracked data from the original audit, use it
        used_tracked_data = False
        if tracked_items or any(audit_issues.values()):
            logger.info(
                f"Found tracked data from audit {source_audit.audit_id}: "
                f"{len(tracked_items)} tracked items, "
                f"{sum(len(v) for v in audit_issues.values())} from audit fields"
            )
            issues = _merge_issue_sources(tracked_items, audit_issues)
            used_tracked_data = True
        else:
            # Fallback: Scan database for items that currently have issues
            # This is less ideal but works for audits that didn't track issues
            logger.info(
                f"No tracked data in audit {source_audit.audit_id}, "
                f"falling back to database scan"
            )
            issues = await _extract_issues_from_database(limit_per_type=200)

        # Get or create the fix audit record
        fix_audit = await AuditReport.find_one({"audit_id": fix_audit_id})
        if not fix_audit:
            return

        # Apply fixes based on requested types
        if "titles" in fix_types:
            stats = await _apply_title_fixes(
                fix_audit_id, issues.get("dirty_titles", []), dry_run
            )
            all_stats["dirty_titles"] = stats
            await _log_fix_progress(fix_audit, "titles", stats)

        if "metadata" in fix_types:
            stats = await _apply_metadata_fixes(
                fix_audit_id, issues.get("missing_metadata", []), dry_run
            )
            all_stats["missing_metadata"] = stats
            await _log_fix_progress(fix_audit, "metadata", stats)

        if "posters" in fix_types:
            stats = await _apply_poster_fixes(
                fix_audit_id, issues.get("missing_posters", []), dry_run
            )
            all_stats["missing_posters"] = stats
            await _log_fix_progress(fix_audit, "posters", stats)

        if "subtitles" in fix_types:
            stats = await _apply_subtitle_fixes(
                fix_audit_id, issues.get("missing_subtitles", []), dry_run
            )
            all_stats["missing_subtitles"] = stats
            await _log_fix_progress(fix_audit, "subtitles", stats)

        if "misclassifications" in fix_types:
            stats = await _apply_misclassification_fixes(
                fix_audit_id, issues.get("misclassifications", []), dry_run
            )
            all_stats["misclassifications"] = stats
            await _log_fix_progress(fix_audit, "misclassifications", stats)

        if "broken_streams" in fix_types:
            stats = await _apply_broken_stream_fixes(
                fix_audit_id, issues.get("broken_streams", []), dry_run
            )
            all_stats["broken_streams"] = stats
            await _log_fix_progress(fix_audit, "broken_streams", stats)

        # Calculate totals
        total_attempted = sum(s.get("attempted", 0) for s in all_stats.values())
        total_success = sum(s.get("success", 0) for s in all_stats.values())
        total_failed = sum(s.get("failed", 0) for s in all_stats.values())

        # Update fix audit with results
        fix_audit.status = "completed"
        fix_audit.execution_time_seconds = (
            datetime.utcnow() - start_time
        ).total_seconds()
        fix_audit.summary = {
            "source_audit_id": source_audit.audit_id,
            "dry_run": dry_run,
            "fix_types": fix_types,
            "total_attempted": total_attempted,
            "total_success": total_success,
            "total_failed": total_failed,
            "stats_by_type": all_stats,
            "used_tracked_data": used_tracked_data,
            "note": (
                "Used tracked issues from original audit"
                if used_tracked_data
                else "Fell back to database scan (original audit had no tracked data)"
            ),
        }
        fix_audit.completed_at = datetime.utcnow()
        await fix_audit.save()

        logger.info(
            f"Reapply fixes completed for {fix_audit_id}: {total_success}/{total_attempted} successful"
        )

    except Exception as e:
        logger.error(f"Error in reapply fixes task {fix_audit_id}: {e}")
        fix_audit = await AuditReport.find_one({"audit_id": fix_audit_id})
        if fix_audit:
            fix_audit.status = "failed"
            fix_audit.summary["error"] = str(e)
            fix_audit.completed_at = datetime.utcnow()
            await fix_audit.save()


def _extract_issues_from_audit_report(audit: AuditReport) -> dict:
    """Extract tracked issues from an audit report's stored fields."""
    issues = {
        "dirty_titles": [],
        "missing_metadata": [],
        "missing_posters": [],
        "missing_subtitles": [],
        "misclassifications": [],
        "broken_streams": [],
    }

    # Get issues from the audit's tracked fields
    # These are populated by the issue_tracker during the audit

    # missing_metadata field contains both missing metadata and dirty titles
    for item in audit.missing_metadata or []:
        content_id = item.get("content_id")
        if not content_id:
            continue

        issue_type = item.get("issue_type", "missing_metadata")
        target_list = issues.get(issue_type) or issues["missing_metadata"]

        # Check if this was already fixed
        was_fixed = any(
            fix.get("content_id") == content_id
            for fix in (audit.fixes_applied or [])
        )
        if not was_fixed:
            target_list.append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
                "issue_type": issue_type,
            })

    # broken_streams
    for item in audit.broken_streams or []:
        content_id = item.get("content_id")
        if content_id:
            issues["broken_streams"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
                "error": item.get("error", "Stream validation failed"),
            })

    # misclassifications
    for item in audit.misclassifications or []:
        content_id = item.get("content_id")
        if content_id:
            issues["misclassifications"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
            })

    # manual_review_needed contains failed fixes that can be retried
    for item in audit.manual_review_needed or []:
        if not item.get("reapply_eligible", False):
            continue

        content_id = item.get("content_id")
        tool_name = item.get("tool_name", "")

        if not content_id:
            continue

        # Map tool name to issue category
        if "poster" in tool_name:
            issues["missing_posters"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
            })
        elif "metadata" in tool_name:
            issues["missing_metadata"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
            })
        elif "title" in tool_name or "clean" in tool_name:
            issues["dirty_titles"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
            })
        elif "subtitle" in tool_name:
            issues["missing_subtitles"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
                "language": item.get("tool_input", {}).get("language", "en"),
            })

    return issues


def _merge_issue_sources(tracked_items: list, audit_issues: dict) -> dict:
    """Merge tracked items from issue_tracker with audit report fields."""
    issues = {
        "dirty_titles": [],
        "missing_metadata": [],
        "missing_posters": [],
        "missing_subtitles": [],
        "misclassifications": [],
        "broken_streams": [],
    }

    seen_ids = set()

    # First, add items from tracked_items (from issue_tracker)
    for item in tracked_items:
        content_id = item.get("content_id")
        if content_id in seen_ids:
            continue
        seen_ids.add(content_id)

        tool_name = item.get("tool_name", "")
        issue_type = item.get("issue_type", "")

        # Determine category from tool name or issue type
        if "poster" in tool_name or issue_type == "missing_poster":
            issues["missing_posters"].append(item)
        elif "metadata" in tool_name or issue_type == "missing_metadata":
            issues["missing_metadata"].append(item)
        elif "title" in tool_name or "clean" in tool_name or issue_type == "dirty_title":
            issues["dirty_titles"].append(item)
        elif "subtitle" in tool_name or issue_type == "missing_subtitle":
            issues["missing_subtitles"].append(item)
        elif "classif" in tool_name or issue_type == "misclassification":
            issues["misclassifications"].append(item)
        elif "stream" in tool_name or issue_type == "broken_stream":
            issues["broken_streams"].append(item)
        else:
            # Default to missing_metadata
            issues["missing_metadata"].append(item)

    # Then, add items from audit report fields (avoiding duplicates)
    for category, items in audit_issues.items():
        for item in items:
            content_id = item.get("id") or item.get("content_id")
            if content_id and content_id not in seen_ids:
                seen_ids.add(content_id)
                issues[category].append(item)

    return issues