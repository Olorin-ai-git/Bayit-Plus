"""
WebSocket endpoint for bilingual dubbing audio streaming.

Client sends Hebrew text segments with timestamps, server responds with
code-switched text and synthesized bilingual audio chunks.
Auth protocol matches websocket_live_dubbing: authenticate via JSON message.
"""

import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers import (
    check_authentication_message,
    check_subscription_tier,
    get_user_from_token,
)
from app.services.olorin.dubbing.bilingual_pipeline import bilingual_pipeline
from app.services.olorin.dubbing.bilingual_service import (
    bilingual_dubbing_service,
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.websocket("/ws/bilingual-dubbing/{content_id}")
async def websocket_bilingual_dubbing(
    websocket: WebSocket,
    content_id: str,
):
    """WebSocket endpoint for bilingual dubbing audio streaming.

    Protocol:
    1. Client connects, server accepts.
    2. Client sends: {"type": "authenticate", "token": "JWT..."}
    3. Client sends: {"type": "start_session", "profile_id": "..."}
    4. Client sends segments:
       {"type": "segment", "hebrew_text": "...", "timestamp_seconds": 12.5}
    5. Server responds per segment:
       - JSON: {"type": "segment_result", "mixed_text": "...",
                "hebrew_words_used": [...], "latency_ms": ...}
       - Binary: audio chunk bytes (one or more)
       - JSON: {"type": "audio_complete"}
    6. Client sends: {"type": "end_session"}
    """
    await websocket.accept()

    # Step 1: Authenticate via JSON message
    token, auth_error = await check_authentication_message(websocket)
    if auth_error:
        return

    user = await get_user_from_token(token)
    if not user:
        await websocket.send_json(
            {
                "type": "error",
                "message": "Invalid or expired token",
                "recoverable": False,
            }
        )
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Step 2: Check subscription tier
    if not await check_subscription_tier(
        websocket, user, ["premium", "family"]
    ):
        return

    logger.info(
        "Bilingual dubbing WebSocket authenticated",
        extra={"user_id": str(user.id), "content_id": content_id},
    )

    session_id = None

    try:
        while True:
            raw = await websocket.receive_text()
            message = json.loads(raw)
            msg_type = message.get("type")

            if msg_type == "start_session":
                profile_id = message.get("profile_id")
                if not profile_id:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "profile_id is required",
                            "recoverable": True,
                        }
                    )
                    continue

                session = await bilingual_dubbing_service.start_session(
                    user_id=str(user.id),
                    profile_id=profile_id,
                    content_id=content_id,
                )
                session_id = session.session_id

                await websocket.send_json(
                    {
                        "type": "session_started",
                        "session_id": session_id,
                        "target_hebrew_ratio": session.target_hebrew_ratio,
                    }
                )

            elif msg_type == "segment":
                if not session_id:
                    await websocket.send_json(
                        {
                            "type": "error",
                            "message": "No active session. Send start_session first.",
                            "recoverable": True,
                        }
                    )
                    continue

                hebrew_text = message.get("hebrew_text", "")
                timestamp_seconds = message.get("timestamp_seconds", 0.0)

                result = await bilingual_pipeline.process_segment(
                    session_id=session_id,
                    hebrew_text=hebrew_text,
                    timestamp_seconds=timestamp_seconds,
                )

                await websocket.send_json(
                    {
                        "type": "segment_result",
                        "mixed_text": result["mixed_text"],
                        "hebrew_words_used": result["hebrew_words_used"],
                        "latency_ms": result["latency_ms"],
                    }
                )

                for chunk in result["audio_chunks"]:
                    await websocket.send_bytes(chunk)

                await websocket.send_json({"type": "audio_complete"})

            elif msg_type == "end_session":
                if session_id:
                    await bilingual_dubbing_service.end_session(session_id)
                    logger.info(
                        "Bilingual dubbing session ended by client",
                        extra={"session_id": session_id},
                    )
                    session_id = None

                await websocket.send_json({"type": "session_ended"})

    except WebSocketDisconnect:
        logger.info(
            "Bilingual dubbing WebSocket disconnected",
            extra={
                "user_id": str(user.id),
                "content_id": content_id,
                "session_id": session_id,
            },
        )
    except json.JSONDecodeError:
        logger.warning(
            "Invalid JSON in bilingual dubbing WebSocket",
            extra={"user_id": str(user.id)},
        )
        await websocket.close(code=4002, reason="Invalid JSON message")
    except Exception as exc:
        logger.error(
            "Bilingual dubbing WebSocket error",
            extra={
                "user_id": str(user.id),
                "content_id": content_id,
                "session_id": session_id,
                "error": str(exc),
            },
        )
        try:
            await websocket.send_json(
                {
                    "type": "error",
                    "message": str(exc),
                    "recoverable": False,
                }
            )
        except Exception:
            pass
    finally:
        if session_id:
            await bilingual_dubbing_service.end_session(session_id)
            logger.info(
                "Bilingual dubbing session cleaned up on disconnect",
                extra={"session_id": session_id},
            )
