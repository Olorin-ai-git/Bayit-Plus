"""
Request Timing Middleware for Bayit+ Backend.

Tracks request duration and logs slow requests for performance monitoring.
"""

import logging
import time
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.middleware.correlation_id import get_correlation_id

logger = logging.getLogger(__name__)


class RequestTimingMiddleware(BaseHTTPMiddleware):
    """
    Middleware to track request timing and log slow requests.

    Features:
    - Measures request duration from start to finish
    - Adds X-Request-Duration-Ms header to responses
    - Logs warnings for requests exceeding configured threshold
    - Includes correlation ID in log messages for tracing
    """

    def __init__(self, app, warning_threshold_ms: int | None = None):
        """
        Initialize the middleware.

        Args:
            app: The ASGI application
            warning_threshold_ms: Custom threshold for slow request warnings (optional)
        """
        super().__init__(app)
        self.warning_threshold_ms = (
            warning_threshold_ms or settings.REQUEST_TIMEOUT_WARNING_MS
        )

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and track timing.

        Args:
            request: The incoming request
            call_next: The next middleware or route handler

        Returns:
            The response with timing header added
        """
        start_time = time.perf_counter()

        # Process the request
        response = await call_next(request)

        # Calculate duration
        duration_seconds = time.perf_counter() - start_time
        duration_ms = int(duration_seconds * 1000)

        # Add timing header to response
        response.headers["X-Request-Duration-Ms"] = str(duration_ms)

        # Get request details for logging
        method = request.method
        path = request.url.path
        correlation_id = get_correlation_id()
        status_code = response.status_code

        # Log slow requests
        if duration_ms > self.warning_threshold_ms:
            logger.warning(
                f"Slow request detected",
                extra={
                    "extra_data": {
                        "method": method,
                        "path": path,
                        "duration_ms": duration_ms,
                        "threshold_ms": self.warning_threshold_ms,
                        "status_code": status_code,
                        "correlation_id": correlation_id,
                    }
                },
            )

        # Log all requests at debug level with timing
        logger.debug(
            f"Request completed: {method} {path}",
            extra={
                "extra_data": {
                    "method": method,
                    "path": path,
                    "duration_ms": duration_ms,
                    "status_code": status_code,
                    "correlation_id": correlation_id,
                }
            },
        )

        return response
