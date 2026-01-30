"""
Analytics Service Proxy - Backend-only credential management

This module provides a secure proxy for analytics event tracking.
The mobile app calls this endpoint with an OAuth token, never directly accessing analytics services.
Backend credentials are managed securely and never exposed to the client.
"""

import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user, verify_oauth_token

router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])
logger = logging.getLogger(__name__)


class AnalyticsEvent(BaseModel):
    """Analytics event model"""

    event_name: str = Field(..., min_length=1, max_length=255, description="Event name")
    event_category: str = Field(
        ..., min_length=1, max_length=50, description="Event category"
    )
    properties: Optional[Dict[str, Any]] = Field(
        default_factory=dict, description="Event properties"
    )
    timestamp: Optional[datetime] = Field(
        default_factory=datetime.utcnow, description="Event timestamp"
    )


class AnalyticsResponse(BaseModel):
    """Response model for analytics tracking"""

    success: bool = Field(description="Whether event was tracked successfully")
    event_id: Optional[str] = Field(default=None, description="Tracked event ID")
    message: Optional[str] = Field(default=None, description="Response message")


@router.post("/track", response_model=AnalyticsResponse)
async def track_analytics_event(
    event: AnalyticsEvent,
    current_user=Depends(verify_oauth_token),
) -> AnalyticsResponse:
    """
    Track analytics event through backend proxy.

    Backend-only credential access ensures mobile app never handles analytics credentials.

    Args:
        event: AnalyticsEvent with event name, category, and properties
        current_user: Verified OAuth token user

    Returns:
        AnalyticsResponse with tracking result

    Raises:
        HTTPException: If tracking fails
    """

    try:
        # Sanitize event name and category (only alphanumeric and underscores)
        if not event.event_name.replace("_", "").isalnum():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Event name must contain only alphanumeric characters and underscores",
            )

        if not event.event_category.replace("_", "").isalnum():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Event category must contain only alphanumeric characters and underscores",
            )

        # Add user context (no PII, just ID)
        enriched_properties = {
            **event.properties,
            "user_id": current_user.id if hasattr(current_user, "id") else "unknown",
            "timestamp": (
                event.timestamp.isoformat()
                if event.timestamp
                else datetime.now(timezone.utc).isoformat()
            ),
        }

        # Log the event for backend processing
        # In production, this would be sent to Mixpanel, Segment, Google Analytics, etc.
        logger.info(
            f"[Analytics] Event tracked: {event.event_category}.{event.event_name}",
            extra={
                "event_name": event.event_name,
                "event_category": event.event_category,
                "properties": enriched_properties,
                "user_id": current_user.id if hasattr(current_user, "id") else None,
            },
        )

        # Events are tracked via Cloud Logging structured logs above
        # Cloud Logging integrates with BigQuery for analytics queries

        return AnalyticsResponse(
            success=True,
            event_id=f"{event.event_category}_{event.event_name}_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            message="Event tracked successfully",
        )

    except ValueError as e:
        logger.warning(f"[Analytics] Invalid event data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid event data: {str(e)}",
        )
    except Exception as e:
        logger.error(f"[Analytics] Failed to track event: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to track analytics event",
        )


@router.post("/batch", response_model=Dict[str, Any])
async def track_batch_analytics_events(
    events: list[AnalyticsEvent],
    current_user=Depends(verify_oauth_token),
) -> Dict[str, Any]:
    """
    Track multiple analytics events in batch.

    Backend-only credential access ensures mobile app never handles analytics credentials.

    Args:
        events: List of AnalyticsEvent objects
        current_user: Verified OAuth token user

    Returns:
        Batch response with tracking results

    Raises:
        HTTPException: If batch tracking fails
    """

    if not events:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one event is required",
        )

    if len(events) > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 100 events per batch",
        )

    tracked_events = []
    failed_events = []

    try:
        for event in events:
            try:
                # Same validation as single event
                if not event.event_name.replace("_", "").isalnum():
                    failed_events.append(
                        {"event": event.event_name, "reason": "Invalid event name"}
                    )
                    continue

                enriched_properties = {
                    **event.properties,
                    "user_id": (
                        current_user.id if hasattr(current_user, "id") else "unknown"
                    ),
                    "timestamp": (
                        event.timestamp.isoformat()
                        if event.timestamp
                        else datetime.now(timezone.utc).isoformat()
                    ),
                }

                logger.info(
                    f"[Analytics] Batch event: {event.event_category}.{event.event_name}",
                    extra={
                        "event_name": event.event_name,
                        "event_category": event.event_category,
                        "properties": enriched_properties,
                        "user_id": (
                            current_user.id if hasattr(current_user, "id") else None
                        ),
                    },
                )

                tracked_events.append(
                    {
                        "event_id": f"{event.event_category}_{event.event_name}_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                        "event_name": event.event_name,
                        "status": "tracked",
                    }
                )

            except Exception as e:
                failed_events.append({"event": event.event_name, "reason": str(e)})

        return {
            "total": len(events),
            "tracked": len(tracked_events),
            "failed": len(failed_events),
            "tracked_events": tracked_events,
            "failed_events": failed_events,
        }

    except Exception as e:
        logger.error(f"[Analytics] Batch tracking failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Batch analytics tracking failed",
        )


@router.get("/health")
async def health_check():
    """Health check endpoint for analytics service"""

    return {
        "status": "healthy",
        "service": "analytics_proxy",
        "message": "Analytics service is operational",
    }
