"""
Olorin Rate Limiting Middleware
In-memory rate limiting for API endpoints
Follows Olorin ecosystem patterns
"""

import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
from threading import Lock

from app.core.config import get_settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)
settings = get_settings()


class RateLimiter:
    """
    Token bucket rate limiter
    In-memory implementation for single-instance deployments
    """

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_minute / 60
        self.buckets: Dict[str, Tuple[float, int]] = {}
        self.lock = Lock()

    def is_allowed(self, key: str) -> bool:
        """
        Check if request is allowed under rate limit

        Args:
            key: Rate limit key (e.g., user_id or IP)

        Returns:
            True if allowed, False if rate limited
        """
        now = time.time()

        with self.lock:
            if key not in self.buckets:
                self.buckets[key] = (now, self.requests_per_minute - 1)
                return True

            last_check, tokens = self.buckets[key]

            # Calculate new tokens based on time elapsed
            elapsed = now - last_check
            new_tokens = min(
                self.requests_per_minute,
                tokens + elapsed * self.requests_per_second
            )

            if new_tokens >= 1:
                self.buckets[key] = (now, new_tokens - 1)
                return True
            else:
                self.buckets[key] = (now, new_tokens)
                return False

    def reset(self, key: str):
        """Reset rate limit for key"""
        with self.lock:
            if key in self.buckets:
                del self.buckets[key]

    def cleanup_old_entries(self, max_age_seconds: int = 3600):
        """Remove old entries to prevent memory bloat"""
        now = time.time()

        with self.lock:
            keys_to_delete = [
                key
                for key, (last_check, _) in self.buckets.items()
                if now - last_check > max_age_seconds
            ]

            for key in keys_to_delete:
                del self.buckets[key]

        if keys_to_delete:
            logger.debug(f"Cleaned up {len(keys_to_delete)} old rate limit entries")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware for FastAPI
    Applies rate limits based on user ID or IP address
    """

    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.limiter = RateLimiter(requests_per_minute=requests_per_minute)

        # Different limits for different tiers
        self.tier_limits = {
            "free": 30,  # 30 requests/minute
            "pro": 120,  # 120 requests/minute
            "enterprise": 300,  # 300 requests/minute
        }

        logger.info(f"Rate limiting enabled: {requests_per_minute} requests/minute (default)")

    async def dispatch(self, request: Request, call_next):
        """Process request with rate limiting"""

        # Skip rate limiting for health checks
        if request.url.path in ["/", "/health", "/api/docs", "/api/redoc"]:
            return await call_next(request)

        # Get rate limit key (user ID or IP)
        rate_limit_key = self._get_rate_limit_key(request)

        # Check rate limit
        if not self.limiter.is_allowed(rate_limit_key):
            logger.warning(
                "Rate limit exceeded",
                extra={
                    "key": rate_limit_key,
                    "path": request.url.path,
                    "method": request.method,
                },
            )

            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later.",
                headers={"Retry-After": "60"},
            )

        # Process request
        response = await call_next(request)

        # Add rate limit headers
        response.headers["X-RateLimit-Limit"] = str(self.limiter.requests_per_minute)

        return response

    def _get_rate_limit_key(self, request: Request) -> str:
        """
        Get rate limit key for request

        Args:
            request: FastAPI request

        Returns:
            Rate limit key (user ID or IP address)
        """

        # Try to get user ID from request state (set by auth middleware)
        if hasattr(request.state, "user") and request.state.user:
            user_id = request.state.user.get("id")
            if user_id:
                return f"user:{user_id}"

        # Fall back to IP address
        client_ip = request.client.host if request.client else "unknown"
        forwarded_for = request.headers.get("X-Forwarded-For")

        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()

        return f"ip:{client_ip}"


# Global rate limiter instance
default_rate_limiter = RateLimiter(requests_per_minute=60)


def rate_limit_decorator(requests_per_minute: int = 60):
    """
    Decorator for rate limiting specific endpoints

    Usage:
        @router.post("/expensive-operation")
        @rate_limit_decorator(requests_per_minute=10)
        async def expensive_operation():
            ...
    """

    def decorator(func):
        async def wrapper(*args, **kwargs):
            request = kwargs.get("request") or (args[0] if args else None)

            if not request:
                return await func(*args, **kwargs)

            key = f"endpoint:{request.url.path}"

            if not default_rate_limiter.is_allowed(key):
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded for this endpoint ({requests_per_minute}/min)",
                    headers={"Retry-After": "60"},
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator
