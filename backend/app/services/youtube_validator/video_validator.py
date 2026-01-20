"""
YouTube Video Validator

Functions for validating individual YouTube videos.
Handles single video validation and thumbnail fetching.
"""

import logging
import time
from typing import Optional

import httpx

from app.services.youtube_validator.constants import (
    THUMBNAIL_QUALITIES,
    DEFAULT_THUMBNAIL_QUALITY,
    HTTP_STATUS_OK,
    get_validation_timeout,
    get_thumbnail_min_size_bytes,
    get_thumbnail_timeout,
)
from app.services.youtube_validator.models import YouTubeValidationResult
from app.services.youtube_validator.url_parser import (
    extract_video_id,
    get_thumbnail_url,
)
from app.services.youtube_validator.metadata_validator import (
    validate_with_oembed,
    validate_with_api,
    has_api_key,
)


logger = logging.getLogger(__name__)


async def validate_youtube_video(
    url: str,
    use_api: bool = False
) -> YouTubeValidationResult:
    """
    Validate a single YouTube video URL.

    Uses oEmbed by default (no API key required).
    Set use_api=True to use YouTube Data API v3 for more detailed info.

    Args:
        url: YouTube video URL
        use_api: Whether to use YouTube Data API v3 (requires YOUTUBE_API_KEY)

    Returns:
        YouTubeValidationResult with validation details
    """
    video_id = extract_video_id(url)

    if not video_id:
        return YouTubeValidationResult.create_invalid_url(url)

    start_time = time.time()
    timeout = get_validation_timeout()

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            if use_api and has_api_key():
                result = await validate_with_api(client, url, video_id)
            else:
                result = await validate_with_oembed(client, url, video_id)

            result.response_time_ms = int((time.time() - start_time) * 1000)
            return result

    except httpx.TimeoutException:
        return YouTubeValidationResult.create_error(
            url=url,
            video_id=video_id,
            error_message="Request timeout",
            response_time_ms=int((time.time() - start_time) * 1000)
        )
    except httpx.ConnectError:
        return YouTubeValidationResult.create_error(
            url=url,
            video_id=video_id,
            error_message="Connection failed",
            response_time_ms=int((time.time() - start_time) * 1000)
        )
    except Exception as e:
        logger.error(f"Error validating YouTube video {video_id}: {e}")
        return YouTubeValidationResult.create_error(
            url=url,
            video_id=video_id,
            error_message=str(e),
            response_time_ms=int((time.time() - start_time) * 1000)
        )


async def get_best_youtube_thumbnail(video_id: str) -> Optional[str]:
    """
    Get the best available YouTube thumbnail URL.

    Tries highest quality first and falls back to lower qualities.
    Returns None if video doesn't exist.

    Args:
        video_id: 11-character YouTube video ID

    Returns:
        Best available thumbnail URL or None
    """
    timeout = get_thumbnail_timeout()
    min_size = get_thumbnail_min_size_bytes()

    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            for quality in THUMBNAIL_QUALITIES:
                url = get_thumbnail_url(video_id, quality)
                try:
                    response = await client.head(url)
                    if response.status_code == HTTP_STATUS_OK:
                        # Verify it's not the default "no thumbnail" placeholder
                        # by checking content-length (placeholder is very small)
                        content_length = response.headers.get("content-length", "0")
                        if int(content_length) > min_size:
                            return url
                except Exception:
                    continue

            # Fallback to hqdefault which always exists
            return get_thumbnail_url(video_id, DEFAULT_THUMBNAIL_QUALITY)

    except Exception as e:
        logger.warning(f"Failed to get YouTube thumbnail for {video_id}: {e}")
        return get_thumbnail_url(video_id, DEFAULT_THUMBNAIL_QUALITY)
