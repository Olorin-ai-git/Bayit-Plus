"""
Fact Cache Manager

Manages Redis caching of trivia facts for live trivia system.
Falls back to in-memory LRU cache when Redis is unavailable.
"""

import json
import logging
import time
from typing import Dict, List, Optional, Tuple

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


class InMemoryFactCache:
    """In-memory fallback when Redis is unavailable.

    Uses a simple dict with TTL expiry and max-size eviction.
    """

    def __init__(self, cache_ttl_seconds: int, max_entries: int = 200):
        self.cache_ttl = cache_ttl_seconds
        self.max_entries = max_entries
        self._store: Dict[str, Tuple[List[TriviaFactModel], float]] = {}

    def _evict_expired(self) -> None:
        now = time.monotonic()
        expired = [k for k, (_, exp) in self._store.items() if now > exp]
        for k in expired:
            del self._store[k]

    async def get_cached_facts(
        self, topic_hash: str
    ) -> Optional[List[TriviaFactModel]]:
        self._evict_expired()
        key = f"live_trivia:facts:{topic_hash}"
        entry = self._store.get(key)
        if entry:
            logger.info("Cache HIT: %s (%d facts)", topic_hash, len(entry[0]))
            return entry[0]
        logger.info("Cache MISS: %s", topic_hash)
        return None

    async def cache_facts(
        self, topic_hash: str, facts: List[TriviaFactModel]
    ) -> None:
        self._evict_expired()
        if len(self._store) >= self.max_entries:
            oldest_key = next(iter(self._store))
            del self._store[oldest_key]
        key = f"live_trivia:facts:{topic_hash}"
        self._store[key] = (facts, time.monotonic() + self.cache_ttl)
        logger.info(
            "Cached %d facts for %s (TTL: %ds)", len(facts), topic_hash, self.cache_ttl
        )
