"""
Olorin.ai Realtime Dubbing API

WebSocket and REST endpoints for real-time audio dubbing.
"""

import asyncio
import base64
import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner, DubbingSession
from app.services.olorin.partner_service import partner_service
from app.services.olorin.metering_service import metering_service
from app.services.olorin.realtime_dubbing_service import RealtimeDubbingService
from app.api.routes.olorin.dependencies import (
    get_current_partner,
    verify_capability,
    get_client_info,
    API_KEY_HEADER,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# Request/Response Models
# ============================================


class CreateSessionRequest(BaseModel):
    """Request to create a dubbing session."""

    source_language: str = Field(default="he", description="Source language code")
    target_language: str = Field(default="en", description="Target language code")
    voice_id: Optional[str] = Field(
        default=None,
        description="ElevenLabs voice ID (optional, uses default if not specified)",
    )


class SessionResponse(BaseModel):
    """Dubbing session information."""

    session_id: str
    partner_id: str
    source_language: str
    target_language: str
    voice_id: Optional[str]
    status: str
    started_at: str
    websocket_url: str


class SessionEndResponse(BaseModel):
    """Response when ending a dubbing session."""

    session_id: str
    partner_id: str
    segments_processed: int
    audio_seconds: float
    avg_latency_ms: Optional[float]
    error_count: int
    estimated_cost_usd: float


class VoiceInfo(BaseModel):
    """Voice information."""

    voice_id: str
    name: str
    language: str
    description: Optional[str] = None


class VoicesResponse(BaseModel):
    """List of available voices."""

    voices: List[VoiceInfo]


# ============================================
# Active Sessions Tracking
# ============================================

# In-memory tracking of active dubbing services
# In production, this could be moved to Redis for multi-instance support
_active_services: dict[str, RealtimeDubbingService] = {}


# ============================================
# REST Endpoints
# ============================================


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create dubbing session",
    description="Create a new real-time dubbing session. Returns a session ID and WebSocket URL.",
)
async def create_session(
    request: CreateSessionRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Create a new dubbing session."""
    # Verify capability
    await verify_capability(partner, "realtime_dubbing")

    # Check concurrent session limit
    config = partner.get_capability_config("realtime_dubbing")
    if config:
        active_count = await metering_service.get_active_sessions_count(partner.partner_id)
        if active_count >= config.rate_limits.concurrent_sessions:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=f"Maximum concurrent sessions ({config.rate_limits.concurrent_sessions}) reached",
            )

    # Validate languages
    supported_source = ["he", "en", "es", "ar", "ru"]
    supported_target = ["en", "es", "he"]

    if request.source_language not in supported_source:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Source language '{request.source_language}' not supported. "
            f"Supported: {supported_source}",
        )

    if request.target_language not in supported_target:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Target language '{request.target_language}' not supported. "
            f"Supported: {supported_target}",
        )

    # Create dubbing service
    service = RealtimeDubbingService(
        partner=partner,
        source_language=request.source_language,
        target_language=request.target_language,
        voice_id=request.voice_id,
    )

    # Store in active services
    _active_services[service.session_id] = service

    # Build WebSocket URL
    ws_url = f"/api/v1/olorin/dubbing/ws/{service.session_id}"

    logger.info(f"Created dubbing session: {service.session_id} for partner {partner.partner_id}")

    return SessionResponse(
        session_id=service.session_id,
        partner_id=partner.partner_id,
        source_language=request.source_language,
        target_language=request.target_language,
        voice_id=request.voice_id,
        status="created",
        started_at=service._metrics.segments_processed if hasattr(service, "_metrics") else "0",
        websocket_url=ws_url,
    )


@router.delete(
    "/sessions/{session_id}",
    response_model=SessionEndResponse,
    summary="End dubbing session",
    description="End an active dubbing session and get final statistics.",
)
async def end_session(
    session_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """End a dubbing session."""
    # Check if session exists and belongs to partner
    service = _active_services.get(session_id)
    if not service:
        # Try to find in database
        session = await metering_service.get_dubbing_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found",
            )

        if session.partner_id != partner.partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Session belongs to different partner",
            )

        # Session already ended
        return SessionEndResponse(
            session_id=session.session_id,
            partner_id=session.partner_id,
            segments_processed=session.segments_processed,
            audio_seconds=session.audio_seconds_processed,
            avg_latency_ms=session.avg_total_latency_ms,
            error_count=session.error_count,
            estimated_cost_usd=session.estimated_cost_usd,
        )

    # Verify ownership
    if service.partner.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session belongs to different partner",
        )

    # Stop the service
    summary = await service.stop()

    # Remove from active services
    _active_services.pop(session_id, None)

    return SessionEndResponse(
        session_id=summary["session_id"],
        partner_id=summary["partner_id"],
        segments_processed=summary["segments_processed"],
        audio_seconds=summary["audio_seconds"],
        avg_latency_ms=summary["avg_latency_ms"],
        error_count=summary["error_count"],
        estimated_cost_usd=summary["estimated_cost_usd"],
    )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary="Get session info",
    description="Get information about a dubbing session.",
)
async def get_session(
    session_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Get session information."""
    # Check active services first
    service = _active_services.get(session_id)
    if service:
        if service.partner.partner_id != partner.partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Session belongs to different partner",
            )

        return SessionResponse(
            session_id=service.session_id,
            partner_id=service.partner.partner_id,
            source_language=service.source_language,
            target_language=service.target_language,
            voice_id=service.voice_id,
            status="active" if service.is_running else "created",
            started_at=str(service._metrics.segments_processed),
            websocket_url=f"/api/v1/olorin/dubbing/ws/{service.session_id}",
        )

    # Check database
    session = await metering_service.get_dubbing_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found",
        )

    if session.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session belongs to different partner",
        )

    return SessionResponse(
        session_id=session.session_id,
        partner_id=session.partner_id,
        source_language=session.source_language,
        target_language=session.target_language,
        voice_id=session.voice_id,
        status=session.status,
        started_at=session.started_at.isoformat(),
        websocket_url=f"/api/v1/olorin/dubbing/ws/{session.session_id}",
    )


