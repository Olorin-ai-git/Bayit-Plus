"""V2V Voice Transform WebSocket for real-time voice correction."""

import base64
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers.auth_helpers import (
    check_authentication_message,
    get_user_from_token,
)
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.biometric_consent import BiometricConsentType
from app.models.child_avatar import ChildAvatar
from app.services.zeh_ani.biometric_consent_service import (
    biometric_consent_service,
)
from app.services.zeh_ani.v2v_transform_service import v2v_transform_service

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws/v2v/{avatar_id}")
async def v2v_transform_ws(websocket: WebSocket, avatar_id: str):
    """WebSocket for real-time V2V voice correction streaming."""
    await websocket.accept()

    token, error = await check_authentication_message(websocket)
    if error:
        logger.warning(
            "V2V WS auth failed",
            extra={"avatar_id": avatar_id, "error": error},
        )
        await websocket.send_json({
            "type": "error",
            "message": "Authentication failed",
            "recoverable": False,
        })
        await websocket.close(code=4003, reason="Authentication failed")
        return

    user = await get_user_from_token(token)
    if not user:
        await websocket.send_json({
            "type": "error",
            "message": "Invalid authentication token",
            "recoverable": False,
        })
        await websocket.close(code=4001, reason="Invalid token")
        return

    avatar = await ChildAvatar.get(avatar_id)
    if not avatar or avatar.user_id != str(user.id):
        await websocket.send_json({
            "type": "error", "message": "Avatar not found",
        })
        await websocket.close(code=4004, reason="Avatar not found")
        return

    has_consent = await biometric_consent_service.has_biometric_consent(
        user_id=str(user.id),
        profile_id=avatar.profile_id,
        consent_type=BiometricConsentType.VOICE_V2V,
    )
    if not has_consent:
        logger.warning(
            "V2V WebSocket rejected: missing biometric consent",
            extra={"avatar_id": avatar_id, "user_id": str(user.id)},
        )
        await websocket.send_json({
            "type": "error",
            "message": "Biometric consent required for V2V",
            "recoverable": False,
        })
        await websocket.close(code=4003, reason="Consent required")
        return

    session = await v2v_transform_service.get_or_create_session(
        user_id=str(user.id),
        profile_id=avatar.profile_id,
        avatar_id=avatar_id,
    )

    await websocket.send_json({
        "type": "authenticated",
        "user_id": str(user.id),
        "avatar_id": avatar_id,
        "session_id": str(session.id),
    })
    logger.info(
        "V2V WebSocket connected",
        extra={"avatar_id": avatar_id, "user_id": str(user.id)},
    )

    try:
        await _handle_messages(websocket, user, avatar, session)
    except WebSocketDisconnect:
        await v2v_transform_service.complete_session(session)
        logger.info(
            "V2V WebSocket disconnected",
            extra={"avatar_id": avatar_id, "session_id": str(session.id)},
        )
    except Exception as exc:
        logger.error(
            "V2V WebSocket error",
            extra={"avatar_id": avatar_id, "error": str(exc)},
        )
        await websocket.send_json({
            "type": "error",
            "message": "Internal server error",
            "recoverable": False,
        })
        await websocket.close(code=1011, reason="Internal error")


async def _handle_messages(websocket, user, avatar, session):
    """Handle incoming V2V WebSocket messages."""
    while True:
        data = await websocket.receive_text()
        message = json.loads(data)
        msg_type = message.get("type", "")

        if msg_type == "audio_chunk":
            await _handle_audio_chunk(
                websocket, user, avatar, session, message,
            )
        elif msg_type == "end_session":
            await v2v_transform_service.complete_session(session)
            await websocket.send_json({
                "type": "session_completed",
                "session_id": str(session.id),
                "total_transforms": session.total_transforms,
                "average_latency_ms": round(session.average_latency_ms),
                "score_improvement": round(session.score_improvement, 3),
            })
        elif msg_type == "heartbeat":
            await websocket.send_json({"type": "heartbeat_ack"})
        else:
            await websocket.send_json({
                "type": "error",
                "message": f"Unknown message type: {msg_type}",
            })


async def _handle_audio_chunk(websocket, user, avatar, session, message):
    """Process V2V audio chunk and return corrected voice."""
    audio_b64 = message.get("audio", "")
    target_phrase = message.get("target_phrase_he", "")

    if not audio_b64 or not target_phrase:
        await websocket.send_json({
            "type": "error",
            "message": "Missing audio or target phrase",
        })
        return

    audio_data = base64.b64decode(audio_b64)
    if len(audio_data) > settings.WEBSOCKET_MAX_AUDIO_PAYLOAD_BYTES:
        logger.warning(
            "V2V audio payload exceeds size limit",
            extra={
                "size_bytes": len(audio_data),
                "limit_bytes": settings.WEBSOCKET_MAX_AUDIO_PAYLOAD_BYTES,
            },
        )
        await websocket.send_json({
            "type": "error",
            "message": "Audio payload exceeds size limit",
        })
        return

    result = await v2v_transform_service.transform_voice(
        avatar=avatar,
        audio_data=audio_data,
        target_phrase_he=target_phrase,
        session=session,
    )

    if result.get("error") == "insufficient_credits":
        await websocket.send_json({
            "type": "error",
            "message": "Insufficient credits for V2V transform",
            "recoverable": True,
        })
        return

    await websocket.send_json({
        "type": "v2v_result",
        "input_transcript": result["input_transcript"],
        "corrected_transcript": result["corrected_transcript"],
        "v2v_audio_url": result["v2v_audio_url"],
        "latency_ms": result["latency_ms"],
        "score_before": result["score_before"],
        "score_after": result["score_after"],
        "score_delta": result["score_delta"],
    })
