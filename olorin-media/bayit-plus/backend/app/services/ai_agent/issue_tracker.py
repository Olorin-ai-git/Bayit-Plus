"""
AI Agent Issue Tracker

Tracks issues found and fix results during AI agent audits.
Populates AuditReport fields with content IDs for:
- Issues discovered (broken_streams, missing_metadata, etc.)
- Fix attempts that failed (for reapply functionality)
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from beanie import PydanticObjectId

from app.models.librarian import AuditReport

logger = logging.getLogger(__name__)


# Tool names that discover issues
FIND_TOOLS = {
    "find_missing_metadata",
    "find_duplicates",
    "find_quality_variants",
    "find_unlinked_episodes",
    "find_duplicate_episodes",
    "find_misclassified_episodes",
    "find_orphaned_gcs_files",
    "find_orphaned_content_records",
    "find_stuck_upload_jobs",
    "list_taxonomy_violations",
    "verify_required_subtitles",
}

# Tool names that fix issues
FIX_TOOLS = {
    "fix_missing_poster",
    "fix_missing_metadata",
    "recategorize_content",
    "reclassify_as_series",
    "reclassify_as_movie",
    "clean_title",
    "delete_broken_content",
    "resolve_duplicates",
    "link_quality_variants",
    "link_episode_to_series",
    "auto_link_episodes",
    "resolve_duplicate_episodes",
    "create_series_from_episode",
    "sync_series_posters_to_episodes",
    "fix_misclassified_series",
    "organize_all_series",
    "cleanup_orphans",
    "recover_stuck_jobs",
    "run_full_cleanup",
    "apply_taxonomy_classification",
    "batch_migrate_taxonomy",
    "download_external_subtitle",
    "batch_download_subtitles",
    "extract_video_subtitles",
}

# Map issue types to AuditReport fields
ISSUE_TYPE_TO_FIELD = {
    "broken_stream": "broken_streams",
    "missing_poster": "missing_metadata",
    "missing_metadata": "missing_metadata",
    "misclassification": "misclassifications",
    "orphaned": "orphaned_items",
    "duplicate": "misclassifications",
    "unlinked_episode": "misclassifications",
    "dirty_title": "missing_metadata",
    "missing_subtitle": "missing_metadata",
}


async def track_issues_found(
    audit_report: "AuditReport",
    tool_name: str,
    tool_result: Dict[str, Any],
) -> None:
    """
    Track issues found by discovery tools.

    Parses tool results and adds discovered content IDs to appropriate
    AuditReport fields (broken_streams, missing_metadata, etc.)

    Note: This function modifies the audit_report in-place. The caller is
    responsible for saving the report.
    """
    if tool_name not in FIND_TOOLS:
        return

    try:
        if not audit_report:
            return

        issues_to_add = _extract_issues_from_find_result(tool_name, tool_result)
        if not issues_to_add:
            return

        # Add to appropriate field
        for issue in issues_to_add:
            field_name = ISSUE_TYPE_TO_FIELD.get(
                issue.get("issue_type", ""), "missing_metadata"
            )
            field_list = getattr(audit_report, field_name, [])

            # Avoid duplicates
            existing_ids = {item.get("content_id") for item in field_list}
            if issue.get("content_id") not in existing_ids:
                field_list.append(issue)
                setattr(audit_report, field_name, field_list)

        logger.debug(f"Tracked {len(issues_to_add)} issues from {tool_name}")

    except Exception as e:
        logger.error(f"Failed to track issues from {tool_name}: {e}")


async def track_fix_result(
    audit_report: "AuditReport",
    tool_name: str,
    tool_input: Dict[str, Any],
    tool_result: Dict[str, Any],
) -> None:
    """
    Track fix tool results.

    If fix succeeded: adds to fixes_applied
    If fix failed: adds to manual_review_needed (for reapply)

    Note: This function modifies the audit_report in-place. The caller is
    responsible for saving the report.
    """
    logger.info(f"track_fix_result called: tool={tool_name}")

    if tool_name not in FIX_TOOLS:
        logger.debug(f"Skipping tracking for non-fix tool: {tool_name}")
        return

    try:
        if not audit_report:
            logger.warning(f"track_fix_result: No audit report provided")
            return

        content_id = _extract_content_id(tool_input, tool_result)
        if not content_id:
            logger.warning(f"track_fix_result: No content_id found in input or result for {tool_name}")
            return

        logger.info(f"track_fix_result: Tracking {tool_name} for content_id={content_id}")
        fix_record = {
            "content_id": content_id,
            "tool_name": tool_name,
            "tool_input": tool_input,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        success = tool_result.get("success", False)
        if success:
            # Add to fixes_applied
            fix_record["result"] = "success"
            fix_record["message"] = tool_result.get("message", "Fixed successfully")
            audit_report.fixes_applied.append(fix_record)
        else:
            # Add to manual_review_needed (will be used for reapply)
            fix_record["result"] = "failed"
            fix_record["error"] = tool_result.get("error", "Unknown error")
            fix_record["reapply_eligible"] = True
            audit_report.manual_review_needed.append(fix_record)

        logger.debug(
            f"Tracked fix result for {tool_name}: {'success' if success else 'failed'}"
        )

    except Exception as e:
        logger.error(f"Failed to track fix result for {tool_name}: {e}")


async def get_reapply_items(audit_id: str) -> List[Dict[str, Any]]:
    """
    Get items eligible for fix reapplication from a specific audit.

    Returns items that:
    1. Were attempted to be fixed but failed
    2. Are marked as reapply_eligible
    """
    try:
        audit_report = await _get_audit_report(audit_id)
        if not audit_report:
            return []

        reapply_items = []

        # Get failed fixes from manual_review_needed
        for item in audit_report.manual_review_needed:
            if item.get("reapply_eligible", False) and item.get("tool_name"):
                reapply_items.append({
                    "content_id": item.get("content_id"),
                    "tool_name": item.get("tool_name"),
                    "tool_input": item.get("tool_input", {}),
                    "original_error": item.get("error"),
                })

        # Also include unfixed issues from the discovery lists
        issue_fields = ["broken_streams", "missing_metadata", "misclassifications"]
        for field_name in issue_fields:
            field_list = getattr(audit_report, field_name, [])
            for item in field_list:
                content_id = item.get("content_id")
                # Check if this was fixed (exists in fixes_applied)
                was_fixed = any(
                    fix.get("content_id") == content_id
                    for fix in audit_report.fixes_applied
                )
                if not was_fixed:
                    issue_type = item.get("issue_type", "")
                    suggested_tool = _get_fix_tool_for_issue(issue_type)
                    if suggested_tool:
                        reapply_items.append({
                            "content_id": content_id,
                            "tool_name": suggested_tool,
                            "tool_input": {"content_id": content_id},
                            "issue_type": issue_type,
                            "title": item.get("title", "Unknown"),
                        })

        return reapply_items

    except Exception as e:
        logger.error(f"Failed to get reapply items for audit {audit_id}: {e}")
        return []


async def _get_audit_report(audit_id: str) -> Optional[AuditReport]:
    """Get audit report by ID."""
    try:
        object_id = PydanticObjectId(audit_id)
        return await AuditReport.get(object_id)
    except Exception:
        return await AuditReport.find_one({"audit_id": audit_id})


def _extract_issues_from_find_result(
    tool_name: str, result: Dict[str, Any]
) -> List[Dict[str, Any]]:
    """Extract issue records from find tool results."""
    issues = []

    # Handle different find tool result formats
    if tool_name == "find_missing_metadata":
        items = result.get("items", [])
        for item in items:
            issues.append({
                "content_id": item.get("id") or item.get("content_id"),
                "title": item.get("title", "Unknown"),
                "issue_type": "missing_metadata",
                "missing_fields": item.get("missing_fields", []),
            })

    elif tool_name == "verify_required_subtitles":
        missing = result.get("missing_subtitles", [])
        for item in missing:
            issues.append({
                "content_id": item.get("id") or item.get("content_id"),
                "title": item.get("title", "Unknown"),
                "issue_type": "missing_subtitle",
                "missing_languages": item.get("missing", []),
            })

    elif tool_name in ("find_duplicates", "find_duplicate_episodes"):
        duplicates = result.get("duplicates", [])
        for group in duplicates:
            for item in group.get("items", []):
                issues.append({
                    "content_id": item.get("id") or item.get("content_id"),
                    "title": item.get("title", "Unknown"),
                    "issue_type": "duplicate",
                })

    elif tool_name == "find_misclassified_episodes":
        items = result.get("items", result.get("misclassified", []))
        for item in items:
            issues.append({
                "content_id": item.get("id") or item.get("content_id"),
                "title": item.get("title", "Unknown"),
                "issue_type": "misclassification",
            })

    elif tool_name in ("find_orphaned_gcs_files", "find_orphaned_content_records"):
        items = result.get("orphans", result.get("items", []))
        for item in items:
            issues.append({
                "content_id": item.get("id") or item.get("content_id") or item.get("path"),
                "title": item.get("title", item.get("path", "Unknown")),
                "issue_type": "orphaned",
            })

    elif tool_name == "list_taxonomy_violations":
        items = result.get("violations", [])
        for item in items:
            issues.append({
                "content_id": item.get("id") or item.get("content_id"),
                "title": item.get("title", "Unknown"),
                "issue_type": "misclassification",
                "violation": item.get("violation", ""),
            })

    # Generic handler for other find tools
    else:
        items = result.get("items", result.get("results", []))
        if isinstance(items, list):
            for item in items:
                if isinstance(item, dict):
                    content_id = (
                        item.get("id")
                        or item.get("content_id")
                        or item.get("item_id")
                    )
                    if content_id:
                        issues.append({
                            "content_id": content_id,
                            "title": item.get("title", "Unknown"),
                            "issue_type": tool_name.replace("find_", ""),
                        })

    return issues


def _extract_content_id(
    tool_input: Dict[str, Any], tool_result: Dict[str, Any]
) -> Optional[str]:
    """Extract content ID from tool input or result."""
    # Try input first
    content_id = (
        tool_input.get("content_id")
        or tool_input.get("id")
        or tool_input.get("item_id")
    )
    if content_id:
        return str(content_id)

    # Then try result
    content_id = (
        tool_result.get("content_id")
        or tool_result.get("id")
        or tool_result.get("item_id")
    )
    if content_id:
        return str(content_id)

    return None


def _get_fix_tool_for_issue(issue_type: str) -> Optional[str]:
    """Map issue type to appropriate fix tool."""
    mapping = {
        "missing_metadata": "fix_missing_metadata",
        "missing_poster": "fix_missing_poster",
        "missing_subtitle": "download_external_subtitle",
        "dirty_title": "clean_title",
        "misclassification": "recategorize_content",
        "duplicate": "resolve_duplicates",
        "broken_stream": None,  # Usually requires deletion or manual intervention
        "orphaned": "cleanup_orphans",
    }
    return mapping.get(issue_type)
