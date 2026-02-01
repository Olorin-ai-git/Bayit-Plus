"""
TranscriptEventBus - Channel-routed transcript event distribution.

Manages per-channel event buses for live transcript distribution
with lifecycle events and optional replay buffer for late joiners.
"""

import asyncio
import time
from collections import deque

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.event_bus.base import AsyncEventBus
from app.services.transcript_bus.models import TranscriptEvent

logger = get_logger(__name__)


class TranscriptEventBus:
    """Channel-routed transcript event bus.

    Features:
    - Per-channel event buses (isolated distribution)
    - Lifecycle events (channel_start, channel_end)
    - Replay buffer for late subscribers
    - Configurable queue sizes per consumer
    - Memory circuit breaker
    """

    def __init__(self):
        """Initialize transcript event bus."""
        config = settings.olorin.transcript_bus
        self._default_queue_size = config.default_queue_size
        self._replay_buffer_size = config.replay_buffer_size
        self._max_total_events = config.max_total_events
        self._cleanup_interval = config.cleanup_interval_seconds

        self._channels: dict[str, AsyncEventBus[TranscriptEvent]] = {}
        self._replay_buffers: dict[str, deque[TranscriptEvent]] = {}
        self._lock = asyncio.Lock()
        self._total_events = 0

        logger.info(
            "TranscriptEventBus initialized",
            extra={
                "default_queue_size": self._default_queue_size,
                "replay_buffer_size": self._replay_buffer_size,
                "max_total_events": self._max_total_events,
            },
        )

    async def create_channel(self, channel_id: str) -> None:
        """Create a new channel and broadcast channel_start event.

        Args:
            channel_id: Channel identifier
        """
        async with self._lock:
            if channel_id in self._channels:
                logger.debug(
                    "Channel already exists",
                    extra={"channel_id": channel_id},
                )
                return

            bus = AsyncEventBus[TranscriptEvent](
                name=f"transcript_{channel_id}",
                default_queue_size=self._default_queue_size,
            )
            self._channels[channel_id] = bus
            self._replay_buffers[channel_id] = deque(maxlen=self._replay_buffer_size)

            logger.info(
                "Channel created",
                extra={
                    "channel_id": channel_id,
                    "total_channels": len(self._channels),
                },
            )

        # Broadcast channel_start event
        start_event = TranscriptEvent(
            channel_id=channel_id,
            session_id="system",
            text="",
            text_translated=None,
            source_lang="",
            target_lang="",
            timestamp=time.time(),
            is_partial=False,
            confidence=1.0,
            event_type="channel_start",
        )
        self.publish_nowait(channel_id, start_event)

    async def end_channel(self, channel_id: str) -> None:
        """End a channel and broadcast channel_end event.

        Args:
            channel_id: Channel identifier
        """
        if channel_id not in self._channels:
            logger.debug(
                "Channel not found for end",
                extra={"channel_id": channel_id},
            )
            return

        # Broadcast channel_end event before cleanup
        end_event = TranscriptEvent(
            channel_id=channel_id,
            session_id="system",
            text="",
            text_translated=None,
            source_lang="",
            target_lang="",
            timestamp=time.time(),
            is_partial=False,
            confidence=1.0,
            event_type="channel_end",
        )
        self.publish_nowait(channel_id, end_event)

        # Cleanup channel resources
        async with self._lock:
            if channel_id in self._channels:
                bus = self._channels.pop(channel_id)
                await bus.clear()

            if channel_id in self._replay_buffers:
                buffer = self._replay_buffers.pop(channel_id)
                self._total_events -= len(buffer)

            logger.info(
                "Channel ended and cleaned up",
                extra={
                    "channel_id": channel_id,
                    "remaining_channels": len(self._channels),
                },
            )

    async def subscribe(
        self,
        channel_id: str,
        consumer_id: str,
        queue_size: int | None = None,
        with_replay: int = 0,
    ) -> asyncio.Queue[TranscriptEvent]:
        """Subscribe to a channel's transcript events.

        Args:
            channel_id: Channel to subscribe to
            consumer_id: Unique consumer identifier
            queue_size: Optional custom queue size
            with_replay: Number of recent events to replay (0 = no replay)

        Returns:
            Queue to receive TranscriptEvent objects

        Raises:
            ValueError: If channel doesn't exist
        """
        if channel_id not in self._channels:
            # Auto-create channel if not exists
            await self.create_channel(channel_id)

        bus = self._channels[channel_id]
        queue = await bus.subscribe(consumer_id, queue_size)

        # Replay recent events for late joiners
        if with_replay > 0 and channel_id in self._replay_buffers:
            buffer = self._replay_buffers[channel_id]
            replay_events = list(buffer)[-with_replay:]
            for event in replay_events:
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    break

            if replay_events:
                logger.debug(
                    "Replayed events to late subscriber",
                    extra={
                        "channel_id": channel_id,
                        "consumer_id": consumer_id,
                        "replayed_count": len(replay_events),
                    },
                )

        logger.info(
            "Subscribed to channel",
            extra={
                "channel_id": channel_id,
                "consumer_id": consumer_id,
                "with_replay": with_replay,
            },
        )
        return queue

    async def unsubscribe(self, channel_id: str, consumer_id: str) -> None:
        """Unsubscribe from a channel.

        Args:
            channel_id: Channel identifier
            consumer_id: Consumer identifier
        """
        if channel_id not in self._channels:
            return

        bus = self._channels[channel_id]
        await bus.unsubscribe(consumer_id)

        logger.info(
            "Unsubscribed from channel",
            extra={
                "channel_id": channel_id,
                "consumer_id": consumer_id,
            },
        )

    def publish_nowait(self, channel_id: str, event: TranscriptEvent) -> int:
        """Publish event to all channel subscribers (non-blocking).

        Args:
            channel_id: Channel to publish to
            event: Event to publish

        Returns:
            Number of subscribers that received the event
        """
        if channel_id not in self._channels:
            logger.debug(
                "Channel not found for publish",
                extra={"channel_id": channel_id},
            )
            return 0

        # Memory circuit breaker
        if self._total_events >= self._max_total_events:
            logger.error(
                "Memory circuit breaker triggered, dropping event",
                extra={
                    "channel_id": channel_id,
                    "total_events": self._total_events,
                    "max_total_events": self._max_total_events,
                },
            )
            return 0

        # Add to replay buffer (for late joiners)
        if event.event_type == "transcript" and channel_id in self._replay_buffers:
            buffer = self._replay_buffers[channel_id]
            # Track if we're at capacity (will evict oldest)
            was_full = len(buffer) >= buffer.maxlen if buffer.maxlen else False
            buffer.append(event)
            if not was_full:
                self._total_events += 1

        # Publish to subscribers
        bus = self._channels[channel_id]
        delivered = bus.publish_nowait(event)

        if event.event_type == "transcript":
            logger.debug(
                "Published transcript event",
                extra={
                    "channel_id": channel_id,
                    "delivered_to": delivered,
                    "text_length": len(event.text),
                },
            )

        return delivered

    def get_subscriber_count(self, channel_id: str) -> int:
        """Get subscriber count for a channel.

        Args:
            channel_id: Channel identifier

        Returns:
            Number of subscribers (0 if channel doesn't exist)
        """
        if channel_id not in self._channels:
            return 0
        return self._channels[channel_id].get_subscriber_count()

    def get_active_channels(self) -> list[str]:
        """Get list of active channel IDs.

        Returns:
            List of channel identifiers
        """
        return list(self._channels.keys())

    def get_stats(self) -> dict:
        """Get bus statistics.

        Returns:
            Dict with channel counts, subscriber counts, event counts
        """
        channel_stats = {}
        for channel_id, bus in self._channels.items():
            buffer_size = 0
            if channel_id in self._replay_buffers:
                buffer_size = len(self._replay_buffers[channel_id])
            channel_stats[channel_id] = {
                "subscribers": bus.get_subscriber_count(),
                "buffer_size": buffer_size,
            }

        return {
            "total_channels": len(self._channels),
            "total_events_buffered": self._total_events,
            "max_total_events": self._max_total_events,
            "channels": channel_stats,
        }
