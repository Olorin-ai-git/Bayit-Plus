"""
Async Redis Client for Olorin Platform

Provides connection pooling and session state management.
"""

import json
import logging
from typing import Optional

from redis.asyncio import ConnectionPool, Redis

logger = logging.getLogger(__name__)


class AsyncRedisClient:
    """Async Redis client with connection pooling for session state."""

    def __init__(
        self, redis_url: str = "redis://localhost:6379/0", max_connections: int = 50
    ):
        """
        Initialize Redis client (lazy connection).

        Args:
            redis_url: Redis connection URL
            max_connections: Max connections in pool
        """
        self.redis_url = redis_url
        self.max_connections = max_connections
        self._pool: Optional[ConnectionPool] = None
        self._client: Optional[Redis] = None

    async def connect(self) -> None:
        """
        Initialize Redis connection pool.

        Note: This is now non-blocking. If Redis is unavailable, the client will
        continue without caching/session features rather than crashing the application.
        """
        if self._pool is None:
            try:
                self._pool = ConnectionPool.from_url(
                    self.redis_url,
                    max_connections=self.max_connections,
                    decode_responses=True,
                )
                self._client = Redis(connection_pool=self._pool)

                # Test connection
                await self._client.ping()
                logger.info(f"✅ Redis connected: {self.redis_url}")
            except Exception as e:
                logger.warning(
                    f"⚠️  Redis unavailable ({e}). "
                    "Continuing without session persistence/caching. "
                    "To enable Redis features, start Redis: brew services start redis"
                )
                # Don't raise - allow application to continue without Redis
                self._client = None
                self._pool = None

    async def close(self) -> None:
        """Close Redis connection."""
        if self._client:
            try:
                await self._client.close()
            except Exception as e:
                logger.warning(f"Error closing Redis: {e}")

        if self._pool:
            try:
                await self._pool.disconnect()
            except Exception as e:
                logger.warning(f"Error disconnecting pool: {e}")

        self._client = None
        self._pool = None

    async def set_with_ttl(self, key: str, value: dict, ttl_seconds: int) -> None:
        """
        Set key with TTL (expiration).

        Args:
            key: Redis key
            value: Dictionary to store
            ttl_seconds: Time-to-live in seconds
        """
        if not self._client:
            await self.connect()

        # Skip silently if Redis is unavailable (non-blocking)
        if not self._client:
            return

        try:
            json_value = json.dumps(value)
            await self._client.setex(key, ttl_seconds, json_value)
        except Exception as e:
            logger.error(f"Error setting key {key}: {e}")
            # Don't raise - allow operation to continue

    async def get(self, key: str) -> Optional[dict]:
        """
        Get value by key.

        Args:
            key: Redis key

        Returns:
            Deserialized dictionary or None
        """
        if not self._client:
            await self.connect()

        try:
            value = await self._client.get(key)
            return json.loads(value) if value else None
        except Exception as e:
            logger.error(f"Error getting key {key}: {e}")
            return None

    async def delete(self, key: str) -> None:
        """
        Delete key from Redis.

        Args:
            key: Redis key to delete
        """
        if not self._client:
            await self.connect()

        # Skip silently if Redis is unavailable (non-blocking)
        if not self._client:
            return

        try:
            await self._client.delete(key)
        except Exception as e:
            logger.error(f"Error deleting key {key}: {e}")

    async def exists(self, key: str) -> bool:
        """
        Check if key exists.

        Args:
            key: Redis key

        Returns:
            True if key exists, False otherwise (or if Redis unavailable)
        """
        if not self._client:
            await self.connect()

        # Return False if Redis is unavailable (non-blocking)
        if not self._client:
            return False

        try:
            result = await self._client.exists(key)
            return result > 0
        except Exception as e:
            logger.error(f"Error checking existence of key {key}: {e}")
            return False

    async def increment_counter(
        self, key: str, amount: int = 1, ttl_seconds: int = 3600
    ) -> int:
        """
        Increment a counter key (for rate limiting, metering).

        Args:
            key: Redis key for counter
            amount: Amount to increment
            ttl_seconds: Expiration time (set only on creation)

        Returns:
            New counter value (or 0 if Redis unavailable)
        """
        if not self._client:
            await self.connect()

        # Return 0 if Redis is unavailable (non-blocking)
        if not self._client:
            logger.debug(f"Redis unavailable, cannot increment counter {key}")
            return 0

        try:
            # Increment the counter
            new_value = await self._client.incrby(key, amount)

            # Set TTL on first creation (if value equals amount)
            if new_value == amount:
                await self._client.expire(key, ttl_seconds)

            return new_value
        except Exception as e:
            logger.error(f"Error incrementing counter {key}: {e}")
            # Don't raise - return 0 to allow operation to continue
            return 0

    async def get_counter(self, key: str) -> int:
        """
        Get counter value.

        Args:
            key: Redis key for counter

        Returns:
            Counter value or 0 if not exists (or if Redis unavailable)
        """
        if not self._client:
            await self.connect()

        # Return 0 if Redis is unavailable (non-blocking)
        if not self._client:
            return 0

        try:
            value = await self._client.get(key)
            return int(value) if value else 0
        except Exception as e:
            logger.error(f"Error getting counter {key}: {e}")
            return 0

    @property
    def is_connected(self) -> bool:
        """Check if Redis client is connected."""
        return self._client is not None


# Global singleton instance
_redis_client: Optional[AsyncRedisClient] = None


async def get_redis_client(
    redis_url: str = "redis://localhost:6379/0",
    max_connections: int = 50,
) -> AsyncRedisClient:
    """
    Get or initialize the global Redis client.

    Note: This is now non-blocking. If Redis is unavailable, the client will
    be created but operations will gracefully skip rather than crash.

    Args:
        redis_url: Redis connection URL
        max_connections: Max connections in pool

    Returns:
        AsyncRedisClient instance (may be disconnected if Redis unavailable)
    """
    global _redis_client

    if _redis_client is None:
        _redis_client = AsyncRedisClient(redis_url, max_connections)
        # connect() is now non-blocking - won't raise if Redis unavailable
        await _redis_client.connect()

    return _redis_client


async def close_redis_client() -> None:
    """Close the global Redis client."""
    global _redis_client

    if _redis_client:
        await _redis_client.close()
        _redis_client = None
