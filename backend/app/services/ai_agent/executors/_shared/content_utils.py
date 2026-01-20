"""
Content Utilities for AI Agent Executors

Common content validation and retrieval patterns to eliminate duplication across executor modules.
"""

import logging
from typing import Any, Dict, Optional, Tuple

from app.models.content import Content
from app.models.content_taxonomy import ContentSection

logger = logging.getLogger(__name__)


async def get_content_or_error(
    content_id: str,
) -> Tuple[Optional[Content], Optional[Dict[str, Any]]]:
    """
    Fetch content by ID or return error dict.

    Eliminates duplicate validation pattern across executor functions.

    Args:
        content_id: The content ID to fetch

    Returns:
        Tuple of (Content object, None) if found, or (None, error dict) if not found

    Example:
        content, error = await get_content_or_error(content_id)
        if error:
            return error
        # Use content safely
    """
    try:
        content = await Content.get(content_id)
        if not content:
            return None, {"success": False, "error": "Content not found"}
        return content, None
    except Exception as e:
        logger.error(f"Error fetching content {content_id}: {e}")
        return None, {"success": False, "error": str(e)}


async def get_content_section_or_error(
    identifier: str, by_slug: bool = False
) -> Tuple[Optional[ContentSection], Optional[Dict[str, Any]]]:
    """
    Fetch ContentSection by ID or slug, or return error dict.

    Eliminates duplicate category lookup pattern across executor functions.

    Args:
        identifier: The category ID or slug to fetch
        by_slug: If True, treat identifier as slug. If False, treat as ID.

    Returns:
        Tuple of (ContentSection object, None) if found, or (None, error dict) if not found

    Example:
        category, error = await get_content_section_or_error("movies", by_slug=True)
        if error:
            return error
        # Use category safely
    """
    try:
        if by_slug:
            category = await ContentSection.find_one({"slug": identifier})
        else:
            category = await ContentSection.get(identifier)

        if not category:
            error_msg = f"Category '{identifier}' not found"
            return None, {"success": False, "error": error_msg}

        return category, None
    except Exception as e:
        logger.error(f"Error fetching category {identifier}: {e}")
        return None, {"success": False, "error": str(e)}


async def validate_content_exists(content_id: str) -> Optional[Dict[str, Any]]:
    """
    Validate that content exists, returning error dict if not.

    Simplified validation for cases where you just need to check existence.

    Args:
        content_id: The content ID to validate

    Returns:
        None if content exists, error dict if not found

    Example:
        error = await validate_content_exists(content_id)
        if error:
            return error
    """
    _, error = await get_content_or_error(content_id)
    return error


async def validate_content_section_exists(
    identifier: str, by_slug: bool = False
) -> Optional[Dict[str, Any]]:
    """
    Validate that ContentSection exists, returning error dict if not.

    Simplified validation for cases where you just need to check existence.

    Args:
        identifier: The category ID or slug to validate
        by_slug: If True, treat identifier as slug. If False, treat as ID.

    Returns:
        None if category exists, error dict if not found

    Example:
        error = await validate_content_section_exists("movies", by_slug=True)
        if error:
            return error
    """
    _, error = await get_content_section_or_error(identifier, by_slug=by_slug)
    return error


def handle_dry_run(dry_run: bool, operation: str, **kwargs) -> Optional[Dict[str, Any]]:
    """
    Handle dry-run mode with consistent messaging.

    Eliminates duplicate dry-run handling across executor functions.

    Args:
        dry_run: Whether this is a dry-run
        operation: Description of the operation (e.g., "fix missing poster for {content_id}")
        **kwargs: Variables to format into the operation description

    Returns:
        Dry-run response dict if dry_run=True, None otherwise

    Example:
        result = handle_dry_run(dry_run, "link episode {episode_id} to series {series_id}",
                               episode_id=ep_id, series_id=ser_id)
        if result:
            return result
        # Proceed with actual operation
    """
    if not dry_run:
        return None

    message = operation.format(**kwargs) if kwargs else operation
    return {"success": True, "dry_run": True, "message": f"[DRY RUN] Would {message}"}
