"""
Enhanced Cache System

Advanced caching with TTL, content hashing, Redis support, and intelligent eviction.
Provides high-performance caching for tool results with comprehensive monitoring.
"""

import asyncio
import hashlib
import json
import pickle
import time
import weakref
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, List, Optional, Set, Tuple, Union

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class EvictionPolicy(Enum):
    """Cache eviction policies"""

    LRU = "lru"  # Least Recently Used
    LFU = "lfu"  # Least Frequently Used
    FIFO = "fifo"  # First In First Out
    TTL_ONLY = "ttl_only"  # TTL expiration only
    SIZE_AWARE = "size_aware"  # Consider entry size


@dataclass
class CacheEntry:
    """Cache entry with metadata"""

    key: str
    value: Any
    created_at: datetime
    accessed_at: datetime
    expires_at: Optional[datetime]
    access_count: int = 0
    size_bytes: int = 0
    content_hash: Optional[str] = None
    tags: Set[str] = field(default_factory=set)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_expired(self) -> bool:
        """Check if entry is expired"""
        if self.expires_at is None:
            return False
        return datetime.now() > self.expires_at

    def touch(self) -> None:
        """Update access time and count"""
        self.accessed_at = datetime.now()
        self.access_count += 1

    def calculate_size(self) -> int:
        """Calculate approximate size in bytes"""
        if self.size_bytes > 0:
            return self.size_bytes

        try:
            # Use pickle to estimate size
            pickled = pickle.dumps(self.value)
            self.size_bytes = len(pickled)
            return self.size_bytes
        except Exception:
            # Fallback to string length estimation
            self.size_bytes = len(str(self.value)) * 2  # Rough Unicode estimate
            return self.size_bytes


@dataclass
class CacheStats:
    """Cache performance statistics"""

    hits: int = 0
    misses: int = 0
    evictions: int = 0
    expired_entries: int = 0
    total_size_bytes: int = 0
    entry_count: int = 0

    # Performance metrics
    avg_get_time_ms: float = 0.0
    avg_set_time_ms: float = 0.0
    max_get_time_ms: float = 0.0
    max_set_time_ms: float = 0.0

    # Time-based metrics
    last_hit_time: Optional[datetime] = None
    last_miss_time: Optional[datetime] = None
    last_eviction_time: Optional[datetime] = None

    @property
    def hit_rate(self) -> float:
        """Calculate cache hit rate"""
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    @property
    def miss_rate(self) -> float:
        """Calculate cache miss rate"""
        total = self.hits + self.misses
        return self.misses / total if total > 0 else 0.0


