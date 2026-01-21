"""
Unified structured logging for Olorin.ai ecosystem platforms.

Provides JSON logging compatible with Google Cloud Logging, structured context,
and consistent log formatting across all Olorin.ai services.
"""

import json
import logging
import sys
from typing import Any, Dict, Optional

import structlog
from pythonjsonlogger import jsonlogger


def configure_logging(
    level: str = "INFO",
    use_json: bool = True,
    use_structlog: bool = True,
) -> None:
    """
    Configure unified logging for the application.

    Args:
        level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        use_json: Enable JSON logging format
        use_structlog: Enable structlog integration
    """
    # Configure structlog if enabled
    if use_structlog:
        structlog.configure(
            processors=[
                structlog.stdlib.filter_by_level,
                structlog.stdlib.add_logger_name,
                structlog.stdlib.add_log_level,
                structlog.stdlib.PositionalArgumentsFormatter(),
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.UnicodeDecoder(),
                structlog.processors.JSONRenderer() if use_json else structlog.dev.ConsoleRenderer(),
            ],
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )

    # Configure standard logging
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    # Remove existing handlers
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    # Add console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(level)

    if use_json:
        formatter = jsonlogger.JsonFormatter(
            fmt='{"timestamp": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
            timestamp=True,
        )
    else:
        formatter = logging.Formatter(
            fmt='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S',
        )

    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)


def get_logger(name: str) -> Any:
    """
    Get a logger instance.

    Args:
        name: Logger name (typically __name__)

    Returns:
        Logger instance (structlog if available, otherwise standard logging)
    """
    try:
        return structlog.get_logger(name)
    except Exception:
        return logging.getLogger(name)


class StructuredLogger:
    """
    Wrapper providing structured logging interface.

    Automatically adds context and correlation IDs to all log messages.
    """

    def __init__(self, name: str):
        """
        Initialize structured logger.

        Args:
            name: Logger name
        """
        self.logger = get_logger(name)
        self._context: Dict[str, Any] = {}

    def set_context(self, **kwargs) -> None:
        """Set context variables for all future log calls."""
        self._context.update(kwargs)

    def clear_context(self) -> None:
        """Clear all context variables."""
        self._context.clear()

    def debug(self, message: str, **kwargs) -> None:
        """Log debug message with context."""
        context = {**self._context, **kwargs}
        self.logger.debug(message, **context)

    def info(self, message: str, **kwargs) -> None:
        """Log info message with context."""
        context = {**self._context, **kwargs}
        self.logger.info(message, **context)

    def warning(self, message: str, **kwargs) -> None:
        """Log warning message with context."""
        context = {**self._context, **kwargs}
        self.logger.warning(message, **context)

    def error(self, message: str, **kwargs) -> None:
        """Log error message with context."""
        context = {**self._context, **kwargs}
        self.logger.error(message, **context)

    def critical(self, message: str, **kwargs) -> None:
        """Log critical message with context."""
        context = {**self._context, **kwargs}
        self.logger.critical(message, **context)


def create_context_logger(name: str, **context) -> StructuredLogger:
    """
    Create a structured logger with predefined context.

    Args:
        name: Logger name
        **context: Context variables to include in all logs

    Returns:
        StructuredLogger instance with context
    """
    logger = StructuredLogger(name)
    logger.set_context(**context)
    return logger
