"""
Action Logging Utilities for AI Agent Executors

Standardized LibrarianAction creation to ensure consistent audit logging across all executor modules.
"""

import logging
from typing import Optional, Dict, Any

from app.models.librarian import LibrarianAction

logger = logging.getLogger(__name__)


async def log_librarian_action(
    audit_id: str,
    action_type: str,
    content_id: str,
    description: str,
    content_type: str = "content",
    issue_type: Optional[str] = None,
    auto_approved: bool = True,
    before_state: Optional[Dict[str, Any]] = None,
    after_state: Optional[Dict[str, Any]] = None,
    confidence: Optional[int] = None,
    reason: Optional[str] = None,
) -> None:
    """
    Create and insert a LibrarianAction with standardized fields.

    Eliminates duplicate action logging code across executor functions.

    Args:
        audit_id: The audit ID this action belongs to
        action_type: Type of action (e.g., "poster_fix", "link_episode", "recategorize")
        content_id: The content ID being acted upon
        description: Human-readable description of the action
        content_type: Type of content (default: "content")
        issue_type: Type of issue being fixed (e.g., "missing_poster", "unlinked_episode")
        auto_approved: Whether action was auto-approved (default: True)
        before_state: State before action (for recategorization, etc.)
        after_state: State after action
        confidence: Confidence level (0-100) for AI decisions
        reason: Reason for the action

    Example:
        await log_librarian_action(
            audit_id=audit_id,
            action_type="poster_fix",
            content_id=content_id,
            description=f"Fixed missing poster for '{content.title}'",
            issue_type="missing_poster"
        )
    """
    try:
        action = LibrarianAction(
            audit_id=audit_id,
            action_type=action_type,
            content_id=content_id,
            content_type=content_type,
            auto_approved=auto_approved,
            description=description,
        )

        # Add optional fields only if provided
        if issue_type:
            action.issue_type = issue_type
        if before_state:
            action.before_state = before_state
        if after_state:
            action.after_state = after_state
        if confidence is not None:
            action.confidence = confidence
        if reason:
            action.reason = reason

        await action.insert()
        logger.info(f"Logged action {action_type} for content {content_id} in audit {audit_id}")

    except Exception as e:
        logger.error(f"Failed to log librarian action: {e}")
        # Don't fail the operation if logging fails, just log the error


def create_action_description(
    action: str,
    content_title: str,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
) -> str:
    """
    Create standardized action description.

    Args:
        action: The action being performed (e.g., "Fixed missing poster", "Linked episode")
        content_title: The title of the content
        old_value: Optional old value (for changes)
        new_value: Optional new value (for changes)

    Returns:
        Formatted description string

    Example:
        desc = create_action_description(
            action="Recategorized",
            content_title="The Matrix",
            old_value="Action",
            new_value="Sci-Fi"
        )
        # Returns: "Recategorized 'The Matrix' from 'Action' to 'Sci-Fi'"
    """
    if old_value and new_value:
        return f"{action} '{content_title}' from '{old_value}' to '{new_value}'"
    else:
        return f"{action} for '{content_title}'"
