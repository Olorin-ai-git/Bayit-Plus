"""WebSocket endpoint for live channel public chat."""

from typing import Optional

from fastapi import APIRouter, WebSocket

from app.api.routes.websocket_chat_connection import (
    broadcast_user_joined,
    broadcast_user_left,
    check_beta_status,
    get_recent_messages_data,
    send_connected_message,
)
from app.api.routes.websocket_chat_handlers import run_message_loop
from app.api.routes.websocket_helpers import (
    check_authentication_message,
    get_user_from_token,
)
from app.core.logging_config import get_logger
from app.models.user import User
from app.services.channel_chat_service import (
    ChannelChatService,
    get_channel_chat_service,
)

router = APIRouter()
logger = get_logger(__name__)


@router.websocket("/ws/live/{channel_id}/chat")
async def websocket_channel_chat(websocket: WebSocket, channel_id: str):
    """WebSocket endpoint for live channel public chat."""
    await websocket.accept()

    user: Optional[User] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    client_ip: str = websocket.client.host if websocket.client else "unknown"
    chat_service: Optional[ChannelChatService] = None
    session_token: Optional[str] = None

    try:
        # Step 1: Authenticate via message
        token, auth_error = await check_authentication_message(websocket)
        if auth_error:
            return

        # Step 2: Validate token and get user
        user = await get_user_from_token(token)
        if not user:
            await websocket.send_json(
                {"type": "error", "code": "auth_failed", "message": "Invalid authentication", "recoverable": False}
            )
            await websocket.close(code=4001, reason="Authentication failed")
            logger.warning("Auth failed for WebSocket", extra={"client_ip": client_ip, "channel_id": channel_id})
            return

        user_id = str(user.id)
        user_name = user.display_name or user.email.split("@")[0]
        logger.info(
            "User authenticated for channel chat",
            extra={"user_id": user_id, "user_name": user_name, "channel_id": channel_id, "client_ip": client_ip},
        )

        # Step 3: Join channel chat (with connection limits)
        chat_service = get_channel_chat_service()
        success, session_token, error_msg = await chat_service.join_channel_chat(
            channel_id, websocket, user_id, user_name, client_ip
        )

        if not success:
            await websocket.send_json(
                {"type": "error", "code": "connection_limit", "message": error_msg or "Connection limit reached", "recoverable": True}
            )
            await websocket.close(code=4003, reason="Connection limit")
            logger.warning("Connection limit", extra={"user_id": user_id, "channel_id": channel_id, "error": error_msg})
            return

        # Step 4: Send connected state and broadcast join
        is_beta_user = await check_beta_status(user)
        recent_messages_data = await get_recent_messages_data(chat_service, channel_id)
        user_count = await chat_service.get_channel_user_count(channel_id)
        await send_connected_message(websocket, channel_id, user_count, is_beta_user, session_token, recent_messages_data)
        await broadcast_user_joined(chat_service, channel_id, user_name, user_count)

        # Step 5: Run message loop (handles heartbeat + dispatch)
        await run_message_loop(websocket, chat_service, user_id, user_name, channel_id)

    except Exception as e:
        logger.error(
            "WebSocket connection error",
            extra={"user_id": user_id, "channel_id": channel_id, "client_ip": client_ip, "error": str(e)},
        )

    finally:
        if chat_service and user_id:
            remaining = await chat_service.leave_channel_chat(channel_id, user_id, client_ip)
            if user_name:
                await broadcast_user_left(chat_service, channel_id, user_name, remaining)
