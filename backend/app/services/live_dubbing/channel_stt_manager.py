"""
ChannelSTTManager - Shared STT Connection Per Channel

Manages a single STT (Speech-To-Text) connection per live channel.
Broadcasts transcripts to ALL subscribed user sessions.

Cost Impact: 99% reduction in STT connections
- Before: 100 users = 100 STT connections to ElevenLabs ($$$)
- After: 100 users = 1 STT connection to ElevenLabs ($)

Each channel:
- Maintains ONE active STT connection
- Captures audio from HLS stream server-side (no CORS issues)
- Broadcasts transcripts to all subscribers
- Auto-starts on first subscriber
- Auto-stops when no subscribers remain
- Publishes to TranscriptEventBus for downstream consumers
"""

import asyncio
import time
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Optional

from app.core.logging_config import get_logger
from app.services.live_dubbing.stream_audio_capture import (
    StreamAudioCapture,
    StreamAudioCaptureError,
)
from app.services.olorin.dubbing.stt_provider import get_stt_provider
from app.services.transcript_bus import TranscriptEvent, get_transcript_bus

logger = get_logger(__name__)


@dataclass
class TranscriptMessage:
    """Transcript from STT to be broadcast to all sessions."""

    text: str
    language: str
    timestamp_ms: int


class ChannelSTTManager:
    """
    Manages a single STT connection per live channel.

    Uses backend-side audio capture from HLS streams (no CORS issues).
    Broadcasts transcripts to all subscribed user sessions.
    Automatically starts/stops STT connection based on subscriber count.
    """

    def __init__(self, channel_id: str, source_language: str, stream_url: str):
        """
        Initialize STT manager for a channel.

        Args:
            channel_id: Unique identifier for the live channel
            source_language: Source audio language (e.g., "he", "en")
            stream_url: HLS stream URL for audio capture
        """
        self.channel_id = channel_id
        self.source_language = source_language
        self.stream_url = stream_url

        # Subscribers: session_id -> transcript queue
        self._subscribers: Dict[str, asyncio.Queue[TranscriptMessage]] = {}
        self._subscriber_lock = asyncio.Lock()

        # STT provider (lazily initialized)
        self._stt_provider = None
        self._is_running = False
        self._broadcast_task: Optional[asyncio.Task] = None
        self._audio_capture_task: Optional[asyncio.Task] = None
        self._audio_capture: Optional[StreamAudioCapture] = None

        logger.info(
            f"ChannelSTTManager initialized: channel={channel_id}, "
            f"source_lang={source_language}, stream_url={stream_url[:50]}..."
        )

    async def subscribe(self, session_id: str) -> asyncio.Queue[TranscriptMessage]:
        """
        Subscribe a session to receive transcripts.

        Automatically starts STT connection if this is the first subscriber.

        Args:
            session_id: Unique session identifier

        Returns:
            Queue to receive TranscriptMessage objects
        """
        async with self._subscriber_lock:
            # Return existing queue if already subscribed
            if session_id in self._subscribers:
                logger.debug(
                    f"Session {session_id} already subscribed to channel {self.channel_id}"
                )
                return self._subscribers[session_id]

            # Create new queue for session
            queue: asyncio.Queue[TranscriptMessage] = asyncio.Queue(maxsize=100)
            self._subscribers[session_id] = queue

            logger.info(
                f"Session {session_id} subscribed to channel {self.channel_id} "
                f"({len(self._subscribers)} subscribers)"
            )

            # Start STT broadcast if first subscriber
            if len(self._subscribers) == 1 and not self._is_running:
                logger.info(
                    f"Starting STT broadcast for channel {self.channel_id} "
                    f"(first subscriber)"
                )
                await self._start_stt_broadcast()

            return queue

    async def unsubscribe(self, session_id: str) -> None:
        """
        Unsubscribe a session.

        Automatically stops STT connection if no subscribers remain.

        Args:
            session_id: Unique session identifier
        """
        async with self._subscriber_lock:
            if session_id not in self._subscribers:
                logger.debug(
                    f"Session {session_id} not subscribed to channel {self.channel_id}"
                )
                return

            del self._subscribers[session_id]

            logger.info(
                f"Session {session_id} unsubscribed from channel {self.channel_id} "
                f"({len(self._subscribers)} subscribers remain)"
            )

            # Stop STT broadcast if no more subscribers
            if len(self._subscribers) == 0 and self._is_running:
                logger.info(
                    f"Stopping STT broadcast for channel {self.channel_id} "
                    f"(no subscribers)"
                )
                await self._stop_stt_broadcast()

    async def _start_stt_broadcast(self) -> None:
        """Start audio capture, STT connection, and broadcast loop."""
        try:
            # Initialize STT provider
            self._stt_provider = get_stt_provider()

            # Connect to STT service
            await self._stt_provider.connect(self.source_language)

            # Start backend audio capture from HLS stream
            self._audio_capture = StreamAudioCapture(
                stream_url=self.stream_url,
                channel_id=self.channel_id,
            )
            await self._audio_capture.start()

            self._is_running = True

            # Create channel on transcript event bus
            transcript_bus = get_transcript_bus()
            await transcript_bus.create_channel(self.channel_id)

            # Start audio capture task (feeds audio to STT)
            self._audio_capture_task = asyncio.create_task(
                self._audio_capture_loop()
            )

            # Start broadcast task (receives transcripts from STT)
            self._broadcast_task = asyncio.create_task(self._broadcast_loop())

            logger.info(
                "STT broadcast started with backend audio capture",
                extra={
                    "channel_id": self.channel_id,
                    "source_lang": self.source_language,
                    "stream_url": self.stream_url[:50],
                },
            )

        except StreamAudioCaptureError as e:
            logger.error(
                "Failed to start audio capture",
                extra={"channel_id": self.channel_id, "error": str(e)},
            )
            self._is_running = False
            await self._cleanup_resources()
        except Exception as e:
            logger.error(
                "Failed to start STT broadcast",
                extra={"channel_id": self.channel_id, "error": str(e)},
            )
            self._is_running = False
            await self._cleanup_resources()

    async def _audio_capture_loop(self) -> None:
        """Read audio chunks from stream and send to STT provider."""
        if not self._audio_capture or not self._stt_provider:
            return

        chunk_count = 0
        try:
            async for chunk in self._audio_capture.read_chunks():
                if not self._is_running:
                    break

                try:
                    await self._stt_provider.send_audio_chunk(chunk)
                    chunk_count += 1

                    # Log progress every 100 chunks (~10 seconds)
                    if chunk_count % 100 == 0:
                        logger.debug(
                            f"Audio capture progress: {chunk_count} chunks sent",
                            extra={"channel_id": self.channel_id},
                        )

                except Exception as e:
                    logger.error(
                        "Error sending audio to STT",
                        extra={
                            "channel_id": self.channel_id,
                            "error": str(e),
                            "chunk_count": chunk_count,
                        },
                    )
                    # Continue trying - STT might recover

        except asyncio.CancelledError:
            logger.info(
                "Audio capture loop cancelled",
                extra={"channel_id": self.channel_id, "chunks_sent": chunk_count},
            )
        except Exception as e:
            logger.error(
                "Audio capture loop error",
                extra={
                    "channel_id": self.channel_id,
                    "error": str(e),
                    "chunks_sent": chunk_count,
                },
            )

    async def _cleanup_resources(self) -> None:
        """Cleanup audio capture and STT resources."""
        # Stop audio capture
        if self._audio_capture:
            try:
                await self._audio_capture.stop()
            except Exception as e:
                logger.warning(
                    "Error stopping audio capture",
                    extra={"channel_id": self.channel_id, "error": str(e)},
                )
            self._audio_capture = None

        # Close STT provider
        if self._stt_provider:
            try:
                await self._stt_provider.close()
            except Exception as e:
                logger.warning(
                    "Error closing STT provider",
                    extra={"channel_id": self.channel_id, "error": str(e)},
                )
            self._stt_provider = None

    async def _stop_stt_broadcast(self) -> None:
        """Stop audio capture, STT connection, and broadcast loop."""
        self._is_running = False

        # End channel on transcript event bus (broadcasts channel_end event)
        transcript_bus = get_transcript_bus()
        await transcript_bus.end_channel(self.channel_id)

        # Cancel audio capture task
        if self._audio_capture_task:
            self._audio_capture_task.cancel()
            try:
                await self._audio_capture_task
            except asyncio.CancelledError:
                pass
            self._audio_capture_task = None

        # Cancel broadcast task
        if self._broadcast_task:
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except asyncio.CancelledError:
                pass
            self._broadcast_task = None

        # Cleanup resources
        await self._cleanup_resources()

        logger.info(
            "STT broadcast stopped",
            extra={"channel_id": self.channel_id},
        )

    async def _broadcast_loop(self) -> None:
        """Receive transcripts from STT and broadcast to all subscribers."""
        if not self._stt_provider:
            logger.error(
                "STT provider not initialized",
                extra={"channel_id": self.channel_id},
            )
            return

        transcript_bus = get_transcript_bus()

        try:
            async for text, language in self._stt_provider.receive_transcripts():
                if not self._is_running:
                    break

                current_time = time.time()
                timestamp_ms = int(current_time * 1000)

                # Create transcript message with timestamp
                message = TranscriptMessage(
                    text=text,
                    language=language,
                    timestamp_ms=timestamp_ms,
                )

                logger.debug(
                    f"Transcript received: {text[:50]}...",
                    extra={"channel_id": self.channel_id},
                )

                # Publish to TranscriptEventBus for downstream consumers
                event = TranscriptEvent(
                    channel_id=self.channel_id,
                    session_id="stt_source",
                    text=text,
                    text_translated=None,
                    source_lang=language,
                    target_lang="",
                    timestamp=current_time,
                    is_partial=False,
                    confidence=1.0,
                )
                transcript_bus.publish_nowait(self.channel_id, event)

                # Broadcast to all dubbing subscribers
                async with self._subscriber_lock:
                    dead_subscribers = []

                    for session_id, queue in self._subscribers.items():
                        try:
                            queue.put_nowait(message)
                        except asyncio.QueueFull:
                            logger.warning(
                                "Queue full, dropping transcript",
                                extra={
                                    "channel_id": self.channel_id,
                                    "session_id": session_id,
                                },
                            )
                        except Exception as e:
                            logger.error(
                                "Error broadcasting to session",
                                extra={
                                    "channel_id": self.channel_id,
                                    "session_id": session_id,
                                    "error": str(e),
                                },
                            )
                            dead_subscribers.append(session_id)

                    # Remove dead subscribers
                    for session_id in dead_subscribers:
                        del self._subscribers[session_id]
                        logger.warning(
                            "Removed dead subscriber",
                            extra={
                                "channel_id": self.channel_id,
                                "session_id": session_id,
                            },
                        )

                    # Stop if no subscribers left
                    if not self._subscribers and self._is_running:
                        logger.info(
                            "All subscribers disconnected, stopping broadcast",
                            extra={"channel_id": self.channel_id},
                        )
                        await self._stop_stt_broadcast()
                        break

        except asyncio.CancelledError:
            logger.info(
                "Broadcast loop cancelled",
                extra={"channel_id": self.channel_id},
            )
        except Exception as e:
            logger.error(
                "Broadcast loop error",
                extra={"channel_id": self.channel_id, "error": str(e)},
            )
            self._is_running = False

    def get_subscriber_count(self) -> int:
        """Get current number of subscribers."""
        return len(self._subscribers)

    def is_running(self) -> bool:
        """Check if STT broadcast is active."""
        return self._is_running


