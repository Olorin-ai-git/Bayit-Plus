"""
Trailer stream URL resolver.

Resolves YouTube embed/watch URLs into direct MP4 stream URLs
using yt-dlp, with in-memory TTL caching.
"""

import asyncio
import logging
import time
from typing import Optional

from app.core.config import settings
from app.services.youtube_validator.url_parser import (
    extract_video_id,
    is_youtube_url,
)

logger = logging.getLogger(__name__)

_cache: dict[str, tuple[str, float]] = {}


def _cache_ttl_seconds() -> float:
    return settings.TRAILER_STREAM_CACHE_TTL_HOURS * 3600


def _get_cached(video_id: str) -> Optional[str]:
    entry = _cache.get(video_id)
    if entry is None:
        return None
    url, expires_at = entry
    if time.monotonic() > expires_at:
        _cache.pop(video_id, None)
        return None
    return url


def _set_cached(video_id: str, stream_url: str) -> None:
    expires_at = time.monotonic() + _cache_ttl_seconds()
    _cache[video_id] = (stream_url, expires_at)


def _resolve_sync(watch_url: str) -> Optional[str]:
    from yt_dlp import YoutubeDL

    ydl_opts = {
        "format": "best[protocol=https]/best[ext=mp4]/best",
        "quiet": True,
        "no_warnings": True,
        "skip_download": True,
    }
    with YoutubeDL(ydl_opts) as ydl:
        info = ydl.extract_info(watch_url, download=False)
        if info:
            return info.get("url")
    return None


async def resolve_trailer_stream(trailer_url: str) -> Optional[str]:
    """
    Resolve a YouTube trailer URL into a direct playable stream URL.

    Args:
        trailer_url: YouTube embed or watch URL.

    Returns:
        Direct MP4 stream URL, or None if resolution fails.
    """
    if not is_youtube_url(trailer_url):
        return None

    video_id = extract_video_id(trailer_url)
    if not video_id:
        logger.warning("Cannot extract video ID from trailer URL")
        return None

    cached = _get_cached(video_id)
    if cached:
        logger.debug("Trailer stream cache hit", extra={"video_id": video_id})
        return cached

    watch_url = f"https://www.youtube.com/watch?v={video_id}"
    logger.info("Resolving trailer stream", extra={"video_id": video_id})

    loop = asyncio.get_running_loop()
    stream_url = await loop.run_in_executor(None, _resolve_sync, watch_url)

    if stream_url:
        _set_cached(video_id, stream_url)
        logger.info(
            "Trailer stream resolved",
            extra={"video_id": video_id},
        )
    else:
        logger.warning(
            "Failed to resolve trailer stream",
            extra={"video_id": video_id},
        )

    return stream_url
