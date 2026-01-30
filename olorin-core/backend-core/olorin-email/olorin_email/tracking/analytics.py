"""Email analytics and delivery statistics."""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from beanie.operators import GTE, LTE, And, Eq
from pymongo import DESCENDING

from .models import EmailEvent


logger = logging.getLogger(__name__)


@dataclass
class DeliveryStats:
    """Email delivery statistics."""

    sent: int = 0
    delivered: int = 0
    opened: int = 0
    clicked: int = 0
    bounced: int = 0
    dropped: int = 0
    spam_report: int = 0
    unsubscribe: int = 0


class EmailAnalytics:
    """Email analytics and reporting."""

    async def get_delivery_stats(
        self,
        campaign_id: Optional[str],
        start: datetime,
        end: datetime
    ) -> DeliveryStats:
        """Get delivery statistics for a time period."""
        query_filters = [
            GTE(EmailEvent.timestamp, start),
            LTE(EmailEvent.timestamp, end)
        ]

        if campaign_id:
            query_filters.append(Eq(EmailEvent.campaign_id, campaign_id))

        query = EmailEvent.find(And(*query_filters))

        stats = DeliveryStats()

        async for event in query:
            event_type = event.event_type.lower()

            if event_type == "processed" or event_type == "sent":
                stats.sent += 1
            elif event_type == "delivered":
                stats.delivered += 1
            elif event_type == "open":
                stats.opened += 1
            elif event_type == "click":
                stats.clicked += 1
            elif event_type == "bounce":
                stats.bounced += 1
            elif event_type == "dropped":
                stats.dropped += 1
            elif event_type == "spamreport":
                stats.spam_report += 1
            elif event_type == "unsubscribe":
                stats.unsubscribe += 1

        logger.info(
            "Delivery stats calculated",
            extra={
                "campaign_id": campaign_id,
                "start": start.isoformat(),
                "end": end.isoformat(),
                "sent": stats.sent,
                "delivered": stats.delivered
            }
        )

        return stats

    async def get_bounce_rate(self, start: datetime, end: datetime) -> float:
        """Calculate bounce rate for a time period."""
        stats = await self.get_delivery_stats(None, start, end)

        if stats.sent == 0:
            return 0.0

        bounce_rate = stats.bounced / stats.sent

        logger.info(
            "Bounce rate calculated",
            extra={
                "start": start.isoformat(),
                "end": end.isoformat(),
                "bounced": stats.bounced,
                "sent": stats.sent,
                "rate": bounce_rate
            }
        )

        return bounce_rate

    async def get_top_bouncing_recipients(self, limit: int = 10) -> list[dict]:
        """Get recipients with most bounce events."""
        pipeline = [
            {"$match": {"event_type": "bounce"}},
            {
                "$group": {
                    "_id": "$recipient",
                    "bounce_count": {"$sum": 1},
                    "last_bounce": {"$max": "$timestamp"}
                }
            },
            {"$sort": {"bounce_count": -1}},
            {"$limit": limit}
        ]

        results = []

        async for doc in EmailEvent.get_motor_collection().aggregate(pipeline):
            results.append({
                "recipient": doc["_id"],
                "bounce_count": doc["bounce_count"],
                "last_bounce": doc["last_bounce"]
            })

        logger.info(
            "Top bouncing recipients retrieved",
            extra={"count": len(results), "limit": limit}
        )

        return results

    async def get_campaign_performance(self, campaign_id: str) -> dict:
        """Get comprehensive performance metrics for a campaign."""
        query = EmailEvent.find(Eq(EmailEvent.campaign_id, campaign_id))

        first_event = await query.sort([(EmailEvent.timestamp, 1)]).first_or_none()
        last_event = await query.sort([(EmailEvent.timestamp, -1)]).first_or_none()

        if not first_event or not last_event:
            logger.warning(
                "No events found for campaign",
                extra={"campaign_id": campaign_id}
            )
            return {
                "campaign_id": campaign_id,
                "stats": DeliveryStats(),
                "start_time": None,
                "end_time": None
            }

        stats = await self.get_delivery_stats(
            campaign_id,
            first_event.timestamp,
            last_event.timestamp
        )

        open_rate = stats.opened / stats.delivered if stats.delivered > 0 else 0.0
        click_rate = stats.clicked / stats.delivered if stats.delivered > 0 else 0.0

        performance = {
            "campaign_id": campaign_id,
            "stats": stats,
            "start_time": first_event.timestamp,
            "end_time": last_event.timestamp,
            "open_rate": open_rate,
            "click_rate": click_rate
        }

        logger.info(
            "Campaign performance calculated",
            extra={
                "campaign_id": campaign_id,
                "open_rate": open_rate,
                "click_rate": click_rate
            }
        )

        return performance
