"""
Redis client wrapper for caching Composio connection status and MaxMind scores.

This module provides a caching layer using the existing Redis infrastructure.
"""

import json
import logging
from typing import Any, Optional

from app.service.config import SvcSettings
from app.service.logging import get_bridge_logger
from app.service.redis_client import RedisCloudClient

logger = get_bridge_logger(__name__)


class CacheService:
    """
    Cache service wrapper for Redis-based caching.

    Provides methods for caching Composio connection status and MaxMind IP risk scores.
    """

    def __init__(self, redis_client: Optional[RedisCloudClient] = None):
        """
        Initialize cache service with Redis client.

        Args:
            redis_client: Optional Redis client instance. If not provided, creates new client.
        """
        if redis_client is None:
            settings = SvcSettings()
            redis_client = RedisCloudClient(settings)
        self.redis = redis_client
        self._client = None

    def _get_client(self):
        """Get Redis client instance."""
        if self._client is None:
            self._client = self.redis.get_client()
        return self._client

    def get(self, key: str) -> Optional[Any]:
        """
        Get cached value by key.

        Args:
            key: Cache key

        Returns:
            Cached value (deserialized from JSON) or None if not found
        """
        try:
            client = self._get_client()
            value = client.get(key)
            if value is None:
                return None
            # Try to deserialize JSON, fallback to string
            try:
                return json.loads(value)
            except (json.JSONDecodeError, TypeError):
                return value.decode() if isinstance(value, bytes) else value
        except Exception as e:
            logger.warning(f"Cache get error for key {key}: {e}")
            return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set cached value with optional TTL.

        Args:
            key: Cache key
            value: Value to cache (will be serialized to JSON if dict/list)
            ttl: Optional time-to-live in seconds

        Returns:
            True if successful, False otherwise
        """
        try:
            client = self._get_client()
            # Serialize to JSON if dict/list, otherwise convert to string
            if isinstance(value, (dict, list)):
                serialized = json.dumps(value)
            else:
                serialized = str(value)

            if ttl:
                return client.setex(key, ttl, serialized)
            else:
                return client.set(key, serialized)
        except Exception as e:
            logger.warning(f"Cache set error for key {key}: {e}")
            return False

    def delete(self, key: str) -> bool:
        """
        Delete cached value by key.

        Args:
            key: Cache key

        Returns:
            True if successful, False otherwise
        """
        try:
            client = self._get_client()
            return bool(client.delete(key))
        except Exception as e:
            logger.warning(f"Cache delete error for key {key}: {e}")
            return False

    def exists(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Args:
            key: Cache key

        Returns:
            True if key exists, False otherwise
        """
        try:
            client = self._get_client()
            return bool(client.exists(key))
        except Exception as e:
            logger.warning(f"Cache exists check error for key {key}: {e}")
            return False
