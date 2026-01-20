"""
Dubbing Session REST Endpoints

REST API endpoints for session management.
"""

import json
import logging

from app.api.routes.olorin.dependencies import get_current_partner, verify_capability
from app.api.routes.olorin.dubbing_routes import state
from app.api.routes.olorin.dubbing_routes.models import (
    CreateSessionRequest,
    SessionEndResponse,
    SessionResponse,
    VoiceInfo,
    VoicesResponse,
)
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.metering_service import metering_service
from app.services.olorin.realtime_dubbing_service import RealtimeDubbingService
from fastapi import APIRouter, Depends, HTTPException, status

logger = logging.getLogger(__name__)

router = APIRouter()

SUPPORTED_SOURCE_LANGUAGES = ["he", "en", "es", "ar", "ru"]
SUPPORTED_TARGET_LANGUAGES = ["en", "es", "he"]


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create dubbing session",
    description="Create a new real-time dubbing session.",
)
async def create_session(
    request: CreateSessionRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Create a new dubbing session."""
    await verify_capability(partner, "realtime_dubbing")

    config = partner.get_capability_config("realtime_dubbing")
    if config:
        active_count = await metering_service.get_active_sessions_count(
            partner.partner_id
        )
        if active_count >= config.rate_limits.concurrent_sessions:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail=get_error_message(
                    OlorinErrors.MAX_SESSIONS_REACHED,
                    limit=config.rate_limits.concurrent_sessions,
                ),
            )

    if request.source_language not in SUPPORTED_SOURCE_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=get_error_message(
                OlorinErrors.SOURCE_LANGUAGE_NOT_SUPPORTED,
                language=request.source_language,
                supported=", ".join(SUPPORTED_SOURCE_LANGUAGES),
            ),
        )

    if request.target_language not in SUPPORTED_TARGET_LANGUAGES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=get_error_message(
                OlorinErrors.TARGET_LANGUAGE_NOT_SUPPORTED,
                language=request.target_language,
                supported=", ".join(SUPPORTED_TARGET_LANGUAGES),
            ),
        )

    service = RealtimeDubbingService(
        partner=partner,
        source_language=request.source_language,
        target_language=request.target_language,
        voice_id=request.voice_id,
    )

    state.add_service(service.session_id, service)
    ws_url = f"/api/v1/olorin/dubbing/ws/{service.session_id}"

    logger.info(
        f"Created dubbing session: {service.session_id} for partner {partner.partner_id}"
    )

    return SessionResponse(
        session_id=service.session_id,
        partner_id=partner.partner_id,
        source_language=request.source_language,
        target_language=request.target_language,
        voice_id=request.voice_id,
        status="created",
        started_at="0",
        websocket_url=ws_url,
    )


@router.delete(
    "/sessions/{session_id}",
    response_model=SessionEndResponse,
    summary="End dubbing session",
)
async def end_session(
    session_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """End a dubbing session."""
    service = state.get_service(session_id)
    if not service:
        session = await metering_service.get_dubbing_session(session_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=get_error_message(OlorinErrors.SESSION_NOT_FOUND),
            )

        if session.partner_id != partner.partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=get_error_message(OlorinErrors.SESSION_DIFFERENT_PARTNER),
            )

        return SessionEndResponse(
            session_id=session.session_id,
            partner_id=session.partner_id,
            segments_processed=session.segments_processed,
            audio_seconds=session.audio_seconds_processed,
            avg_latency_ms=session.avg_total_latency_ms,
            error_count=session.error_count,
            estimated_cost_usd=session.estimated_cost_usd,
        )

    if service.partner.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=get_error_message(OlorinErrors.SESSION_DIFFERENT_PARTNER),
        )

    summary = await service.stop()
    state.remove_service(session_id)

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
)
async def get_session(
    session_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Get session information."""
    service = state.get_service(session_id)
    if service:
        if service.partner.partner_id != partner.partner_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=get_error_message(OlorinErrors.SESSION_DIFFERENT_PARTNER),
            )

        return SessionResponse(
            session_id=service.session_id,
            partner_id=service.partner.partner_id,
            source_language=service.source_language,
            target_language=service.target_language,
            voice_id=service.voice_id,
            status="active" if service.is_running else "created",
            started_at="0",
            websocket_url=f"/api/v1/olorin/dubbing/ws/{service.session_id}",
        )

    session = await metering_service.get_dubbing_session(session_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=get_error_message(OlorinErrors.SESSION_NOT_FOUND),
        )

    if session.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=get_error_message(OlorinErrors.SESSION_DIFFERENT_PARTNER),
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
)
async def list_voices(
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """List available TTS voices."""
    voices = [
        VoiceInfo(
            voice_id=settings.ELEVENLABS_DEFAULT_VOICE_ID,
            name="Rachel",
            language="multilingual",
            description="Natural multilingual female voice (default)",
        ),
    ]

    try:
        configured_voices = json.loads(settings.ELEVENLABS_DUBBING_VOICES)
        for voice_config in configured_voices:
            voices.append(
                VoiceInfo(
                    voice_id=voice_config.get("id", ""),
                    name=voice_config.get("name", "Unknown"),
                    language=voice_config.get("lang", "multilingual"),
                    description=voice_config.get("desc"),
                )
            )
    except json.JSONDecodeError:
        logger.warning("Failed to parse ELEVENLABS_DUBBING_VOICES configuration")

    return VoicesResponse(voices=voices)
