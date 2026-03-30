"""
Partner Rate Limiter Service

MongoDB-backed sliding window rate limiting for per-partner capability access.
Falls back to in-memory counters if MongoDB operations exceed timeout.
"""

import asyncio
import logging
import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from app.models.integration_partner import RateLimitConfig
from app.services.olorin import rate_limiter_store as store

logger = logging.getLogger(__name__)

MONGODB_TIMEOUT_MS = 100

WINDOWS = [
    ("minute", 60),
    ("hour", 3600),
    ("day", 86400),
]


class SlidingWindowCounter:
    """In-memory fallback counter for rate limiting."""

    def __init__(self, window_seconds: int = 60):
        self.window_seconds = window_seconds
        self._buckets: List[Tuple[float, int]] = []
        self._lock = asyncio.Lock()

    async def add_request(self) -> None:
        async with self._lock:
            now = time.time()
            self._cleanup(now)
            self._buckets.append((now, 1))

    async def get_count(self) -> int:
        async with self._lock:
            self._cleanup(time.time())
            return sum(c for _, c in self._buckets)

    def _cleanup(self, now: float) -> None:
        cutoff = now - self.window_seconds
        self._buckets = [(ts, c) for ts, c in self._buckets if ts > cutoff]


async def _get_count_with_fallback(
    partner_id: str,
    capability: str,
    window_type: str,
    window_seconds: int,
    fallback: SlidingWindowCounter,
) -> int:
    """Get count from MongoDB, falling back to in-memory on timeout."""
    try:
        return await asyncio.wait_for(
            store.get_count(partner_id, capability, window_type, window_seconds),
            timeout=MONGODB_TIMEOUT_MS / 1000,
        )
    except (asyncio.TimeoutError, Exception) as exc:
        logger.warning("Rate limiter read fallback: %s", exc)
        return await fallback.get_count()


class PartnerRateLimiter:
    """
    MongoDB-backed rate limiter with in-memory fallback.

    Uses atomic $inc on MongoDB documents keyed by time buckets.
    Falls back to in-memory SlidingWindowCounter if MongoDB is slow.
    """

    def __init__(self):
        self._fallback: Dict[str, Dict[str, Dict[str, SlidingWindowCounter]]] = (
            defaultdict(lambda: defaultdict(dict))
        )

    def _get_fallback(
        self, partner_id: str, capability: str,
        window_type: str, window_seconds: int,
    ) -> SlidingWindowCounter:
        counters = self._fallback[partner_id][capability]
        if window_type not in counters:
            counters[window_type] = SlidingWindowCounter(window_seconds)
        return counters[window_type]

    async def check_rate_limit(
        self,
        partner_id: str,
        capability: str,
        rate_limits: RateLimitConfig,
    ) -> Tuple[bool, Optional[str]]:
        """Check if partner is within rate limits for a capability."""
        limits = [
            ("minute", 60, rate_limits.requests_per_minute),
            ("hour", 3600, rate_limits.requests_per_hour),
            ("day", 86400, rate_limits.requests_per_day),
        ]

        for window_type, window_seconds, limit in limits:
            if not limit:
                continue

            fb = self._get_fallback(
                partner_id, capability, window_type, window_seconds
            )
            count = await _get_count_with_fallback(
                partner_id, capability, window_type, window_seconds, fb
            )

            if count >= limit:
                logger.warning(
                    "Partner %s exceeded %s rate limit (%d/%d) for %s",
                    partner_id, window_type, count, limit, capability,
                )
                return False, (
                    f"Rate limit exceeded: {count}/{limit} "
                    f"requests per {window_type} for {capability}"
                )

        return True, None

    async def record_request(
        self, partner_id: str, capability: str,
    ) -> None:
        """Record a successful request for rate limiting."""
        await store.ensure_indexes()

        for window_type, window_seconds in WINDOWS:
            try:
                await asyncio.wait_for(
                    store.increment(
                        partner_id, capability, window_type, window_seconds
                    ),
                    timeout=MONGODB_TIMEOUT_MS / 1000,
                )
            except (asyncio.TimeoutError, Exception) as exc:
                logger.warning("Rate limiter write fallback: %s", exc)
                fb = self._get_fallback(
                    partner_id, capability, window_type, window_seconds
                )
                await fb.add_request()

    async def get_usage_stats(
        self, partner_id: str, capability: str,
    ) -> Dict[str, int]:
        """Get current usage statistics for a partner's capability."""
        stats = {}
        for window_type, window_seconds in WINDOWS:
            fb = self._get_fallback(
                partner_id, capability, window_type, window_seconds
            )
            count = await _get_count_with_fallback(
                partner_id, capability, window_type, window_seconds, fb
            )
            stats[f"requests_per_{window_type}"] = count
        return stats

    def reset(self, partner_id: Optional[str] = None) -> None:
        """Reset in-memory fallback counters."""
        if partner_id:
            self._fallback.pop(partner_id, None)
        else:
            self._fallback.clear()


partner_rate_limiter = PartnerRateLimiter()
