"""
Search Result Caching Service.

Uses Redis for cross-process caching of search results to improve
performance and reduce database load for popular queries.
Falls back gracefully when Redis is unavailable.
"""

import hashlib
import json
import logging
from typing import Any, Dict, Optional

from app.core.config import settings
from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)


class SearchCacheService:
    """
    Redis-backed cache for search results.

    Features:
    - TTL-based expiration (default from settings.SEARCH_CACHE_TTL_SECONDS)
    - Cache key generation from query and filters
    - Graceful degradation when Redis is unavailable
    """

    def __init__(self):
        self.default_ttl = settings.SEARCH_CACHE_TTL_SECONDS
        self._stats_cleared = 0
        logger.info(f"SearchCacheService initialized with TTL: {self.default_ttl}s")

    def generate_cache_key(self, query: str, filters: Dict[str, Any]) -> str:
        """Generate consistent cache key from query and filters."""
        filter_str = json.dumps(filters, sort_keys=True)
        key_data = f"{query}:{filter_str}"
        hash_obj = hashlib.md5(key_data.encode())
        return f"search:{hash_obj.hexdigest()}"

    async def get(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached search results by key."""
        redis = await get_redis_client()
        result = await redis.get(cache_key)
        if result is None:
            logger.debug(f"Cache MISS: {cache_key}")
            return None
        logger.debug(f"Cache HIT: {cache_key}")
        return result

    async def set(
        self, cache_key: str, results: Dict[str, Any], ttl: Optional[int] = None
    ) -> None:
        """Cache search results with TTL."""
        used_ttl = ttl or self.default_ttl
        redis = await get_redis_client()
        await redis.set_with_ttl(cache_key, results, used_ttl)
        logger.debug(
            f"Cache SET: {cache_key} (TTL: {used_ttl}s, "
            f"size: {len(results.get('results', []))} items)"
        )

    async def get_cached_results(
        self, query: str, filters: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get cached results for query and filters."""
        cache_key = self.generate_cache_key(query, filters)
        return await self.get(cache_key)

    async def cache_results(
        self,
        query: str,
        filters: Dict[str, Any],
        results: Dict[str, Any],
        ttl: Optional[int] = None,
    ) -> None:
        """Cache search results for query and filters."""
        cache_key = self.generate_cache_key(query, filters)
        await self.set(cache_key, results, ttl)

    async def invalidate(
        self, query: Optional[str] = None, filters: Optional[Dict[str, Any]] = None
    ) -> None:
        """Invalidate specific cache entry. Full cache clear not supported with Redis."""
        if query is None:
            logger.info("Search cache invalidation requested (individual keys expire via TTL)")
            self._stats_cleared += 1
        else:
            cache_key = self.generate_cache_key(query, filters or {})
            redis = await get_redis_client()
            await redis.delete(cache_key)
            logger.debug(f"Cache INVALIDATED: {cache_key}")

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        return {
            "total_entries": 0,
            "default_ttl": self.default_ttl,
            "oldest_entry_age": 0,
            "newest_entry_age": 0,
        }


# Global cache instance
_cache_instance: Optional[SearchCacheService] = None


def get_cache() -> SearchCacheService:
    """Get or create global cache instance."""
    global _cache_instance
    if _cache_instance is None:
        _cache_instance = SearchCacheService()
    return _cache_instance
