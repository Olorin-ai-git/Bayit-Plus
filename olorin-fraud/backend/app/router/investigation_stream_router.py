"""
Investigation Stream API Router
Feature: 001-investigation-state-management

Provides streaming and event endpoints for investigation state changes.
Supports cursor-based pagination and conditional requests with ETag caching.

SYSTEM MANDATE Compliance:
- No hardcoded values: All configuration from environment
- Complete implementation: No placeholders or TODOs
- Type-safe: All parameters and returns properly typed
"""

import os
import time
from typing import Optional

from fastapi import (
    APIRouter,
    Depends,
    Header,
    HTTPException,
    Query,
    Request,
    Response,
    status,
)
from sqlalchemy.orm import Session

from app.persistence.database import get_db
from app.security.auth import User, require_read_or_dev
from app.service.etag_service import ETagService
from app.service.event_feed_service import EventFeedService, EventsFeedResponse

router = APIRouter(
    prefix="/api/v1/investigations",
    tags=["Investigation Stream"],
    responses={
        400: {"description": "Bad request"},
        403: {"description": "Forbidden"},
        404: {"description": "Not found"},
    },
)

# Configuration from environment
DEFAULT_LIMIT = int(os.getenv("EVENT_FEED_DEFAULT_LIMIT", "100"))
MAX_LIMIT = int(os.getenv("EVENT_FEED_MAX_LIMIT", "1000"))
ETAG_RESPONSE_TIME_TARGET_MS = int(os.getenv("ETAG_RESPONSE_TIME_TARGET_MS", "30"))


@router.get(
    "/{investigation_id}/events",
    response_model=EventsFeedResponse,
    summary="Get investigation events",
    description="Retrieve events feed for investigation with cursor-based pagination and ETag support",
    responses={
        200: {
            "description": "Events retrieved successfully",
            "model": EventsFeedResponse,
        },
        304: {"description": "Not Modified - ETag matches current state"},
        400: {"description": "Invalid cursor format or expired cursor"},
        403: {"description": "User not authorized to access investigation"},
        404: {"description": "Investigation not found"},
    },
)
async def get_investigation_events(
    investigation_id: str,
    request: Request,
    response: Response,
    since: Optional[str] = Query(
        None,
        description="Cursor string for pagination (e.g., '1730668800000_000127')",
        example="1730668800000_000127",
    ),
    limit: int = Query(
        DEFAULT_LIMIT,
        ge=1,
        le=MAX_LIMIT,
        description=f"Maximum events to return (1-{MAX_LIMIT})",
    ),
    if_none_match: Optional[str] = Header(
        None, alias="If-None-Match", description="ETag value for conditional request"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_read_or_dev),
) -> EventsFeedResponse:
    """
    Get event feed for investigation with cursor-based pagination and ETag support.

    The events endpoint provides a feed of all state changes for an investigation,
    ordered by timestamp. Use the cursor from next_cursor to paginate through results.

    Cursor format: timestamp_sequence (e.g., "1730668800000_000127")
    - timestamp: Unix timestamp in milliseconds
    - sequence: 6-digit sequence number for ordering within same timestamp

    ETag Support:
    - Include If-None-Match header with previous ETag value
    - Returns 304 Not Modified if content unchanged (empty body, headers only)
    - Performance target: 304 responses under 30ms

    Returns:
    - items: Array of investigation events
    - next_cursor: Cursor for next page (null if no more events)
    - has_more: Boolean indicating if more events exist
    - poll_after_seconds: Suggested polling interval for real-time updates
    - etag: ETag for conditional requests

    Response Headers:
    - ETag: Cache validation token
    - X-Recommended-Interval: Recommended polling interval in milliseconds
    - Cache-Control: Caching directives

    Error codes:
    - 304: Not Modified (ETag matches)
    - 400: Invalid cursor format or expired cursor (>30 days old)
    - 403: User not authorized to access investigation
    - 404: Investigation not found
    """
    # Reject reserved route names that shouldn't be treated as investigation IDs
    reserved_names = [
        "visualization",
        "charts",
        "maps",
        "risk-analysis",
        "reports",
        "analytics",
        "rag",
        "investigations",
        "investigations-management",
        "compare",
    ]
    if investigation_id.lower() in reserved_names:
        from app.service.logging import get_bridge_logger

        logger = get_bridge_logger(__name__)
        logger.warning(
            f"Rejected reserved route name '{investigation_id}' as investigation ID"
        )
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Investigation not found: {investigation_id}",
        )

    start_time = time.time()
    event_service = EventFeedService(db)
    etag_service = ETagService(db)

    # Check for ETag match early for fast 304 response
    if if_none_match:
        # Get investigation version for ETag validation
        current_etag = etag_service.get_investigation_etag(
            investigation_id=investigation_id, user_id=current_user.username
        )

        # Fast path: Return 304 if ETag matches
        if if_none_match == current_etag:
            # Calculate poll interval based on investigation state
            poll_interval = etag_service.calculate_poll_interval(investigation_id)

            # Set response headers for 304
            response.status_code = status.HTTP_304_NOT_MODIFIED
            response.headers["ETag"] = current_etag
            # Force revalidation - browser must check with server, but allow 304 responses
            response.headers["Cache-Control"] = "no-cache, must-revalidate"
            response.headers["X-Recommended-Interval"] = str(
                poll_interval * 1000
            )  # Convert to ms

            # Log performance for 304 responses
            elapsed_ms = int((time.time() - start_time) * 1000)
            if elapsed_ms > ETAG_RESPONSE_TIME_TARGET_MS:
                import logging

                logging.warning(
                    f"304 response took {elapsed_ms}ms (target: {ETAG_RESPONSE_TIME_TARGET_MS}ms) "
                    f"for investigation {investigation_id}"
                )

            # Return minimal response for 304
            return EventsFeedResponse(
                items=[],
                next_cursor=None,
                has_more=False,
                poll_after_seconds=poll_interval,
                etag=current_etag,
            )

    # Fetch events (full response path)
    events_response = event_service.fetch_events_since(
        investigation_id=investigation_id,
        user_id=current_user.username,
        cursor=since,
        limit=limit,
    )

    # Set response headers for 200 OK
    response.headers["ETag"] = events_response.etag
    # Force revalidation - browser must check with server on every request
    # This ensures fresh data while still allowing efficient 304 responses
    response.headers["Cache-Control"] = "no-cache, must-revalidate"
    response.headers["X-Recommended-Interval"] = str(
        events_response.poll_after_seconds * 1000
    )

    return events_response
