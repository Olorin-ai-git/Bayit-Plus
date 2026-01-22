"""
Olorin Structured Logging Configuration
Follows Olorin ecosystem logging patterns
"""

import logging
import sys
from typing import Any, Dict, Optional
from datetime import datetime
import json

from app.core.config import get_settings

settings = get_settings()


class StructuredFormatter(logging.Formatter):
    """
    Structured JSON log formatter
    Follows Olorin logging standards
    """

    def format(self, record: logging.LogRecord) -> str:
        """Format log record as JSON"""

        log_data: Dict[str, Any] = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "service": "cvplus",
            "environment": settings.environment,
        }

        # Add correlation ID if present
        if hasattr(record, "correlation_id"):
            log_data["correlation_id"] = record.correlation_id

        # Add extra fields from record
        if hasattr(record, "extra"):
            log_data.update(record.extra)

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add file and line number in development
        if settings.environment == "development":
            log_data["source"] = {
                "file": record.filename,
                "line": record.lineno,
                "function": record.funcName,
            }

        return json.dumps(log_data)


def get_logger(name: str) -> logging.Logger:
    """
    Get configured logger with Olorin standards

    Args:
        name: Logger name (usually __name__)

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)

    # Only configure if not already configured
    if not logger.handlers:
        logger.setLevel(logging.DEBUG if settings.environment == "development" else logging.INFO)

        # Console handler with structured formatting
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(StructuredFormatter())
        logger.addHandler(handler)

        # Prevent propagation to root logger
        logger.propagate = False

    return logger


def configure_logging():
    """
    Configure application-wide logging
    Called on application startup
    """

    # Set root logger level
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)

    # Remove default handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add structured handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    root_logger.addHandler(handler)

    # Silence noisy loggers
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)

    # Log startup message
    logger = get_logger(__name__)
    logger.info(
        "Logging configured",
        extra={
            "environment": settings.environment,
            "log_level": "DEBUG" if settings.environment == "development" else "INFO",
        },
    )


class LoggerAdapter(logging.LoggerAdapter):
    """
    Logger adapter for adding correlation IDs
    Follows Olorin request tracking patterns
    """

    def process(self, msg: str, kwargs: Dict) -> tuple:
        """Add correlation ID to log record"""

        if "extra" not in kwargs:
            kwargs["extra"] = {}

        # Add correlation ID from context
        if hasattr(self, "correlation_id"):
            kwargs["extra"]["correlation_id"] = self.correlation_id

        return msg, kwargs


def get_logger_with_correlation(name: str, correlation_id: Optional[str] = None) -> LoggerAdapter:
    """
    Get logger with correlation ID support

    Args:
        name: Logger name
        correlation_id: Optional correlation ID

    Returns:
        Logger adapter with correlation ID
    """
    logger = get_logger(name)
    adapter = LoggerAdapter(logger, {})

    if correlation_id:
        adapter.correlation_id = correlation_id

    return adapter
