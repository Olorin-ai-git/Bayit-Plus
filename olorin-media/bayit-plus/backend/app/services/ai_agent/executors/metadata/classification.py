"""
AI Agent Executors - Content Classification Operations

Functions for recategorizing content and changing content types.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict

from app.services.ai_agent.executors._shared import (
    get_content_or_error, get_content_section_or_error, handle_dry_run,
    log_librarian_action)

logger = logging.getLogger(__name__)


async def execute_recategorize_content(
    content_id: str,
    new_category_slug: str,
    confidence: int,
    reason: str,
    audit_id: str,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """Recategorize content to a different category."""
    dry_run_result = handle_dry_run(
        dry_run,
        "recategorize {content_id} to {category}",
        content_id=content_id,
        category=new_category_slug,
    )
    if dry_run_result:
        return dry_run_result

    try:
        content, error = await get_content_or_error(content_id)
        if error:
            return error

        category, error = await get_content_section_or_error(
            new_category_slug, by_slug=True
        )
        if error:
            return error

        old_category = content.category_name
        before_state = {
            "category_id": content.category_id,
            "category_name": content.category_name,
        }

        content.category_id = str(category.id)
        content.category_name = category.name
        content.updated_at = datetime.now(timezone.utc)
        await content.save()

        await log_librarian_action(
            audit_id=audit_id,
            action_type="recategorize",
            content_id=content_id,
            description=(
                f"Reclassified from '{old_category}' to '{category.name}' "
                f"({confidence}%). Reason: {reason}"
            ),
            issue_type="misclassification",
            before_state=before_state,
            after_state={
                "category_id": str(category.id),
                "category_name": category.name,
            },
            confidence=confidence,
            reason=reason,
        )

        return {
            "success": True,
            "updated": True,
            "old_category": old_category,
            "new_category": category.name,
        }
    except Exception as e:
        logger.error(f"Error recategorizing: {e}")
        return {"success": False, "error": str(e)}


async def execute_reclassify_as_series(
    content_id: str, audit_id: str, reason: str, dry_run: bool = False
) -> Dict[str, Any]:
    """Reclassify movie content as a series."""
    dry_run_result = handle_dry_run(
        dry_run, "reclassify {content_id} as series", content_id=content_id
    )
    if dry_run_result:
        return dry_run_result

    try:
        content, error = await get_content_or_error(content_id)
        if error:
            return error

        category, error = await get_content_section_or_error("series", by_slug=True)
        if error:
            return {"success": False, "error": "Series category not found"}

        before_state = {
            "category_id": content.category_id,
            "is_series": content.is_series,
        }

        content.category_id = str(category.id)
        content.category_name = "Series"
        content.is_series = True
        content.content_type = "series"
        content.updated_at = datetime.now(timezone.utc)
        await content.save()

        await log_librarian_action(
            audit_id=audit_id,
            action_type="reclassify_series",
            content_id=content_id,
            description=f"Reclassified as series: {reason}",
            issue_type="misclassification",
            before_state=before_state,
            after_state={"category_id": str(category.id), "is_series": True},
        )

        return {"success": True, "updated": True}
    except Exception as e:
        logger.error(f"Error reclassifying as series: {e}")
        return {"success": False, "error": str(e)}


async def execute_reclassify_as_movie(
    content_id: str, audit_id: str, reason: str, dry_run: bool = False
) -> Dict[str, Any]:
    """Reclassify series content as a movie."""
    dry_run_result = handle_dry_run(
        dry_run, "reclassify {content_id} as movie", content_id=content_id
    )
    if dry_run_result:
        return dry_run_result

    try:
        content, error = await get_content_or_error(content_id)
        if error:
            return error

        category, error = await get_content_section_or_error("movies", by_slug=True)
        if error:
            return {"success": False, "error": "Movies category not found"}

        content.category_id = str(category.id)
        content.category_name = "Movies"
        content.is_series = False
        content.content_type = "vod"
        content.updated_at = datetime.now(timezone.utc)
        await content.save()

        return {"success": True, "updated": True}
    except Exception as e:
        logger.error(f"Error reclassifying as movie: {e}")
        return {"success": False, "error": str(e)}
