"""
Multi-Entity Query Cache System

High-performance caching system for Boolean query results and investigation data
with TTL, LRU eviction, and intelligent cache warming strategies.
"""

import asyncio
import hashlib
import json
import time
from collections import OrderedDict
from dataclasses import dataclass
from datetime import datetime, timedelta
from threading import RLock
from typing import Any, Dict, List, Optional, Tuple

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


@dataclass
class CacheEntry:
    """Cache entry with metadata"""

    value: Any
    created_at: float
    last_accessed: float
    access_count: int
    ttl_seconds: float
    size_bytes: int

    def is_expired(self) -> bool:
        """Check if entry is expired based on TTL"""
        return time.time() - self.created_at > self.ttl_seconds

    def is_stale(self, staleness_threshold: float = 3600) -> bool:
        """Check if entry is stale (not accessed recently)"""
        return time.time() - self.last_accessed > staleness_threshold


class MultiEntityQueryCache:
    """
    High-performance cache for multi-entity queries with advanced features:

    - LRU eviction with intelligent cache warming
    - TTL-based expiration with sliding windows
    - Query complexity-based caching strategies
    - Memory usage monitoring and optimization
    - Hit rate analytics and cache performance metrics
    """

    def __init__(
        self,
        max_size: int = 1000,
        default_ttl: float = 3600,  # 1 hour default TTL
        max_memory_mb: int = 100,
    ):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.max_memory_bytes = max_memory_mb * 1024 * 1024

        # Thread-safe cache storage
        self._cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self._lock = RLock()

        # Cache statistics
        self._stats = {
            "hits": 0,
            "misses": 0,
            "evictions": 0,
            "memory_usage_bytes": 0,
            "avg_query_complexity": 0.0,
            "cache_warming_triggered": 0,
        }

        # Performance tracking
        self._performance_log = []
        self._last_cleanup = time.time()

        logger.info(
            f"MultiEntityQueryCache initialized (max_size: {max_size}, ttl: {default_ttl}s, max_memory: {max_memory_mb}MB)"
        )

    def _generate_cache_key(
        self,
        query_type: str,
        entities: List[str],
        boolean_logic: str,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate deterministic cache key for query parameters"""
        # Sort entities for consistent hashing
        sorted_entities = sorted(entities)

        # Create cache key components
        key_data = {
            "query_type": query_type,
            "entities": sorted_entities,
            "boolean_logic": boolean_logic.lower().strip(),
            "extra_params": extra_params or {},
        }

        # Generate hash
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.sha256(key_string.encode()).hexdigest()[:16]

    def _calculate_entry_size(self, value: Any) -> int:
        """Estimate memory size of cache entry"""
        try:
            return len(json.dumps(value, default=str).encode("utf-8"))
        except:
            # Fallback estimation
            return len(str(value)) * 2

    def _calculate_query_complexity(
        self, boolean_logic: str, entity_count: int
    ) -> float:
        """Calculate complexity score for query caching strategy"""
        # Base complexity from entity count
        complexity = entity_count * 0.1

        # Add complexity from Boolean operators
        logic_lower = boolean_logic.lower()
        complexity += logic_lower.count("and") * 0.5
        complexity += logic_lower.count("or") * 0.5
        complexity += logic_lower.count("not") * 0.3
        complexity += logic_lower.count("(") * 0.2  # Nesting complexity

        return complexity

    def _should_cache_query(self, complexity: float, entity_count: int) -> bool:
        """Determine if query should be cached based on complexity"""
        # Always cache complex queries (complexity > 2.0)
        if complexity > 2.0:
            return True

        # Cache queries with many entities (>= 5)
        if entity_count >= 5:
            return True

        # Cache moderately complex queries
        if complexity > 1.0:
            return True

        # Don't cache very simple queries
        return False

    def _evict_entries(self, bytes_needed: int = 0):
        """Evict cache entries using LRU + staleness strategy"""
        with self._lock:
            evicted_count = 0
            target_memory = self.max_memory_bytes - bytes_needed

            # First pass: Remove expired entries
            expired_keys = []
            for key, entry in self._cache.items():
                if entry.is_expired():
                    expired_keys.append(key)

            for key in expired_keys:
                entry = self._cache.pop(key)
                self._stats["memory_usage_bytes"] -= entry.size_bytes
                evicted_count += 1

            # Second pass: Remove stale entries if still over memory limit
            if self._stats["memory_usage_bytes"] > target_memory:
                stale_keys = []
                for key, entry in self._cache.items():
                    if entry.is_stale():
                        stale_keys.append(key)

                # Sort by access count (keep frequently accessed)
                stale_entries = [(key, self._cache[key]) for key in stale_keys]
                stale_entries.sort(key=lambda x: x[1].access_count)

                for key, entry in stale_entries:
                    if self._stats["memory_usage_bytes"] <= target_memory:
                        break
                    self._cache.pop(key)
                    self._stats["memory_usage_bytes"] -= entry.size_bytes
                    evicted_count += 1

            # Third pass: LRU eviction if still needed
            while (
                len(self._cache) > self.max_size
                or self._stats["memory_usage_bytes"] > target_memory
            ):
                if not self._cache:
                    break

                # Remove oldest entry (LRU)
                key, entry = self._cache.popitem(last=False)
                self._stats["memory_usage_bytes"] -= entry.size_bytes
                evicted_count += 1

            if evicted_count > 0:
                self._stats["evictions"] += evicted_count
                logger.debug(f"Evicted {evicted_count} cache entries")

    def put(
        self,
        query_type: str,
        entities: List[str],
        boolean_logic: str,
        result: Any,
        ttl: Optional[float] = None,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> bool:
        """
        Store query result in cache with intelligent caching strategy.

        Args:
            query_type: Type of query (e.g., "boolean_evaluation", "cross_entity_analysis")
            entities: List of entity IDs involved
            boolean_logic: Boolean expression used
            result: Query result to cache
            ttl: Custom TTL in seconds (optional)
            extra_params: Additional parameters for cache key generation

        Returns:
            True if cached successfully, False otherwise
        """
        try:
            # Calculate query complexity
            complexity = self._calculate_query_complexity(boolean_logic, len(entities))

            # Check if we should cache this query
            if not self._should_cache_query(complexity, len(entities)):
                return False

            # Generate cache key
            cache_key = self._generate_cache_key(
                query_type, entities, boolean_logic, extra_params
            )

            # Calculate entry size
            entry_size = self._calculate_entry_size(result)

            # Check if entry is too large
            if (
                entry_size > self.max_memory_bytes * 0.1
            ):  # Don't cache entries > 10% of max memory
                logger.warning(f"Query result too large to cache: {entry_size} bytes")
                return False

            with self._lock:
                # Evict entries if needed
                if (
                    entry_size + self._stats["memory_usage_bytes"]
                    > self.max_memory_bytes
                    or len(self._cache) >= self.max_size
                ):
                    self._evict_entries(entry_size)

                # Create cache entry
                now = time.time()
                entry = CacheEntry(
                    value=result,
                    created_at=now,
                    last_accessed=now,
                    access_count=1,
                    ttl_seconds=ttl or self.default_ttl,
                    size_bytes=entry_size,
                )

                # Store entry (OrderedDict moves to end)
                if cache_key in self._cache:
                    # Update existing entry
                    old_entry = self._cache.pop(cache_key)
                    self._stats["memory_usage_bytes"] -= old_entry.size_bytes

                self._cache[cache_key] = entry
                self._stats["memory_usage_bytes"] += entry_size

                # Update complexity tracking
                current_avg = self._stats["avg_query_complexity"]
                self._stats["avg_query_complexity"] = (current_avg * 0.9) + (
                    complexity * 0.1
                )

                logger.debug(
                    f"Cached query result (key: {cache_key}, size: {entry_size} bytes, complexity: {complexity:.2f})"
                )
                return True

        except Exception as e:
            logger.error(f"Failed to cache query result: {str(e)}")
            return False

    def get(
        self,
        query_type: str,
        entities: List[str],
        boolean_logic: str,
        extra_params: Optional[Dict[str, Any]] = None,
    ) -> Tuple[Any, bool]:
        """
        Retrieve cached query result.

        Args:
            query_type: Type of query
            entities: List of entity IDs involved
            boolean_logic: Boolean expression used
            extra_params: Additional parameters for cache key generation

        Returns:
            Tuple of (result, cache_hit). Result is None if cache miss.
        """
        try:
            cache_key = self._generate_cache_key(
                query_type, entities, boolean_logic, extra_params
            )

            with self._lock:
                if cache_key in self._cache:
                    entry = self._cache[cache_key]

                    # Check if expired
                    if entry.is_expired():
                        self._cache.pop(cache_key)
                        self._stats["memory_usage_bytes"] -= entry.size_bytes
                        self._stats["misses"] += 1
                        return None, False

                    # Update access tracking
                    entry.last_accessed = time.time()
                    entry.access_count += 1

                    # Move to end (most recently used)
                    self._cache.move_to_end(cache_key)

                    self._stats["hits"] += 1
                    logger.debug(f"Cache hit for query (key: {cache_key})")
                    return entry.value, True
                else:
                    self._stats["misses"] += 1
                    return None, False

        except Exception as e:
            logger.error(f"Failed to retrieve from cache: {str(e)}")
            self._stats["misses"] += 1
            return None, False

    def warm_cache_for_entities(self, entities: List[str], common_queries: List[str]):
        """
        Pre-warm cache with common query patterns for given entities.

        Args:
            entities: List of entity IDs to warm cache for
            common_queries: List of common Boolean expressions
        """
        try:
            logger.info(
                f"Warming cache for {len(entities)} entities with {len(common_queries)} query patterns"
            )

            for boolean_logic in common_queries:
                cache_key = self._generate_cache_key("warm_up", entities, boolean_logic)

                # Check if already cached
                if cache_key not in self._cache:
                    # Generate placeholder result for cache warming
                    # In practice, this would trigger actual query execution
                    warm_result = {
                        "warmed_at": datetime.utcnow().isoformat(),
                        "entities": entities,
                        "boolean_logic": boolean_logic,
                        "result": "cache_warmed",
                    }

                    self.put("warm_up", entities, boolean_logic, warm_result)

            self._stats["cache_warming_triggered"] += 1

        except Exception as e:
            logger.error(f"Cache warming failed: {str(e)}")

    def cleanup_stale_entries(self):
        """Perform periodic cleanup of stale and expired entries"""
        now = time.time()

        # Only cleanup if enough time has passed
        if now - self._last_cleanup < 300:  # 5 minutes
            return

        with self._lock:
            initial_count = len(self._cache)
            self._evict_entries()
            cleaned_count = initial_count - len(self._cache)

            if cleaned_count > 0:
                logger.info(f"Cleaned up {cleaned_count} stale cache entries")

            self._last_cleanup = now

    def clear(self):
        """Clear all cache entries"""
        with self._lock:
            self._cache.clear()
            self._stats["memory_usage_bytes"] = 0
            logger.info("Cache cleared")

    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        with self._lock:
            total_requests = self._stats["hits"] + self._stats["misses"]
            hit_rate = (
                (self._stats["hits"] / total_requests) if total_requests > 0 else 0.0
            )

            return {
                "cache_size": len(self._cache),
                "max_size": self.max_size,
                "memory_usage_bytes": self._stats["memory_usage_bytes"],
                "max_memory_bytes": self.max_memory_bytes,
                "memory_usage_percent": (
                    self._stats["memory_usage_bytes"] / self.max_memory_bytes
                )
                * 100,
                "hit_rate": hit_rate,
                "hits": self._stats["hits"],
                "misses": self._stats["misses"],
                "evictions": self._stats["evictions"],
                "avg_query_complexity": self._stats["avg_query_complexity"],
                "cache_warming_triggered": self._stats["cache_warming_triggered"],
                "default_ttl_seconds": self.default_ttl,
            }


# Global cache instance
_cache_instance: Optional[MultiEntityQueryCache] = None


def get_query_cache() -> MultiEntityQueryCache:
    """Get global query cache instance"""
    global _cache_instance

    if _cache_instance is None:
        _cache_instance = MultiEntityQueryCache(
            max_size=1000, default_ttl=3600, max_memory_mb=100  # 1 hour
        )

    return _cache_instance


def clear_global_cache():
    """Clear global cache (useful for testing)"""
    global _cache_instance
    if _cache_instance:
        _cache_instance.clear()
