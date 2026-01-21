"""
Partner Rate Limiter Service

Sliding window rate limiting for per-partner capability access.
"""

import asyncio
import logging
import time
from collections import defaultdict
from typing import Dict, List, Optional, Tuple

from app.models.integration_partner import RateLimitConfig

logger = logging.getLogger(__name__)


class SlidingWindowCounter:
    """
    Sliding window counter for rate limiting.

    Tracks request counts in time buckets for accurate rate limiting
    over rolling time windows.
    """

    def __init__(self, window_seconds: int = 60):
        """
        Initialize sliding window counter.

        Args:
            window_seconds: Size of the sliding window in seconds
        """
        self.window_seconds = window_seconds
        self._buckets: List[Tuple[float, int]] = []  # (timestamp, count)
        self._lock = asyncio.Lock()

    async def add_request(self) -> None:
        """Record a new request."""
        async with self._lock:
            current_time = time.time()
            self._cleanup_old_buckets(current_time)
            self._buckets.append((current_time, 1))

    async def get_count(self) -> int:
        """Get total request count in current window."""
        async with self._lock:
            current_time = time.time()
            self._cleanup_old_buckets(current_time)
            return sum(count for _, count in self._buckets)

    def _cleanup_old_buckets(self, current_time: float) -> None:
        """Remove buckets outside the window."""
        cutoff = current_time - self.window_seconds
        self._buckets = [(ts, count) for ts, count in self._buckets if ts > cutoff]


class PartnerRateLimiter:
    """
    Rate limiter service for per-partner capability access.

    Implements sliding window rate limiting with support for:
    - Per-minute limits
    - Per-hour limits
    - Per-day limits
    """

    def __init__(self):
        """Initialize the rate limiter."""
        # Nested dict: partner_id -> capability -> time_window -> counter
        self._counters: Dict[str, Dict[str, Dict[str, SlidingWindowCounter]]] = (
            defaultdict(lambda: defaultdict(dict))
        )
        self._lock = asyncio.Lock()

    def _get_counter(
        self,
        partner_id: str,
        capability: str,
        window_type: str,
        window_seconds: int,
    ) -> SlidingWindowCounter:
        """Get or create a counter for the given parameters."""
        partner_counters = self._counters[partner_id][capability]
        if window_type not in partner_counters:
            partner_counters[window_type] = SlidingWindowCounter(window_seconds)
        return partner_counters[window_type]

    async def check_rate_limit(
        self,
        partner_id: str,
        capability: str,
        rate_limits: RateLimitConfig,
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if partner is within rate limits for a capability.

        Args:
            partner_id: Partner identifier
            capability: Capability being accessed
            rate_limits: Rate limit configuration

        Returns:
            Tuple of (is_within_limit, error_message)
        """
        async with self._lock:
            # Check minute limit
            if rate_limits.requests_per_minute:
                counter = self._get_counter(partner_id, capability, "minute", 60)
                count = await counter.get_count()
                if count >= rate_limits.requests_per_minute:
                    logger.warning(
                        f"Partner {partner_id} exceeded minute rate limit "
                        f"({count}/{rate_limits.requests_per_minute}) for {capability}"
                    )
                    return False, (
                        f"Rate limit exceeded: {count}/{rate_limits.requests_per_minute} "
                        f"requests per minute for {capability}"
                    )

            # Check hour limit
            if rate_limits.requests_per_hour:
                counter = self._get_counter(partner_id, capability, "hour", 3600)
                count = await counter.get_count()
                if count >= rate_limits.requests_per_hour:
                    logger.warning(
                        f"Partner {partner_id} exceeded hour rate limit "
                        f"({count}/{rate_limits.requests_per_hour}) for {capability}"
                    )
                    return False, (
                        f"Rate limit exceeded: {count}/{rate_limits.requests_per_hour} "
                        f"requests per hour for {capability}"
                    )

            # Check day limit
            if rate_limits.requests_per_day:
                counter = self._get_counter(partner_id, capability, "day", 86400)
                count = await counter.get_count()
                if count >= rate_limits.requests_per_day:
                    logger.warning(
                        f"Partner {partner_id} exceeded day rate limit "
                        f"({count}/{rate_limits.requests_per_day}) for {capability}"
                    )
                    return False, (
                        f"Rate limit exceeded: {count}/{rate_limits.requests_per_day} "
                        f"requests per day for {capability}"
                    )

            return True, None

    async def record_request(
        self,
        partner_id: str,
        capability: str,
    ) -> None:
        """
        Record a successful request for rate limiting.

        Should be called after successful endpoint handling to track usage.

        Args:
            partner_id: Partner identifier
            capability: Capability accessed
        """
        async with self._lock:
            # Record in all relevant windows
            for window_type, window_seconds in [
                ("minute", 60),
                ("hour", 3600),
                ("day", 86400),
            ]:
                counter = self._get_counter(
                    partner_id, capability, window_type, window_seconds
                )
                await counter.add_request()

        logger.debug(
            f"Recorded request for partner {partner_id}, capability {capability}"
        )

    async def get_usage_stats(
        self,
        partner_id: str,
        capability: str,
    ) -> Dict[str, int]:
        """
        Get current usage statistics for a partner's capability.

        Args:
            partner_id: Partner identifier
            capability: Capability to check

        Returns:
            Dict with counts for each time window
        """
        stats = {}
        async with self._lock:
            for window_type, window_seconds in [
                ("minute", 60),
                ("hour", 3600),
                ("day", 86400),
            ]:
                counter = self._get_counter(
                    partner_id, capability, window_type, window_seconds
                )
                stats[f"requests_per_{window_type}"] = await counter.get_count()

        return stats

    def reset(self, partner_id: Optional[str] = None) -> None:
        """
        Reset rate limit counters.

        Args:
            partner_id: Reset only for this partner, or all if None
        """
        if partner_id:
            if partner_id in self._counters:
                del self._counters[partner_id]
                logger.info(f"Reset rate limit counters for partner {partner_id}")
        else:
            self._counters.clear()
            logger.info("Reset all rate limit counters")


# Singleton instance
partner_rate_limiter = PartnerRateLimiter()