@router.get(
    "/voices",
    response_model=VoicesResponse,
    summary="List available voices",
    description="Get list of available TTS voices for dubbing.",
)
async def list_voices(
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """List available TTS voices."""
    # Default voices available for dubbing
    voices = [
        VoiceInfo(
            voice_id=settings.ELEVENLABS_DEFAULT_VOICE_ID,
            name="Rachel",
            language="multilingual",
            description="Natural multilingual female voice (default)",
        ),
        VoiceInfo(
            voice_id="21m00Tcm4TlvDq8ikWAM",
            name="Adam",
            language="multilingual",
            description="Deep male voice",
        ),
        VoiceInfo(
            voice_id="AZnzlk1XvdvUeBnXmlld",
            name="Domi",
            language="multilingual",
            description="Youthful female voice",
        ),
        VoiceInfo(
            voice_id="MF3mGyEYCl7XYWbV9V6O",
            name="Elli",
            language="multilingual",
            description="Warm female voice",
        ),
        VoiceInfo(
            voice_id="TxGEqnHWrfWFTfGW9XjX",
            name="Josh",
            language="multilingual",
            description="Conversational male voice",
        ),
    ]

    return VoicesResponse(voices=voices)


# ============================================
# WebSocket Endpoint
# ============================================


@router.websocket("/ws/{session_id}")
async def websocket_dubbing(
    websocket: WebSocket,
    session_id: str,
    api_key: str = Query(..., alias="api_key"),
):
    """
    WebSocket endpoint for real-time audio dubbing.

    Protocol:
    - Client sends: Binary audio (16kHz, mono, LINEAR16 PCM)
    - Server sends JSON messages:
      - {"type": "transcript", "original_text": "...", "source_language": "he"}
      - {"type": "translation", "original_text": "...", "translated_text": "...", "latency_ms": 123}
      - {"type": "dubbed_audio", "data": "<base64>", "original_text": "...", "translated_text": "..."}
      - {"type": "error", "message": "..."}
      - {"type": "session_started", "session_id": "..."}
      - {"type": "session_ended", "session_id": "..."}
    """
    # Authenticate via API key
    partner = await partner_service.authenticate_by_api_key(api_key)
    if not partner:
        await websocket.close(code=4001, reason="Invalid API key")
        return

    # Verify capability
    if not partner.has_capability("realtime_dubbing"):
        await websocket.close(code=4003, reason="Dubbing capability not enabled")
        return

    # Get the dubbing service
    service = _active_services.get(session_id)
    if not service:
        await websocket.close(code=4004, reason="Session not found")
        return

    # Verify ownership
    if service.partner.partner_id != partner.partner_id:
        await websocket.close(code=4003, reason="Session belongs to different partner")
        return

    # Accept connection
    await websocket.accept()
    logger.info(f"WebSocket connected for dubbing session: {session_id}")

    try:
        # Start the dubbing service
        await service.start()

        # Create tasks for receiving audio and sending messages
        async def receive_audio():
            """Receive audio from client."""
            try:
                while True:
                    data = await websocket.receive()

                    if "bytes" in data:
                        # Binary audio data
                        await service.process_audio_chunk(data["bytes"])
                    elif "text" in data:
                        # Control message (could be used for pause/resume)
                        logger.debug(f"Received text message: {data['text']}")

            except WebSocketDisconnect:
                logger.info(f"Client disconnected from dubbing session: {session_id}")
            except Exception as e:
                logger.error(f"Error receiving audio: {e}")

        async def send_messages():
            """Send dubbing messages to client."""
            try:
                async for message in service.receive_messages():
                    await websocket.send_json(message.to_dict())
            except WebSocketDisconnect:
                pass
            except Exception as e:
                logger.error(f"Error sending messages: {e}")

        # Run both tasks
        receive_task = asyncio.create_task(receive_audio())
        send_task = asyncio.create_task(send_messages())

        # Wait for either task to complete
        done, pending = await asyncio.wait(
            [receive_task, send_task],
            return_when=asyncio.FIRST_COMPLETED,
        )

        # Cancel pending tasks
        for task in pending:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    except Exception as e:
        logger.error(f"WebSocket error in dubbing session {session_id}: {e}")
        try:
            await websocket.send_json({"type": "error", "message": str(e)})
        except Exception:
            pass

    finally:
        # Stop the service
        if service.is_running:
            await service.stop()

        # Remove from active services
        _active_services.pop(session_id, None)

        # Close websocket if still open
        try:
            await websocket.close()
        except Exception:
            pass

        logger.info(f"Dubbing session ended: {session_id}")
