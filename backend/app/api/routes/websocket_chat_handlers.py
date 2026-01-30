"""Message handlers and dispatch loop for channel chat WebSocket."""

import asyncio

from fastapi import WebSocket, WebSocketDisconnect

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.channel_chat import ChatReaction
from app.services.channel_chat_service import ChannelChatService
from app.services.chat_translation_service import ChatTranslationService

logger = get_logger(__name__)


async def send_error(ws: WebSocket, code: str, message: str, recoverable: bool = True, **extra) -> None:
    """Send error message to client."""
    data = {"type": "error", "code": code, "message": message, "recoverable": recoverable}
    data.update(extra)
    await ws.send_json(data)


async def heartbeat_loop(ws: WebSocket, user_id: str, interval: int) -> None:
    """Send periodic pings to keep connection alive."""
    try:
        while True:
            await asyncio.sleep(interval)
            try:
                await ws.send_json({"type": "ping"})
            except Exception as e:
                logger.debug("Heartbeat ping failed", extra={"user_id": user_id, "error": str(e)})
                break
    except asyncio.CancelledError:
        pass
    except Exception as e:
        logger.error("Heartbeat loop error", extra={"user_id": user_id, "error": str(e)})


async def run_message_loop(
    ws: WebSocket, chat_service: ChannelChatService, user_id: str, user_name: str, channel_id: str
) -> None:
    """Run the WebSocket message dispatch loop with heartbeat monitoring."""
    timeout = settings.olorin.channel_chat.heartbeat_timeout_seconds
    hb_task = asyncio.create_task(
        heartbeat_loop(ws, user_id, settings.olorin.channel_chat.heartbeat_interval_seconds)
    )
    last_pong = asyncio.get_event_loop().time()

    try:
        while True:
            try:
                msg = await asyncio.wait_for(ws.receive_json(), timeout=timeout)
                msg_type = msg.get("type")
                if msg_type == "pong":
                    last_pong = asyncio.get_event_loop().time()
                elif msg_type == "chat":
                    await handle_chat_message(ws, chat_service, user_id, user_name, channel_id, msg)
                elif msg_type == "reaction":
                    await handle_reaction(ws, chat_service, user_id, channel_id, msg)
            except asyncio.TimeoutError:
                if asyncio.get_event_loop().time() - last_pong > timeout:
                    logger.warning("Heartbeat timeout", extra={"user_id": user_id, "channel_id": channel_id})
                    await ws.close(code=4008, reason="Heartbeat timeout")
                    break
            except WebSocketDisconnect:
                logger.info("User disconnected", extra={"user_id": user_id, "channel_id": channel_id})
                break
            except Exception as e:
                logger.error("Error processing message", extra={"user_id": user_id, "channel_id": channel_id, "error": str(e)})
                await send_error(ws, "processing_error", "An error occurred processing your message")
    finally:
        if not hb_task.done():
            hb_task.cancel()
            try:
                await hb_task
            except asyncio.CancelledError:
                pass


async def handle_chat_message(
    ws: WebSocket, chat_service: ChannelChatService,
    user_id: str, user_name: str, channel_id: str, message_data: dict,
) -> None:
    """Handle incoming chat message."""
    if not await chat_service.validate_session_token(user_id, message_data.get("session_token")):
        await send_error(ws, "session_invalid", "Invalid session token", False)
        logger.warning("Invalid session token", extra={"user_id": user_id, "channel_id": channel_id})
        return

    if await chat_service.is_user_muted(channel_id, user_id):
        await send_error(ws, "user_muted", "You are muted in this channel")
        return

    allowed, wait_seconds = await chat_service.check_message_rate(user_id, channel_id)
    if not allowed:
        await send_error(ws, "rate_limit", f"Rate limit exceeded. Wait {wait_seconds} seconds.", True, wait_seconds=wait_seconds)
        return

    message_text = message_data.get("message", "").strip()
    if not message_text:
        await send_error(ws, "invalid_message", "Message cannot be empty")
        return

    detected_lang = "he"
    try:
        detection_result = await ChatTranslationService.detect_language(message_text)
        detected_lang = detection_result.detected_language
    except Exception as e:
        logger.warning("Language detection failed", extra={"user_id": user_id, "channel_id": channel_id, "error": str(e)})

    try:
        saved = await chat_service.save_message(channel_id, user_id, user_name, message_text, detected_lang)
    except Exception as e:
        await send_error(ws, "save_failed", "Failed to save message")
        logger.error("Failed to save message", extra={"user_id": user_id, "channel_id": channel_id, "error": str(e)})
        return

    await chat_service.broadcast_message(channel_id, {
        "type": "channel_chat_message",
        "id": str(saved.id),
        "user_id": user_id,
        "user_name": user_name,
        "message": saved.message,
        "original_language": saved.original_language,
        "timestamp": saved.timestamp.isoformat(),
    })
    logger.info("Message sent", extra={"user_id": user_id, "channel_id": channel_id, "message_id": str(saved.id), "language": detected_lang})


async def handle_reaction(
    ws: WebSocket, chat_service: ChannelChatService,
    user_id: str, channel_id: str, message_data: dict,
) -> None:
    """Handle reaction to message."""
    if not await chat_service.validate_session_token(user_id, message_data.get("session_token")):
        await send_error(ws, "session_invalid", "Invalid session token", False)
        return

    message_id = message_data.get("message_id")
    reaction_type = message_data.get("reaction", "").strip()
    if not message_id or not reaction_type:
        await send_error(ws, "invalid_reaction", "Invalid reaction data")
        return

    try:
        reaction = ChatReaction(message_id=message_id, channel_id=channel_id, user_id=user_id, reaction_type=reaction_type)
        await reaction.insert()
        await chat_service.broadcast_message(channel_id, {
            "type": "reaction_update", "message_id": message_id, "user_id": user_id, "reaction": reaction_type,
        })
        logger.info("Reaction added", extra={"user_id": user_id, "channel_id": channel_id, "message_id": message_id, "reaction": reaction_type})
    except Exception as e:
        logger.error("Failed to save reaction", extra={"user_id": user_id, "channel_id": channel_id, "message_id": message_id, "error": str(e)})
