"""
Production logging configuration for Cloud Run
Uses unified structured logging from olorin-shared
Includes correlation ID for end-to-end request tracing
"""

import logging

from olorin_shared.logging import configure_logging as shared_configure_logging
from olorin_shared.logging import get_logger


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


def setup_logging(debug: bool = False):
    """Configure structured logging for production using unified olorin-shared setup"""
    level = "DEBUG" if debug else "INFO"

    # Use unified olorin-shared logging configuration
    shared_configure_logging(level=level, use_json=True, use_structlog=True)

    # Suppress noisy libraries
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("stripe").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("anthropic").setLevel(logging.INFO)

    # Return configured root logger
    return logging.getLogger()
