"""
Rate Limiter - Backward Compatibility Module
Re-exports from app.middleware.rate_limiting for backward compatibility

DEPRECATED: Import directly from app.middleware.rate_limiting instead
"""

from app.middleware.rate_limiting import (
    RateLimiter,
    RateLimitMiddleware,
    default_rate_limiter,
    rate_limit_decorator,
)

__all__ = [
    "RateLimiter",
    "RateLimitMiddleware",
    "default_rate_limiter",
    "rate_limit_decorator",
]
