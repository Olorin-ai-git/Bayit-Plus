"""Phonetic Mirror WebSocket endpoint for real-time pronunciation feedback."""

import json

from app.core.logging_config import get_logger

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers.auth_helpers import (
    check_authentication_message,
    get_user_from_token,
)
from app.models.child_avatar import ChildAvatar
from app.models.phonetic_mirror_attempt import MirrorSource
from app.services.phonetic_mirror.mirror_service import phonetic_mirror_service

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws/phonetic-mirror/{avatar_id}")
async def phonetic_mirror_ws(websocket: WebSocket, avatar_id: str):
    """WebSocket for real-time phonetic mirror pronunciation feedback."""
    await websocket.accept()

    token, error = await check_authentication_message(websocket)
    if error:
        logger.warning(
            "Mirror WS auth failed",
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
            "type": "error",
            "message": "Avatar not found",
        })
        await websocket.close(code=4004, reason="Avatar not found")
        return

    await websocket.send_json({
        "type": "authenticated",
        "user_id": str(user.id),
        "avatar_id": avatar_id,
    })
    logger.info(
        "Mirror WebSocket connected",
        extra={"avatar_id": avatar_id, "user_id": str(user.id)},
    )

    try:
        await _handle_messages(websocket, user, avatar)
    except WebSocketDisconnect:
        logger.info(
            "Mirror WebSocket disconnected",
            extra={"avatar_id": avatar_id, "user_id": str(user.id)},
        )
    except Exception as exc:
        logger.error(
            "Mirror WebSocket error",
            extra={"avatar_id": avatar_id, "error": str(exc)},
        )
        await websocket.send_json({
            "type": "error",
            "message": "Internal server error",
            "recoverable": False,
        })
        await websocket.close(code=1011, reason="Internal error")


async def _handle_messages(websocket, user, avatar):
    """Handle incoming WebSocket messages for phonetic mirror."""
    while True:
        data = await websocket.receive_text()
        message = json.loads(data)
        msg_type = message.get("type", "")

        if msg_type == "audio_chunk":
            await _handle_audio_chunk(websocket, user, avatar, message)
        elif msg_type == "heartbeat":
            await websocket.send_json({"type": "heartbeat_ack"})
        else:
            await websocket.send_json({
                "type": "error",
                "message": f"Unknown message type: {msg_type}",
            })


async def _handle_audio_chunk(websocket, user, avatar, message):
    """Process audio chunk and return pronunciation feedback."""
    import base64

    audio_b64 = message.get("audio", "")
    target_phrase = message.get("target_phrase_he", "")
    target_translit = message.get("target_transliteration", "")
    profile_id = message.get("profile_id", "")

    if not audio_b64 or not target_phrase:
        await websocket.send_json({
            "type": "error",
            "message": "Missing audio or target phrase",
        })
        return

    audio_data = base64.b64decode(audio_b64)

    result = await phonetic_mirror_service.process_mirror_attempt(
        user_id=str(user.id),
        profile_id=profile_id,
        avatar_id=str(avatar.id),
        audio_data=audio_data,
        target_phrase_he=target_phrase,
        target_transliteration=target_translit,
        source=MirrorSource.STANDALONE,
    )

    await websocket.send_json({
        "type": "mirror_result",
        "pronunciation_score": result.pronunciation_score,
        "quality": result.quality,
        "phoneme_feedback": [
            {
                "word_he": f.word_he,
                "expected_transliteration": f.expected_transliteration,
                "heard_transliteration": f.heard_transliteration,
                "score": f.score,
                "issue_type": f.issue_type.value if f.issue_type else None,
            }
            for f in result.phoneme_feedback
        ],
        "corrected_audio_url": result.corrected_audio_url,
        "shekels_earned": result.shekels_earned,
        "input_transcript": result.input_transcript,
    })
