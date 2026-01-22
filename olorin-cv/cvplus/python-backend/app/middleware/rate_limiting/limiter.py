"""
Rate Limiter Core
Token bucket rate limiter implementation
"""

import time
from threading import Lock
from typing import Dict, Tuple

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class RateLimiter:
    """
    Token bucket rate limiter
    In-memory implementation for single-instance deployments
    """

    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests_per_second = requests_per_minute / 60
        self.buckets: Dict[str, Tuple[float, int]] = {}
        self.lock = Lock()

    def is_allowed(self, key: str) -> bool:
        """
        Check if request is allowed under rate limit

        Args:
            key: Rate limit key (e.g., user_id or IP)

        Returns:
            True if allowed, False if rate limited
        """
        now = time.time()

        with self.lock:
            if key not in self.buckets:
                self.buckets[key] = (now, self.requests_per_minute - 1)
                return True

            last_check, tokens = self.buckets[key]

            # Calculate new tokens based on time elapsed
            elapsed = now - last_check
            new_tokens = min(
                self.requests_per_minute,
                tokens + elapsed * self.requests_per_second
            )

            if new_tokens >= 1:
                self.buckets[key] = (now, new_tokens - 1)
                return True
            else:
                self.buckets[key] = (now, new_tokens)
                return False

    def reset(self, key: str):
        """Reset rate limit for key"""
        with self.lock:
            if key in self.buckets:
                del self.buckets[key]

    def cleanup_old_entries(self, max_age_seconds: int = 3600):
        """Remove old entries to prevent memory bloat"""
        now = time.time()

        with self.lock:
            keys_to_delete = [
                key
                for key, (last_check, _) in self.buckets.items()
                if now - last_check > max_age_seconds
            ]

            for key in keys_to_delete:
                del self.buckets[key]

        if keys_to_delete:
            logger.debug(f"Cleaned up {len(keys_to_delete)} old rate limit entries")


# Global rate limiter instance
default_rate_limiter = RateLimiter(requests_per_minute=60)
