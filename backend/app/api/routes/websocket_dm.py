"""
WebSocket handler for real-time direct messaging between friends.
Uses auth-message pattern (no token in URL) and per-connection rate limiting.
"""

import json
from datetime import datetime
from typing import Dict, List

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.api.routes.websocket_auth import (
    ConnectionRateLimiter,
    authenticate_websocket,
    check_message_size,
)
from app.api.routes.websocket_dm_handlers import (
    handle_reaction,
    handle_read,
    handle_send_message,
)
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.user import User
from app.services.friendship_service import FriendshipService

router = APIRouter()
logger = get_logger(__name__)

active_dm_connections: Dict[str, List[WebSocket]] = {}


async def broadcast_to_user(user_id: str, message: dict) -> int:
    """Broadcast a message to all connections for a user."""
    if user_id not in active_dm_connections:
        return 0
    connections = active_dm_connections[user_id]
    failed = []
    ok = 0
    for ws in connections:
        try:
            await ws.send_json(message)
            ok += 1
        except Exception:
            failed.append(ws)
    for ws in failed:
        connections.remove(ws)
    if not connections:
        del active_dm_connections[user_id]
    return ok


@router.websocket("/ws/dm/{friend_id}")
async def dm_websocket(websocket: WebSocket, friend_id: str):
    """WebSocket endpoint for DM. Auth: first msg {"type":"auth","token":"..."}"""
    await websocket.accept()

    user, error = await authenticate_websocket(websocket)
    if error or user is None:
        return

    user_id = str(user.id)

    if not await FriendshipService.are_friends(user_id, friend_id):
        await websocket.close(code=4003, reason="You can only message friends")
        return

    friend = await User.get(friend_id)
    if not friend:
        await websocket.close(code=4004, reason="Friend not found")
        return

    if user_id not in active_dm_connections:
        active_dm_connections[user_id] = []
    active_dm_connections[user_id].append(websocket)

    rate_limiter = ConnectionRateLimiter(
        settings.olorin.social_ws.dm_messages_per_minute
    )
    warning_threshold = settings.olorin.social_ws.rate_limit_warning_threshold

    try:
        await websocket.send_json({
            "type": "connected", "friend_id": friend_id,
            "friend_name": friend.name, "friend_avatar": friend.avatar,
        })

        while True:
            data = await websocket.receive_text()

            if not check_message_size(data):
                await websocket.send_json({"type": "error", "message": "Message too large"})
                continue

            if not rate_limiter.check():
                warnings = rate_limiter.record_warning()
                if warnings >= warning_threshold:
                    logger.warning("DM WS rate limit exceeded", extra={"user_id": user_id})
                    await websocket.close(code=4029, reason="Rate limit exceeded")
                    return
                await websocket.send_json({"type": "error", "message": "Rate limit exceeded, slow down"})
                continue

            try:
                message = json.loads(data)
                await _handle_dm_message(
                    message, user, user_id, friend, friend_id, websocket
                )
            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
            except Exception as exc:
                logger.error("DM WS handler error", extra={"error": str(exc), "user_id": user_id})
                await websocket.send_json({"type": "error", "message": "An unexpected error occurred"})

    except WebSocketDisconnect:
        pass
    finally:
        if user_id in active_dm_connections:
            try:
                active_dm_connections[user_id].remove(websocket)
            except ValueError:
                pass
            if not active_dm_connections.get(user_id):
                active_dm_connections.pop(user_id, None)


async def _handle_dm_message(message, user, user_id, friend, friend_id, websocket):
    """Route a DM WebSocket message by type."""
    msg_type = message.get("type")

    if msg_type == "ping":
        await websocket.send_json({"type": "pong", "timestamp": datetime.utcnow().isoformat()})
    elif msg_type == "message":
        await handle_send_message(message, user, user_id, friend, friend_id, websocket, broadcast_to_user)
    elif msg_type == "typing":
        await broadcast_to_user(friend_id, {
            "type": "typing", "user_id": user_id, "user_name": user.name,
            "timestamp": datetime.utcnow().isoformat(),
        })
    elif msg_type == "read":
        await handle_read(message, user_id, broadcast_to_user)
    elif msg_type == "react":
        await handle_reaction(message, user_id, friend_id, "add", broadcast_to_user)
    elif msg_type == "unreact":
        await handle_reaction(message, user_id, friend_id, "remove", broadcast_to_user)
