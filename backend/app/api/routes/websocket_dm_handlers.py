"""
DM WebSocket message handlers.
Extracted from websocket_dm.py to keep files under 200 lines.
"""

from datetime import datetime

from starlette.websockets import WebSocket

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.direct_message import DirectMessage
from app.models.user import User
from app.services.chat_translation_service import chat_translation_service

logger = get_logger(__name__)


def build_message_payload(message: DirectMessage, viewer_id: str) -> dict:
    """Build a message payload for WebSocket transmission."""
    if message.has_translation and message.receiver_id == viewer_id:
        display = message.translated_text or message.message
        is_translated = (
            message.translated_text is not None
            and message.translated_text != message.message
        )
    else:
        display = message.message
        is_translated = False

    return {
        "id": str(message.id), "sender_id": message.sender_id,
        "sender_name": message.sender_name, "sender_avatar": message.sender_avatar,
        "receiver_id": message.receiver_id, "receiver_name": message.receiver_name,
        "receiver_avatar": message.receiver_avatar,
        "message": message.message, "display_message": display,
        "message_type": message.message_type, "source_language": message.source_language,
        "is_translated": is_translated, "translation_available": message.has_translation,
        "read": message.read, "reactions": message.reactions,
        "timestamp": message.timestamp.isoformat(),
    }


def sanitize_text(text: str) -> str:
    """Strip whitespace and enforce max DM message length from config."""
    max_len = settings.olorin.social_ws.dm_max_message_length
    return text.strip()[:max_len]


async def handle_send_message(message, user, user_id, friend, friend_id, websocket, broadcast_fn):
    """Handle sending a new DM with translation."""
    text = sanitize_text(message.get("text", ""))
    msg_type = message.get("message_type", "text")
    if msg_type != "text":
        msg_type = "text"

    if not text:
        await websocket.send_json({"type": "error", "message": "Empty message"})
        return

    detection = await chat_translation_service.detect_language(text)
    should_tr, target = await chat_translation_service.should_translate_for_user(friend_id)
    translated, has_tr = None, False
    if should_tr and detection.detected_language != target:
        result = await chat_translation_service.translate_message(
            text, detection.detected_language, target
        )
        if result.translated_text != text:
            translated, has_tr = result.translated_text, True

    dm = DirectMessage(
        sender_id=user_id, sender_name=user.name, sender_avatar=user.avatar,
        receiver_id=friend_id, receiver_name=friend.name, receiver_avatar=friend.avatar,
        message=text, message_type=msg_type, source_language=detection.detected_language,
        translated_text=translated, has_translation=has_tr,
    )
    await dm.insert()

    await broadcast_fn(user_id, {"type": "message", "data": build_message_payload(dm, user_id)})
    await broadcast_fn(friend_id, {"type": "message", "data": build_message_payload(dm, friend_id)})


async def handle_read(message, user_id, broadcast_fn):
    """Mark message as read and notify sender."""
    mid = message.get("message_id")
    if not mid:
        return
    dm = await DirectMessage.get(mid)
    if dm and dm.receiver_id == user_id and not dm.read:
        dm.read = True
        dm.read_at = datetime.utcnow()
        await dm.save()
        await broadcast_fn(
            dm.sender_id,
            {"type": "read", "message_id": mid, "read_at": dm.read_at.isoformat()},
        )


async def handle_reaction(message, user_id, friend_id, action, broadcast_fn):
    """Add or remove a reaction on a DM."""
    mid, emoji = message.get("message_id"), message.get("emoji")
    if not mid or not emoji:
        return
    dm = await DirectMessage.get(mid)
    if not dm or (dm.sender_id != user_id and dm.receiver_id != user_id):
        return
    if action == "add":
        if emoji not in dm.reactions:
            dm.reactions[emoji] = []
        if user_id not in dm.reactions[emoji]:
            dm.reactions[emoji].append(user_id)
            await dm.save()
    elif action == "remove":
        if emoji in dm.reactions and user_id in dm.reactions[emoji]:
            dm.reactions[emoji].remove(user_id)
            if not dm.reactions[emoji]:
                del dm.reactions[emoji]
            await dm.save()
    reaction_msg = {
        "type": "reaction", "message_id": mid,
        "emoji": emoji, "user_id": user_id, "action": action,
    }
    await broadcast_fn(user_id, reaction_msg)
    await broadcast_fn(friend_id, reaction_msg)
