"""
Dubbing session lifecycle management helpers
"""

import asyncio
import logging
from typing import Optional

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from app.models.content import LiveChannel
from app.models.user import User
from app.services.live_dubbing_service import LiveDubbingService

logger = logging.getLogger(__name__)

# Active sessions tracked via Redis for cross-instance visibility.
# Local fallback dict used when Redis is unavailable.
_active_sessions: dict[str, set[str]] = {}

# Track active sessions per user (user_id -> set of session_ids)
_user_sessions: dict[str, set[str]] = {}


def get_user_session_count(user_id: str) -> int:
    """Get number of active dubbing sessions for a user."""
    return len(_user_sessions.get(user_id, set()))


async def initialize_dubbing_session(
    websocket: WebSocket,
    channel: LiveChannel,
    user: User,
    target_lang: str,
    voice_id: Optional[str],
    platform: str,
    enable_continuous_flow: bool = True,
) -> tuple[
    Optional[LiveDubbingService],
    Optional[asyncio.Task],
    Optional[asyncio.Task],
    Optional[asyncio.Task],
]:
    """
    Initialize dubbing service and start background tasks.

    Args:
        websocket: WebSocket connection
        channel: Live channel being dubbed
        user: User requesting dubbing
        target_lang: Target language for dubbing
        voice_id: Optional voice ID override
        platform: Client platform
        enable_continuous_flow: Enable continuous flow architecture

    Returns:
        (dubbing_service, pipeline_task, latency_task, sender_task)
    """
    try:
        # Use channel's default voice or provided voice
        effective_voice_id = voice_id or channel.default_dubbing_voice_id

        dubbing_service = LiveDubbingService(
            channel=channel,
            user=user,
            target_language=target_lang,
            voice_id=effective_voice_id,
            platform=platform,
            enable_continuous_flow=enable_continuous_flow,
        )

        # Start dubbing session
        connection_info = await dubbing_service.start()

        # Send connection confirmation
        await websocket.send_json(connection_info)
        logger.info(
            f"Dubbing session started: {dubbing_service.session_id}, "
            f"sync_delay={connection_info['sync_delay_ms']}ms"
        )

        # Track active session (per channel and per user)
        channel_id = str(channel.id)
        user_id = str(user.id)
        if channel_id not in _active_sessions:
            _active_sessions[channel_id] = set()
        _active_sessions[channel_id].add(dubbing_service.session_id)
        if user_id not in _user_sessions:
            _user_sessions[user_id] = set()
        _user_sessions[user_id].add(dubbing_service.session_id)
        try:
            from app.services.redis_connection_manager import redis_connection_manager
            await redis_connection_manager.add_active_session(channel_id, dubbing_service.session_id)
        except Exception:
            pass

        # Start pipeline processing task
        pipeline_task = asyncio.create_task(dubbing_service.run_pipeline())

        # Start latency report task (every 10 seconds)
        async def send_latency_reports():
            while dubbing_service.is_running:
                await asyncio.sleep(10)
                if dubbing_service.is_running:
                    report = dubbing_service.get_latency_report()
                    try:
                        report_data = report.model_dump()

                        # Include buffer status if continuous flow is enabled
                        buffer_status = dubbing_service.get_buffer_status()
                        if buffer_status:
                            report_data["buffer_status"] = buffer_status

                        await websocket.send_json(report_data)
                    except Exception:
                        break

        latency_task = asyncio.create_task(send_latency_reports())

        # Start message sender task
        async def send_messages():
            async for message in dubbing_service.receive_messages():
                try:
                    await websocket.send_json(message.model_dump())
                except Exception:
                    break

        sender_task = asyncio.create_task(send_messages())

        return dubbing_service, pipeline_task, latency_task, sender_task

    except WebSocketDisconnect as e:
        logger.warning(
            f"WebSocket disconnected during session initialization "
            f"(code={e.code}, reason={e.reason or 'none'})"
        )
        raise
    except Exception as e:
        logger.error(f"Error initializing dubbing session: {type(e).__name__}: {e}")
        raise


async def cleanup_dubbing_session(
    channel_id: str,
    dubbing_service: Optional[LiveDubbingService],
    pipeline_task: Optional[asyncio.Task],
    latency_task: Optional[asyncio.Task],
    sender_task: Optional[asyncio.Task],
):
    """Cleanup dubbing session and background tasks."""
    # Cancel tasks
    for task in [pipeline_task, latency_task, sender_task]:
        if task and not task.done():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

    # Cleanup dubbing service
    if dubbing_service:
        # Remove from active sessions (per channel)
        if channel_id in _active_sessions:
            _active_sessions[channel_id].discard(dubbing_service.session_id)
            if not _active_sessions[channel_id]:
                del _active_sessions[channel_id]
        try:
            from app.services.redis_connection_manager import redis_connection_manager
            await redis_connection_manager.remove_active_session(channel_id, dubbing_service.session_id)
        except Exception:
            pass

        # Remove from per-user sessions
        for uid, sessions in list(_user_sessions.items()):
            sessions.discard(dubbing_service.session_id)
            if not sessions:
                del _user_sessions[uid]

        # Stop dubbing service
        try:
            summary = await dubbing_service.stop()
            logger.info(f"Dubbing session summary: {summary}")
        except Exception as e:
            logger.error(f"Error stopping dubbing service: {e}")


async def get_active_session_count(channel_id: str) -> int:
    """Get number of active sessions for a channel (cross-instance via Redis)."""
    try:
        from app.services.redis_connection_manager import redis_connection_manager
        count = await redis_connection_manager.get_active_session_count(channel_id)
        if count > 0:
            return count
    except Exception:
        pass
    # Fallback to local count
    return len(_active_sessions.get(channel_id, set()))
