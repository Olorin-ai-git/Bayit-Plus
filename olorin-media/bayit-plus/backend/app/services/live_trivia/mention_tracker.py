"""
Mention Tracker

Manages Redis tracking of topic mentions and cooldowns for live trivia.
"""

import logging
from typing import Optional

logger = logging.getLogger(__name__)


class MentionTracker:
    """Tracks topic mentions and cooldowns using Redis."""

    def __init__(self, redis_client, topic_cooldown_minutes: int, mention_ttl_seconds: int):
        """
        Initialize mention tracker.

        Args:
            redis_client: Redis client instance
            topic_cooldown_minutes: Cooldown period for topics in minutes
            mention_ttl_seconds: TTL for mention tracking in seconds
        """
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