# Global registry of channel managers
_channel_managers: Dict[str, ChannelSTTManager] = {}
_manager_lock = asyncio.Lock()


async def get_channel_stt_manager(
    channel_id: str, source_language: str, stream_url: Optional[str] = None
) -> ChannelSTTManager:
    """
    Get or create a ChannelSTTManager for a live channel.

    Args:
        channel_id: Unique channel identifier
        source_language: Source audio language
        stream_url: HLS stream URL for audio capture (required for new managers)

    Returns:
        ChannelSTTManager instance

    Raises:
        ValueError: If stream_url not provided for new channel
    """
    async with _manager_lock:
        if channel_id not in _channel_managers:
            if not stream_url:
                # Try to get stream URL from channel
                from app.models.content import LiveChannel
                from beanie import PydanticObjectId

                try:
                    channel = await LiveChannel.get(PydanticObjectId(channel_id))
                    if channel and channel.stream_url:
                        stream_url = channel.stream_url
                    else:
                        raise ValueError(
                            f"No stream URL available for channel {channel_id}"
                        )
                except Exception as e:
                    raise ValueError(
                        f"Cannot get stream URL for channel {channel_id}: {e}"
                    )

            _channel_managers[channel_id] = ChannelSTTManager(
                channel_id, source_language, stream_url
            )
            logger.info(
                "Created new ChannelSTTManager with backend audio capture",
                extra={"channel_id": channel_id, "stream_url": stream_url[:50]},
            )

        return _channel_managers[channel_id]


async def cleanup_channel_manager(channel_id: str) -> None:
    """
    Remove a channel manager (called when last session disconnects).

    Args:
        channel_id: Unique channel identifier
    """
    async with _manager_lock:
        if channel_id in _channel_managers:
            manager = _channel_managers[channel_id]
            if manager.is_running():
                await manager._stop_stt_broadcast()
            del _channel_managers[channel_id]
            logger.info(
                "Cleaned up ChannelSTTManager",
                extra={"channel_id": channel_id},
            )


def get_channel_manager_stats() -> Dict[str, dict]:
    """
    Get statistics about all active channel managers.

    Returns:
        Dict mapping channel_id -> {"running": bool, "subscribers": int}
    """
    stats = {}
    for channel_id, manager in _channel_managers.items():
        stats[channel_id] = {
            "running": manager.is_running(),
            "subscribers": manager.get_subscriber_count(),
        }
    return stats
