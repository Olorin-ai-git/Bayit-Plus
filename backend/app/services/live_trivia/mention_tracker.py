"""
Mention Tracker

Manages Redis tracking of topic mentions and cooldowns for live trivia.
Falls back to in-memory tracking when Redis is unavailable.
"""

import asyncio
import logging
import time
from typing import Dict, Optional, Tuple

logger = logging.getLogger(__name__)


class MentionTracker:
    """Tracks topic mentions and cooldowns using Redis."""

    def __init__(self, redis_client, topic_cooldown_minutes: int, mention_ttl_seconds: int):
        self.redis = redis_client
        self.cooldown_seconds = topic_cooldown_minutes * 60
        self.mention_ttl_seconds = mention_ttl_seconds

    async def increment_topic_mention(self, channel_id: str, topic_hash: str) -> int:
        """
        Increment topic mention count in Redis atomically.

        Args:
            channel_id: Live channel ID
            topic_hash: Topic hash key

        Returns:
            Current mention count after increment
        """
        key = f"live_trivia:mentions:{channel_id}:{topic_hash}"
        count = await self.redis.incr(key)
        if count == 1:
            # First mention, set TTL to auto-cleanup
            await self.redis.expire(key, self.mention_ttl_seconds)
        return count

    async def get_topic_mention_count(self, channel_id: str, topic_hash: str) -> int:
        """Get current topic mention count from Redis."""
        key = f"live_trivia:mentions:{channel_id}:{topic_hash}"
        count = await self.redis.get(key)
        return int(count) if count else 0

    async def check_topic_cooldown(self, user_id: str, topic_hash: str) -> bool:
        """
        Check if topic is in cooldown for user.

        Args:
            user_id: User ID
            topic_hash: Topic hash

        Returns:
            True if in cooldown, False if can show
        """
        key = f"live_trivia:cooldown:{user_id}:{topic_hash}"
        in_cooldown = await self.redis.exists(key)
        return bool(in_cooldown)

    async def set_topic_cooldown(self, user_id: str, topic_hash: str) -> None:
        """
        Set cooldown for topic-user pair.

        Args:
            user_id: User ID
            topic_hash: Topic hash
        """
        key = f"live_trivia:cooldown:{user_id}:{topic_hash}"
        await self.redis.setex(key, self.cooldown_seconds, "1")

    async def cleanup_old_mentions(self, channel_id: str, max_age_minutes: int = 30) -> None:
        """
        Cleanup old mention counts (optional maintenance task).

        Args:
            channel_id: Live channel ID
            max_age_minutes: Max age for mentions
        """
        # Redis TTL auto-cleanup handles this, but this method
        # provides explicit cleanup if needed
        pattern = f"live_trivia:mentions:{channel_id}:*"
        cursor = 0

        while True:
            cursor, keys = await self.redis.scan(
                cursor,
                match=pattern,
                count=100
            )

            for key in keys:
                # Check TTL, if > max_age_minutes * 60, delete
                ttl = await self.redis.ttl(key)
                if ttl > max_age_minutes * 60:
                    await self.redis.delete(key)

            if cursor == 0:
                break


class InMemoryMentionTracker:
    """In-memory fallback when Redis is unavailable.

    Provides the same interface as MentionTracker but uses
    local dicts with TTL-based expiry. Suitable for single-instance
    dev environments only.
    """

    def __init__(self, topic_cooldown_minutes: int, mention_ttl_seconds: int):
        self.cooldown_seconds = topic_cooldown_minutes * 60
        self.mention_ttl_seconds = mention_ttl_seconds
        self._mentions: Dict[str, Tuple[int, float]] = {}
        self._cooldowns: Dict[str, float] = {}

    def _evict_expired(self) -> None:
        now = time.monotonic()
        expired = [k for k, (_, exp) in self._mentions.items() if now > exp]
        for k in expired:
            del self._mentions[k]
        expired_cd = [k for k, exp in self._cooldowns.items() if now > exp]
        for k in expired_cd:
            del self._cooldowns[k]

    async def increment_topic_mention(
        self, channel_id: str, topic_hash: str
    ) -> int:
        self._evict_expired()
        key = f"{channel_id}:{topic_hash}"
        now = time.monotonic()
        if key in self._mentions:
            count, expiry = self._mentions[key]
            self._mentions[key] = (count + 1, expiry)
            return count + 1
        self._mentions[key] = (1, now + self.mention_ttl_seconds)
        return 1

    async def get_topic_mention_count(
        self, channel_id: str, topic_hash: str
    ) -> int:
        self._evict_expired()
        key = f"{channel_id}:{topic_hash}"
        entry = self._mentions.get(key)
        return entry[0] if entry else 0

    async def check_topic_cooldown(
        self, user_id: str, topic_hash: str
    ) -> bool:
        self._evict_expired()
        key = f"{user_id}:{topic_hash}"
        return key in self._cooldowns

    async def set_topic_cooldown(
        self, user_id: str, topic_hash: str
    ) -> None:
        now = time.monotonic()
        key = f"{user_id}:{topic_hash}"
        self._cooldowns[key] = now + self.cooldown_seconds

    async def cleanup_old_mentions(
        self, channel_id: str, max_age_minutes: int = 30
    ) -> None:
        self._evict_expired()
