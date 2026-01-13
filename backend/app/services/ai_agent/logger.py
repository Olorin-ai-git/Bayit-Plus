"""
AI Agent Logger

Database logging utilities for streaming logs to UI in real-time.
"""

import uuid
import logging
from datetime import datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.librarian import AuditReport

logger = logging.getLogger(__name__)


async def log_to_database(
    audit_report: "AuditReport",
    level: str,
    message: str,
    source: str = "AI Agent"
):
    """
    Append a log entry to the audit report's execution_logs array.
    This enables real-time log streaming to the UI.

    Args:
        audit_report: The AuditReport document to update
        level: Log level ("info", "warn", "error", "success", "debug", "trace")
        message: Log message
        source: Source of the log (default "AI Agent")
    """
    try:
        log_entry = {
            "id": str(uuid.uuid4())[:8],  # Short ID for React keys
            "timestamp": datetime.utcnow().isoformat(),
            "level": level,
            "message": message,
            "source": source
        }

        # Append to execution_logs array
        audit_report.execution_logs.append(log_entry)

        # Save to database (using update to avoid race conditions)
        await audit_report.save()

        # Also log to console for debugging
        logger.info(f"[{level.upper()}] {source}: {message}")

    except Exception as e:
        # Don't let logging failures break the audit
        logger.error(f"Failed to write log to database: {e}")
