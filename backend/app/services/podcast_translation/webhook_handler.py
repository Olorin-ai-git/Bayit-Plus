"""Webhook notification handler for translation events."""
import hashlib
import hmac
import logging
from typing import Dict, Optional

import httpx

from app.models.content import PodcastEpisode
from app.models.integration_partner import IntegrationPartner, WebhookDelivery

logger = logging.getLogger(__name__)


class WebhookHandler:
    """Handles webhook notifications for translation events."""

    async def send_webhook(
        self,
        episode_id: str,
        event_type: str,
        payload: Dict,
        partner: Optional[IntegrationPartner] = None,
    ):
        """
        Send webhook notification for translation event.
        Non-blocking: failures are logged but don't stop translation.

        Args:
            episode_id: Episode ID
            event_type: Webhook event type (translation.started, translation.progress, etc.)
            payload: Event payload data
            partner: Optional pre-fetched partner (for efficiency)
        """
        try:
            # Check if already sent this event to prevent duplicates
            episode = await PodcastEpisode.get(episode_id)
            if not episode:
                return

            notification_key = f"{event_type}:{payload.get('progress', 0)}"
            if notification_key in (episode.webhook_notifications_sent or []):
                logger.info(
                    f"Skipping duplicate webhook notification: {notification_key}"
                )
                return

            # Find partner if not provided (usually configured at system level)
            if not partner:
                # For MVP, use first active partner with translation webhooks enabled
                # In production, this should be configured per podcast or globally
                partner = await IntegrationPartner.find_one(
                    {
                        "is_active": True,
                        "webhook_url": {"$ne": None},
                        "webhook_events": event_type,
                    }
                )

            if not partner or not partner.webhook_url:
                return  # No webhook configured, skip silently

            # Generate HMAC signature
            payload_str = str(payload)
            signature = hmac.new(
                (partner.webhook_secret or "").encode(),
                payload_str.encode(),
                hashlib.sha256,
            ).hexdigest()

            # Send webhook with retry logic
            headers = {
                "Content-Type": "application/json",
                "X-Webhook-Signature": signature,
                "X-Webhook-Event": event_type,
            }

            async with httpx.AsyncClient(timeout=10.0) as client:
                try:
                    response = await client.post(
                        partner.webhook_url, json=payload, headers=headers
                    )
                    delivered = response.status_code < 400

                    # Track delivery attempt
                    await WebhookDelivery(
                        partner_id=partner.partner_id,
                        event_type=event_type,
                        payload=payload,
                        delivered=delivered,
                        attempts=1,
                        response_status_code=response.status_code,
                        response_body=response.text[:500],
                    ).insert()

                    if delivered:
                        # Mark as sent to prevent duplicates
                        await PodcastEpisode.find_one({"_id": episode_id}).update(
                            {"$addToSet": {"webhook_notifications_sent": notification_key}}
                        )
                        logger.info(f"Webhook sent successfully: {event_type}")
                    else:
                        logger.warning(
                            f"Webhook delivery failed: {event_type} (status: {response.status_code})"
                        )

                except Exception as delivery_error:
                    logger.error(
                        f"Webhook delivery exception: {event_type} - {delivery_error}"
                    )
                    await WebhookDelivery(
                        partner_id=partner.partner_id if partner else "unknown",
                        event_type=event_type,
                        payload=payload,
                        delivered=False,
                        attempts=1,
                        error_message=str(delivery_error),
                    ).insert()

        except Exception as e:
            # Non-blocking: log error but don't fail translation
            logger.error(f"Webhook system error (non-blocking): {e}")
