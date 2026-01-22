"""
Rate Limit Decorator
Decorator for rate limiting specific endpoints
"""

from fastapi import HTTPException, status

from app.middleware.rate_limiting.limiter import default_rate_limiter


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
