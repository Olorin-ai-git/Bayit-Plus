"""
Dubbing session lifecycle management helpers
"""

import asyncio
import logging
from typing import Optional

from fastapi import WebSocket

from app.models.content import LiveChannel
from app.models.user import User
from app.services.live_dubbing_service import LiveDubbingService

logger = logging.getLogger(__name__)

# Track active sessions per channel
_active_sessions: dict[str, set[str]] = {}


async def initialize_dubbing_session(
    websocket: WebSocket,
    channel: LiveChannel,
    user: User,
    target_lang: str,
    voice_id: Optional[str],
    platform: str,
) -> tuple[
    Optional[LiveDubbingService],
    Optional[asyncio.Task],
    Optional[asyncio.Task],
    Optional[asyncio.Task],
]:
    """
    Initialize dubbing service and start background tasks.

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
        channel_id = str(channel.id)
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

    except Exception as e:
        logger.error(f"Error initializing dubbing session: {e}")
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


def get_active_session_count(channel_id: str) -> int:
    """Get number of active sessions for a channel."""
    return len(_active_sessions.get(channel_id, set()))
