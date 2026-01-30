"""Connection management for channel chat WebSocket."""

from fastapi import WebSocket

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.channel_chat_service import ChannelChatService
from app.services.olorin.metering.service import MeteringService

logger = get_logger(__name__)


async def check_beta_status(user: User) -> bool:
    """Check if user is beta user."""
    try:
        from app.core.config import get_settings

        credit_service = BetaCreditService(
            settings=get_settings(),
            metering_service=MeteringService(),
            db=None,
        )
        return await credit_service.is_beta_user(str(user.id))
    except Exception as e:
        logger.debug(
            "Could not check beta status", extra={"user_id": str(user.id), "error": str(e)}
        )
        return False


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
    is_beta_user: bool,
    session_token: str,
    recent_messages_data: list,
) -> None:
    """Send connected confirmation to client."""
    await websocket.send_json(
        {
            "type": "connected",
            "channel_id": channel_id,
            "user_count": user_count,
            "is_beta_user": is_beta_user,
            "translation_enabled": (
                is_beta_user and settings.olorin.channel_chat.translation_enabled
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
