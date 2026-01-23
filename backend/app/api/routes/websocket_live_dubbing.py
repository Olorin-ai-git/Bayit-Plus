"""
WebSocket endpoint for live channel dubbing (Premium feature)
Real-time audio → transcription → translation → dubbed audio streaming
"""

import asyncio
import logging
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt

from app.core.config import settings
from app.models.content import LiveChannel
from app.models.user import User
from app.services.live_dubbing_service import LiveDubbingService

router = APIRouter()
logger = logging.getLogger(__name__)

# Track active sessions per channel for shared STT pipeline
_active_sessions: dict[str, set[str]] = {}


async def get_user_from_token(token: str) -> Optional[User]:
    """Validate JWT token and return user."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if not user_id:
            return None

        user = await User.get(user_id)
        if not user or not user.is_active:
            return None

        return user
    except JWTError:
        return None


@router.websocket("/ws/live/{channel_id}/dubbing")
async def websocket_live_dubbing(
    websocket: WebSocket,
    channel_id: str,
    target_lang: str = Query("en"),
    voice_id: Optional[str] = Query(None),
    platform: str = Query("web"),
):
    """
    WebSocket endpoint for live channel dubbing (Premium feature).

    Authentication: Client sends {"type": "authenticate", "token": "..."} as first message
    (SECURITY: Token not in URL to avoid exposure in logs, history, referer headers)

    Client sends:
    - JSON authentication message first
    - Binary audio chunks (16kHz, mono, LINEAR16 PCM)

    Server sends JSON messages:
    - {"type": "connected", "session_id": "...", "sync_delay_ms": 600, ...}
    - {"type": "dubbed_audio", "data": "<base64>", "original_text": "...", ...}
    - {"type": "transcript", "text": "...", "timestamp_ms": ...}
    - {"type": "latency_report", "avg_total_ms": 650, ...}
    - {"type": "error", "message": "...", "recoverable": true}
    """
    # Step 1: Check if live dubbing is enabled
    if not settings.olorin.dubbing.live_dubbing_enabled:
        await websocket.close(code=4000, reason="Live dubbing is disabled")
        return

    # Step 2: Accept connection first (then authenticate via message)
    await websocket.accept()

    # Step 3: Wait for authentication message (SECURITY: token via message, not URL)
    try:
        auth_timeout = 10.0  # 10 second timeout for authentication
        auth_message = await asyncio.wait_for(
            websocket.receive_json(), timeout=auth_timeout
        )

        if auth_message.get("type") != "authenticate" or not auth_message.get("token"):
            await websocket.send_json({
                "type": "error",
                "message": "Authentication required. Send: {type: 'authenticate', token: '...'}",
                "recoverable": False,
            })
            await websocket.close(code=4001, reason="Authentication required")
            return

        token = auth_message["token"]
    except asyncio.TimeoutError:
        await websocket.send_json({
            "type": "error",
            "message": "Authentication timeout",
            "recoverable": False,
        })
        await websocket.close(code=4001, reason="Authentication timeout")
        return
    except Exception as e:
        logger.warning(f"Authentication error: {e}")
        await websocket.close(code=4001, reason="Authentication error")
        return

    # Step 4: Validate token
    user = await get_user_from_token(token)
    if not user:
        await websocket.send_json({
            "type": "error",
            "message": "Invalid or expired token",
            "recoverable": False,
        })
        await websocket.close(code=4001, reason="Authentication failed")
        return

    # Step 5: Check subscription tier (Premium feature)
    if user.subscription_tier not in ["premium", "family"]:
        await websocket.send_json({
            "type": "error",
            "message": "Premium subscription required for live dubbing",
            "recoverable": False,
        })
        await websocket.close(code=4003, reason="Premium subscription required")
        return

    # Step 6: Verify channel exists and supports dubbing
    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
    except Exception:
        channel = None

    if not channel:
        await websocket.close(code=4004, reason="Channel not found")
        return

    if not channel.supports_live_dubbing:
        await websocket.send_json({
            "type": "error",
            "message": "Channel does not support live dubbing",
            "recoverable": False,
        })
        await websocket.close(code=4005, reason="Channel does not support live dubbing")
        return

    # Step 7: Validate target language
    if target_lang not in channel.available_dubbing_languages:
        await websocket.send_json({
            "type": "error",
            "message": f"Language {target_lang} not available. Supported: {channel.available_dubbing_languages}",
            "recoverable": False,
        })
        await websocket.close(
            code=4006,
            reason=f"Language {target_lang} not available. Supported: {channel.available_dubbing_languages}",
        )
        return

    # Connection already accepted in Step 2 (for secure token auth via message)
    logger.info(
        f"Live dubbing session authenticated: user={user.id}, "
        f"channel={channel_id}, target_lang={target_lang}"
    )

    # Step 8: Initialize dubbing service
    dubbing_service: Optional[LiveDubbingService] = None
    pipeline_task: Optional[asyncio.Task] = None
    latency_report_task: Optional[asyncio.Task] = None

    try:
        # Use channel's default voice or provided voice
        effective_voice_id = voice_id or channel.default_dubbing_voice_id

        dubbing_service = LiveDubbingService(
            channel=channel,
            user=user,
            target_language=target_lang,
            voice_id=effective_voice_id,
            platform=platform,
        )

        # Start dubbing session
        connection_info = await dubbing_service.start()

        # Send connection confirmation
        await websocket.send_json(connection_info)
        logger.info(
            f"Dubbing session started: {dubbing_service.session_id}, "
            f"sync_delay={connection_info['sync_delay_ms']}ms"
        )

        # Track active session
        if channel_id not in _active_sessions:
            _active_sessions[channel_id] = set()
        _active_sessions[channel_id].add(dubbing_service.session_id)

        # Start pipeline processing task
        pipeline_task = asyncio.create_task(dubbing_service.run_pipeline())

        # Start latency report task (every 10 seconds)
        async def send_latency_reports():
            while dubbing_service.is_running:
                await asyncio.sleep(10)
                if dubbing_service.is_running:
                    report = dubbing_service.get_latency_report()
                    try:
                        await websocket.send_json(report.model_dump())
                    except Exception:
                        break

        latency_report_task = asyncio.create_task(send_latency_reports())

        # Start message sender task
        async def send_messages():
            async for message in dubbing_service.receive_messages():
                try:
                    await websocket.send_json(message.model_dump())
                except Exception:
                    break

        message_sender_task = asyncio.create_task(send_messages())

        # Step 8: Process incoming audio chunks
        try:
            while True:
                audio_chunk = await websocket.receive_bytes()
                await dubbing_service.process_audio_chunk(audio_chunk)

        except WebSocketDisconnect:
            logger.info(
                f"Live dubbing session ended (disconnect): "
                f"user={user.id}, session={dubbing_service.session_id}"
            )

    except Exception as e:
        logger.error(f"Error in live dubbing stream: {str(e)}")
        try:
            await websocket.send_json({
                "type": "error",
                "message": str(e),
                "recoverable": False,
            })
        except Exception:
            pass

    finally:
        # Cleanup
        if pipeline_task and not pipeline_task.done():
            pipeline_task.cancel()
            try:
                await pipeline_task
            except asyncio.CancelledError:
                pass

        if latency_report_task and not latency_report_task.done():
            latency_report_task.cancel()
            try:
                await latency_report_task
            except asyncio.CancelledError:
                pass

        # Cancel message sender task to prevent resource leaks
        if 'message_sender_task' in locals() and message_sender_task and not message_sender_task.done():
            message_sender_task.cancel()
            try:
                await message_sender_task
            except asyncio.CancelledError:
                pass

        if dubbing_service:
            # Remove from active sessions
            if channel_id in _active_sessions:
                _active_sessions[channel_id].discard(dubbing_service.session_id)
                if not _active_sessions[channel_id]:
                    del _active_sessions[channel_id]

            # Stop dubbing service
            try:
                summary = await dubbing_service.stop()
                logger.info(f"Dubbing session summary: {summary}")
            except Exception as e:
                logger.error(f"Error stopping dubbing service: {e}")


@router.get("/live/{channel_id}/dubbing/status")
async def check_dubbing_availability(channel_id: str):
    """
    Check if live dubbing is available for a channel.

    Returns:
        {
            "available": true,
            "source_language": "he",
            "supported_target_languages": ["en", "es", "ar"],
            "default_sync_delay_ms": 600,
            "active_sessions": 3
        }
    """
    # Check if feature is enabled
    if not settings.olorin.dubbing.live_dubbing_enabled:
        return {
            "available": False,
            "error": "Live dubbing is disabled",
        }

    try:
        channel = await LiveChannel.get(PydanticObjectId(channel_id))
        if not channel:
            return {"available": False, "error": "Channel not found"}

        active_count = len(_active_sessions.get(channel_id, set()))

        return {
            "available": channel.supports_live_dubbing,
            "source_language": channel.dubbing_source_language or "he",
            "supported_target_languages": channel.available_dubbing_languages,
            "default_voice_id": channel.default_dubbing_voice_id,
            "default_sync_delay_ms": channel.dubbing_sync_delay_ms,
            "active_sessions": active_count,
        }

    except Exception as e:
        logger.error(f"Error checking dubbing availability: {str(e)}")
        return {"available": False, "error": "Internal error"}
