"""Connection management for channel chat WebSocket."""

from fastapi import WebSocket

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.user import User
from app.services.channel_chat_service import ChannelChatService

logger = get_logger(__name__)


def check_premium_status(user: User) -> bool:
    """Check if user has premium access (Plus subscription or admin)."""
    return user.can_access_premium_features()


async def get_recent_messages_data(
    chat_service: ChannelChatService, channel_id: str
) -> list:
    """Get recent messages formatted for client."""
    messages = await chat_service.get_recent_messages(channel_id)
    return [
        {
            "id": str(msg.id),
            "user_id": msg.user_id,
            "user_name": msg.user_name,
            "user_role": msg.user_role,
            "message": msg.message,
            "original_language": msg.original_language,
            "timestamp": msg.timestamp.isoformat(),
            "is_pinned": msg.is_pinned,
        }
        for msg in messages
    ]


async def send_connected_message(
    websocket: WebSocket,
    channel_id: str,
    user_count: int,
    is_premium: bool,
    session_token: str,
    recent_messages_data: list,
) -> None:
    """Send connected confirmation to client."""
    await websocket.send_json(
        {
            "type": "connected",
            "channel_id": channel_id,
            "user_count": user_count,
            "is_premium": is_premium,
            "translation_enabled": (
                is_premium and settings.olorin.channel_chat.translation_enabled
            ),
            "session_token": session_token,
            "recent_messages": recent_messages_data,
        }
    )


async def broadcast_user_joined(
    chat_service: ChannelChatService, channel_id: str, user_name: str, user_count: int
) -> None:
    """Broadcast user joined message."""
    await chat_service.broadcast_message(
        channel_id,
        {
            "type": "user_joined",
            "user_name": user_name,
            "user_count": user_count,
        },
    )


async def broadcast_user_left(
    chat_service: ChannelChatService, channel_id: str, user_name: str, user_count: int
) -> None:
    """Broadcast user left message."""
    await chat_service.broadcast_message(
        channel_id,
        {
            "type": "user_left",
            "user_name": user_name,
            "user_count": user_count,
        },
    )
