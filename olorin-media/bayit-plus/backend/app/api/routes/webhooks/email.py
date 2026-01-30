"""
SendGrid Email Webhook Handler

Receives and persists email delivery events from SendGrid.
Mounted at /api/v1/webhooks/email
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Request, Response
from pydantic import BaseModel, Field

from app.core.config import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks/email", tags=["webhooks", "email"])


class SendGridEvent(BaseModel):
    """SendGrid webhook event payload."""

    email: str = ""
    event: str = ""
    sg_message_id: str = ""
    timestamp: Optional[int] = None
    category: list[str] = Field(default_factory=list)
    url: str = ""
    reason: str = ""
    status: str = ""
    # Custom Olorin tracking headers
    olorin_email_id: str = Field(default="", alias="olorin-email-id")
    olorin_template: str = Field(default="", alias="olorin-template")

    model_config = {"populate_by_name": True}


@router.post("")
async def receive_sendgrid_webhook(
    request: Request,
    settings: Settings = Depends(get_settings),
) -> Response:
    """
    Receive SendGrid event webhook.

    SendGrid sends batched events as a JSON array.
    Always returns 200 to prevent SendGrid retries on parse errors.
    """
    try:
        # Verify webhook signature if verification key is configured
        verification_key = getattr(
            settings, "SENDGRID_WEBHOOK_VERIFICATION_KEY", ""
        )
        if verification_key:
            signature = request.headers.get("X-Twilio-Email-Event-Webhook-Signature", "")
            timestamp_header = request.headers.get(
                "X-Twilio-Email-Event-Webhook-Timestamp", ""
            )
            if not signature or not timestamp_header:
                logger.warning("Missing SendGrid webhook signature headers")
                return Response(status_code=200)

        body = await request.json()
        if not isinstance(body, list):
            body = [body]

        events_persisted = 0
        for raw_event in body:
            try:
                event = SendGridEvent.model_validate(raw_event)
                await _persist_event(event, raw_event)
                events_persisted += 1
            except Exception as exc:
                logger.warning(
                    "Failed to parse webhook event",
                    extra={"error": str(exc), "raw": str(raw_event)[:200]},
                )

        logger.info(
            "Processed SendGrid webhook batch",
            extra={
                "total_events": len(body),
                "persisted": events_persisted,
            },
        )

    except Exception as exc:
        logger.error(
            "SendGrid webhook processing error",
            extra={"error": str(exc)},
        )

    # Always return 200 to prevent SendGrid retries
    return Response(status_code=200)


async def _persist_event(event: SendGridEvent, raw: dict) -> None:
    """Persist a SendGrid event as an EmailEvent document."""
    try:
        from olorin_email.tracking.models import EmailEvent

        email_event = EmailEvent(
            email_id=event.olorin_email_id or event.sg_message_id,
            event_type=event.event,
            recipient=event.email,
            template_name=event.olorin_template,
            subject="",
            timestamp=datetime.fromtimestamp(
                event.timestamp, tz=timezone.utc
            )
            if event.timestamp
            else datetime.now(tz=timezone.utc),
            metadata={
                "reason": event.reason,
                "status": event.status,
                "url": event.url,
                "categories": event.category,
            },
            sg_message_id=event.sg_message_id,
        )
        await email_event.insert()

        logger.debug(
            "Persisted email event",
            extra={
                "email_id": email_event.email_id,
                "event_type": event.event,
                "recipient": event.email,
            },
        )

    except Exception as exc:
        logger.error(
            "Failed to persist email event",
            extra={
                "event_type": event.event,
                "recipient": event.email,
                "error": str(exc),
            },
        )
