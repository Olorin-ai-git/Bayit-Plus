"""
Rate limiting service for live features (WebSocket and REST endpoints)
Prevents abuse and brute force attacks
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class LiveFeatureRateLimiter:
    """In-memory rate limiter for live features with sliding window algorithm"""

    def __init__(self):
        self._connection_attempts: dict[str, list[datetime]] = {}
        self._api_requests: dict[str, list[datetime]] = {}
        self._cleanup_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start background cleanup task"""
        self._cleanup_task = asyncio.create_task(self._cleanup_expired())

    async def stop(self):
        """Stop background cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

    async def _cleanup_expired(self):
        """Periodically cleanup expired entries"""
        while True:
            try:
                await asyncio.sleep(60)
                now = datetime.utcnow()
                for cache in [self._connection_attempts, self._api_requests]:
                    expired_keys = [
                        k
                        for k, v in cache.items()
                        if not v or (now - v[-1]).total_seconds() > 3600
                    ]
                    for key in expired_keys:
                        del cache[key]
                logger.debug(
                    f"Cleaned up {len(expired_keys)} expired rate limit entries"
                )
            except Exception as e:
                logger.error(f"Error in rate limiter cleanup: {e}")

    def _check_limit(
        self, cache: dict, key: str, limit: int, window_seconds: int
    ) -> tuple[bool, int]:
        """Check if key is within rate limit"""
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=window_seconds)

        if key not in cache:
            cache[key] = []

        cache[key] = [ts for ts in cache[key] if ts > cutoff]
        current_count = len(cache[key])

        if current_count >= limit:
            oldest = cache[key][0]
            reset_in = int((oldest - cutoff).total_seconds())
            return False, reset_in

        cache[key].append(now)
        return True, 0

    async def check_websocket_connection(
        self, user_id: str
    ) -> tuple[bool, Optional[str], int]:
        """
        Check WebSocket connection rate limit (5 connections per minute)
        Returns: (allowed, error_message, reset_in_seconds)
        """
        allowed, reset_in = self._check_limit(
            self._connection_attempts,
            f"ws:{user_id}",
            limit=settings.LIVE_QUOTA_WEBSOCKET_RATE_LIMIT,
            window_seconds=60,
        )
        if not allowed:
            error_msg = f"WebSocket connection rate limit exceeded. Try again in {reset_in} seconds."
            logger.warning(f"WebSocket rate limit exceeded for user {user_id}")
            return False, error_msg, reset_in
        return True, None, 0

    async def check_api_request(
        self, user_id: str, endpoint: str
    ) -> tuple[bool, Optional[str], int]:
        """
        Check REST API rate limit (100 requests per minute)
        Returns: (allowed, error_message, reset_in_seconds)
        """
        allowed, reset_in = self._check_limit(
            self._api_requests,
            f"api:{user_id}:{endpoint}",
            limit=settings.LIVE_QUOTA_API_RATE_LIMIT,
            window_seconds=60,
        )
        if not allowed:
            error_msg = f"API rate limit exceeded. Try again in {reset_in} seconds."
            logger.warning(f"API rate limit exceeded for user {user_id} on {endpoint}")
            return False, error_msg, reset_in
        return True, None, 0

    async def check_quota_check_limit(
        self, user_id: str
    ) -> tuple[bool, Optional[str], int]:
        """
        Check quota check rate limit (20 checks per minute to prevent spam)
        Returns: (allowed, error_message, reset_in_seconds)
        """
        allowed, reset_in = self._check_limit(
            self._api_requests,
            f"quota_check:{user_id}",
            limit=settings.LIVE_QUOTA_CHECK_RATE_LIMIT,
            window_seconds=60,
        )
        if not allowed:
            error_msg = (
                f"Quota check rate limit exceeded. Try again in {reset_in} seconds."
            )
            logger.warning(f"Quota check rate limit exceeded for user {user_id}")
            return False, error_msg, reset_in
        return True, None, 0


# Global rate limiter instance
_rate_limiter: Optional[LiveFeatureRateLimiter] = None


async def get_rate_limiter() -> LiveFeatureRateLimiter:
    """Get or create global rate limiter instance"""
    global _rate_limiter
    if _rate_limiter is None:
        _rate_limiter = LiveFeatureRateLimiter()
        await _rate_limiter.start()
    return _rate_limiter


async def shutdown_rate_limiter():
    """Shutdown global rate limiter"""
    global _rate_limiter
    if _rate_limiter:
        await _rate_limiter.stop()
        _rate_limiter = None
