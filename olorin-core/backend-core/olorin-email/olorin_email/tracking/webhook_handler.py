"""FastAPI webhook handler for SendGrid events."""

import hashlib
import hmac
import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Request, Response

from ..config import EmailSettings
from .models import EmailEvent


logger = logging.getLogger(__name__)


def create_webhook_router(settings: EmailSettings) -> APIRouter:
    """Create FastAPI router for SendGrid webhook events.

    Args:
        settings: Email settings with webhook verification key

    Returns:
        Configured APIRouter for webhook endpoints
    """
    router = APIRouter(prefix="/email/webhooks", tags=["email-webhooks"])

    @router.post("/sendgrid")
    async def handle_sendgrid_webhook(request: Request) -> Response:
        """Handle SendGrid webhook events.

        Always returns 200 OK to prevent SendGrid retries on parse errors.

        Args:
            request: FastAPI request with webhook payload

        Returns:
            200 OK response
        """
        try:
            body = await request.body()

            if settings.SENDGRID_WEBHOOK_VERIFICATION_KEY:
                if not _verify_signature(request, body, settings):
                    logger.warning(
                        "Invalid webhook signature",
                        extra={"remote_addr": request.client.host}
                    )
                    return Response(status_code=200)

            events = await request.json()

            if not isinstance(events, list):
                logger.error(
                    "Webhook payload is not a list",
                    extra={"payload_type": type(events).__name__}
                )
                return Response(status_code=200)

            await _process_events(events)

            logger.info(
                "Webhook events processed",
                extra={"event_count": len(events)}
            )

        except Exception as exc:
            logger.error(
                "Error processing webhook",
                extra={"error": str(exc)},
                exc_info=True
            )

        return Response(status_code=200)

    return router


def _verify_signature(request: Request, body: bytes, settings: EmailSettings) -> bool:
    """Verify SendGrid webhook signature.

    Args:
        request: FastAPI request with signature header
        body: Raw request body
        settings: Email settings with verification key

    Returns:
        True if signature is valid
    """
    signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature", "")
    timestamp = request.headers.get("X-Twilio-Email-Event-Webhook-Timestamp", "")

    if not signature or not timestamp:
        return False

    verification_key = settings.SENDGRID_WEBHOOK_VERIFICATION_KEY
    signed_payload = timestamp.encode() + body

    expected_signature = hmac.new(
        verification_key.encode(),
        signed_payload,
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)


async def _process_events(events: list[dict[str, Any]]) -> None:
    """Process and persist webhook events.

    Args:
        events: List of SendGrid event dictionaries
    """
    for event_data in events:
        try:
            email_event = EmailEvent(
                email_id=event_data.get("olorin_email_id", ""),
                event_type=event_data.get("event", "unknown"),
                recipient=event_data.get("email", ""),
                template_name=event_data.get("olorin_template", ""),
                subject=event_data.get("subject", ""),
                timestamp=datetime.fromtimestamp(event_data.get("timestamp", 0)),
                metadata=_extract_metadata(event_data),
                sg_message_id=event_data.get("sg_message_id", ""),
                campaign_id=event_data.get("campaign_id"),
                user_id=event_data.get("user_id")
            )

            await email_event.insert()

            logger.debug(
                "Email event persisted",
                extra={
                    "email_id": email_event.email_id,
                    "event_type": email_event.event_type,
                    "recipient": email_event.recipient
                }
            )

        except Exception as exc:
            logger.error(
                "Failed to persist email event",
                extra={
                    "event_data": event_data,
                    "error": str(exc)
                },
                exc_info=True
            )


def _extract_metadata(event_data: dict[str, Any]) -> dict:
    """Extract metadata from webhook event.

    Args:
        event_data: SendGrid event dictionary

    Returns:
        Filtered metadata dictionary
    """
    metadata_keys = [
        "url",
        "url_offset",
        "useragent",
        "ip",
        "reason",
        "status",
        "response",
        "attempt",
        "category",
        "type",
        "bounce_classification"
    ]

    return {
        key: event_data[key]
        for key in metadata_keys
        if key in event_data
    }
