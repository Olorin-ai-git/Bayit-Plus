"""
Query Cache with LRU Eviction Policy.

Implements Least Recently Used (LRU) caching for query translations.
Tracks cache hits, misses, and provides performance metrics.

Constitutional Compliance:
- NO hardcoded cache size - configurable
- Complete LRU implementation
- Thread-safe operations
"""

import threading
from collections import OrderedDict
from typing import Any, Dict, Optional

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class QueryCache:
    """LRU cache for query translations with hit/miss tracking."""

    def __init__(self, max_size: int = 1000):
        """
        Initialize query cache.

        Args:
            max_size: Maximum number of cached items (must be > 0)

        Raises:
            ValueError: If max_size is <= 0
        """
        if max_size <= 0:
            raise ValueError(f"Cache max_size must be > 0, got {max_size}")

        self.max_size = max_size
        self._cache: OrderedDict[str, str] = OrderedDict()
        self._lock = threading.RLock()
        self.hit_count = 0
        self.miss_count = 0

        logger.info(f"QueryCache initialized with max_size={max_size}")

    def get(self, query: str) -> Optional[str]:
        """
        Get cached translation for query.

        Args:
            query: Query to look up

        Returns:
            Cached translation or None if not found
        """
        with self._lock:
            normalized_key = self._normalize_key(query)

            if normalized_key in self._cache:
                # Move to end (most recently used)
                self._cache.move_to_end(normalized_key)
                self.hit_count += 1
                logger.debug(f"Cache HIT for query (length={len(query)})")
                return self._cache[normalized_key]
            else:
                self.miss_count += 1
                logger.debug(f"Cache MISS for query (length={len(query)})")
                return None

    def put(self, query: str, translation: str):
        """
        Store query translation in cache.

        Args:
            query: Original query
            translation: Translated query
        """
        with self._lock:
            normalized_key = self._normalize_key(query)

            # If key exists, update it and move to end
            if normalized_key in self._cache:
                self._cache[normalized_key] = translation
                self._cache.move_to_end(normalized_key)
            else:
                # Add new entry
                self._cache[normalized_key] = translation

                # Evict least recently used if over capacity
                if len(self._cache) > self.max_size:
                    evicted_key = next(iter(self._cache))
                    del self._cache[evicted_key]
                    logger.debug(f"Cache evicted LRU entry (size={len(self._cache)})")

    def clear(self):
        """Clear all cached items and reset metrics."""
        with self._lock:
            self._cache.clear()
            self.hit_count = 0
            self.miss_count = 0
            logger.info("Cache cleared")

    def size(self) -> int:
        """
        Get current number of cached items.

        Returns:
            Number of items in cache
        """
        with self._lock:
            return len(self._cache)

    def get_hit_rate(self) -> float:
        """
        Calculate cache hit rate.

        Returns:
            Hit rate as decimal (0.0 to 1.0)
        """
        with self._lock:
            total_requests = self.hit_count + self.miss_count
            if total_requests == 0:
                return 0.0
            return self.hit_count / total_requests

    def get_stats(self) -> Dict[str, Any]:
        """
        Get comprehensive cache statistics.

        Returns:
            Dictionary with cache metrics
        """
        with self._lock:
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "hit_count": self.hit_count,
                "miss_count": self.miss_count,
                "hit_rate": self.get_hit_rate(),
                "total_requests": self.hit_count + self.miss_count,
            }

    def _normalize_key(self, query: str) -> str:
        """
        Normalize query for use as cache key.

        Normalizes whitespace to ensure queries with different
        whitespace patterns map to same cache entry.

        Args:
            query: SQL query

        Returns:
            Normalized query key
        """
        # Collapse multiple spaces into single space
        # Trim leading/trailing whitespace
        return " ".join(query.split())
