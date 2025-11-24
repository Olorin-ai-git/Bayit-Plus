"""
LogProvider Base Interface
Feature: 021-live-merged-logstream

Abstract base class for log providers that fetch logs from different sources.
Supports async streaming and enables pluggable log sources (local-dev, Sentry, Datadog, etc.).

Author: Gil Klainert
Date: 2025-11-12
Spec: /specs/021-live-merged-logstream/research.md
"""

from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional
from datetime import datetime

from app.models.unified_log import UnifiedLog


class LogProvider(ABC):
    """
    Abstract base class for log providers.

    Implementations fetch logs from specific sources (frontend, backend, external services)
    and yield them as UnifiedLog entries in chronological order.
    """

    def __init__(self, investigation_id: str, timeout_ms: int = 30000):
        """
        Initialize log provider.

        Args:
            investigation_id: Investigation ID to filter logs
            timeout_ms: Request timeout in milliseconds
        """
        self.investigation_id = investigation_id
        self.timeout_ms = timeout_ms

    @abstractmethod
    async def stream_logs(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None
    ) -> AsyncIterator[UnifiedLog]:
        """
        Stream logs from this provider.

        Args:
            start_time: Optional start timestamp for log filtering
            end_time: Optional end timestamp for log filtering

        Yields:
            UnifiedLog entries in chronological order (sorted by ts, seq)

        Raises:
            ProviderError: If log fetching fails
        """
        pass

    @abstractmethod
    async def fetch_logs(
        self,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> list[UnifiedLog]:
        """
        Fetch a batch of logs (for polling endpoint).

        Args:
            start_time: Optional start timestamp
            end_time: Optional end timestamp
            limit: Maximum number of logs to return

        Returns:
            List of UnifiedLog entries sorted by (ts, seq)

        Raises:
            ProviderError: If log fetching fails
        """
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """
        Check if provider is healthy and can fetch logs.

        Returns:
            True if provider is operational, False otherwise
        """
        pass

    def get_provider_name(self) -> str:
        """Get human-readable provider name"""
        return self.__class__.__name__


class ProviderError(Exception):
    """Exception raised when log provider encounters an error"""

    def __init__(self, provider_name: str, message: str, cause: Optional[Exception] = None):
        self.provider_name = provider_name
        self.message = message
        self.cause = cause
        super().__init__(f"{provider_name}: {message}")


class ProviderTimeoutError(ProviderError):
    """Exception raised when provider operation times out"""
    pass


class ProviderUnavailableError(ProviderError):
    """Exception raised when provider is temporarily unavailable"""
    pass
