"""
HTTP Long-Polling / SSE Fallback (P3-4)

Server-Sent Events endpoint for networks that block WebSocket connections.
Partners POST audio chunks and receive results via SSE stream.
"""

import asyncio
import base64
import logging
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse

from app.api.routes.olorin.dependencies import get_current_partner
from app.api.routes.olorin.dubbing_routes import state
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.core.config import settings
from app.models.integration_partner import IntegrationPartner

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/sessions/{session_id}/audio",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Submit audio chunk (fallback)",
    description="Submit audio chunk via HTTP for networks blocking WebSocket.",
)
async def submit_audio_chunk(
    session_id: str,
    request: Request,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Accept audio chunk via HTTP POST (P3-4 fallback)."""
    service = state.get_service(session_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.SESSION_NOT_FOUND),
        )

    if service.partner.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=get_error_message(
                OlorinErrors.SESSION_DIFFERENT_PARTNER
            ),
        )

    audio_data = await request.body()

    max_chunk = settings.olorin.dubbing.max_audio_chunk_bytes
    if len(audio_data) > max_chunk:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Audio chunk exceeds maximum size ({max_chunk} bytes)",
        )

    await service.process_audio_chunk(audio_data)
    return {"status": "accepted", "bytes_received": len(audio_data)}


@router.get(
    "/sessions/{session_id}/events",
    summary="SSE event stream (fallback)",
    description="Server-Sent Events stream for dubbing output.",
)
async def session_events(
    session_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """P3-4: SSE endpoint for dubbing output when WebSocket unavailable."""
    service = state.get_service(session_id)
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.SESSION_NOT_FOUND),
        )

    if service.partner.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=get_error_message(
                OlorinErrors.SESSION_DIFFERENT_PARTNER
            ),
        )

    async def event_generator() -> AsyncIterator[str]:
        """Generate SSE events from dubbing output queue."""
        import json

        async for message in service.receive_messages():
            data = json.dumps(message.to_dict())
            yield f"event: {message.type}\ndata: {data}\n\n"

            if message.type == "session_ended":
                break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
