"""
Rate Limit Middleware
FastAPI middleware for rate limiting requests
"""

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.logging_config import get_logger
from app.middleware.rate_limiting.limiter import RateLimiter

logger = get_logger(__name__)


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
