"""
WebSocket handler for real-time watch party communication.
Uses auth-message pattern (no token in URL) and per-connection rate limiting.
"""

import json
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_auth import (
    ConnectionRateLimiter,
    authenticate_websocket,
    check_message_size,
)
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.connection_manager import connection_manager
from app.services.room_manager import room_manager

router = APIRouter()
logger = get_logger(__name__)


@router.websocket("/ws/party/{party_id}")
async def party_websocket(websocket: WebSocket, party_id: str):
    """WebSocket endpoint for watch party real-time communication.

    Auth: first message must be {"type": "auth", "token": "..."}
    """
    await websocket.accept()

    user, error = await authenticate_websocket(websocket)
    if error or user is None:
        return

    user_id = str(user.id)
    logger.info("Party WS authenticated", extra={"user_id": user_id, "party_id": party_id})

    party = await room_manager.get_party(party_id)
    if not party or not party.is_active:
        await websocket.close(code=4004, reason="Party not found")
        return

    if not any(p.user_id == user_id for p in party.participants):
        party = await room_manager.join_party(party_id, user_id, user.name)
        if not party:
            await websocket.close(code=4003, reason="Cannot join party")
            return

    connection_id = await connection_manager.connect(
        websocket=websocket, user_id=user_id, user_name=user.name, party_id=party_id
    )

    rate_limiter = ConnectionRateLimiter(
        settings.olorin.social_ws.party_messages_per_minute
    )
    warning_threshold = settings.olorin.social_ws.rate_limit_warning_threshold

    try:
        await connection_manager.send_personal_message(
            _build_connected_payload(party, user_id), connection_id
        )

        while True:
            data = await websocket.receive_text()

            if not check_message_size(data):
                await connection_manager.send_personal_message(
                    {"type": "error", "message": "Message too large"}, connection_id
                )
                continue

            if not rate_limiter.check():
                warnings = rate_limiter.record_warning()
                if warnings >= warning_threshold:
                    logger.warning("Party WS rate limit exceeded, closing", extra={"user_id": user_id})
                    await websocket.close(code=4029, reason="Rate limit exceeded")
                    return
                await connection_manager.send_personal_message(
                    {"type": "error", "message": "Rate limit exceeded, slow down"}, connection_id
                )
                continue

            try:
                message = json.loads(data)
                await _handle_party_message(
                    message, party, party_id, user_id, user, connection_id
                )
            except json.JSONDecodeError:
                await connection_manager.send_personal_message(
                    {"type": "error", "message": "Invalid JSON"}, connection_id
                )
            except Exception as exc:
                logger.error("Party WS handler error", extra={"error": str(exc), "user_id": user_id})
                await connection_manager.send_personal_message(
                    {"type": "error", "message": "An unexpected error occurred"}, connection_id
                )

    except WebSocketDisconnect:
        pass
    finally:
        await connection_manager.disconnect(connection_id)
        await room_manager.leave_party(party_id, user_id)


async def _handle_party_message(message, party, party_id, user_id, user, connection_id):
    """Route a single party WebSocket message by type."""
    msg_type = message.get("type")

    if msg_type == "ping":
        await connection_manager.send_personal_message(
            {"type": "pong", "timestamp": datetime.utcnow().isoformat()}, connection_id
        )
    elif msg_type == "chat":
        if party.chat_enabled:
            from app.models.realtime import ChatMessageCreate

            await room_manager.send_chat_message(
                party_id=party_id,
                user_id=user_id,
                user_name=user.name,
                data=ChatMessageCreate(
                    message=message.get("message", ""),
                    message_type=message.get("message_type", "text"),
                ),
            )
    elif msg_type == "sync":
        if party.sync_playback and party.host_id == user_id:
            await room_manager.sync_playback(
                party_id=party_id,
                user_id=user_id,
                position=message.get("position", 0),
                is_playing=message.get("is_playing", True),
            )
    elif msg_type == "state":
        await room_manager.update_participant_state(
            party_id=party_id,
            user_id=user_id,
            is_muted=message.get("is_muted"),
            is_speaking=message.get("is_speaking"),
        )
    elif msg_type == "reaction":
        action = message.get("action", "add")
        if action == "add":
            await room_manager.add_reaction(
                message_id=message.get("message_id"), user_id=user_id, emoji=message.get("emoji", "")
            )
        elif action == "remove":
            await room_manager.remove_reaction(
                message_id=message.get("message_id"), user_id=user_id, emoji=message.get("emoji", "")
            )


def _build_connected_payload(party, user_id: str) -> dict:
    """Build the initial connected payload for the party."""
    return {
        "type": "connected",
        "party": {
            "id": str(party.id),
            "host_id": party.host_id,
            "host_name": party.host_name,
            "content_id": party.content_id,
            "content_type": party.content_type,
            "audio_enabled": party.audio_enabled,
            "chat_enabled": party.chat_enabled,
            "sync_playback": party.sync_playback,
            "participants": [
                {
                    "user_id": p.user_id,
                    "user_name": p.user_name,
                    "is_muted": p.is_muted,
                    "is_speaking": p.is_speaking,
                }
                for p in party.participants
            ],
        },
        "user_id": user_id,
    }
