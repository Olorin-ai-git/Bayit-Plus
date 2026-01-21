"""
Log Deduplicator Service
Feature: 021-live-merged-logstream

Detects and filters duplicate log entries using SHA-1 hashing with LRU cache.
Prevents duplicate logs from appearing in the merged stream.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

import hashlib
import logging
from collections import OrderedDict
from typing import AsyncIterator, Dict

from app.config.logstream_config import AggregatorConfig
from app.models.unified_log import UnifiedLog

logger = logging.getLogger(__name__)


class LRUCache:
    """
    Least Recently Used (LRU) cache for deduplication hashes.

    Automatically evicts oldest entries when cache is full.
    """

    def __init__(self, capacity: int):
        """
        Initialize LRU cache.

        Args:
            capacity: Maximum number of hashes to store
        """
        self.capacity = capacity
        self.cache: OrderedDict[str, bool] = OrderedDict()

    def contains(self, key: str) -> bool:
        """
        Check if key exists in cache.

        Moves key to end (most recently used position).

        Args:
            key: Hash key to check

        Returns:
            True if key exists in cache, False otherwise
        """
        if key in self.cache:
            self.cache.move_to_end(key)
            return True
        return False

    def add(self, key: str) -> None:
        """
        Add key to cache.

        Evicts oldest entry if cache is full.

        Args:
            key: Hash key to add
        """
        if key in self.cache:
            self.cache.move_to_end(key)
        else:
            if len(self.cache) >= self.capacity:
                self.cache.popitem(last=False)
            self.cache[key] = True

    def size(self) -> int:
        """Get current cache size."""
        return len(self.cache)

    def clear(self) -> None:
        """Clear all entries from cache."""
        self.cache.clear()


class LogDeduplicatorService:
    """
    Deduplicates log entries using SHA-1 hashing.

    Uses LRU cache to track seen log hashes. Detects duplicates based on
    (ts, investigation_id, message, service) tuple.
    """

    def __init__(self, config: AggregatorConfig):
        """
        Initialize log deduplicator.

        Args:
            config: Aggregator configuration with deduplication settings
        """
        self.config = config
        self.cache = LRUCache(capacity=config.dedup_cache_size)
        self.duplicates_filtered = 0

    def _compute_hash(self, log: UnifiedLog) -> str:
        """
        Compute SHA-1 hash for log entry.

        Hash based on:
        - Timestamp (ts)
        - Investigation ID
        - Message content
        - Service name

        Args:
            log: UnifiedLog entry to hash

        Returns:
            SHA-1 hash as hexadecimal string
        """
        hash_input = (
            f"{log.ts.isoformat()}|"
            f"{log.investigation_id}|"
            f"{log.message}|"
            f"{log.service}"
        )

        return hashlib.sha1(hash_input.encode("utf-8")).hexdigest()

    async def deduplicate_stream(
        self, log_stream: AsyncIterator[UnifiedLog]
    ) -> AsyncIterator[UnifiedLog]:
        """
        Filter duplicate logs from stream.

        Args:
            log_stream: Stream of UnifiedLog entries

        Yields:
            UnifiedLog entries with duplicates removed
        """
        async for log in log_stream:
            log_hash = self._compute_hash(log)

            if self.cache.contains(log_hash):
                self.duplicates_filtered += 1
                logger.debug(
                    f"Filtered duplicate log: {log.event_id}",
                    extra={
                        "investigation_id": log.investigation_id,
                        "hash": log_hash,
                    },
                )
                continue

            self.cache.add(log_hash)
            yield log

    def get_stats(self) -> Dict[str, int]:
        """
        Get deduplication statistics.

        Returns:
            Dictionary with cache size and duplicates filtered
        """
        return {
            "cache_size": self.cache.size(),
            "cache_capacity": self.config.dedup_cache_size,
            "duplicates_filtered": self.duplicates_filtered,
        }

    def reset_stats(self) -> None:
        """Reset deduplication statistics."""
        self.duplicates_filtered = 0

    def clear_cache(self) -> None:
        """Clear deduplication cache and reset statistics."""
        self.cache.clear()
        self.duplicates_filtered = 0
        logger.info("Deduplication cache cleared")
