"""
Production logging configuration for Cloud Run
Uses structured logging compatible with Google Cloud Logging
Includes correlation ID for end-to-end request tracing
"""
import json
import logging
import sys
from typing import Any


def _get_correlation_id() -> str | None:
    """
    Get the current correlation ID from context.
    Imported lazily to avoid circular imports.
    """
    try:
        from app.middleware.correlation_id import get_correlation_id

        return get_correlation_id()
    except ImportError:
        return None


class StructuredLogger(logging.Formatter):
    """Format logs as JSON for Cloud Logging with correlation ID"""

    def format(self, record: logging.LogRecord) -> str:
        log_obj = {
            "timestamp": self.formatTime(record, self.datefmt),
            "severity": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add correlation ID for request tracing
        correlation_id = _get_correlation_id()
        if correlation_id:
            log_obj["correlation_id"] = correlation_id

        # Add exception info if present
        if record.exc_info:
            log_obj["exception"] = self.formatException(record.exc_info)

        # Add extra fields
        if hasattr(record, "extra_data"):
            log_obj.update(record.extra_data)

        return json.dumps(log_obj)


def setup_logging(debug: bool = False):
    """Configure structured logging for production"""
    level = logging.DEBUG if debug else logging.INFO

    # Root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Clear existing handlers
    root_logger.handlers.clear()

    # Console handler with structured format
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredLogger())
    root_logger.addHandler(handler)

    # Suppress noisy libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("stripe").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("anthropic").setLevel(logging.INFO)

    return root_logger
