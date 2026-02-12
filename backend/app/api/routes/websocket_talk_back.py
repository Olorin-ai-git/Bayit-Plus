"""
WebSocket endpoint for real-time Talk Back voice streaming.

Accepts audio from client, transcribes via STT, evaluates the
response, and returns structured results over the WebSocket.
"""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers import (
    check_authentication_message,
    get_user_from_token,
)
from app.core.config import settings
from app.services.talk_back.orchestrator import talk_back_orchestrator
from app.services.whisper_transcription_service import (
    WhisperTranscriptionService,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/talk-back/{content_id}")
async def websocket_talk_back(
    websocket: WebSocket,
    content_id: str,
):
    """
    WebSocket for real-time Talk Back voice interaction.

    Auth: Client sends {"type": "authenticate", "token": "..."} first.
    Then sends:
      - Binary audio chunks (16kHz mono LINEAR16 PCM)
      - JSON control: {"type": "evaluate", "point_id": "...",
                        "profile_id": "..."}
    Server responds with JSON evaluation results.
    """
    await websocket.accept()

    token, auth_error = await check_authentication_message(websocket)
    if auth_error:
        return

    user = await get_user_from_token(token)
    if not user:
        await websocket.send_json({
            "type": "error",
            "message": "Invalid or expired token",
            "recoverable": False,
        })
        await websocket.close(code=4001, reason="Authentication failed")
        return

    await websocket.send_json({
        "type": "connected",
        "user_id": str(user.id),
        "content_id": content_id,
    })

    logger.info(
        "Talk Back WebSocket connected",
        extra={"user_id": str(user.id), "content_id": content_id},
    )

    stt_service = WhisperTranscriptionService()
    audio_buffer = bytearray()
    current_point_id = None
    current_profile_id = None

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                audio_buffer.extend(message["bytes"])

            elif "text" in message:
                try:
                    msg_data = json.loads(message["text"])
                    msg_type = msg_data.get("type")

                    if msg_type == "evaluate":
                        current_point_id = msg_data.get("point_id")
                        current_profile_id = msg_data.get("profile_id")

                        if not current_point_id or not current_profile_id:
                            await websocket.send_json({
                                "type": "error",
                                "message": "point_id and profile_id required",
                                "recoverable": True,
                            })
                            continue

                        await _process_audio_and_evaluate(
                            websocket=websocket,
                            stt_service=stt_service,
                            audio_buffer=audio_buffer,
                            user_id=str(user.id),
                            profile_id=current_profile_id,
                            content_id=content_id,
                            point_id=current_point_id,
                        )
                        audio_buffer.clear()

                    elif msg_type == "clear_audio":
                        audio_buffer.clear()

                except json.JSONDecodeError:
                    logger.warning(
                        "Invalid JSON in Talk Back WebSocket",
                        extra={"user_id": str(user.id)},
                    )

    except WebSocketDisconnect:
        logger.info(
            "Talk Back WebSocket disconnected",
            extra={"user_id": str(user.id), "content_id": content_id},
        )
    except Exception as e:
        logger.error(
            "Talk Back WebSocket error",
            extra={
                "user_id": str(user.id),
                "error": str(e),
                "error_type": type(e).__name__,
            },
        )
        try:
            await websocket.send_json({
                "type": "error",
                "message": "Internal server error",
                "recoverable": False,
            })
        except Exception:
            pass


async def _process_audio_and_evaluate(
    websocket: WebSocket,
    stt_service: WhisperTranscriptionService,
    audio_buffer: bytearray,
    user_id: str,
    profile_id: str,
    content_id: str,
    point_id: str,
) -> None:
    """Transcribe buffered audio and evaluate via orchestrator."""
    if not audio_buffer:
        await websocket.send_json({
            "type": "error",
            "message": "No audio data received",
            "recoverable": True,
        })
        return

    transcript = await stt_service.transcribe_audio_chunk(
        audio_data=bytes(audio_buffer),
        source_lang="he",
    )

    detected_language = "he" if transcript else "unknown"

    await websocket.send_json({
        "type": "transcript",
        "text": transcript or "",
        "language": detected_language,
    })

    result = await talk_back_orchestrator.process_response(
        user_id=user_id,
        profile_id=profile_id,
        content_id=content_id,
        point_id=point_id,
        transcript=transcript or "",
        detected_language=detected_language,
        audio_duration_ms=len(audio_buffer) // 32,
    )

    await websocket.send_json({"type": "evaluation", **result})
