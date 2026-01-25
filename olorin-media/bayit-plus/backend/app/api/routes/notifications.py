"""
Notification Routes - Event tracking and analytics

Provides endpoints for logging notification events and retrieving
notification history and analytics.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.core.security import get_current_active_user, get_optional_user, get_current_admin_user
from app.models.user import User
from app.models.notification_event import NotificationEvent, NotificationMetrics

router = APIRouter()


class NotificationEventCreate(BaseModel):
    """Request model for creating notification event."""
    notification_id: str
    level: str
    message: str
    title: Optional[str] = None
    event_type: str  # shown, dismissed, action_clicked
    platform: str  # web, mobile, tv
    shown_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None


class NotificationEventResponse(BaseModel):
    """Response model for notification event."""
    id: str
    notification_id: str
    user_id: Optional[str]
    level: str
    message: str
    title: Optional[str]
    event_type: str
    platform: str
    shown_at: Optional[datetime]
    dismissed_at: Optional[datetime]
    time_to_dismiss_ms: Optional[int]
    created_at: datetime


@router.post("/events", response_model=dict)
async def log_notification_event(
    event: NotificationEventCreate,
    user: User = Depends(get_optional_user)
):
    """
    Log a notification lifecycle event.

    Tracks when notifications are shown, dismissed, or actions clicked.
    """
    # Calculate time to dismiss if applicable
    time_to_dismiss_ms = None
    if event.shown_at and event.dismissed_at:
        time_to_dismiss_ms = int((event.dismissed_at - event.shown_at).total_seconds() * 1000)

    # Create event document
    event_doc = NotificationEvent(
        notification_id=event.notification_id,
        user_id=str(user.id) if user else None,
        level=event.level,
        message=event.message[:500],  # Truncate to 500 chars
        title=event.title[:100] if event.title else None,
        event_type=event.event_type,
        platform=event.platform,
        shown_at=event.shown_at,
        dismissed_at=event.dismissed_at,
        time_to_dismiss_ms=time_to_dismiss_ms,
    )

    await event_doc.insert()

    return {"status": "ok", "event_id": str(event_doc.id)}


@router.get("/history", response_model=dict)
async def get_notification_history(
    limit: int = Query(default=50, le=100),
    skip: int = Query(default=0, ge=0),
    user: User = Depends(get_current_active_user)
):
    """
    Get user's notification history.

    Returns paginated list of notifications the user has seen.
    """
    events = await NotificationEvent.find(
        NotificationEvent.user_id == str(user.id)
    ).sort(-NotificationEvent.created_at).skip(skip).limit(limit).to_list()

    total = await NotificationEvent.find(
        NotificationEvent.user_id == str(user.id)
    ).count()

    return {
        "events": [
            {
                "id": str(e.id),
                "level": e.level,
                "message": e.message,
                "title": e.title,
                "event_type": e.event_type,
                "platform": e.platform,
                "created_at": e.created_at.isoformat(),
            }
            for e in events
        ],
        "total": total,
        "limit": limit,
        "skip": skip,
    }


@router.get("/admin/analytics", response_model=dict)
async def get_notification_analytics(
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    platform: Optional[str] = Query(None, description="web, mobile, tv"),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Get notification analytics for admin dashboard.

    Returns aggregated metrics for the specified date range.
    """
    query_filter = {
        "date": {"$gte": start_date, "$lte": end_date}
    }

    if platform:
        query_filter["platform"] = platform

    metrics = await NotificationMetrics.find(query_filter).to_list()

    return {
        "metrics": [
            {
                "date": m.date,
                "platform": m.platform,
                "total_notifications": m.total_notifications,
                "notifications_by_level": m.notifications_by_level,
                "dismiss_rate": m.dismiss_rate,
                "action_click_rate": m.action_click_rate,
                "avg_time_to_dismiss_ms": m.avg_time_to_dismiss_ms,
            }
            for m in metrics
        ],
        "start_date": start_date,
        "end_date": end_date,
        "platform": platform,
    }


@router.delete("/admin/cleanup")
async def cleanup_old_notifications(
    days: int = Query(default=90, description="Delete events older than N days"),
    admin_user: User = Depends(get_current_admin_user)
):
    """
    Cleanup old notification events.

    Delete events older than specified number of days.
    """
    cutoff_date = datetime.utcnow() - timedelta(days=days)

    result = await NotificationEvent.find(
        NotificationEvent.created_at < cutoff_date
    ).delete()

    return {
        "status": "ok",
        "deleted_count": result.deleted_count,
        "cutoff_date": cutoff_date.isoformat(),
    }
