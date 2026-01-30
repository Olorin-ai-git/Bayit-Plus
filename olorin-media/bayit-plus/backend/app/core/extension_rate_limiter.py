"""
Chrome Extension Rate Limiting

Per-user rate limiting for Chrome Extension endpoints to prevent abuse.
Uses in-memory storage (can be upgraded to Redis for production).
"""

from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

from fastapi import HTTPException, Request, status


class ExtensionRateLimiter:
    """
    Simple in-memory rate limiter for Chrome Extension endpoints.

    Tracks requests per user/IP and enforces rate limits:
    - Subscription endpoints: 10 req/min per user
    - WebSocket connections: 5 connections/min per user
    - Quota checks: 20 req/min per user

    Production note: Replace with Redis-backed limiter for multi-instance deployments.
    """

    def __init__(self):
        # Format: {(endpoint, identifier): [(timestamp, ...)]}
        self._requests: Dict[Tuple[str, str], list[datetime]] = {}

    def _cleanup_old_requests(
        self, key: Tuple[str, str], window_seconds: int = 60
    ) -> None:
        """Remove requests outside the time window."""
        if key not in self._requests:
            return

        cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)
        self._requests[key] = [
            ts for ts in self._requests[key] if ts > cutoff
        ]

    def check_rate_limit(
        self,
        endpoint: str,
        identifier: str,
        limit: int,
        window_seconds: int = 60,
    ) -> None:
        """
        Check if request is within rate limit.

        Args:
            endpoint: Endpoint identifier (e.g., "checkout", "websocket")
            identifier: User ID or IP address
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds (default 60)

        Raises:
            HTTPException: If rate limit exceeded (429 Too Many Requests)
        """
        key = (endpoint, identifier)

        # Cleanup old requests
        self._cleanup_old_requests(key, window_seconds)

        # Initialize if first request
        if key not in self._requests:
            self._requests[key] = []

        # Check limit
        if len(self._requests[key]) >= limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Rate limit exceeded. Maximum {limit} requests per {window_seconds} seconds.",
                headers={"Retry-After": str(window_seconds)},
            )

        # Record request
        self._requests[key].append(datetime.now(timezone.utc))

    def get_remaining(
        self,
        endpoint: str,
        identifier: str,
        limit: int,
        window_seconds: int = 60,
    ) -> int:
        """
        Get remaining requests in current window.

        Args:
            endpoint: Endpoint identifier
            identifier: User ID or IP address
            limit: Maximum requests allowed in window
            window_seconds: Time window in seconds

        Returns:
            Number of remaining requests
        """
        key = (endpoint, identifier)
        self._cleanup_old_requests(key, window_seconds)

        if key not in self._requests:
            return limit

        used = len(self._requests[key])
        return max(0, limit - used)


# Global rate limiter instance
extension_rate_limiter = ExtensionRateLimiter()


def get_client_identifier(request: Request, user_id: str | None = None) -> str:
    """
    Get client identifier for rate limiting.

    Prefers user ID if authenticated, falls back to IP address.

    Args:
        request: FastAPI request object
        user_id: Authenticated user ID (if available)

    Returns:
        Identifier string (user ID or IP address)
    """
    if user_id:
        return f"user:{user_id}"

    # Get IP from X-Forwarded-For or direct connection
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return f"ip:{forwarded_for.split(',')[0].strip()}"

    client_host = request.client.host if request.client else "unknown"
    return f"ip:{client_host}"
