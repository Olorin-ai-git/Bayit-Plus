"""
Notification Event Model

Tracks notification lifecycle events for analytics and user history.
"""

from datetime import datetime
from typing import Optional, Dict

from beanie import Document
from pydantic import Field


class NotificationEvent(Document):
    """
    Track notification lifecycle events.

    Records when notifications are shown, dismissed, and when actions are clicked.
    Used for analytics and user notification history.
    """

    # Identity
    notification_id: str = Field(..., description="Unique notification ID")
    user_id: Optional[str] = Field(None, description="User who saw the notification")

    # Notification details
    level: str = Field(..., description="Notification level: debug, info, warning, success, error")
    message: str = Field(..., description="Notification message content")
    title: Optional[str] = Field(None, description="Notification title")

    # Event tracking
    event_type: str = Field(..., description="Event type: shown, dismissed, action_clicked")
    platform: str = Field(..., description="Platform: web, mobile, tv")

    # Timing
    shown_at: Optional[datetime] = Field(None, description="When notification was shown")
    dismissed_at: Optional[datetime] = Field(None, description="When notification was dismissed")
    time_to_dismiss_ms: Optional[int] = Field(None, description="Time to dismiss in milliseconds")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notification_events"
        indexes = [
            "notification_id",
            "user_id",
            [("user_id", 1), ("created_at", -1)],
            [("platform", 1), ("level", 1)],
            [("created_at", -1)],
        ]


class NotificationMetrics(Document):
    """
    Daily aggregated notification metrics.

    Stores daily rollups of notification statistics for analytics dashboards.
    """

    # Identity
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    platform: str = Field(..., description="Platform: web, mobile, tv")

    # Counts
    total_notifications: int = Field(default=0)
    notifications_by_level: Dict[str, int] = Field(default_factory=dict)

    # Rates
    dismiss_rate: float = Field(default=0.0, description="Percentage dismissed")
    action_click_rate: float = Field(default=0.0, description="Percentage with action clicks")
    avg_time_to_dismiss_ms: float = Field(default=0.0, description="Average time to dismiss")

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "notification_metrics"
        indexes = [
            [("date", 1), ("platform", 1)],
            "date",
            "platform",
        ]
