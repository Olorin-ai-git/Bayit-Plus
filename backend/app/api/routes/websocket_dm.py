"""
WebSocket handler for real-time direct messaging between friends.
Handles WebSocket connections, message sending, and read receipts.
"""

import json
import logging
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.models.direct_message import DirectMessage
from app.models.user import User
from app.services.chat_translation_service import chat_translation_service
from app.services.friendship_service import FriendshipService

router = APIRouter()
logger = logging.getLogger(__name__)

# Track active WebSocket connections per user
# Format: {user_id: [websocket1, websocket2, ...]}
active_dm_connections: Dict[str, List[WebSocket]] = {}


async def broadcast_to_user(user_id: str, message: dict) -> int:
    """Broadcast a message to all connections for a user. Returns number of successful sends."""
    if user_id not in active_dm_connections:
        return 0

    connections = active_dm_connections[user_id]
    success_count = 0
    failed_connections = []

    for ws in connections:
        try:
            await ws.send_json(message)
            success_count += 1
        except Exception as e:
            logger.warning(f"[DM] Failed to send to connection: {e}")
            failed_connections.append(ws)

    # Remove failed connections
    for ws in failed_connections:
        connections.remove(ws)

    # Clean up empty user connection list
    if not connections:
        del active_dm_connections[user_id]

    return success_count


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate JWT token and return user."""
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


def build_message_payload(message: DirectMessage, viewer_id: str) -> dict:
    """Build a message payload for WebSocket transmission."""
    # Determine display message based on viewer
    if message.has_translation and message.receiver_id == viewer_id:
        display_message = message.translated_text or message.message
        is_translated = (
            message.translated_text is not None
            and message.translated_text != message.message
        )
    else:
        display_message = message.message
        is_translated = False

    return {
        "id": str(message.id),
        "sender_id": message.sender_id,
        "sender_name": message.sender_name,
        "sender_avatar": message.sender_avatar,
        "receiver_id": message.receiver_id,
        "receiver_name": message.receiver_name,
        "receiver_avatar": message.receiver_avatar,
        "message": message.message,
        "display_message": display_message,
        "message_type": message.message_type,
        "source_language": message.source_language,
        "is_translated": is_translated,
        "translation_available": message.has_translation,
        "read": message.read,
        "reactions": message.reactions,
        "timestamp": message.timestamp.isoformat(),
    }


@router.websocket("/ws/dm/{friend_id}")
async def dm_websocket(websocket: WebSocket, friend_id: str, token: str = Query(...)):
    """
    WebSocket endpoint for real-time direct messaging with a friend.

    Message types (client -> server):
    - {"type": "message", "text": "Hello!", "message_type": "text"}
    - {"type": "typing"}
    - {"type": "read", "message_id": "..."}
    - {"type": "react", "message_id": "...", "emoji": "👍"}
    - {"type": "unreact", "message_id": "...", "emoji": "👍"}
    - {"type": "ping"}

    Message types (server -> client):
    - {"type": "message", "data": {...}}
    - {"type": "typing", "user_id": "..."}
    - {"type": "read", "message_id": "..."}
    - {"type": "reaction", "message_id": "...", "emoji": "...", "user_id": "...", "action": "add/remove"}
    - {"type": "error", "message": "..."}
    - {"type": "pong"}
    """
    # Accept WebSocket first
    await websocket.accept()
    logger.info(f"[DM] WebSocket connection accepted for friend {friend_id}")

    # Authenticate user
    user = await get_user_from_token(token)
    if not user:
        logger.warning(f"[DM] Invalid token for friend {friend_id}")
        await websocket.close(code=4001, reason="Invalid token")
        return

    user_id = str(user.id)

    # Verify friendship
    if not await FriendshipService.are_friends(user_id, friend_id):
        logger.warning(f"[DM] User {user_id} not friends with {friend_id}")
        await websocket.close(code=4003, reason="You can only message friends")
        return

    # Get friend info
    friend = await User.get(friend_id)
    if not friend:
        await websocket.close(code=4004, reason="Friend not found")
        return

    logger.info(
        f"[DM] User {user.name} ({user_id}) connected to chat with {friend.name} ({friend_id})"
    )

    # Add connection to active connections
    if user_id not in active_dm_connections:
        active_dm_connections[user_id] = []
    active_dm_connections[user_id].append(websocket)
    logger.info(
        f"[DM] Added connection for user {user_id}. Total connections: {len(active_dm_connections[user_id])}"
    )

    try:
        # Send connection confirmation
        await websocket.send_json(
            {
                "type": "connected",
                "friend_id": friend_id,
                "friend_name": friend.name,
                "friend_avatar": friend.avatar,
            }
        )

        # Message loop
        while True:
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
                msg_type = message.get("type")

                if msg_type == "ping":
                    await websocket.send_json(
                        {"type": "pong", "timestamp": datetime.utcnow().isoformat()}
                    )

                elif msg_type == "message":
                    # Handle new message
                    text = message.get("text", "").strip()
                    message_type = message.get("message_type", "text")

                    if not text:
                        await websocket.send_json(
                            {"type": "error", "message": "Empty message"}
                        )
                        continue

                    # Detect language
                    detection = await chat_translation_service.detect_language(text)
                    source_lang = detection.detected_language

                    # Check if receiver needs translation
                    (
                        should_translate,
                        target_lang,
                    ) = await chat_translation_service.should_translate_for_user(
                        friend_id
                    )

                    translated_text = None
                    has_translation = False

                    if should_translate and source_lang != target_lang:
                        result = await chat_translation_service.translate_message(
                            text, source_lang, target_lang
                        )
                        if result.translated_text != text:
                            translated_text = result.translated_text
                            has_translation = True

                    # Create message
                    dm = DirectMessage(
                        sender_id=user_id,
                        sender_name=user.name,
                        sender_avatar=user.avatar,
                        receiver_id=friend_id,
                        receiver_name=friend.name,
                        receiver_avatar=friend.avatar,
                        message=text,
                        message_type=message_type,
                        source_language=source_lang,
                        translated_text=translated_text,
                        has_translation=has_translation,
                    )

                    await dm.insert()

                    # Broadcast to sender (all their connections)
                    sender_payload = build_message_payload(dm, user_id)
                    await broadcast_to_user(
                        user_id, {"type": "message", "data": sender_payload}
                    )

                    # Broadcast to receiver (all their connections)
                    receiver_payload = build_message_payload(dm, friend_id)
                    await broadcast_to_user(
                        friend_id, {"type": "message", "data": receiver_payload}
                    )

                elif msg_type == "typing":
                    # Broadcast typing indicator to friend
                    await broadcast_to_user(
                        friend_id,
                        {
                            "type": "typing",
                            "user_id": user_id,
                            "user_name": user.name,
                            "timestamp": datetime.utcnow().isoformat(),
                        },
                    )

                elif msg_type == "read":
                    # Mark message as read
                    message_id = message.get("message_id")
                    if message_id:
                        dm = await DirectMessage.get(message_id)
                        if dm and dm.receiver_id == user_id and not dm.read:
                            dm.read = True
                            dm.read_at = datetime.utcnow()
                            await dm.save()

                            # Notify sender
                            await broadcast_to_user(
                                dm.sender_id,
                                {
                                    "type": "read",
                                    "message_id": message_id,
                                    "read_at": dm.read_at.isoformat(),
                                },
                            )

                elif msg_type == "react":
                    # Add reaction
                    message_id = message.get("message_id")
                    emoji = message.get("emoji")
                    if message_id and emoji:
                        dm = await DirectMessage.get(message_id)
                        if dm and (
                            dm.sender_id == user_id or dm.receiver_id == user_id
                        ):
                            if emoji not in dm.reactions:
                                dm.reactions[emoji] = []
                            if user_id not in dm.reactions[emoji]:
                                dm.reactions[emoji].append(user_id)
                                await dm.save()

                                # Broadcast reaction to both users
                                reaction_msg = {
                                    "type": "reaction",
                                    "message_id": message_id,
                                    "emoji": emoji,
                                    "user_id": user_id,
                                    "action": "add",
                                }
                                await broadcast_to_user(user_id, reaction_msg)
                                await broadcast_to_user(friend_id, reaction_msg)

                elif msg_type == "unreact":
                    # Remove reaction
                    message_id = message.get("message_id")
                    emoji = message.get("emoji")
                    if message_id and emoji:
                        dm = await DirectMessage.get(message_id)
                        if dm and (
                            dm.sender_id == user_id or dm.receiver_id == user_id
                        ):
                            if emoji in dm.reactions and user_id in dm.reactions[emoji]:
                                dm.reactions[emoji].remove(user_id)
                                if not dm.reactions[emoji]:
                                    del dm.reactions[emoji]
                                await dm.save()

                                # Broadcast reaction removal to both users
                                reaction_msg = {
                                    "type": "reaction",
                                    "message_id": message_id,
                                    "emoji": emoji,
                                    "user_id": user_id,
                                    "action": "remove",
                                }
                                await broadcast_to_user(user_id, reaction_msg)
                                await broadcast_to_user(friend_id, reaction_msg)

            except json.JSONDecodeError:
                await websocket.send_json({"type": "error", "message": "Invalid JSON"})
            except KeyError as e:
                await websocket.send_json(
                    {"type": "error", "message": f"Missing required field: {str(e)}"}
                )
            except Exception as e:
                logger.error(f"[DM] Error handling message: {e}")
                await websocket.send_json({"type": "error", "message": str(e)})

    except WebSocketDisconnect:
        logger.info(f"[DM] User {user.name} disconnected from chat with {friend.name}")
    finally:
        # Remove connection from active connections
        if user_id in active_dm_connections:
            try:
                active_dm_connections[user_id].remove(websocket)
                logger.info(
                    f"[DM] Removed connection for user {user_id}. Remaining: {len(active_dm_connections[user_id])}"
                )

                if not active_dm_connections[user_id]:
                    del active_dm_connections[user_id]
                    logger.info(
                        f"[DM] Removed empty connection list for user {user_id}"
                    )
            except ValueError:
                logger.warning(
                    f"[DM] Connection not found for user {user_id} during cleanup"
                )
