"""
YouTube Validation Cache

Caching functions for YouTube validation results.
Reduces redundant API calls by storing validation results with TTL.
"""

import logging
from datetime import datetime, timedelta
from typing import Dict, Any, List, Tuple, Optional

from app.models.librarian import StreamValidationCache
from app.services.youtube_validator.constants import (
    VIDEO_STATUS_CACHED_INVALID,
    STREAM_TYPE_YOUTUBE,
    CONTENT_TYPE_YOUTUBE,
    HTTP_STATUS_OK,
    HTTP_STATUS_NOT_FOUND,
    get_cache_ttl_valid_hours,
    get_cache_ttl_invalid_hours,
)
from app.services.youtube_validator.models import YouTubeValidationResult


logger = logging.getLogger(__name__)


async def filter_cached_youtube(
    urls: List[Dict[str, Any]]
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Filter URLs based on cache, return (uncached, cached_results).

    Args:
        urls: List of URL items with content metadata

    Returns:
        Tuple of (uncached items, cached results)
    """
    uncached = []
    cached_results = []
    now = datetime.utcnow()

    for item in urls:
        cached = await StreamValidationCache.find_one({
            "stream_url": item["url"],
            "expires_at": {"$gt": now}
        })

        if cached:
            if not cached.is_valid:
                cached_results.append({
                    "content_id": item["content_id"],
                    "title": item["title"],
                    "field": item["field"],
                    "url": item["url"],
                    "status": VIDEO_STATUS_CACHED_INVALID,
                    "error": cached.error_message,
                    "is_valid": False,
                    "from_cache": True
                })
            else:
                cached_results.append({"is_valid": True})
        else:
            uncached.append(item)

    return uncached, cached_results


async def cache_youtube_result(result: YouTubeValidationResult) -> None:
    """
    Cache a YouTube validation result.

    Args:
        result: Validation result to cache
    """
    try:
        valid_ttl = get_cache_ttl_valid_hours()
        invalid_ttl = get_cache_ttl_invalid_hours()

        if result.is_valid:
            ttl = timedelta(hours=valid_ttl)
            status_code = HTTP_STATUS_OK
        else:
            ttl = timedelta(hours=invalid_ttl)
            status_code = HTTP_STATUS_NOT_FOUND

        cache_entry = StreamValidationCache(
            stream_url=result.url,
            last_validated=datetime.utcnow(),
            is_valid=result.is_valid,
            status_code=status_code,
            response_time_ms=result.response_time_ms,
            error_message=result.error_message,
            stream_type=STREAM_TYPE_YOUTUBE,
            content_type=CONTENT_TYPE_YOUTUBE,
            expires_at=datetime.utcnow() + ttl
        )

        # Upsert (replace if exists)
        existing = await StreamValidationCache.find_one({"stream_url": result.url})
        if existing:
            await existing.delete()

        await cache_entry.insert()

    except Exception as e:
        logger.warning(f"Failed to cache YouTube validation result: {e}")


async def get_cached_validation(url: str) -> Optional[Dict[str, Any]]:
    """
    Get cached validation result for a URL.

    Args:
        url: YouTube URL to look up

    Returns:
        Cached result dict or None if not cached or expired
    """
    now = datetime.utcnow()
    cached = await StreamValidationCache.find_one({
        "stream_url": url,
        "expires_at": {"$gt": now}
    })

    if not cached:
        return None

    return {
        "url": cached.stream_url,
        "is_valid": cached.is_valid,
        "status_code": cached.status_code,
        "response_time_ms": cached.response_time_ms,
        "error_message": cached.error_message,
        "last_validated": cached.last_validated.isoformat(),
        "expires_at": cached.expires_at.isoformat(),
        "from_cache": True
    }


async def invalidate_cache(url: str) -> bool:
    """
    Invalidate cached validation result for a URL.

    Args:
        url: YouTube URL to invalidate

    Returns:
        True if cache entry was deleted, False if not found
    """
    existing = await StreamValidationCache.find_one({"stream_url": url})
    if existing:
        await existing.delete()
        return True
    return False
