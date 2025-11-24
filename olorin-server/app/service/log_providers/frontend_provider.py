"""
Frontend Log Provider
Feature: 021-live-merged-logstream

Fetches frontend logs from in-memory buffer (local-dev mode).
In production, will integrate with external log aggregation services (Sentry, Datadog, etc.).

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

from typing import AsyncIterator, Optional, List
from datetime import datetime
import asyncio
import logging

from app.models.unified_log import UnifiedLog
from app.service.log_providers.base import (
    LogProvider,
    ProviderError,
    ProviderTimeoutError
)
from app.service.log_providers.frontend_log_buffer import FrontendLogBuffer

logger = logging.getLogger(__name__)


class FrontendLogProvider(LogProvider):
    """
    Frontend log provider for local-dev mode.

    Fetches logs from in-memory buffer. In production, will integrate
    with external log aggregation services (Sentry, Datadog, CloudWatch, etc.).
    """

    def __init__(
        self,
        investigation_id: str,
        buffer: FrontendLogBuffer,
        timeout_ms: int = 30000
    ):
        """
        Initialize frontend log provider.

        Args:
            investigation_id: Investigation ID to filter logs
            buffer: In-memory log buffer
            timeout_ms: Request timeout in milliseconds
        """
        super().__init__(investigation_id, timeout_ms)
        self.buffer = buffer

    async def stream_logs(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> AsyncIterator[UnifiedLog]:
        """
        Stream logs from frontend buffer.

        For SSE endpoint. Yields logs as they become available.

        Args:
            start_time: Optional start timestamp for log filtering
            end_time: Optional end timestamp for log filtering

        Yields:
            UnifiedLog entries in chronological order

        Raises:
            ProviderTimeoutError: If operation exceeds timeout
            ProviderError: If log fetching fails
        """
        try:
            timeout_sec = self.timeout_ms / 1000.0

            async with asyncio.timeout(timeout_sec):
                last_seq = 0

                while True:
                    logs = await self.buffer.get_logs(
                        investigation_id=self.investigation_id,
                        start_time=start_time,
                        end_time=end_time
                    )

                    new_logs = [log for log in logs if log.seq > last_seq]

                    for log in new_logs:
                        yield log
                        last_seq = max(last_seq, log.seq)

                    if end_time and datetime.now() > end_time:
                        break

                    await asyncio.sleep(0.1)

        except asyncio.TimeoutError as e:
            raise ProviderTimeoutError(
                provider_name=self.get_provider_name(),
                message=f"Stream logs timed out after {timeout_sec}s",
                cause=e
            )
        except Exception as e:
            logger.error(
                f"Frontend log provider stream failed: {e}",
                extra={"investigation_id": self.investigation_id}
            )
            raise ProviderError(
                provider_name=self.get_provider_name(),
                message="Failed to stream frontend logs",
                cause=e
            )

    async def fetch_logs(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[UnifiedLog]:
        """
        Fetch a batch of logs (for polling endpoint).

        Args:
            start_time: Optional start timestamp
            end_time: Optional end timestamp
            limit: Maximum number of logs to return

        Returns:
            List of UnifiedLog entries sorted by (ts, seq)

        Raises:
            ProviderTimeoutError: If operation exceeds timeout
            ProviderError: If log fetching fails
        """
        try:
            timeout_sec = self.timeout_ms / 1000.0

            async with asyncio.timeout(timeout_sec):
                return await self.buffer.get_logs(
                    investigation_id=self.investigation_id,
                    start_time=start_time,
                    end_time=end_time,
                    limit=limit
                )

        except asyncio.TimeoutError as e:
            raise ProviderTimeoutError(
                provider_name=self.get_provider_name(),
                message=f"Fetch logs timed out after {timeout_sec}s",
                cause=e
            )
        except Exception as e:
            logger.error(
                f"Frontend log provider fetch failed: {e}",
                extra={"investigation_id": self.investigation_id}
            )
            raise ProviderError(
                provider_name=self.get_provider_name(),
                message="Failed to fetch frontend logs",
                cause=e
            )

    async def health_check(self) -> bool:
        """
        Check if provider is healthy and can fetch logs.

        Returns:
            True if provider is operational, False otherwise
        """
        try:
            await self.buffer.get_logs(
                investigation_id=self.investigation_id,
                limit=1
            )
            return True
        except Exception as e:
            logger.warning(
                f"Frontend log provider health check failed: {e}",
                extra={"investigation_id": self.investigation_id}
            )
            return False
