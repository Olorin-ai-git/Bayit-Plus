"""
Log Aggregator Service
Feature: 021-live-merged-logstream

Merges multiple sorted log streams using min-heap algorithm (O(n log k) performance).
Combines logs from frontend and backend providers in chronological order.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

from typing import AsyncIterator, List, Optional
from datetime import datetime
import asyncio
import heapq
import logging

from app.models.unified_log import UnifiedLog
from app.service.log_providers.base import LogProvider
from app.config.logstream_config import AggregatorConfig

logger = logging.getLogger(__name__)


class LogEntry:
    """
    Wrapper for UnifiedLog with comparison operators for heap operations.

    Enables min-heap to order logs by (ts, seq) for chronological merging.
    """

    def __init__(self, log: UnifiedLog, provider_index: int):
        self.log = log
        self.provider_index = provider_index

    def __lt__(self, other: "LogEntry") -> bool:
        """Compare by timestamp first, then sequence number."""
        if self.log.ts != other.log.ts:
            return self.log.ts < other.log.ts
        return self.log.seq < other.log.seq

    def __eq__(self, other: "LogEntry") -> bool:
        """Check equality by timestamp and sequence."""
        return self.log.ts == other.log.ts and self.log.seq == other.log.seq


class LogAggregatorService:
    """
    Aggregates logs from multiple providers using min-heap merge.

    Performance: O(n log k) where n is total logs, k is number of providers.
    Maintains chronological order across all sources.
    """

    def __init__(self, providers: List[LogProvider], config: AggregatorConfig):
        """
        Initialize log aggregator.

        Args:
            providers: List of log providers (frontend, backend, etc.)
            config: Aggregator configuration
        """
        self.providers = providers
        self.config = config
        self.buffer_size = config.buffer_size

    async def stream_logs(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> AsyncIterator[UnifiedLog]:
        """
        Stream merged logs from all providers.

        Uses min-heap to merge sorted streams efficiently.

        Args:
            start_time: Optional start timestamp
            end_time: Optional end timestamp

        Yields:
            UnifiedLog entries in chronological order across all providers

        Raises:
            Exception: If any provider fails (logged but not raised)
        """
        iterators = []
        heap: List[LogEntry] = []

        for i, provider in enumerate(self.providers):
            try:
                iterator = provider.stream_logs(start_time, end_time)
                iterators.append(iterator)

                first_log = await anext(iterator, None)
                if first_log:
                    heapq.heappush(heap, LogEntry(first_log, i))

            except Exception as e:
                logger.error(
                    f"Failed to initialize provider {provider.get_provider_name()}: {e}"
                )
                continue

        while heap:
            entry = heapq.heappop(heap)
            yield entry.log

            try:
                next_log = await anext(iterators[entry.provider_index], None)
                if next_log:
                    heapq.heappush(heap, LogEntry(next_log, entry.provider_index))

            except Exception as e:
                logger.warning(
                    f"Provider {self.providers[entry.provider_index].get_provider_name()} "
                    f"stream ended: {e}"
                )
                continue

            if len(heap) == 0:
                await asyncio.sleep(0.1)

    async def fetch_logs(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[UnifiedLog]:
        """
        Fetch merged logs from all providers (for polling endpoint).

        Args:
            start_time: Optional start timestamp
            end_time: Optional end timestamp
            limit: Maximum number of logs to return

        Returns:
            List of UnifiedLog entries sorted by (ts, seq)
        """
        all_logs: List[UnifiedLog] = []

        fetch_tasks = [
            provider.fetch_logs(start_time, end_time, limit)
            for provider in self.providers
        ]

        results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(
                    f"Provider {self.providers[i].get_provider_name()} fetch failed: {result}"
                )
                continue

            all_logs.extend(result)

        all_logs.sort(key=lambda log: (log.ts, log.seq))

        return all_logs[:limit]

    async def health_check(self) -> bool:
        """
        Check health of all providers.

        Returns:
            True if at least one provider is healthy, False otherwise
        """
        health_tasks = [provider.health_check() for provider in self.providers]
        results = await asyncio.gather(*health_tasks, return_exceptions=True)

        healthy_count = sum(
            1 for result in results if not isinstance(result, Exception) and result
        )

        logger.info(f"Provider health: {healthy_count}/{len(self.providers)} healthy")

        return healthy_count > 0
