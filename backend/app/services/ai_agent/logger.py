"""
AI Agent Logger

Database logging utilities for streaming logs to UI in real-time.
"""

import logging
import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Dict, Optional

if TYPE_CHECKING:
    from app.models.librarian import AuditReport

logger = logging.getLogger(__name__)

# Cache for content titles to avoid repeated database lookups
_content_title_cache: Dict[str, Optional[str]] = {}


async def _get_content_title(content_id: str) -> Optional[str]:
    """
    Fetch content title from database, with caching to avoid repeated lookups.
    Returns the title (preferring English, falling back to Hebrew).
    """
    if content_id in _content_title_cache:
        return _content_title_cache[content_id]

    try:
        # Import here to avoid circular imports
        from app.models.content import Content
        from beanie import PydanticObjectId

        content = await Content.get(PydanticObjectId(content_id))
        if content:
            # Prefer English title, fall back to Hebrew
            title = content.title_en or content.title
            _content_title_cache[content_id] = title
            return title
    except Exception as e:
        logger.debug(f"Could not fetch title for content {content_id}: {e}")

    _content_title_cache[content_id] = None
    return None


def clear_title_cache():
    """Clear the content title cache (call at start of new audit)."""
    _content_title_cache.clear()


async def log_to_database(
    audit_report: "AuditReport",
    level: str,
    message: str,
    source: str = "AI Agent",
    item_name: str = None,
    content_id: str = None,
    metadata: dict = None,
):
    """
    Append a structured log entry to the audit report's execution_logs array.
    This enables real-time log streaming to the UI with structured data.

    If content_id is provided but item_name is not, the function will
    automatically fetch the content title from the database.

    Args:
        audit_report: The AuditReport document to update
        level: Log level ("info", "warn", "error", "success", "debug", "trace")
        message: Log message (keep concise, put details in metadata)
        source: Source of the log (default "AI Agent")
        item_name: Name of the content item being processed (movie/show title)
        content_id: ID of the content item being processed
        metadata: Additional structured data (tool results, parameters, etc.)
    """
    try:
        # Auto-fetch content title if content_id is provided but item_name is not
        resolved_item_name = item_name
        if content_id and not item_name:
            resolved_item_name = await _get_content_title(content_id)

        log_entry = {
            "id": str(uuid.uuid4())[:8],  # Short ID for React keys
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            "source": source,
        }

        # Add optional structured fields
        if resolved_item_name:
            log_entry["itemName"] = resolved_item_name
        if content_id:
            log_entry["contentId"] = content_id
        if metadata:
            log_entry["metadata"] = metadata

        # Append to execution_logs array
        audit_report.execution_logs.append(log_entry)

        # Save to database (using update to avoid race conditions)
        await audit_report.save()

        # Also log to console for debugging
        item_info = f" [{resolved_item_name}]" if resolved_item_name else ""
        logger.info(f"[{level.upper()}] {source}{item_info}: {message}")

    except Exception as e:
        # Don't let logging failures break the audit
        logger.error(f"Failed to write log to database: {e}")
