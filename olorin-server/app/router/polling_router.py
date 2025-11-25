"""
Polling API Router
Feature: 005-polling-and-persistence (Enhanced for 001-investigation-state-management)

Provides REST API endpoints for adaptive polling with ETag support and rate limiting.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy.orm import Session

from app.config.investigation_state_config import PollingConfig, RateLimitConfig
from app.persistence.database import get_db
from app.security.auth import User, require_read, require_write
from app.service.polling_service import PollingService

router = APIRouter(
    prefix="/api/v1/polling",
    tags=["Polling"],
    responses={
        404: {"description": "Not found"},
        429: {"description": "Too many requests"},
    },
)


def _get_polling_service(db: Session = Depends(get_db)) -> PollingService:
    """Dependency for PollingService with config."""
    polling_config = PollingConfig()
    rate_limit_config = RateLimitConfig()
    return PollingService(db, polling_config, rate_limit_config)


@router.get(
    "/investigation-state/{investigation_id}",
    response_model=Dict[str, Any],
    summary="Poll investigation state",
    description="Poll investigation state with adaptive intervals and ETag support",
)
async def poll_investigation_state(
    investigation_id: str,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
) -> Dict[str, Any]:
    """Poll investigation state with ETag caching."""
    service = _get_polling_service(db)

    # Check rate limiting
    rate_limit_info = service.get_rate_limit_info(current_user.username)

    # Set rate limit headers
    response.headers["X-RateLimit-Limit"] = str(rate_limit_info["limit"])
    response.headers["X-RateLimit-Remaining"] = str(rate_limit_info["remaining"])
    response.headers["X-RateLimit-Reset"] = str(rate_limit_info["reset"])

    if service.is_rate_limited(current_user.username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": str(rate_limit_info["limit"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(rate_limit_info["reset"]),
            },
        )

    # Check ETag header
    if_none_match = request.headers.get("If-None-Match")

    # Poll state with ETag support
    state_data = service.poll_state(
        investigation_id=investigation_id,
        user_id=current_user.username,
        if_none_match=if_none_match,
    )

    # Return 304 if not modified
    if state_data is None:
        response.status_code = status.HTTP_304_NOT_MODIFIED
        return {}  # Empty body for 304

    # Set response headers
    response.headers["X-Recommended-Interval"] = str(
        state_data["recommended_interval_ms"]
    )
    response.headers["ETag"] = state_data["etag"]
    response.headers["Cache-Control"] = "no-cache"

    # Add poll_after_seconds to response headers
    if "poll_after_seconds" in state_data:
        response.headers["X-Poll-After-Seconds"] = str(state_data["poll_after_seconds"])

    return state_data


@router.get(
    "/investigation-state/{investigation_id}/changes",
    response_model=Dict[str, Any],
    summary="Poll investigation state changes",
    description="Poll for delta changes since specified version",
)
async def poll_investigation_state_changes(
    investigation_id: str,
    since_version: int = Query(..., ge=1),
    include_snapshot: bool = Query(False),
    response: Response = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
) -> Dict[str, Any]:
    """Poll for delta changes since version."""
    service = _get_polling_service(db)

    # Check rate limiting
    rate_limit_info = service.get_rate_limit_info(current_user.username)

    # Set rate limit headers
    response.headers["X-RateLimit-Limit"] = str(rate_limit_info["limit"])
    response.headers["X-RateLimit-Remaining"] = str(rate_limit_info["remaining"])
    response.headers["X-RateLimit-Reset"] = str(rate_limit_info["reset"])

    if service.is_rate_limited(current_user.username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": str(rate_limit_info["limit"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(rate_limit_info["reset"]),
            },
        )

    changes = service.poll_changes(
        investigation_id=investigation_id,
        user_id=current_user.username,
        since_version=since_version,
    )

    # Add poll_after_seconds to response headers
    if "poll_after_seconds" in changes:
        response.headers["X-Poll-After-Seconds"] = str(changes["poll_after_seconds"])

    return changes


@router.get(
    "/active-investigations",
    response_model=List[Dict[str, Any]],
    summary="Poll active investigations",
    description="Poll for list of active investigations with filtering and pagination",
)
async def poll_active_investigations(
    status_filter: Optional[List[str]] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    response: Response = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read),
) -> List[Dict[str, Any]]:
    """Poll for active investigations list."""
    service = _get_polling_service(db)

    # Check rate limiting
    rate_limit_info = service.get_rate_limit_info(current_user.username)

    # Set rate limit headers
    response.headers["X-RateLimit-Limit"] = str(rate_limit_info["limit"])
    response.headers["X-RateLimit-Remaining"] = str(rate_limit_info["remaining"])
    response.headers["X-RateLimit-Reset"] = str(rate_limit_info["reset"])

    if service.is_rate_limited(current_user.username):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={
                "Retry-After": "60",
                "X-RateLimit-Limit": str(rate_limit_info["limit"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(rate_limit_info["reset"]),
            },
        )

    investigations = service.poll_active_investigations(
        user_id=current_user.username,
        status_filter=status_filter,
        limit=limit,
        offset=offset,
    )

    return investigations


@router.get(
    "/health",
    response_model=Dict[str, Any],
    summary="Polling health check",
    description="Health check endpoint without authentication requirement",
)
async def get_polling_health() -> Dict[str, Any]:
    """Health check endpoint (no auth required)."""
    polling_config = PollingConfig()

    return {
        "status": "healthy",
        "recommended_intervals": {
            "fast_ms": polling_config.fast_interval_ms,
            "normal_ms": polling_config.normal_interval_ms,
            "slow_ms": polling_config.slow_interval_ms,
        },
        "rate_limits": {
            "requests_per_minute": RateLimitConfig().requests_per_minute,
            "burst": RateLimitConfig().burst,
        },
    }
