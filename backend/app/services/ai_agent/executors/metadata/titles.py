"""
AI Agent Executors - Title Management Operations

Functions for cleaning and fixing content titles.
"""

import logging
from datetime import datetime
from typing import Any, Dict

from app.services.ai_agent.executors._shared import (create_action_description,
                                                     get_content_or_error,
                                                     handle_dry_run,
                                                     log_librarian_action)

logger = logging.getLogger(__name__)


async def execute_clean_title(
    content_id: str, cleaned_title: str, reason: str, cleaned_title_en: str = None, *, audit_id: str, dry_run: bool = False
) -> Dict[str, Any]:
    """
    Clean/fix content title.

    Args:
        content_id: The content ID to update
        cleaned_title: The cleaned/new title
        reason: Brief explanation of what was cleaned (required)
        cleaned_title_en: Optional English title
        audit_id: The audit ID for logging (keyword-only)
        dry_run: If True, only simulate the operation (keyword-only)

    Returns:
        Dict with success status and title change details
    """
    dry_run_result = handle_dry_run(
        dry_run,
        "rename {content_id} to '{cleaned_title}'",
        content_id=content_id,
        cleaned_title=cleaned_title,
    )
    if dry_run_result:
        return dry_run_result

    try:
        content, error = await get_content_or_error(content_id)
        if error:
            return error

        old_title = content.title
        content.title = cleaned_title
        if cleaned_title_en:
            content.title_en = cleaned_title_en
        content.updated_at = datetime.utcnow()
        await content.save()

        description = create_action_description(
            action="Cleaned title",
            content_title=old_title,
            old_value=old_title,
            new_value=cleaned_title,
        )
        if reason:
            description = f"{description} - {reason}"

        await log_librarian_action(
            audit_id=audit_id,
            action_type="clean_title",
            content_id=content_id,
            description=description,
            issue_type="title_cleanup",
            before_state={"title": old_title},
            after_state={"title": cleaned_title},
        )

        return {
            "success": True,
            "updated": True,
            "old_title": old_title,
            "new_title": cleaned_title,
        }
    except Exception as e:
        logger.error(f"Error cleaning title: {e}")
        return {"success": False, "error": str(e)}
