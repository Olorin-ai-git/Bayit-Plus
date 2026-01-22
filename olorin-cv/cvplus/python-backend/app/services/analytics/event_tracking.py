"""
Event Tracking
Core event creation and tracking functionality
"""

import logging
from typing import Dict, Optional

from app.models import AnalyticsEvent

logger = logging.getLogger(__name__)


async def track_event(
    event_type: str,
    user_id: Optional[str] = None,
    cv_id: Optional[str] = None,
    profile_id: Optional[str] = None,
    visitor_id: Optional[str] = None,
    metadata: Optional[Dict] = None
) -> AnalyticsEvent:
    """
    Track analytics event

    Args:
        event_type: Event type (view, download, contact, etc.)
        user_id: User ID (if authenticated)
        cv_id: CV ID (if applicable)
        profile_id: Profile ID (if applicable)
        visitor_id: Anonymous visitor ID (for public views)
        metadata: Additional event metadata

    Returns:
        Created event
    """
    logger.debug(f"Tracking event: {event_type}", extra={
        "user_id": user_id,
        "cv_id": cv_id,
        "profile_id": profile_id,
    })

    metadata = metadata or {}

    event = AnalyticsEvent(
        event_type=event_type,
        user_id=user_id,
        cv_id=cv_id,
        profile_id=profile_id,
        visitor_id=visitor_id,
        ip_address=metadata.get("ip_address"),
        user_agent=metadata.get("user_agent"),
        referrer=metadata.get("referrer"),
        utm_source=metadata.get("utm_source"),
        utm_medium=metadata.get("utm_medium"),
        utm_campaign=metadata.get("utm_campaign"),
        country=metadata.get("country"),
        city=metadata.get("city"),
        metadata=metadata,
    )

    await event.save()

    return event
