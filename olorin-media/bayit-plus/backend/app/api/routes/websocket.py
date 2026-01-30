"""
WebSocket handler for real-time watch party communication.
Handles WebSocket connections, message routing, and real-time events.
"""

import json
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.models.user import User
from app.services.connection_manager import connection_manager
from app.services.room_manager import room_manager

router = APIRouter()


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate JWT token and return user"""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            return None

        user = await User.get(user_id)
        if user is None or not user.is_active:
            return None

        return user
    except JWTError:
        return None


@router.websocket("/ws/party/{party_id}")
async def party_websocket(websocket: WebSocket, party_id: str, token: str = Query(...)):
    """
    WebSocket endpoint for watch party real-time communication.

    Message types (client -> server):
    - {"type": "chat", "message": "text"}
    - {"type": "sync", "position": 123.45, "is_playing": true}
    - {"type": "state", "is_muted": true, "is_speaking": false}
    - {"type": "reaction", "message_id": "...", "emoji": "...", "action": "add|remove"}
    - {"type": "ping"}

    Message types (server -> client):
    - {"type": "connected", "party": {...}, "user_id": "..."}
    - {"type": "chat_message", "message": {...}}
    - {"type": "playback_sync", "position": 123.45, "is_playing": true}
    - {"type": "participant_joined", "user_id": "...", "user_name": "..."}
    - {"type": "participant_left", "user_id": "..."}
    - {"type": "participant_state_changed", "user_id": "...", ...}
    - {"type": "party_ended"}
    - {"type": "error", "message": "..."}
    - {"type": "pong"}
    """
    # Authenticate user
    user = await get_user_from_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Verify party exists and user is a participant
    party = await room_manager.get_party(party_id)
    if not party or not party.is_active:
        await websocket.close(code=4004, reason="Party not found")
        return

    user_id = str(user.id)
    if not any(p.user_id == user_id for p in party.participants):
        # Try to join the party
        party = await room_manager.join_party(party_id, user_id, user.name)
        if not party:
            await websocket.close(code=4003, reason="Cannot join party")
            return

    # Connect to WebSocket
    connection_id = await connection_manager.connect(
        websocket=websocket, user_id=user_id, user_name=user.name, party_id=party_id
    )

    try:
        # Send initial party state
        await connection_manager.send_personal_message(
            {
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
            },
            connection_id,
        )

        # Message loop
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "ping":
                    await connection_manager.send_personal_message(
                        {"type": "pong", "timestamp": datetime.now(timezone.utc).isoformat()},
                        connection_id,
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
                            message_id=message.get("message_id"),
                            user_id=user_id,
                            emoji=message.get("emoji", ""),
                        )
                    elif action == "remove":
                        await room_manager.remove_reaction(
                            message_id=message.get("message_id"),
                            user_id=user_id,
                            emoji=message.get("emoji", ""),
                        )

            except json.JSONDecodeError:
                await connection_manager.send_personal_message(
                    {"type": "error", "message": "Invalid JSON"}, connection_id
                )
            except Exception as e:
                await connection_manager.send_personal_message(
                    {"type": "error", "message": str(e)}, connection_id
                )

    except WebSocketDisconnect:
        pass
    finally:
        # Clean up connection
        await connection_manager.disconnect(connection_id)

        # Update party state (user left)
        await room_manager.leave_party(party_id, user_id)
