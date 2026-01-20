"""
Sentry Error Tracking Configuration for Bayit+ Backend.

Initializes Sentry SDK with FastAPI integration, configures sampling,
and filters sensitive data before sending to Sentry.
"""

import logging
from typing import Any

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration
from sentry_sdk.integrations.logging import LoggingIntegration

from app.core.config import settings

logger = logging.getLogger(__name__)


# Sensitive fields to scrub from events
SENSITIVE_FIELDS = frozenset({
    "password",
    "secret",
    "token",
    "api_key",
    "apikey",
    "authorization",
    "auth",
    "credentials",
    "private_key",
    "access_token",
    "refresh_token",
    "jwt",
    "session",
    "cookie",
    "credit_card",
    "card_number",
    "cvv",
    "ssn",
    "social_security",
})


def _scrub_sensitive_data(event: dict[str, Any], hint: dict[str, Any]) -> dict[str, Any] | None:
    """
    Scrub sensitive data from Sentry events before sending.

    Args:
        event: The Sentry event data
        hint: Additional hints about the event

    Returns:
        Scrubbed event or None to drop the event
    """
    # Scrub request data
    if "request" in event:
        request_data = event["request"]

        # Scrub headers
        if "headers" in request_data:
            headers = request_data["headers"]
            for key in list(headers.keys()):
                key_lower = key.lower()
                if any(sensitive in key_lower for sensitive in SENSITIVE_FIELDS):
                    headers[key] = "[Filtered]"

        # Scrub query string
        if "query_string" in request_data:
            query = request_data["query_string"]
            if isinstance(query, str):
                for sensitive in SENSITIVE_FIELDS:
                    if sensitive in query.lower():
                        request_data["query_string"] = "[Filtered]"
                        break

        # Scrub body/data
        if "data" in request_data and isinstance(request_data["data"], dict):
            _scrub_dict(request_data["data"])

    # Scrub extra context
    if "extra" in event and isinstance(event["extra"], dict):
        _scrub_dict(event["extra"])

    # Scrub contexts
    if "contexts" in event and isinstance(event["contexts"], dict):
        _scrub_dict(event["contexts"])

    return event


def _scrub_dict(data: dict[str, Any]) -> None:
    """
    Recursively scrub sensitive fields from a dictionary in-place.

    Args:
        data: Dictionary to scrub
    """
    for key, value in list(data.items()):
        key_lower = key.lower()
        if any(sensitive in key_lower for sensitive in SENSITIVE_FIELDS):
            data[key] = "[Filtered]"
        elif isinstance(value, dict):
            _scrub_dict(value)
        elif isinstance(value, list):
            for i, item in enumerate(value):
                if isinstance(item, dict):
                    _scrub_dict(item)


def init_sentry() -> bool:
    """
    Initialize Sentry SDK with FastAPI integration.

    Returns:
        True if Sentry was initialized successfully, False if disabled
    """
    if not settings.SENTRY_DSN:
        logger.info("Sentry DSN not configured - error tracking disabled")
        return False

    try:
        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.SENTRY_ENVIRONMENT,
            release=settings.SENTRY_RELEASE or None,
            # Performance monitoring sample rate
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            # Send performance data for all transactions in sampled traces
            profiles_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            # Integrations
            integrations=[
                FastApiIntegration(
                    transaction_style="endpoint",  # Use endpoint names for transactions
                ),
                StarletteIntegration(
                    transaction_style="endpoint",
                ),
                LoggingIntegration(
                    level=logging.INFO,  # Capture INFO and above as breadcrumbs
                    event_level=logging.ERROR,  # Send ERROR and above as events
                ),
            ],
            # Data scrubbing
            before_send=_scrub_sensitive_data,
            # Disable sending PII by default
            send_default_pii=False,
            # Attach stack trace to all messages
            attach_stacktrace=True,
            # Maximum breadcrumbs to keep
            max_breadcrumbs=50,
            # Enable debug mode in development
            debug=settings.DEBUG,
        )

        logger.info(
            f"Sentry initialized - environment: {settings.SENTRY_ENVIRONMENT}, "
            f"traces_sample_rate: {settings.SENTRY_TRACES_SAMPLE_RATE}"
        )
        return True

    except Exception as e:
        logger.error(f"Failed to initialize Sentry: {e}")
        return False


def capture_exception(exc: Exception, context: dict[str, Any] | None = None) -> str | None:
    """
    Capture an exception and send to Sentry.

    Args:
        exc: The exception to capture
        context: Additional context to attach to the event

    Returns:
        Sentry event ID if captured, None otherwise
    """
    if not settings.SENTRY_DSN:
        return None

    with sentry_sdk.push_scope() as scope:
        if context:
            for key, value in context.items():
                scope.set_extra(key, value)
        return sentry_sdk.capture_exception(exc)


def capture_message(message: str, level: str = "info", context: dict[str, Any] | None = None) -> str | None:
    """
    Capture a message and send to Sentry.

    Args:
        message: The message to capture
        level: Log level (debug, info, warning, error, fatal)
        context: Additional context to attach to the event

    Returns:
        Sentry event ID if captured, None otherwise
    """
    if not settings.SENTRY_DSN:
        return None

    with sentry_sdk.push_scope() as scope:
        if context:
            for key, value in context.items():
                scope.set_extra(key, value)
        return sentry_sdk.capture_message(message, level=level)


def set_user(user_id: str, email: str | None = None, username: str | None = None) -> None:
    """
    Set the current user context for Sentry events.

    Args:
        user_id: Unique user identifier
        email: User's email (optional)
        username: User's display name (optional)
    """
    if not settings.SENTRY_DSN:
        return

    sentry_sdk.set_user({
        "id": user_id,
        "email": email,
        "username": username,
    })


def set_tag(key: str, value: str) -> None:
    """
    Set a tag on the current scope.

    Args:
        key: Tag name
        value: Tag value
    """
    if not settings.SENTRY_DSN:
        return

    sentry_sdk.set_tag(key, value)
