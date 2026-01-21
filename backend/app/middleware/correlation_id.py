"""
Correlation ID Middleware for Bayit+ Backend.

Generates or extracts correlation IDs from incoming requests to enable
end-to-end request tracing across services.
"""

import logging
import uuid
from contextvars import ContextVar
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings

logger = logging.getLogger(__name__)

# Context variable for thread-safe correlation ID storage
correlation_id_var: ContextVar[str | None] = ContextVar("correlation_id", default=None)


def get_correlation_id() -> str | None:
    """
    Get the current correlation ID from context.

    Returns:
        The correlation ID for the current request, or None if not set
    """
    return correlation_id_var.get()


def set_correlation_id(correlation_id: str) -> None:
    """
    Set the correlation ID in the current context.

    Args:
        correlation_id: The correlation ID to set
    """
    correlation_id_var.set(correlation_id)


def generate_correlation_id() -> str:
    """
    Generate a new correlation ID.

    Returns:
        A new UUID-based correlation ID
    """
    return str(uuid.uuid4())


def get_correlation_headers() -> dict[str, str]:
    """
    Get headers dict with correlation ID for external service calls.

    Use this when making HTTP requests to external services to propagate
    the correlation ID for distributed tracing.

    Returns:
        Dictionary with X-Correlation-ID header if set, empty dict otherwise

    Example:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={**default_headers, **get_correlation_headers()}
            )
    """
    correlation_id = get_correlation_id()
    if correlation_id:
        return {settings.CORRELATION_ID_HEADER: correlation_id}
    return {}


class CorrelationIdMiddleware(BaseHTTPMiddleware):
    """
    Middleware to manage correlation IDs for request tracing.

    Features:
    - Extracts correlation ID from incoming request header if present
    - Generates a new correlation ID if not provided
    - Stores correlation ID in context for access throughout the request
    - Adds correlation ID to response headers
    """

    def __init__(self, app, header_name: str | None = None):
        """
        Initialize the middleware.

        Args:
            app: The ASGI application
            header_name: Custom header name for correlation ID (optional)
        """
        super().__init__(app)
        self.header_name = header_name or settings.CORRELATION_ID_HEADER

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and manage correlation ID.

        Args:
            request: The incoming request
            call_next: The next middleware or route handler

        Returns:
            The response with correlation ID header added
        """
        # Extract correlation ID from request header or generate new one
        correlation_id = request.headers.get(self.header_name)

        if not correlation_id:
            correlation_id = generate_correlation_id()
            logger.debug(f"Generated new correlation ID: {correlation_id}")
        else:
            logger.debug(f"Using existing correlation ID: {correlation_id}")

        # Store in context for thread-safe access
        set_correlation_id(correlation_id)

        # Add to Sentry scope if Sentry is enabled
        try:
            import sentry_sdk

            sentry_sdk.set_tag("correlation_id", correlation_id)
        except ImportError:
            pass

        # Process the request
        response = await call_next(request)

        # Add correlation ID to response headers
        response.headers[self.header_name] = correlation_id

        return response
