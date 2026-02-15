"""Live Layer WebSocket for interactive scene triggers during playback."""

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_helpers.auth_helpers import (
    check_authentication_message,
    get_user_from_token,
)
from app.api.routes.websocket_helpers.live_layer_handlers import (
    handle_start_lipsync,
    handle_timestamp_update,
    handle_trigger_response,
)
from app.core.logging_config import get_logger
from app.models.biometric_consent import BiometricConsentType
from app.models.child_avatar import ChildAvatar
from app.models.content import Content
from app.services.zeh_ani.biometric_consent_service import (
    biometric_consent_service,
)

logger = get_logger(__name__)
router = APIRouter()


@router.websocket("/ws/live-layer/{content_id}")
async def live_layer_ws(websocket: WebSocket, content_id: str):
    """WebSocket for interactive scene trigger delivery and response scoring."""
    await websocket.accept()

    token, error = await check_authentication_message(websocket)
    if error:
        logger.warning(
            "Live layer WS auth failed",
            extra={"content_id": content_id, "error": error},
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

    content = await Content.get(content_id)
    if not content:
        logger.warning(
            "Live layer rejected: content not found",
            extra={"content_id": content_id, "user_id": str(user.id)},
        )
        await websocket.send_json({
            "type": "error",
            "message": "Content not found",
            "recoverable": False,
        })
        await websocket.close(code=4004, reason="Content not found")
        return

    avatar = await ChildAvatar.find_one(
        {"user_id": str(user.id)}
)
    if not avatar:
        logger.warning(
            "Live layer rejected: no avatar profile",
            extra={"content_id": content_id, "user_id": str(user.id)},
        )
        await websocket.send_json({
            "type": "error",
            "message": "No active avatar profile",
            "recoverable": False,
        })
        await websocket.close(code=4004, reason="No avatar profile")
        return

    has_consent = await biometric_consent_service.has_biometric_consent(
        user_id=str(user.id),
        profile_id=avatar.profile_id,
        consent_type=BiometricConsentType.VOICE_V2V,
    )
    if not has_consent:
        logger.warning(
            "Live layer rejected: missing biometric consent",
            extra={"content_id": content_id, "user_id": str(user.id)},
        )
        await websocket.send_json({
            "type": "error",
            "message": "Biometric consent required for live interactions",
            "recoverable": False,
        })
        await websocket.close(code=4003, reason="Consent required")
        return

    await websocket.send_json({
        "type": "authenticated",
        "user_id": str(user.id),
        "content_id": content_id,
    })
    logger.info(
        "Live layer WebSocket connected",
        extra={"content_id": content_id, "user_id": str(user.id)},
    )

    try:
        await _handle_messages(websocket, user, content_id)
    except WebSocketDisconnect:
        logger.info(
            "Live layer WebSocket disconnected",
            extra={"content_id": content_id, "user_id": str(user.id)},
        )
    except Exception as exc:
        logger.error(
            "Live layer WebSocket error",
            extra={"content_id": content_id, "error": str(exc)},
        )
        await websocket.send_json({
            "type": "error",
            "message": "Internal server error",
            "recoverable": False,
        })
        await websocket.close(code=1011, reason="Internal error")


async def _handle_messages(websocket, user, content_id):
    """Handle incoming live layer WebSocket messages."""
    while True:
        data = await websocket.receive_text()
        try:
            message = json.loads(data)
        except json.JSONDecodeError:
            await websocket.send_json({"type": "error", "message": "Invalid JSON"})
            continue
        msg_type = message.get("type", "")

        if msg_type == "timestamp_update":
            await handle_timestamp_update(
                websocket, content_id, message,
            )
        elif msg_type == "trigger_response":
            await handle_trigger_response(
                websocket, user, content_id, message,
            )
        elif msg_type == "start_lipsync":
            await handle_start_lipsync(
                websocket, user, message,
            )
        elif msg_type == "heartbeat":
            await websocket.send_json({"type": "heartbeat_ack"})
        else:
            await websocket.send_json({
                "type": "error",
                "message": f"Unknown message type: {msg_type}",
            })
