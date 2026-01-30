"""
Admin Email Analytics API

Provides delivery statistics, bounce rates, and event logs
for monitoring email performance.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/email/analytics", tags=["admin", "email-analytics"])


@router.get("")
async def get_delivery_stats(
    campaign_id: Optional[str] = Query(None, description="Filter by campaign ID"),
    days: int = Query(7, ge=1, le=90, description="Number of days to look back"),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Get email delivery statistics for the given period."""
    from olorin_email.tracking.analytics import EmailAnalytics

    analytics = EmailAnalytics()
    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(days=days)

    stats = await analytics.get_delivery_stats(
        campaign_id=campaign_id, start=start, end=end
    )

    logger.info(
        "Delivery stats retrieved",
        extra={"campaign_id": campaign_id, "days": days},
    )

    return {
        "period": {"start": start.isoformat(), "end": end.isoformat(), "days": days},
        "campaign_id": campaign_id,
        "stats": {
            "sent": stats.sent,
            "delivered": stats.delivered,
            "opened": stats.opened,
            "clicked": stats.clicked,
            "bounced": stats.bounced,
            "dropped": stats.dropped,
            "spam_reports": stats.spam_reports,
            "unsubscribes": stats.unsubscribes,
            "delivery_rate": stats.delivery_rate,
            "open_rate": stats.open_rate,
            "click_rate": stats.click_rate,
            "bounce_rate": stats.bounce_rate,
        },
    }


@router.get("/campaign/{campaign_id}")
async def get_campaign_stats(
    campaign_id: str,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Get delivery statistics for a specific campaign."""
    from olorin_email.tracking.analytics import EmailAnalytics

    analytics = EmailAnalytics()
    end = datetime.now(tz=timezone.utc)
    # Campaign stats look back 90 days by default
    start = end - timedelta(days=90)

    stats = await analytics.get_delivery_stats(
        campaign_id=campaign_id, start=start, end=end
    )

    return {
        "campaign_id": campaign_id,
        "stats": {
            "sent": stats.sent,
            "delivered": stats.delivered,
            "opened": stats.opened,
            "clicked": stats.clicked,
            "bounced": stats.bounced,
            "dropped": stats.dropped,
            "delivery_rate": stats.delivery_rate,
            "open_rate": stats.open_rate,
            "click_rate": stats.click_rate,
            "bounce_rate": stats.bounce_rate,
        },
    }


@router.get("/bounces")
async def get_bouncing_recipients(
    limit: int = Query(20, ge=1, le=100, description="Max recipients to return"),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Get top bouncing email recipients."""
    from olorin_email.tracking.analytics import EmailAnalytics

    analytics = EmailAnalytics()
    recipients = await analytics.get_top_bouncing_recipients(limit=limit)

    return {"bouncing_recipients": recipients, "limit": limit}


@router.get("/events")
async def get_event_log(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=10, le=200, description="Events per page"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    recipient: Optional[str] = Query(None, description="Filter by recipient"),
    campaign_id: Optional[str] = Query(None, description="Filter by campaign"),
    days: int = Query(7, ge=1, le=90, description="Days to look back"),
    settings: Settings = Depends(get_settings),
) -> dict:
    """Get paginated email event log."""
    from olorin_email.tracking.models import EmailEvent

    end = datetime.now(tz=timezone.utc)
    start = end - timedelta(days=days)

    # Build query filter
    query_filter = {"timestamp": {"$gte": start, "$lte": end}}
    if event_type:
        query_filter["event_type"] = event_type
    if recipient:
        query_filter["recipient"] = recipient
    if campaign_id:
        query_filter["campaign_id"] = campaign_id

    # Get total count
    total = await EmailEvent.find(query_filter).count()

    # Get paginated results
    skip = (page - 1) * page_size
    events = (
        await EmailEvent.find(query_filter)
        .sort("-timestamp")
        .skip(skip)
        .limit(page_size)
        .to_list()
    )

    total_pages = (total + page_size - 1) // page_size

    return {
        "events": [
            {
                "email_id": e.email_id,
                "event_type": e.event_type,
                "recipient": e.recipient,
                "template_name": e.template_name,
                "subject": e.subject,
                "timestamp": e.timestamp.isoformat(),
                "sg_message_id": e.sg_message_id,
                "campaign_id": e.campaign_id,
            }
            for e in events
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
