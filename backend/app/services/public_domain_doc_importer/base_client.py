"""Abstract base client for public domain documentary content sources.

Uses Olorin resilience patterns (circuit breaker) and rate limiting.
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings
from app.services.olorin.resilience import CircuitBreakerError, get_circuit_breaker

logger = logging.getLogger(__name__)


class BaseDocSourceClient(ABC):
    """Abstract base class for documentary content source API clients."""

    def __init__(self, source_name: str):
        self.source_name = source_name
        self._http_client: Optional[httpx.AsyncClient] = None
        self._circuit_breaker = get_circuit_breaker(
            f"doc_import_{source_name}"
        )
        self._request_timestamps: List[float] = []
        self._rate_lock = asyncio.Lock()

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client with configured timeout."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=float(settings.DOC_IMPORT_HTTP_TIMEOUT_SECONDS),
                follow_redirects=True,
            )
        return self._http_client

    async def close(self) -> None:
        """Close the HTTP client."""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()
            self._http_client = None

    async def _rate_limit_wait(self) -> None:
        """Sliding window rate limiter per source."""
        import time

        async with self._rate_lock:
            now = time.time()
            window = 60.0
            max_requests = settings.DOC_IMPORT_RATE_LIMIT_REQUESTS_PER_MINUTE

            self._request_timestamps = [
                ts for ts in self._request_timestamps if now - ts < window
            ]

            if len(self._request_timestamps) >= max_requests:
                oldest = self._request_timestamps[0]
                wait_time = window - (now - oldest) + 0.1
                logger.info(
                    "Rate limit reached, waiting",
                    extra={"source": self.source_name, "wait_seconds": wait_time},
                )
                await asyncio.sleep(wait_time)

            self._request_timestamps.append(time.time())

    async def _request_with_resilience(
        self,
        method: str,
        url: str,
        **kwargs: Any,
    ) -> httpx.Response:
        """Make HTTP request with circuit breaker and retry logic."""
        if not await self._circuit_breaker.can_execute():
            raise CircuitBreakerError(
                self.source_name,
                "Service unavailable, circuit breaker open",
            )

        await self._rate_limit_wait()
        client = await self._get_client()

        max_attempts = settings.DOC_IMPORT_RETRY_MAX_ATTEMPTS
        backoff_base = settings.DOC_IMPORT_RETRY_BACKOFF_BASE_SECONDS

        last_exception: Optional[Exception] = None

        for attempt in range(max_attempts):
            try:
                response = await client.request(method, url, **kwargs)

                if response.status_code == 429:
                    wait = backoff_base * (2 ** attempt)
                    logger.warning(
                        "Rate limited by upstream, backing off",
                        extra={
                            "source": self.source_name,
                            "attempt": attempt + 1,
                            "wait_seconds": wait,
                        },
                    )
                    await asyncio.sleep(wait)
                    continue

                if response.status_code >= 500:
                    wait = backoff_base * (2 ** attempt)
                    logger.warning(
                        "Server error from upstream, retrying",
                        extra={
                            "source": self.source_name,
                            "status": response.status_code,
                            "attempt": attempt + 1,
                        },
                    )
                    await asyncio.sleep(wait)
                    continue

                await self._circuit_breaker.record_success()
                return response

            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                last_exception = exc
                wait = backoff_base * (2 ** attempt)
                logger.warning(
                    "Request failed, retrying",
                    extra={
                        "source": self.source_name,
                        "error": str(exc),
                        "attempt": attempt + 1,
                    },
                )
                if attempt < max_attempts - 1:
                    await asyncio.sleep(wait)

        if last_exception:
            await self._circuit_breaker.record_failure(last_exception)
            raise last_exception

        raise httpx.HTTPError("Max retries exhausted")

    @abstractmethod
    async def search(
        self, query: str, page: int = 1, page_size: int = 20
    ) -> List[Dict[str, Any]]:
        """Search for content items."""

    @abstractmethod
    async def get_item_detail(self, source_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific item."""

    @abstractmethod
    async def get_video_url(self, source_id: str) -> Optional[str]:
        """Get the video stream URL for an item."""

    @abstractmethod
    async def get_thumbnail_url(self, source_id: str) -> Optional[str]:
        """Get the thumbnail URL for an item."""
