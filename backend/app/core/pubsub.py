"""
Redis Pub/Sub Manager for cross-instance WebSocket messaging.

Provides publish/subscribe capabilities backed by Redis for broadcasting
messages across multiple Cloud Run instances. Degrades gracefully when
Redis is unavailable (same as single-instance in-memory behavior).
"""

import asyncio
import json
import logging
from typing import Any, Awaitable, Callable, Dict, Optional

from redis.asyncio import ConnectionPool, Redis
from redis.exceptions import ConnectionError as RedisConnectionError
from redis.exceptions import RedisError

from app.core.config import settings

logger = logging.getLogger(__name__)

MessageHandler = Callable[[str, dict], Awaitable[None]]


class PubSubManager:
    """
    Redis pub/sub manager for cross-instance WebSocket message delivery.

    Maintains background subscriber tasks that route Redis channel messages
    to registered handlers. Auto-reconnects with exponential backoff on
    connection loss. Degrades to no-op when Redis is unavailable.
    """

    def __init__(self, redis_url: str = ""):
        self._redis_url = redis_url or settings.REDIS_URL
        self._pool: Optional[ConnectionPool] = None
        self._pub_client: Optional[Redis] = None
        self._sub_client: Optional[Redis] = None
        self._pubsub: Optional[Any] = None
        self._handlers: Dict[str, MessageHandler] = {}
        self._listener_task: Optional[asyncio.Task] = None
        self._connected = False
        self._shutting_down = False
        self._reconnect_delay = 1.0
        self._max_reconnect_delay = 30.0

    async def connect(self) -> None:
        """Initialize Redis connections for pub and sub clients."""
        if not self._redis_url:
            logger.warning(
                "PubSubManager: REDIS_URL not configured. "
                "Cross-instance messaging disabled (local-only mode)."
            )
            return

        try:
            self._pool = ConnectionPool.from_url(
                self._redis_url,
                max_connections=20,
                decode_responses=True,
            )
            self._pub_client = Redis(connection_pool=self._pool)
            self._sub_client = Redis(connection_pool=self._pool)

            await self._pub_client.ping()
            self._connected = True
            self._reconnect_delay = 1.0
            logger.info("PubSubManager: Redis connected for pub/sub")
        except (RedisConnectionError, RedisError, OSError) as exc:
            logger.warning(
                "PubSubManager: Redis unavailable (%s). "
                "Operating in local-only mode (no cross-instance messaging).",
                exc,
            )
            self._connected = False

    async def close(self) -> None:
        """Shut down pub/sub connections and background tasks."""
        self._shutting_down = True

        if self._listener_task and not self._listener_task.done():
            self._listener_task.cancel()
            try:
                await self._listener_task
            except asyncio.CancelledError:
                pass

        if self._pubsub:
            try:
                await self._pubsub.unsubscribe()
                await self._pubsub.close()
            except Exception as exc:
                logger.warning("PubSubManager: Error closing pubsub: %s", exc)

        if self._pub_client:
            try:
                await self._pub_client.close()
            except Exception as exc:
                logger.warning("PubSubManager: Error closing pub client: %s", exc)

        if self._sub_client:
            try:
                await self._sub_client.close()
            except Exception as exc:
                logger.warning("PubSubManager: Error closing sub client: %s", exc)

        if self._pool:
            try:
                await self._pool.disconnect()
            except Exception as exc:
                logger.warning("PubSubManager: Error disconnecting pool: %s", exc)

        self._connected = False
        self._handlers.clear()
        logger.info("PubSubManager: Shut down complete")

    async def publish(self, channel: str, message: dict) -> bool:
        """
        Publish a message to a Redis channel.

        Returns True if published, False if Redis unavailable (no-op).
        """
        if not self._connected or not self._pub_client:
            return False

        try:
            payload = json.dumps(message)
            await self._pub_client.publish(channel, payload)
            return True
        except (RedisConnectionError, RedisError) as exc:
            logger.warning(
                "PubSubManager: Publish failed on channel %s: %s", channel, exc
            )
            self._connected = False
            asyncio.create_task(self._reconnect())
            return False

    async def subscribe(self, channel: str, handler: MessageHandler) -> None:
        """
        Subscribe to a Redis channel with a message handler callback.

        The handler receives (channel: str, message: dict) for each message.
        If Redis is unavailable, the handler is registered but inactive
        until reconnection succeeds.
        """
        self._handlers[channel] = handler
        logger.info("PubSubManager: Registered handler for channel %s", channel)

        if self._connected and self._sub_client:
            await self._ensure_listener()

    async def unsubscribe(self, channel: str) -> None:
        """Unsubscribe from a Redis channel."""
        self._handlers.pop(channel, None)

        if self._pubsub and self._connected:
            try:
                await self._pubsub.unsubscribe(channel)
            except (RedisConnectionError, RedisError) as exc:
                logger.warning(
                    "PubSubManager: Unsubscribe failed for %s: %s", channel, exc
                )

    async def _ensure_listener(self) -> None:
        """Start or restart the background listener task."""
        if self._listener_task and not self._listener_task.done():
            # Listener already running; re-subscribe to pick up new channels
            if self._pubsub:
                channels = list(self._handlers.keys())
                if channels:
                    await self._pubsub.subscribe(*channels)
            return

        self._listener_task = asyncio.create_task(self._listen_loop())

    async def _listen_loop(self) -> None:
        """Background loop that reads messages from Redis pub/sub."""
        while not self._shutting_down:
            try:
                if not self._sub_client:
                    await asyncio.sleep(self._reconnect_delay)
                    continue

                self._pubsub = self._sub_client.pubsub()
                channels = list(self._handlers.keys())
                if not channels:
                    await asyncio.sleep(1.0)
                    continue

                await self._pubsub.subscribe(*channels)
                logger.info(
                    "PubSubManager: Listening on %d channel(s)", len(channels)
                )

                async for raw_message in self._pubsub.listen():
                    if self._shutting_down:
                        break

                    if raw_message["type"] != "message":
                        continue

                    channel = raw_message["channel"]
                    handler = self._handlers.get(channel)
                    if not handler:
                        continue

                    try:
                        data = json.loads(raw_message["data"])
                        await handler(channel, data)
                    except json.JSONDecodeError:
                        logger.warning(
                            "PubSubManager: Invalid JSON on channel %s", channel
                        )
                    except Exception as exc:
                        logger.error(
                            "PubSubManager: Handler error on channel %s: %s",
                            channel,
                            exc,
                            exc_info=True,
                        )

            except asyncio.CancelledError:
                break
            except (RedisConnectionError, RedisError, OSError) as exc:
                if self._shutting_down:
                    break
                logger.warning(
                    "PubSubManager: Listener disconnected: %s. "
                    "Reconnecting in %.1fs...",
                    exc,
                    self._reconnect_delay,
                )
                self._connected = False
                await asyncio.sleep(self._reconnect_delay)
                await self._reconnect()

    async def _reconnect(self) -> None:
        """Reconnect with exponential backoff."""
        if self._shutting_down or self._connected:
            return

        try:
            if self._pub_client:
                await self._pub_client.ping()
            self._connected = True
            self._reconnect_delay = 1.0
            logger.info("PubSubManager: Reconnected to Redis")

            if self._handlers:
                await self._ensure_listener()
        except (RedisConnectionError, RedisError, OSError):
            self._reconnect_delay = min(
                self._reconnect_delay * 2, self._max_reconnect_delay
            )

    @property
    def is_connected(self) -> bool:
        """Whether Redis pub/sub is actively connected."""
        return self._connected


# Module-level singleton
_pubsub_manager: Optional[PubSubManager] = None


async def get_pubsub_manager() -> PubSubManager:
    """Get or create the global PubSubManager singleton."""
    global _pubsub_manager
    if _pubsub_manager is None:
        _pubsub_manager = PubSubManager()
        await _pubsub_manager.connect()
    return _pubsub_manager


async def close_pubsub_manager() -> None:
    """Shut down the global PubSubManager."""
    global _pubsub_manager
    if _pubsub_manager:
        await _pubsub_manager.close()
        _pubsub_manager = None