class EnhancedCache:
    """
    Advanced caching system with multiple backends and intelligent features.

    Features:
    - Multiple eviction policies (LRU, LFU, FIFO, etc.)
    - TTL with automatic cleanup
    - Content-based deduplication
    - Tag-based cache invalidation
    - Size-aware caching with limits
    - Redis backend support
    - Comprehensive performance monitoring
    - Batch operations
    - Cache warming and prefetching
    """

    def __init__(
        self,
        max_size: int = 10000,
        max_memory_mb: int = 100,
        default_ttl_seconds: int = 300,
        eviction_policy: EvictionPolicy = EvictionPolicy.LRU,
        cleanup_interval_seconds: int = 60,
        enable_content_deduplication: bool = True,
        enable_compression: bool = False,
        redis_client: Optional[Any] = None,
    ):
        """Initialize enhanced cache"""

        self.max_size = max_size
        self.max_memory_bytes = max_memory_mb * 1024 * 1024
        self.default_ttl_seconds = default_ttl_seconds
        self.eviction_policy = eviction_policy
        self.cleanup_interval_seconds = cleanup_interval_seconds
        self.enable_content_deduplication = enable_content_deduplication
        self.enable_compression = enable_compression
        self.redis_client = redis_client

        # Cache storage
        self.entries: Dict[str, CacheEntry] = {}
        self.access_order: OrderedDict = OrderedDict()  # For LRU
        self.access_counts: Dict[str, int] = {}  # For LFU
        self.content_hashes: Dict[str, str] = {}  # For deduplication
        self.tag_index: Dict[str, Set[str]] = {}  # Tag to keys mapping

        # Statistics
        self.stats = CacheStats()

        # Background cleanup task
        self.cleanup_task: Optional[asyncio.Task] = None
        self._cleanup_task_started = False

        self.logger = get_bridge_logger(f"{__name__}.cache")

    def start_cleanup_task(self) -> None:
        """Start background cleanup task (only when event loop is running)"""
        try:
            if self.cleanup_task is None or self.cleanup_task.done():
                self.cleanup_task = asyncio.create_task(self._cleanup_loop())
                self._cleanup_task_started = True
        except RuntimeError:
            # No event loop running - task will be started on first async operation
            self._cleanup_task_started = False

    async def _cleanup_loop(self) -> None:
        """Background cleanup loop"""
        while True:
            try:
                await asyncio.sleep(self.cleanup_interval_seconds)
                await self._cleanup_expired()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Cache cleanup error: {str(e)}", exc_info=True)

    async def get(self, key: str, default: Any = None, touch: bool = True) -> Any:
        """Get value from cache"""
        start_time = time.time()

        # Ensure cleanup task is started (lazy initialization)
        if not self._cleanup_task_started:
            self.start_cleanup_task()

        try:
            # Check Redis first if available
            if self.redis_client:
                redis_value = await self._get_from_redis(key)
                if redis_value is not None:
                    self._update_get_stats(start_time, True)
                    return redis_value

            # Check local cache
            if key not in self.entries:
                self._update_get_stats(start_time, False)
                return default

            entry = self.entries[key]

            # Check expiration
            if entry.is_expired():
                await self.delete(key)
                self._update_get_stats(start_time, False)
                return default

            # Update access information
            if touch:
                entry.touch()
                self._update_access_order(key)

            self._update_get_stats(start_time, True)
            return entry.value

        except Exception as e:
            self.logger.error(f"Cache get error for key {key}: {str(e)}", exc_info=True)
            self._update_get_stats(start_time, False)
            return default

    async def set(
        self,
        key: str,
        value: Any,
        ttl_seconds: Optional[int] = None,
        tags: Optional[Set[str]] = None,
    ) -> bool:
        """Set value in cache"""
        start_time = time.time()

        # Ensure cleanup task is started (lazy initialization)
        if not self._cleanup_task_started:
            self.start_cleanup_task()

        try:
            ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl_seconds
            expires_at = datetime.now() + timedelta(seconds=ttl) if ttl > 0 else None

            # Create cache entry
            entry = CacheEntry(
                key=key,
                value=value,
                created_at=datetime.now(),
                accessed_at=datetime.now(),
                expires_at=expires_at,
                tags=tags or set(),
            )

            # Calculate size
            entry.calculate_size()

            # Content deduplication
            if self.enable_content_deduplication:
                content_hash = self._calculate_content_hash(value)
                entry.content_hash = content_hash

                # Check if content already exists
                if content_hash in self.content_hashes:
                    existing_key = self.content_hashes[content_hash]
                    if existing_key in self.entries:
                        # Point to existing entry instead of duplicating
                        self.logger.debug(
                            f"Content deduplication: {key} -> {existing_key}"
                        )
                        self.entries[key] = self.entries[existing_key]
                        self._update_access_order(key)
                        self._update_tag_index(key, tags or set())
                        self._update_set_stats(start_time)
                        return True

                self.content_hashes[content_hash] = key

            # Check capacity before insertion
            await self._ensure_capacity(entry.size_bytes)

            # Store entry
            self.entries[key] = entry
            self._update_access_order(key)
            self._update_tag_index(key, tags or set())

            # Update statistics
            self.stats.entry_count = len(self.entries)
            self.stats.total_size_bytes += entry.size_bytes

            # Store in Redis if available
            if self.redis_client:
                await self._set_in_redis(key, value, ttl)

            self._update_set_stats(start_time)
            return True

        except Exception as e:
            self.logger.error(f"Cache set error for key {key}: {str(e)}", exc_info=True)
            self._update_set_stats(start_time)
            return False

    async def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            if key not in self.entries:
                return False

            entry = self.entries[key]

            # Update statistics
            self.stats.total_size_bytes -= entry.size_bytes

            # Remove from all indices
            del self.entries[key]
            self.access_order.pop(key, None)
            self.access_counts.pop(key, None)

            # Remove from tag index
            for tag in entry.tags:
                if tag in self.tag_index:
                    self.tag_index[tag].discard(key)
                    if not self.tag_index[tag]:
                        del self.tag_index[tag]

            # Remove from content hash index
            if entry.content_hash and entry.content_hash in self.content_hashes:
                if self.content_hashes[entry.content_hash] == key:
                    del self.content_hashes[entry.content_hash]

            # Delete from Redis if available
            if self.redis_client:
                await self._delete_from_redis(key)

            self.stats.entry_count = len(self.entries)
            return True

        except Exception as e:
            self.logger.error(
                f"Cache delete error for key {key}: {str(e)}", exc_info=True
            )
            return False

    async def invalidate_by_tag(self, tag: str) -> int:
        """Invalidate all entries with a specific tag"""
        if tag not in self.tag_index:
            return 0

        keys_to_delete = list(self.tag_index[tag])
        deleted_count = 0

        for key in keys_to_delete:
            if await self.delete(key):
                deleted_count += 1

        self.logger.info(f"Invalidated {deleted_count} cache entries with tag '{tag}'")
        return deleted_count

    async def invalidate_by_pattern(self, pattern: str) -> int:
        """Invalidate all keys matching a pattern (simple wildcard support)"""
        import fnmatch

        keys_to_delete = [
            key for key in self.entries.keys() if fnmatch.fnmatch(key, pattern)
        ]

        deleted_count = 0
        for key in keys_to_delete:
            if await self.delete(key):
                deleted_count += 1

        self.logger.info(
            f"Invalidated {deleted_count} cache entries matching pattern '{pattern}'"
        )
        return deleted_count

    async def get_multi(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple values from cache"""
        result = {}

        for key in keys:
            value = await self.get(key)
            if value is not None:
                result[key] = value

        return result

    async def set_multi(
        self,
        key_value_pairs: Dict[str, Any],
        ttl_seconds: Optional[int] = None,
        tags: Optional[Set[str]] = None,
    ) -> Dict[str, bool]:
        """Set multiple values in cache"""
        result = {}

        for key, value in key_value_pairs.items():
            result[key] = await self.set(key, value, ttl_seconds, tags)

        return result

    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        if key not in self.entries:
            return False

        entry = self.entries[key]
        if entry.is_expired():
            await self.delete(key)
            return False

        return True

    async def clear(self) -> None:
        """Clear all cache entries"""
        self.entries.clear()
        self.access_order.clear()
        self.access_counts.clear()
        self.content_hashes.clear()
        self.tag_index.clear()

        self.stats = CacheStats()

        if self.redis_client:
            # Clear Redis keys with our prefix
            await self._clear_redis()

        self.logger.info("Cache cleared")

    async def _ensure_capacity(self, new_entry_size: int) -> None:
        """Ensure cache has capacity for new entry"""

        # Size-based eviction
        while (
            self.stats.total_size_bytes + new_entry_size > self.max_memory_bytes
            and self.entries
        ):
            await self._evict_one_entry()

        # Count-based eviction
        while len(self.entries) >= self.max_size and self.entries:
            await self._evict_one_entry()

    async def _evict_one_entry(self) -> None:
        """Evict one entry based on eviction policy"""
        if not self.entries:
            return

        key_to_evict = None

        if self.eviction_policy == EvictionPolicy.LRU:
            # Least recently used
            key_to_evict = next(iter(self.access_order))

        elif self.eviction_policy == EvictionPolicy.LFU:
            # Least frequently used
            key_to_evict = min(self.access_counts.items(), key=lambda x: x[1])[0]

        elif self.eviction_policy == EvictionPolicy.FIFO:
            # First in, first out (oldest created)
            oldest_entry = min(self.entries.items(), key=lambda x: x[1].created_at)
            key_to_evict = oldest_entry[0]

        elif self.eviction_policy == EvictionPolicy.SIZE_AWARE:
            # Evict largest entry
            largest_entry = max(self.entries.items(), key=lambda x: x[1].size_bytes)
            key_to_evict = largest_entry[0]

        else:  # TTL_ONLY or fallback
            # Evict first entry (arbitrary)
            key_to_evict = next(iter(self.entries))

        if key_to_evict:
            await self.delete(key_to_evict)
            self.stats.evictions += 1
            self.stats.last_eviction_time = datetime.now()
            self.logger.debug(f"Evicted cache entry: {key_to_evict}")

    async def _cleanup_expired(self) -> None:
        """Clean up expired entries"""
        expired_keys = []

        for key, entry in self.entries.items():
            if entry.is_expired():
                expired_keys.append(key)

        for key in expired_keys:
            await self.delete(key)
            self.stats.expired_entries += 1

        if expired_keys:
            self.logger.debug(f"Cleaned up {len(expired_keys)} expired cache entries")

    def _calculate_content_hash(self, value: Any) -> str:
        """Calculate content hash for deduplication"""
        try:
            # Convert to JSON for consistent hashing
            json_str = json.dumps(value, sort_keys=True, default=str)
            return hashlib.sha256(json_str.encode()).hexdigest()[:16]
        except Exception:
            # Fallback to string representation
            return hashlib.sha256(str(value).encode()).hexdigest()[:16]

    def _update_access_order(self, key: str) -> None:
        """Update access order for LRU"""
        if self.eviction_policy == EvictionPolicy.LRU:
            # Move to end (most recent)
            self.access_order.pop(key, None)
            self.access_order[key] = True

        # Update access count for LFU
        if self.eviction_policy == EvictionPolicy.LFU:
            self.access_counts[key] = self.access_counts.get(key, 0) + 1

    def _update_tag_index(self, key: str, tags: Set[str]) -> None:
        """Update tag to key mapping"""
        for tag in tags:
            if tag not in self.tag_index:
                self.tag_index[tag] = set()
            self.tag_index[tag].add(key)

    def _update_get_stats(self, start_time: float, hit: bool) -> None:
        """Update get operation statistics"""
        duration_ms = (time.time() - start_time) * 1000

        if hit:
            self.stats.hits += 1
            self.stats.last_hit_time = datetime.now()
        else:
            self.stats.misses += 1
            self.stats.last_miss_time = datetime.now()

        # Update timing stats
        total_ops = self.stats.hits + self.stats.misses
        self.stats.avg_get_time_ms = (
            self.stats.avg_get_time_ms * (total_ops - 1) + duration_ms
        ) / total_ops
        self.stats.max_get_time_ms = max(self.stats.max_get_time_ms, duration_ms)

    def _update_set_stats(self, start_time: float) -> None:
        """Update set operation statistics"""
        duration_ms = (time.time() - start_time) * 1000

        # Simple moving average for set timing
        if self.stats.avg_set_time_ms == 0:
            self.stats.avg_set_time_ms = duration_ms
        else:
            self.stats.avg_set_time_ms = (self.stats.avg_set_time_ms + duration_ms) / 2

        self.stats.max_set_time_ms = max(self.stats.max_set_time_ms, duration_ms)

    # Redis backend methods (placeholder implementations)

    async def _get_from_redis(self, key: str) -> Any:
        """Get value from Redis backend"""
        try:
            if hasattr(self.redis_client, "get"):
                redis_key = f"olorin_cache:{key}"
                value = await self.redis_client.get(redis_key)
                if value:
                    return pickle.loads(value)
        except Exception as e:
            self.logger.error(f"Redis get error: {str(e)}")
        return None

    async def _set_in_redis(self, key: str, value: Any, ttl_seconds: int) -> None:
        """Set value in Redis backend"""
        try:
            if hasattr(self.redis_client, "setex"):
                redis_key = f"olorin_cache:{key}"
                serialized_value = pickle.dumps(value)
                await self.redis_client.setex(redis_key, ttl_seconds, serialized_value)
        except Exception as e:
            self.logger.error(f"Redis set error: {str(e)}")

    async def _delete_from_redis(self, key: str) -> None:
        """Delete value from Redis backend"""
        try:
            if hasattr(self.redis_client, "delete"):
                redis_key = f"olorin_cache:{key}"
                await self.redis_client.delete(redis_key)
        except Exception as e:
            self.logger.error(f"Redis delete error: {str(e)}")

    async def _clear_redis(self) -> None:
        """Clear all cache keys from Redis"""
        try:
            if hasattr(self.redis_client, "keys") and hasattr(
                self.redis_client, "delete"
            ):
                keys = await self.redis_client.keys("olorin_cache:*")
                if keys:
                    await self.redis_client.delete(*keys)
        except Exception as e:
            self.logger.error(f"Redis clear error: {str(e)}")

    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics"""
        return {
            "performance": {
                "hit_rate": self.stats.hit_rate,
                "miss_rate": self.stats.miss_rate,
                "hits": self.stats.hits,
                "misses": self.stats.misses,
                "evictions": self.stats.evictions,
                "expired_entries": self.stats.expired_entries,
            },
            "capacity": {
                "entry_count": self.stats.entry_count,
                "max_size": self.max_size,
                "total_size_bytes": self.stats.total_size_bytes,
                "max_memory_bytes": self.max_memory_bytes,
                "memory_usage_percent": (
                    self.stats.total_size_bytes / self.max_memory_bytes
                )
                * 100,
            },
            "timing": {
                "avg_get_time_ms": self.stats.avg_get_time_ms,
                "avg_set_time_ms": self.stats.avg_set_time_ms,
                "max_get_time_ms": self.stats.max_get_time_ms,
                "max_set_time_ms": self.stats.max_set_time_ms,
            },
            "configuration": {
                "eviction_policy": self.eviction_policy.value,
                "default_ttl_seconds": self.default_ttl_seconds,
                "content_deduplication_enabled": self.enable_content_deduplication,
                "compression_enabled": self.enable_compression,
                "redis_enabled": self.redis_client is not None,
            },
            "last_activity": {
                "last_hit": (
                    self.stats.last_hit_time.isoformat()
                    if self.stats.last_hit_time
                    else None
                ),
                "last_miss": (
                    self.stats.last_miss_time.isoformat()
                    if self.stats.last_miss_time
                    else None
                ),
                "last_eviction": (
                    self.stats.last_eviction_time.isoformat()
                    if self.stats.last_eviction_time
                    else None
                ),
            },
            "content_deduplication": {
                "unique_content_hashes": len(self.content_hashes),
                "deduplication_ratio": len(self.content_hashes)
                / max(1, self.stats.entry_count),
            },
            "tags": {
                "unique_tags": len(self.tag_index),
                "tagged_entries": sum(len(keys) for keys in self.tag_index.values()),
            },
        }

    async def warm_cache(self, key_value_generator: Any) -> int:
        """Warm cache with data from generator"""
        warmed_count = 0

        try:
            if hasattr(key_value_generator, "__aiter__"):
                # Async generator
                async for key, value in key_value_generator:
                    if await self.set(key, value):
                        warmed_count += 1
            else:
                # Sync generator
                for key, value in key_value_generator:
                    if await self.set(key, value):
                        warmed_count += 1

        except Exception as e:
            self.logger.error(f"Cache warming error: {str(e)}", exc_info=True)

        self.logger.info(f"Warmed cache with {warmed_count} entries")
        return warmed_count

    def __del__(self):
        """Cleanup when cache is destroyed"""
        if self.cleanup_task and not self.cleanup_task.done():
            self.cleanup_task.cancel()
