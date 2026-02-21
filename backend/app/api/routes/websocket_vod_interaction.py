"""WebSocket endpoint for voice-driven VOD avatar interaction."""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.api.routes.websocket_helpers.auth_helpers import (
    check_authentication_message, get_user_from_token,
)
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.biometric_consent import BiometricConsentType
from app.models.vod_interaction import VODInteractionSession
from app.services.vod_interaction.interaction_service import vod_interaction_service
from app.services.vod_interaction.pause_ask_orchestrator import pause_ask_orchestrator
from app.services.vod_interaction.voice_interaction_handler import voice_interaction_handler
from app.services.zeh_ani.biometric_consent_service import biometric_consent_service

logger = get_logger(__name__)
router = APIRouter()


async def _send_err(ws: WebSocket, msg: str, recoverable: bool = True):
    await ws.send_json({"type": "error", "message": msg, "recoverable": recoverable})


@router.websocket("/ws/vod-interaction/{session_id}")
async def vod_interaction_voice_ws(websocket: WebSocket, session_id: str):
    """WebSocket for real-time voice-driven VOD character interaction."""
    await websocket.accept()

    token, error = await check_authentication_message(websocket)
    if error:
        logger.warning("VOD interaction WS auth failed", extra={"session_id": session_id, "error": error})
        await _send_err(websocket, "Authentication failed", False)
        await websocket.close(code=4003, reason="Authentication failed")
        return

    user = await get_user_from_token(token)
    if not user:
        await _send_err(websocket, "Invalid authentication token", False)
        await websocket.close(code=4001, reason="Invalid token")
        return

    session = await VODInteractionSession.get(session_id)
    if not session or session.user_id != str(user.id):
        await _send_err(websocket, "Session not found", False)
        await websocket.close(code=4004, reason="Session not found")
        return

    if not settings.VOD_INTERACTION_VOICE_ENABLED:
        await _send_err(websocket, "Voice interaction is not enabled", False)
        await websocket.close(code=4003, reason="Voice not enabled")
        return

    has_consent = await biometric_consent_service.has_biometric_consent(
        user_id=str(user.id), profile_id=session.profile_id,
        consent_type=BiometricConsentType.VOICE_INTERACTION,
    )
    if not has_consent:
        logger.warning("VOD interaction WS rejected: no consent", extra={"session_id": session_id})
        await _send_err(websocket, "Biometric consent required for voice interaction", False)
        await websocket.close(code=4003, reason="Consent required")
        return

    await websocket.send_json({"type": "connected", "session_id": session_id})
    logger.info("VOD interaction WS connected", extra={"session_id": session_id, "user_id": str(user.id)})

    try:
        await _handle_messages(websocket, session)
    except WebSocketDisconnect:
        logger.info("VOD interaction WS disconnected", extra={"session_id": session_id})
    except Exception as exc:
        logger.error("VOD interaction WS error", extra={"session_id": session_id, "error": str(exc)})
        await _send_err(websocket, "Internal server error", False)
        await websocket.close(code=1011, reason="Internal error")


async def _handle_messages(websocket: WebSocket, session: VODInteractionSession):
    """Handle incoming WebSocket messages for VOD voice interaction."""
    while True:
        message = await websocket.receive()
        if message.get("type") == "websocket.receive" and "bytes" in message:
            await _handle_binary(websocket, session, message["bytes"])
            continue

        raw_text = message.get("text")
        if not raw_text:
            continue
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            await _send_err(websocket, "Invalid JSON")
            continue

        msg_type = data.get("type", "")
        if msg_type == "text_message":
            await _handle_text_message(websocket, session, data)
        elif msg_type == "pause_ask":
            await _handle_pause_ask(websocket, session, data)
        elif msg_type == "end_session":
            await vod_interaction_service.complete_session(str(session.id))
            await websocket.send_json({"type": "session_completed", "session_id": str(session.id)})
            await websocket.close(code=1000, reason="Session ended")
            return
        elif msg_type == "heartbeat":
            await websocket.send_json({"type": "heartbeat_ack"})
        else:
            await _send_err(websocket, f"Unknown message type: {msg_type}")


async def _handle_binary(ws: WebSocket, session: VODInteractionSession, audio_data: bytes):
    """Process binary audio frame through the voice interaction pipeline."""
    if len(audio_data) > settings.VOD_INTERACTION_MAX_AUDIO_CHUNK_BYTES:
        await _send_err(ws, "Audio payload exceeds size limit")
        return
    try:
        await ws.send_json({"type": "processing", "stage": "transcribing"})
        result = await voice_interaction_handler.process_voice_input(
            session=session, audio_data=audio_data,
        )
        await ws.send_json({
            "type": "voice_result", "status": result.status,
            "transcript": result.transcript, "character_text": result.character_text,
            "character_audio_url": result.character_audio_url,
            "character_video_url": result.character_video_url, "emotion": result.emotion,
        })
    except ValueError as ve:
        await _send_err(ws, str(ve))
    except Exception as exc:
        logger.error("Voice processing failed", extra={"session_id": str(session.id), "error": str(exc)})
        await _send_err(ws, "Voice processing failed")


async def _handle_text_message(ws: WebSocket, session: VODInteractionSession, data: dict):
    """Process text message through VOD interaction service."""
    user_message = data.get("message", "")
    if not user_message:
        await _send_err(ws, "Empty message")
        return
    try:
        exchange = await vod_interaction_service.process_user_message(
            session_id=str(session.id), user_message=user_message,
        )
        await ws.send_json({
            "type": "text_result", "character_text": exchange.message_text,
            "character_audio_url": exchange.audio_url,
            "character_video_url": exchange.animated_video_url,
        })
    except ValueError as ve:
        await _send_err(ws, str(ve))
    except Exception as exc:
        logger.error("Text processing failed", extra={"session_id": str(session.id), "error": str(exc)})
        await _send_err(ws, "Message processing failed")


async def _handle_pause_ask(ws: WebSocket, session: VODInteractionSession, data: dict):
    """Process Pause & Ask exchange with phased progress updates."""
    user_message = data.get("message", "")
    if not user_message:
        await _send_err(ws, "Empty message")
        return
    if not settings.VOD_INTERACTION_PAUSE_ASK_ENABLED:
        await _send_err(ws, "Pause & Ask feature is disabled", False)
        return
    try:
        await ws.send_json({"type": "pause_ask_progress", "phase": "polishing"})
        result = await pause_ask_orchestrator.process_exchange(
            session=session,
            user_message=user_message,
            language_hint=data.get("language_hint", ""),
        )
        await ws.send_json({"type": "pause_ask_result", **result.model_dump()})
    except ValueError as ve:
        await _send_err(ws, str(ve))
    except Exception as exc:
        logger.error(
            "Pause & Ask WS processing failed",
            extra={"session_id": str(session.id), "error": str(exc)},
        )
        await _send_err(ws, "Pause & Ask processing failed")
