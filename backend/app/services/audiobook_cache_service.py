"""
Audiobook Redis Cache Service.

Provides Redis-backed caching for audiobook endpoints with
graceful degradation when Redis is unavailable.
"""

import hashlib
import json
import logging
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.redis_client import get_redis_client

logger = logging.getLogger(__name__)

CACHE_PREFIX = "audiobooks"


def _hash_filters(filters: Dict[str, Any]) -> str:
    """Generate a deterministic hash from query filters."""
    raw = json.dumps(filters, sort_keys=True, default=str)
    return hashlib.md5(raw.encode()).hexdigest()


async def get_cached_list(filters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Get cached audiobook list response."""
    redis = await get_redis_client()
    key = f"{CACHE_PREFIX}:list:{_hash_filters(filters)}"
    return await redis.get(key)


async def set_cached_list(
    filters: Dict[str, Any], data: Dict[str, Any]
) -> None:
    """Cache audiobook list response."""
    redis = await get_redis_client()
    key = f"{CACHE_PREFIX}:list:{_hash_filters(filters)}"
    await redis.set_with_ttl(
        key, data, settings.AUDIOBOOK_LIST_CACHE_TTL_SECONDS
    )


async def get_cached_authors() -> Optional[Dict[str, Any]]:
    """Get cached authors list."""
    redis = await get_redis_client()
    return await redis.get(f"{CACHE_PREFIX}:authors")


async def set_cached_authors(data: Dict[str, Any]) -> None:
    """Cache authors list."""
    redis = await get_redis_client()
    await redis.set_with_ttl(
        f"{CACHE_PREFIX}:authors",
        data,
        settings.AUDIOBOOK_AUTHORS_CACHE_TTL_SECONDS,
    )


async def get_cached_detail(audiobook_id: str) -> Optional[Dict[str, Any]]:
    """Get cached audiobook detail."""
    redis = await get_redis_client()
    return await redis.get(f"{CACHE_PREFIX}:detail:{audiobook_id}")


async def set_cached_detail(
    audiobook_id: str, data: Dict[str, Any]
) -> None:
    """Cache audiobook detail."""
    redis = await get_redis_client()
    await redis.set_with_ttl(
        f"{CACHE_PREFIX}:detail:{audiobook_id}",
        data,
        settings.AUDIOBOOK_DETAIL_CACHE_TTL_SECONDS,
    )


async def get_cached_chapters(
    audiobook_id: str,
) -> Optional[Dict[str, Any]]:
    """Get cached audiobook chapters."""
    redis = await get_redis_client()
    return await redis.get(f"{CACHE_PREFIX}:chapters:{audiobook_id}")


async def set_cached_chapters(
    audiobook_id: str, data: Dict[str, Any]
) -> None:
    """Cache audiobook chapters."""
    redis = await get_redis_client()
    await redis.set_with_ttl(
        f"{CACHE_PREFIX}:chapters:{audiobook_id}",
        data,
        settings.AUDIOBOOK_CHAPTERS_CACHE_TTL_SECONDS,
    )


async def invalidate_audiobook(audiobook_id: str) -> None:
    """Invalidate caches for a specific audiobook."""
    redis = await get_redis_client()
    await redis.delete(f"{CACHE_PREFIX}:detail:{audiobook_id}")
    await redis.delete(f"{CACHE_PREFIX}:chapters:{audiobook_id}")
    logger.info("Invalidated audiobook cache: %s", audiobook_id)


async def invalidate_all() -> None:
    """Invalidate all audiobook list and authors caches.

    Deletes the well-known authors key. List keys use hashed
    filters so they rely on TTL expiry (120s) for full flush.
    """
    redis = await get_redis_client()
    await redis.delete(f"{CACHE_PREFIX}:authors")
    logger.info("Invalidated audiobook authors cache")
