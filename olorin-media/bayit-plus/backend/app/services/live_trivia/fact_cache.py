"""
Fact Cache Manager

Manages Redis caching of trivia facts for live trivia system.
"""

import json
import logging
from typing import List, Optional

from app.models.trivia import TriviaFactModel

logger = logging.getLogger(__name__)


class FactCache:
    """Manages Redis caching of trivia facts."""

    def __init__(self, redis_client, cache_ttl_seconds: int):
        """
        Initialize fact cache.

        Args:
            redis_client: Redis client instance
            cache_ttl_seconds: TTL for cached facts in seconds
        """
        self.redis = redis_client
        self.cache_ttl = cache_ttl_seconds

    async def get_cached_facts(self, topic_hash: str) -> Optional[List[TriviaFactModel]]:
        """
        Get cached facts from Redis for a topic.

        Args:
            topic_hash: Topic hash key

        Returns:
            List of TriviaFactModel or None if not cached
        """
        key = f"live_trivia:facts:{topic_hash}"
        cached = await self.redis.get(key)

        if cached:
            try:
                facts_data = json.loads(cached)
                facts = [TriviaFactModel(**fact_dict) for fact_dict in facts_data]
                logger.info(f"Cache HIT: {topic_hash} ({len(facts)} facts)")
                return facts
            except Exception as e:
                logger.error(f"Failed to deserialize cached facts for {topic_hash}: {e}")
                return None

        logger.info(f"Cache MISS: {topic_hash}")
        return None

    async def cache_facts(self, topic_hash: str, facts: List[TriviaFactModel]) -> None:
        """
        Cache facts in Redis with TTL.

        Args:
            topic_hash: Topic hash key
            facts: List of TriviaFactModel to cache
        """
        key = f"live_trivia:facts:{topic_hash}"
        facts_data = [fact.dict() for fact in facts]

        try:
            await self.redis.setex(
                key,
                self.cache_ttl,
                json.dumps(facts_data)
            )
            logger.info(f"Cached {len(facts)} facts for {topic_hash} (TTL: {self.cache_ttl}s)")
        except Exception as e:
            logger.error(f"Failed to cache facts for {topic_hash}: {e}")
