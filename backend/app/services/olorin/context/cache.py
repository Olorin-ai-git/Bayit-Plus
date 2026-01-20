"""
Alias Cache Management

Caches cultural reference aliases for fast pattern matching with LRU eviction and TTL.
"""

import logging
import time
from collections import OrderedDict
from typing import Optional, Tuple

from app.core.config import settings
from app.models.cultural_reference import CulturalReference

logger = logging.getLogger(__name__)


class AliasCache:
    """
    Cache for cultural reference aliases with LRU eviction and TTL support.

    Features:
    - LRU eviction when max_entries is exceeded
    - TTL-based expiration for stale entries
    - Thread-safe operations (within async context)
    """

    def __init__(self):
        # OrderedDict stores (reference_id, timestamp) tuples for LRU + TTL
        self._cache: OrderedDict[str, Tuple[str, float]] = OrderedDict()
        self._loaded = False

    @property
    def is_loaded(self) -> bool:
        """Check if cache is loaded."""
        return self._loaded

    @property
    def aliases(self) -> dict[str, str]:
        """Get alias cache (reference_id only, for backward compatibility)."""
        return {alias: ref_id for alias, (ref_id, _) in self._cache.items()}

    @property
    def size(self) -> int:
        """Get current cache size."""
        return len(self._cache)

    def _get_max_entries(self) -> int:
        """Get max entries from config."""
        return settings.olorin.cultural.reference_cache_max_entries

    def _get_ttl_seconds(self) -> float:
        """Get TTL in seconds from config."""
        return settings.olorin.cultural.reference_cache_ttl_hours * 3600

    def _is_expired(self, timestamp: float) -> bool:
        """Check if an entry is expired based on TTL."""
        return (time.time() - timestamp) > self._get_ttl_seconds()

    def _evict_if_needed(self) -> int:
        """
        Evict oldest entries if cache exceeds max size (LRU eviction).

        Returns:
            Number of entries evicted
        """
        max_entries = self._get_max_entries()
        evicted = 0

        while len(self._cache) > max_entries:
            # Pop oldest entry (first item in OrderedDict)
            evicted_key, _ = self._cache.popitem(last=False)
            evicted += 1
            logger.debug(f"LRU evicted alias: {evicted_key}")

        if evicted > 0:
            logger.info(f"LRU evicted {evicted} entries, cache size: {len(self._cache)}")

        return evicted

    def cleanup_expired(self) -> int:
        """
        Remove all expired entries from cache.

        Returns:
            Number of entries removed
        """
        current_time = time.time()
        ttl_seconds = self._get_ttl_seconds()
        expired_keys = []

        for alias, (_, timestamp) in self._cache.items():
            if (current_time - timestamp) > ttl_seconds:
                expired_keys.append(alias)

        for key in expired_keys:
            del self._cache[key]

        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

        return len(expired_keys)

    def get(self, alias: str) -> Optional[str]:
        """
        Get reference_id for an alias, checking TTL and updating LRU order.

        Args:
            alias: The alias to look up (case-insensitive)

        Returns:
            Reference ID if found and not expired, None otherwise
        """
        key = alias.lower()
        entry = self._cache.get(key)

        if entry is None:
            return None

        ref_id, timestamp = entry

        # Check if expired
        if self._is_expired(timestamp):
            del self._cache[key]
            logger.debug(f"Expired alias removed on access: {key}")
            return None

        # Move to end for LRU (most recently used)
        self._cache.move_to_end(key)
        return ref_id

    async def load(self) -> None:
        """Load alias cache from database."""
        if self._loaded:
            return

        try:
            current_time = time.time()
            references = await CulturalReference.find_all().to_list()

            for ref in references:
                # Add canonical names
                self._add_entry(ref.canonical_name.lower(), ref.reference_id, current_time)
                if ref.canonical_name_en:
                    self._add_entry(ref.canonical_name_en.lower(), ref.reference_id, current_time)

                # Add aliases
                for alias in ref.aliases:
                    self._add_entry(alias.lower(), ref.reference_id, current_time)
                for alias in ref.aliases_en:
                    self._add_entry(alias.lower(), ref.reference_id, current_time)

            # Ensure we don't exceed max entries after initial load
            self._evict_if_needed()

            self._loaded = True
            logger.info(f"Loaded {len(self._cache)} cultural reference aliases")

        except Exception as e:
            logger.error(f"Failed to load alias cache: {e}")

    def _add_entry(self, alias: str, reference_id: str, timestamp: float) -> None:
        """Add entry to cache with timestamp."""
        self._cache[alias] = (reference_id, timestamp)

    def add_alias(self, alias: str, reference_id: str) -> None:
        """
        Add single alias to cache.

        Args:
            alias: The alias to add (case-insensitive)
            reference_id: The reference ID to associate
        """
        key = alias.lower()
        self._cache[key] = (reference_id, time.time())
        # Move to end (most recently added/used)
        self._cache.move_to_end(key)
        # Check if eviction needed
        self._evict_if_needed()

    def invalidate(self) -> None:
        """Invalidate cache for reload."""
        self._cache.clear()
        self._loaded = False
        logger.info("Alias cache invalidated")

    def remove(self, alias: str) -> bool:
        """
        Remove an alias from cache.

        Args:
            alias: The alias to remove (case-insensitive)

        Returns:
            True if removed, False if not found
        """
        key = alias.lower()
        if key in self._cache:
            del self._cache[key]
            return True
        return False
