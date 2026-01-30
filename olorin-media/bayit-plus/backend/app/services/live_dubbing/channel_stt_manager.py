"""
ChannelSTTManager - Shared STT Connection Per Channel

Manages a single STT (Speech-To-Text) connection per live channel.
Broadcasts transcripts to ALL subscribed user sessions.

Cost Impact: 99% reduction in STT connections
- Before: 100 users = 100 STT connections to ElevenLabs ($$$)
- After: 100 users = 1 STT connection to ElevenLabs ($)

Each channel:
- Maintains ONE active STT connection
- Broadcasts transcripts to all subscribers
- Auto-starts on first subscriber
- Auto-stops when no subscribers remain
"""

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import AsyncIterator, Dict, Optional

from app.services.olorin.dubbing.stt_provider import get_stt_provider

logger = logging.getLogger(__name__)


@dataclass
class TranscriptMessage:
    """Transcript from STT to be broadcast to all sessions."""

    text: str
    language: str
    timestamp_ms: int


class ChannelSTTManager:
    """
    Manages a single STT connection per live channel.

    Broadcasts transcripts to all subscribed user sessions.
    Automatically starts/stops STT connection based on subscriber count.
    """

    def __init__(self, channel_id: str, source_language: str):
        """
        Initialize STT manager for a channel.

        Args:
            channel_id: Unique identifier for the live channel
            source_language: Source audio language (e.g., "he", "en")
        """
        self.channel_id = channel_id
        self.source_language = source_language

        # Subscribers: session_id -> transcript queue
        self._subscribers: Dict[str, asyncio.Queue[TranscriptMessage]] = {}
        self._subscriber_lock = asyncio.Lock()

        # STT provider (lazily initialized)
        self._stt_provider = None
        self._is_running = False
        self._broadcast_task: Optional[asyncio.Task] = None

        logger.info(
            f"ChannelSTTManager initialized: channel={channel_id}, "
            f"source_lang={source_language}"
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

    async def send_audio_chunk(self, audio_data: bytes) -> None:
        """
        Send audio chunk to STT provider.

        Args:
            audio_data: Binary audio data (16kHz mono PCM)
        """
        if not self._is_running or not self._stt_provider:
            logger.debug(
                f"STT not running for channel {self.channel_id}, "
                f"ignoring audio chunk"
            )
            return

        try:
            await self._stt_provider.send_audio_chunk(audio_data)
        except Exception as e:
            logger.error(f"Error sending audio to STT: {e}")

    async def _start_stt_broadcast(self) -> None:
        """Start STT connection and broadcast loop."""
        try:
            # Initialize STT provider
            self._stt_provider = get_stt_provider()

            # Connect to STT service
            await self._stt_provider.connect(self.source_language)
            self._is_running = True

            # Start broadcast task
            self._broadcast_task = asyncio.create_task(self._broadcast_loop())

            logger.info(
                f"STT broadcast started for channel {self.channel_id} "
                f"(source_lang={self.source_language})"
            )

        except Exception as e:
            logger.error(
                f"Failed to start STT broadcast for channel {self.channel_id}: {e}"
            )
            self._is_running = False

    async def _stop_stt_broadcast(self) -> None:
        """Stop STT connection and broadcast loop."""
        self._is_running = False

        # Cancel broadcast task
        if self._broadcast_task:
            self._broadcast_task.cancel()
            try:
                await self._broadcast_task
            except asyncio.CancelledError:
                pass
            self._broadcast_task = None

        # Close STT provider
        if self._stt_provider:
            try:
                await self._stt_provider.close()
            except Exception as e:
                logger.warning(f"Error closing STT provider: {e}")
            self._stt_provider = None

        logger.info(f"STT broadcast stopped for channel {self.channel_id}")

    async def _broadcast_loop(self) -> None:
        """Receive transcripts from STT and broadcast to all subscribers."""
        if not self._stt_provider:
            logger.error(f"STT provider not initialized for channel {self.channel_id}")
            return

        try:
            async for text, language in self._stt_provider.receive_transcripts():
                if not self._is_running:
                    break

                # Create transcript message with timestamp
                message = TranscriptMessage(
                    text=text,
                    language=language,
                    timestamp_ms=int(datetime.now(timezone.utc).timestamp() * 1000),
                )

                # Broadcast to all subscribers
                async with self._subscriber_lock:
                    dead_subscribers = []

                    for session_id, queue in self._subscribers.items():
                        try:
                            # Non-blocking put (drop if queue full)
                            queue.put_nowait(message)
                        except asyncio.QueueFull:
                            logger.warning(
                                f"Queue full for session {session_id}, "
                                f"dropping transcript"
                            )
                        except Exception as e:
                            logger.error(
                                f"Error broadcasting to session {session_id}: {e}"
                            )
                            dead_subscribers.append(session_id)

                    # Remove dead subscribers
                    for session_id in dead_subscribers:
                        del self._subscribers[session_id]
                        logger.warning(
                            f"Removed dead subscriber {session_id} "
                            f"from channel {self.channel_id}"
                        )

                    # Stop if no subscribers left
                    if not self._subscribers and self._is_running:
                        logger.info(
                            f"All subscribers disconnected from channel {self.channel_id}, "
                            f"stopping broadcast"
                        )
                        await self._stop_stt_broadcast()
                        break

        except asyncio.CancelledError:
            logger.info(f"Broadcast loop cancelled for channel {self.channel_id}")
        except Exception as e:
            logger.error(f"Broadcast loop error for channel {self.channel_id}: {e}")
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
    channel_id: str, source_language: str
) -> ChannelSTTManager:
    """
    Get or create a ChannelSTTManager for a live channel.

    Args:
        channel_id: Unique channel identifier
        source_language: Source audio language

    Returns:
        ChannelSTTManager instance
    """
    async with _manager_lock:
        if channel_id not in _channel_managers:
            _channel_managers[channel_id] = ChannelSTTManager(
                channel_id, source_language
            )
            logger.info(f"Created new ChannelSTTManager for channel {channel_id}")

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
            logger.info(f"Cleaned up ChannelSTTManager for channel {channel_id}")


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
