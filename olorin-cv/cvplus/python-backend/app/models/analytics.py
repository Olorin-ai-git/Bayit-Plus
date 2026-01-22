"""
Analytics Document Models
MongoDB models for usage tracking and metrics
"""

from datetime import datetime
from typing import Optional, Dict
from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel, ASCENDING, DESCENDING


class AnalyticsEvent(Document):
    """Analytics event tracking"""

    # Event identification
    event_type: Indexed(str)  # view, download, contact, analysis, etc.
    user_id: Optional[Indexed(str)] = None
    cv_id: Optional[Indexed(str)] = None
    profile_id: Optional[Indexed(str)] = None

    # Visitor information (for public profile views)
    visitor_id: Optional[str] = None  # Anonymous visitor tracking
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

    # Source tracking
    referrer: Optional[str] = None
    utm_source: Optional[str] = None
    utm_medium: Optional[str] = None
    utm_campaign: Optional[str] = None

    # Geographic data
    country: Optional[str] = None
    city: Optional[str] = None

    # Event metadata
    metadata: Dict = Field(default_factory=dict)

    # Timestamps
    created_at: Indexed(datetime) = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "analytics_events"
        indexes = [
            IndexModel([("event_type", ASCENDING)]),
            IndexModel([("user_id", ASCENDING)], sparse=True),
            IndexModel([("cv_id", ASCENDING)], sparse=True),
            IndexModel([("profile_id", ASCENDING)], sparse=True),
            IndexModel(
                [("user_id", ASCENDING), ("event_type", ASCENDING), ("created_at", DESCENDING)],
                name="idx_user_event_created"
            ),
            IndexModel(
                [("profile_id", ASCENDING), ("event_type", ASCENDING), ("created_at", DESCENDING)],
                name="idx_profile_event_created"
            ),
            IndexModel(
                [("event_type", ASCENDING), ("created_at", DESCENDING)],
                name="idx_event_type_created"
            ),
            IndexModel(
                [("created_at", ASCENDING)],
                expireAfterSeconds=30 * 24 * 60 * 60,  # 30 days TTL
                name="idx_ttl_created_at"
            ),
        ]
