"""
Chat Webhook Endpoints - External integration webhooks

Endpoints for handling webhook callbacks from external services
like ElevenLabs for async transcription processing.
"""

import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException, Request

from app.core.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

from .models import ElevenLabsWebhookEvent, WebhookResponse
from .services import (pending_transcriptions, process_transcription_completed,
                       verify_elevenlabs_signature)

router = APIRouter()


@router.post("/webhook/elevenlabs", response_model=WebhookResponse)
async def elevenlabs_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    elevenlabs_signature: Optional[str] = Header(None, alias="elevenlabs-signature"),
    x_elevenlabs_signature: Optional[str] = Header(
        None, alias="x-elevenlabs-signature"
    ),
) -> WebhookResponse:
    """Handle ElevenLabs webhook events for transcription completion."""
    body = await request.body()

    signature = elevenlabs_signature or x_elevenlabs_signature

    if settings.ELEVENLABS_WEBHOOK_SECRET:
        if not signature:
            raise HTTPException(
                status_code=401, detail="Missing webhook signature header"
            )

        if not verify_elevenlabs_signature(
            body, signature, settings.ELEVENLABS_WEBHOOK_SECRET
        ):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        payload = json.loads(body)
        event = ElevenLabsWebhookEvent(**payload)
    except Exception as e:
        raise HTTPException(
            status_code=400, detail=f"Invalid webhook payload: {str(e)}"
        )

    if event.event_type == "transcription.completed":
        background_tasks.add_task(
            process_transcription_completed,
            event.transcription_id or event.request_id,
            event.text,
            event.language_code,
            event.audio_duration,
            event.metadata,
        )

        return WebhookResponse(
            event_type=event.event_type,
            message=f"Transcription completed: {len(event.text or '')} characters",
        )

    elif event.event_type == "transcription.failed":
        logger.error("ElevenLabs webhook transcription failed", extra={"error": event.error})

        if event.transcription_id and event.transcription_id in pending_transcriptions:
            pending_transcriptions[event.transcription_id]["status"] = "failed"
            pending_transcriptions[event.transcription_id]["error"] = event.error

        return WebhookResponse(
            event_type=event.event_type, message=f"Transcription failed: {event.error}"
        )

    elif event.event_type == "transcription.started":
        if event.transcription_id:
            pending_transcriptions[event.transcription_id] = {
                "status": "processing",
                "started_at": datetime.utcnow().isoformat(),
                "metadata": event.metadata,
            }

        return WebhookResponse(
            event_type=event.event_type, message="Transcription started"
        )

    else:
        logger.warning("ElevenLabs webhook unknown event type", extra={"event_type": event.event_type})
        return WebhookResponse(
            event_type=event.event_type, message=f"Event received: {event.event_type}"
        )
