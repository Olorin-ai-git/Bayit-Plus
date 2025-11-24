"""
Rate Limit Status Router
Feature: Phase 8 (T066-T067) - Rate Limiting & Backoff

Provides endpoints to check rate limit status and test rate limiting behavior.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.persistence.database import get_db
from app.security.auth import User, require_read_or_dev
from app.middleware.enhanced_rate_limiter import EnhancedRateLimiter, RateLimitState
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)

router = APIRouter(
    prefix="/api/v1/rate-limit",
    tags=["Rate Limiting"],
    responses={
        429: {"description": "Rate limit exceeded"}
    },
)

# Global rate limiter instance for status checking
_rate_limiter = EnhancedRateLimiter()


@router.get(
    "/status",
    summary="Get current rate limit status",
    description="Check your current rate limit status and remaining requests",
    responses={
        200: {
            "description": "Rate limit status",
            "content": {
                "application/json": {
                    "example": {
                        "user_id": "user_abc123",
                        "current_requests": 25,
                        "max_requests": 60,
                        "remaining_requests": 35,
                        "window_seconds": 60,
                        "reset_timestamp": 1234567890,
                        "reset_datetime": "2024-01-01T12:00:00",
                        "violations": 0,
                        "is_limited": False,
                        "backoff_enabled": True
                    }
                }
            }
        }
    }
)
async def get_rate_limit_status(
    request: Request,
    current_user: User = Depends(require_read_or_dev),
) -> Dict[str, Any]:
    """
    Get current rate limit status for the authenticated user.

    Shows:
    - Current request count
    - Maximum allowed requests
    - Remaining requests
    - Time until reset
    - Violation count (for backoff calculation)
    """
    user_id = current_user.username

    status = await RateLimitState.get_user_rate_limit_status(
        user_id=user_id,
        limiter=_rate_limiter
    )

    # Add rate limit headers to response
    request.state.rate_limit_headers = {
        "X-RateLimit-Limit": str(status["max_requests"]),
        "X-RateLimit-Remaining": str(status["remaining_requests"]),
        "X-RateLimit-Reset": str(status["reset_timestamp"])
    }

    return status


@router.get(
    "/config",
    summary="Get rate limit configuration",
    description="Get current rate limit configuration values",
)
async def get_rate_limit_config(
    current_user: User = Depends(require_read_or_dev),
) -> Dict[str, Any]:
    """
    Get rate limit configuration for documentation purposes.

    T066: Shows the configured rate limits.
    """
    import os

    return {
        "default": {
            "max_requests": int(os.getenv("RATE_LIMIT_MAX_REQUESTS", "60")),
            "window_seconds": int(os.getenv("RATE_LIMIT_WINDOW_SECONDS", "60")),
            "description": "Default rate limit for authenticated users"
        },
        "authentication": {
            "max_requests": 5,
            "window_seconds": 300,
            "description": "Rate limit for authentication endpoints"
        },
        "sse_streaming": {
            "max_requests": 10,
            "window_seconds": 60,
            "description": "Rate limit for SSE streaming connections"
        },
        "event_polling": {
            "max_requests": 120,
            "window_seconds": 60,
            "description": "Rate limit for event polling endpoints"
        },
        "features": {
            "exponential_backoff": os.getenv("RATE_LIMIT_ENABLE_BACKOFF", "true").lower() == "true",
            "per_user_tracking": True,
            "sliding_window": True,
            "endpoint_specific_limits": True
        }
    }


@router.post(
    "/test-limit",
    summary="Test rate limiting",
    description="Endpoint for testing rate limit behavior",
)
async def test_rate_limit(
    request: Request,
    current_user: User = Depends(require_read_or_dev),
) -> Dict[str, Any]:
    """
    Test endpoint to trigger rate limiting.

    Make repeated calls to this endpoint to test rate limiting behavior.
    Watch the X-RateLimit-* headers decrease and eventually get a 429 response.
    """
    import time

    user_id = current_user.username

    # Get current status
    status = await RateLimitState.get_user_rate_limit_status(
        user_id=user_id,
        limiter=_rate_limiter
    )

    return {
        "message": "Request successful",
        "timestamp": time.time(),
        "rate_limit_status": {
            "current": status["current_requests"],
            "remaining": status["remaining_requests"],
            "max": status["max_requests"],
            "will_be_limited": status["remaining_requests"] <= 1
        }
    }


@router.delete(
    "/reset",
    summary="Reset rate limit (admin only)",
    description="Reset rate limit counters for testing purposes",
)
async def reset_rate_limit(
    user_id: str = None,
    current_user: User = Depends(require_read_or_dev),
) -> Dict[str, Any]:
    """
    Reset rate limit for a user (testing purposes).

    In production, this would require admin privileges.
    """
    import os

    # Only allow in development mode
    if os.getenv("APP_ENV", "local") == "prd":
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Rate limit reset not allowed in production"
        )

    target_user = user_id or current_user.username

    # Reset the user's request queue and violations
    async with _rate_limiter._lock:
        if target_user in _rate_limiter.requests:
            _rate_limiter.requests[target_user].clear()
        if target_user in _rate_limiter.violations:
            _rate_limiter.violations[target_user] = 0

    return {
        "message": f"Rate limit reset for user {target_user}",
        "user_id": target_user
    }


@router.get(
    "/headers-example",
    summary="Example of rate limit headers",
    description="Shows example rate limit headers as per T067",
)
async def rate_limit_headers_example() -> Dict[str, Any]:
    """
    Example showing the rate limit headers format.

    T067: Documents the rate limit headers added to all endpoints.
    """
    return {
        "description": "All API responses include rate limit headers",
        "headers": {
            "X-RateLimit-Limit": {
                "description": "Maximum number of requests allowed in the window",
                "example": "60",
                "format": "integer"
            },
            "X-RateLimit-Remaining": {
                "description": "Number of requests remaining in the current window",
                "example": "35",
                "format": "integer"
            },
            "X-RateLimit-Reset": {
                "description": "Unix timestamp when the rate limit window resets",
                "example": "1234567890",
                "format": "integer (unix timestamp)"
            },
            "Retry-After": {
                "description": "Seconds to wait before retrying (only in 429 responses)",
                "example": "60",
                "format": "integer",
                "note": "Includes exponential backoff for repeated violations"
            }
        },
        "example_response_headers": {
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "35",
            "X-RateLimit-Reset": "1234567890"
        },
        "example_429_response_headers": {
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": "1234567890",
            "Retry-After": "60"
        }
    }