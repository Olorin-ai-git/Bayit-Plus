"""
Backend Log Collector
Feature: 021-live-merged-logstream

Collects backend logs from structlog in local-dev mode.
In production, will be replaced with external log aggregation service integration.

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

import asyncio
from datetime import datetime
from typing import List, Optional

from app.models.unified_log import UnifiedLog


class BackendLogCollector:
    """
    Collects backend logs from structlog (local-dev mode).

    In production, this will be replaced with integration to external services
    (Splunk, ELK, CloudWatch, etc.).
    """

    def __init__(self):
        self._logs: List[UnifiedLog] = []
        self._lock = asyncio.Lock()

    async def add_log(self, log: UnifiedLog) -> None:
        """
        Add log to collector.

        Maintains chronological order by (ts, seq).
        """
        async with self._lock:
            self._logs.append(log)
            self._logs.sort(key=lambda l: (l.ts, l.seq))

    async def get_logs(
        self,
        investigation_id: str,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: Optional[int] = None,
    ) -> List[UnifiedLog]:
        """
        Get logs from collector with filtering.

        Args:
            investigation_id: Filter by investigation ID
            start_time: Optional start timestamp
            end_time: Optional end timestamp
            limit: Optional maximum number of logs

        Returns:
            Filtered list of UnifiedLog entries sorted by (ts, seq)
        """
        async with self._lock:
            filtered = [
                log
                for log in self._logs
                if log.investigation_id == investigation_id and log.source == "backend"
            ]

            if start_time:
                filtered = [log for log in filtered if log.ts >= start_time]

            if end_time:
                filtered = [log for log in filtered if log.ts <= end_time]

            if limit:
                filtered = filtered[:limit]

            return filtered

    async def clear(self) -> None:
        """Clear all logs from collector."""
        async with self._lock:
            self._logs.clear()

    async def size(self) -> int:
        """Get current collector size."""
        async with self._lock:
            return len(self._logs)
