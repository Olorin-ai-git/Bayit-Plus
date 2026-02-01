"""
Generic AsyncEventBus base class.

Extracted common pattern from ChannelSTTManager for reuse across
transcript bus, highlights, search indexing, and other event-driven services.
"""

import asyncio
from typing import Generic, TypeVar

from app.core.logging_config import get_logger

logger = get_logger(__name__)

T = TypeVar("T")


class AsyncEventBus(Generic[T]):
    """Generic async event bus with queue-per-subscriber pattern.

    Thread-safe, memory-efficient event distribution with:
    - Per-subscriber queues with configurable size
    - Non-blocking publish (drops on full queue)
    - Dead subscriber cleanup
    - Subscriber count tracking
    """

    def __init__(self, name: str, default_queue_size: int = 100):
        """Initialize event bus.

        Args:
            name: Bus name for logging
            default_queue_size: Default queue size for new subscribers
        """
        self._name = name
        self._default_queue_size = default_queue_size
        self._subscribers: dict[str, asyncio.Queue[T]] = {}
        self._lock = asyncio.Lock()
        logger.info(
            "AsyncEventBus initialized",
            extra={"bus_name": name, "default_queue_size": default_queue_size},
        )

    async def subscribe(
        self, subscriber_id: str, queue_size: int | None = None
    ) -> asyncio.Queue[T]:
        """Subscribe to receive events.

        Args:
            subscriber_id: Unique subscriber identifier
            queue_size: Optional custom queue size (uses default if None)

        Returns:
            Queue to receive events from
        """
        async with self._lock:
            if subscriber_id in self._subscribers:
                logger.debug(
                    "Subscriber already exists, returning existing queue",
                    extra={"bus_name": self._name, "subscriber_id": subscriber_id},
                )
                return self._subscribers[subscriber_id]

            size = queue_size if queue_size is not None else self._default_queue_size
            queue: asyncio.Queue[T] = asyncio.Queue(maxsize=size)
            self._subscribers[subscriber_id] = queue

            logger.info(
                "Subscriber added",
                extra={
                    "bus_name": self._name,
                    "subscriber_id": subscriber_id,
                    "queue_size": size,
                    "total_subscribers": len(self._subscribers),
                },
            )
            return queue

    async def unsubscribe(self, subscriber_id: str) -> None:
        """Unsubscribe from events.

        Args:
            subscriber_id: Subscriber identifier to remove
        """
        async with self._lock:
            if subscriber_id not in self._subscribers:
                logger.debug(
                    "Subscriber not found for unsubscribe",
                    extra={"bus_name": self._name, "subscriber_id": subscriber_id},
                )
                return

            del self._subscribers[subscriber_id]
            logger.info(
                "Subscriber removed",
                extra={
                    "bus_name": self._name,
                    "subscriber_id": subscriber_id,
                    "remaining_subscribers": len(self._subscribers),
                },
            )

    def publish_nowait(self, event: T) -> int:
        """Publish event to all subscribers (non-blocking).

        Drops events for subscribers with full queues.

        Args:
            event: Event to publish

        Returns:
            Number of subscribers that received the event
        """
        delivered = 0
        dropped = 0

        for subscriber_id, queue in list(self._subscribers.items()):
            try:
                queue.put_nowait(event)
                delivered += 1
            except asyncio.QueueFull:
                dropped += 1
                logger.warning(
                    "Queue full, dropping event",
                    extra={
                        "bus_name": self._name,
                        "subscriber_id": subscriber_id,
                    },
                )

        if dropped > 0:
            logger.warning(
                "Events dropped due to full queues",
                extra={
                    "bus_name": self._name,
                    "delivered": delivered,
                    "dropped": dropped,
                },
            )

        return delivered

    async def cleanup_dead_subscribers(self, dead_ids: list[str]) -> None:
        """Remove dead subscribers.

        Args:
            dead_ids: List of subscriber IDs to remove
        """
        if not dead_ids:
            return

        async with self._lock:
            for subscriber_id in dead_ids:
                if subscriber_id in self._subscribers:
                    del self._subscribers[subscriber_id]

            logger.info(
                "Cleaned up dead subscribers",
                extra={
                    "bus_name": self._name,
                    "removed_count": len(dead_ids),
                    "remaining_subscribers": len(self._subscribers),
                },
            )

    def get_subscriber_count(self) -> int:
        """Get current subscriber count.

        Returns:
            Number of active subscribers
        """
        return len(self._subscribers)

    def get_subscriber_ids(self) -> list[str]:
        """Get list of subscriber IDs.

        Returns:
            List of active subscriber identifiers
        """
        return list(self._subscribers.keys())

    async def clear(self) -> None:
        """Remove all subscribers."""
        async with self._lock:
            count = len(self._subscribers)
            self._subscribers.clear()
            logger.info(
                "Cleared all subscribers",
                extra={"bus_name": self._name, "cleared_count": count},
            )
