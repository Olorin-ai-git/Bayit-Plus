import logging
from contextlib import contextmanager
from contextvars import ContextVar, Token
from typing import Any, Dict

# Logging approach based on https://github.olorin.com/global-core/global-content-service/blob/master/app/logs.py

# Use an immutable frozenset so resets on state can point to a different object
# A dictionary would reset to the same dictionary, while the items inside remained the
# same.
_logging_request_context: ContextVar[frozenset] = ContextVar(
    "logging_context", default=frozenset()
)


def reset_context(state: Token):
    """Resets the state of the logging context to that at the given state."""
    _logging_request_context.reset(state)


def update_context(**kwargs) -> Token:
    """Updates the state of the logging context.
    Returns a token that can be used to recover the previous state using `reset_context`
    """
    context = _logging_request_context.get()
    return _logging_request_context.set(context.union(kwargs.items()))


@contextmanager
def logging_context(**kwargs):
    token = update_context(**kwargs)
    try:
        yield
    finally:
        reset_context(token)


class RequestFormatter(logging.Formatter):
    def format(self, record):
        ctx = _logging_request_context.get()
        record.context = ", ".join(f"{k}={v}" for k, v in ctx)
        return super().format(record)


class PIILoggingFilter(logging.Filter):
    """
    Logging filter that hashes PII data before logging.

    This filter processes log records and hashes any PII fields found in:
    - String messages (keyword arguments)
    - Dict-like structures in args
    - Extra fields passed to logger

    Usage:
        import logging
        from app.service.logging_helper import PIILoggingFilter

        logger = logging.getLogger(__name__)
        logger.addFilter(PIILoggingFilter())

        # PII will be hashed automatically
        logger.info("User email: %(EMAIL)s", {"EMAIL": "user@example.com"})
    """

    def __init__(self, name: str = ""):
        super().__init__(name)
        # Import here to avoid circular dependency
        from app.service.security.pii_hasher import get_pii_hasher

        self.pii_hasher = get_pii_hasher()

    def filter(self, record: logging.LogRecord) -> bool:
        """
        Process log record and hash PII fields.

        Args:
            record: Log record to process

        Returns:
            True (always allow the record)
        """
        # Skip if hashing is disabled
        if not self.pii_hasher.config.enabled:
            return True

        # Hash PII in args if they're a dict
        if record.args and isinstance(record.args, dict):
            record.args = self.pii_hasher.hash_dict(record.args)

        # Hash PII in extra fields (stored in __dict__)
        # Look for fields that match PII field names
        for field in list(record.__dict__.keys()):
            field_upper = field.upper()
            if self.pii_hasher.is_pii_field(field_upper):
                value = getattr(record, field)
                hashed_value = self.pii_hasher.hash_value(value, field_upper)
                setattr(record, field, hashed_value)

        return True


def add_pii_filter_to_logger(logger: logging.Logger) -> logging.Logger:
    """
    Add PII hashing filter to all handlers of a logger.

    Args:
        logger: Logger to add PII filter to

    Returns:
        The same logger instance with PII filter added
    """
    pii_filter = PIILoggingFilter()

    # Add filter to the logger itself (applies to all handlers)
    logger.addFilter(pii_filter)

    return logger


def get_pii_aware_logger(name: str) -> logging.Logger:
    """
    Get a logger with PII hashing enabled.

    Args:
        name: Logger name

    Returns:
        Logger with PII hashing filter
    """
    logger = logging.getLogger(name)
    return add_pii_filter_to_logger(logger)
