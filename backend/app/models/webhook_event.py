"""Webhook event tracking for idempotency.

This module prevents replay attacks and duplicate webhook processing
by tracking processed Stripe webhook events.
"""
from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import Field


class WebhookEvent(Document):
    """Track processed webhooks to prevent replay attacks.

    Each Stripe webhook has a unique event ID. By storing processed event IDs,
    we can detect and reject duplicate webhooks (whether malicious replays or
    Stripe retry behavior).

    Attributes:
        stripe_event_id: Unique Stripe event ID (e.g., "evt_1234...")
        event_type: Event type (e.g., "checkout.session.completed")
        processed_at: When this webhook was processed
        user_id: Associated user ID (if applicable)
    """

    stripe_event_id: str = Field(..., unique=True, index=True)
    event_type: str
    processed_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    user_id: Optional[str] = None

    class Settings:
        name = "webhook_events"
        indexes = [
            "stripe_event_id",  # Unique constraint + fast lookup
        ]

    @classmethod
    async def is_processed(cls, event_id: str) -> bool:
        """Check if webhook has already been processed.

        Args:
            event_id: Stripe event ID

        Returns:
            True if already processed, False otherwise
        """
        existing = await cls.find_one(cls.stripe_event_id == event_id)
        return existing is not None

    @classmethod
    async def mark_processed(cls, event_id: str, event_type: str, user_id: Optional[str] = None) -> "WebhookEvent":
        """Mark webhook as processed.

        Args:
            event_id: Stripe event ID
            event_type: Event type (e.g., "checkout.session.completed")
            user_id: Associated user ID

        Returns:
            Created WebhookEvent document
        """
        event = cls(
            stripe_event_id=event_id,
            event_type=event_type,
            user_id=user_id,
        )
        await event.insert()
        return event
