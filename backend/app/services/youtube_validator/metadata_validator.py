"""
YouTube Metadata Validator

Validation logic using YouTube oEmbed API and Data API v3.
Handles video availability, privacy status, and embedding permissions.
"""

import logging

import httpx

from app.core.config import settings
from app.services.youtube_validator.constants import (
    OEMBED_URL,
    YOUTUBE_API_BASE_URL,
    VIDEO_STATUS_AVAILABLE,
    VIDEO_STATUS_UNAVAILABLE,
    VIDEO_STATUS_PRIVATE,
    VIDEO_STATUS_REMOVED,
    VIDEO_STATUS_ERROR,
    HTTP_STATUS_OK,
    HTTP_STATUS_UNAUTHORIZED,
    HTTP_STATUS_FORBIDDEN,
    HTTP_STATUS_NOT_FOUND,
)
from app.services.youtube_validator.models import YouTubeValidationResult
from app.services.youtube_validator.url_parser import build_watch_url


logger = logging.getLogger(__name__)


async def validate_with_oembed(
    client: httpx.AsyncClient,
    url: str,
    video_id: str
) -> YouTubeValidationResult:
    """Validate using YouTube oEmbed API (no API key required)."""
    watch_url = build_watch_url(video_id)
    params = {"url": watch_url, "format": "json"}
    response = await client.get(OEMBED_URL, params=params)

    if response.status_code == HTTP_STATUS_OK:
        data = response.json()
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=True,
            status=VIDEO_STATUS_AVAILABLE,
            title=data.get("title"),
            author=data.get("author_name")
        )

    if response.status_code == HTTP_STATUS_UNAUTHORIZED:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status=VIDEO_STATUS_PRIVATE,
            error_message="Video is private or requires authentication"
        )

    if response.status_code == HTTP_STATUS_NOT_FOUND:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status=VIDEO_STATUS_REMOVED,
            error_message="Video not found or has been removed"
        )

    if response.status_code == HTTP_STATUS_FORBIDDEN:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status=VIDEO_STATUS_UNAVAILABLE,
            error_message="Video is not available (may be region-locked or restricted)"
        )

    return YouTubeValidationResult(
        url=url,
        video_id=video_id,
        is_valid=False,
        status=VIDEO_STATUS_ERROR,
        error_message=f"HTTP {response.status_code}"
    )


async def validate_with_api(
    client: httpx.AsyncClient,
    url: str,
    video_id: str
) -> YouTubeValidationResult:
    """Validate using YouTube Data API v3 (requires API key)."""
    api_key = settings.YOUTUBE_API_KEY
    if not api_key:
        raise ValueError("YOUTUBE_API_KEY is not configured")

    params = {"key": api_key, "id": video_id, "part": "snippet,status"}
    response = await client.get(f"{YOUTUBE_API_BASE_URL}/videos", params=params)

    if response.status_code != HTTP_STATUS_OK:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status=VIDEO_STATUS_ERROR,
            error_message=f"API error: HTTP {response.status_code}"
        )

    data = response.json()
    items = data.get("items", [])

    if not items:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status=VIDEO_STATUS_REMOVED,
            error_message="Video not found or has been removed"
        )

    video = items[0]
    snippet = video.get("snippet", {})
    status = video.get("status", {})
    privacy_status = status.get("privacyStatus", "public")
    embeddable = status.get("embeddable", True)
    title = snippet.get("title")
    author = snippet.get("channelTitle")

    if privacy_status == "private":
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status=VIDEO_STATUS_PRIVATE,
            title=title,
            author=author,
            error_message="Video is private"
        )

    if not embeddable:
        return YouTubeValidationResult(
            url=url,
            video_id=video_id,
            is_valid=False,
            status=VIDEO_STATUS_UNAVAILABLE,
            title=title,
            author=author,
            error_message="Video embedding is disabled"
        )

    return YouTubeValidationResult(
        url=url,
        video_id=video_id,
        is_valid=True,
        status=VIDEO_STATUS_AVAILABLE,
        title=title,
        author=author
    )


def has_api_key() -> bool:
    """Check if YouTube Data API key is configured."""
    return bool(settings.YOUTUBE_API_KEY)
