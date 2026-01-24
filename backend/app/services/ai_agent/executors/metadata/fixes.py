"""
AI Agent Executors - Metadata Fix Operations

Functions for fixing missing posters, metadata, and broken content.
"""

import logging
from typing import Any, Dict

from app.services.ai_agent.executors._shared import (get_content_or_error,
                                                     handle_dry_run,
                                                     log_librarian_action)

logger = logging.getLogger(__name__)


async def execute_fix_missing_poster(
    content_id: str, reason: str, *, audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """
    Fix missing poster for content by fetching from TMDB.

    Args:
        content_id: The content ID to fix
        reason: Reason for the fix
        audit_id: The audit ID for logging (keyword-only)
        dry_run: If True, only simulate the operation (keyword-only)

    Returns:
        Dict with success status and fix results
    """
    dry_run_result = handle_dry_run(
        dry_run, "fix missing poster for {content_id}", content_id=content_id
    )
    if dry_run_result:
        return dry_run_result

    try:
        content, error = await get_content_or_error(content_id)
        if error:
            return error

        from app.services.auto_fixer import fix_missing_metadata

        result = await fix_missing_metadata(content_id)

        if result.get("fixed"):
            await log_librarian_action(
                audit_id=audit_id,
                action_type="poster_fix",
                content_id=content_id,
                description=f"Fixed missing poster for '{content.title}'",
                issue_type="missing_poster",
            )

        return result
    except Exception as e:
        logger.error(f"Error fixing poster: {e}")
        return {"success": False, "error": str(e)}


async def execute_fix_missing_metadata(
    content_id: str, reason: str, *, audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """
    Fix missing metadata fields for content.

    Args:
        content_id: The content ID to fix
        reason: Brief explanation of what metadata is missing (required)
        audit_id: The audit ID for logging (keyword-only)
        dry_run: If True, only simulate the operation (keyword-only)

    Returns:
        Dict with success status and fix results
    """
    dry_run_result = handle_dry_run(
        dry_run, "fix metadata for {content_id}", content_id=content_id
    )
    if dry_run_result:
        return dry_run_result

    try:
        from app.services.auto_fixer import fix_missing_metadata

        result = await fix_missing_metadata(content_id)
        if reason and result.get("success"):
            result["reason"] = reason
        return result
    except Exception as e:
        logger.error(f"Error fixing metadata: {e}")
        return {"success": False, "error": str(e)}


async def execute_delete_broken_content(
    content_id: str, audit_id: str, reason: str, dry_run: bool = False
) -> Dict[str, Any]:
    """
    Delete broken/invalid content.

    Args:
        content_id: The content ID to delete
        audit_id: The audit ID for logging
        reason: Reason for deletion
        dry_run: If True, only simulate the operation

    Returns:
        Dict with success status and deletion results
    """
    dry_run_result = handle_dry_run(
        dry_run, "delete {content_id}", content_id=content_id
    )
    if dry_run_result:
        return dry_run_result

    try:
        content, error = await get_content_or_error(content_id)
        if error:
            return error

        title = content.title
        await content.delete()

        await log_librarian_action(
            audit_id=audit_id,
            action_type="delete",
            content_id=content_id,
            description=f"Deleted broken content '{title}': {reason}",
            issue_type="broken_content",
        )

        return {"success": True, "deleted": True, "title": title}
    except Exception as e:
        logger.error(f"Error deleting broken content: {e}")
        return {"success": False, "error": str(e)}


async def execute_flag_for_manual_review(
    content_id: str, audit_id: str, reason: str
) -> Dict[str, Any]:
    """
    Flag content for manual review.

    Args:
        content_id: The content ID to flag
        audit_id: The audit ID for logging
        reason: Reason for flagging

    Returns:
        Dict with success status
    """
    try:
        await log_librarian_action(
            audit_id=audit_id,
            action_type="flag_review",
            content_id=content_id,
            description=f"Flagged for review: {reason}",
            issue_type="needs_review",
            auto_approved=False,
        )
        return {"success": True, "flagged": True}
    except Exception as e:
        logger.error(f"Error flagging content: {e}")
        return {"success": False, "error": str(e)}
