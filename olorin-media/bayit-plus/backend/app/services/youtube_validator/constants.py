"""
YouTube Validator Constants

Configuration constants and URL patterns for YouTube video validation.
All configurable values are loaded from environment settings.
"""

import re
from typing import List, Pattern

from app.core.config import settings


def get_concurrent_limit() -> int:
    """Get concurrent validation limit from settings."""
    return settings.YOUTUBE_VALIDATION_CONCURRENT_LIMIT


def get_validation_timeout() -> float:
    """Get validation timeout from settings."""
    return settings.YOUTUBE_VALIDATION_TIMEOUT_SECONDS


def get_cache_ttl_valid_hours() -> int:
    """Get cache TTL for valid videos from settings."""
    return settings.YOUTUBE_CACHE_TTL_VALID_HOURS


def get_cache_ttl_invalid_hours() -> int:
    """Get cache TTL for invalid videos from settings."""
    return settings.YOUTUBE_CACHE_TTL_INVALID_HOURS


def get_thumbnail_min_size_bytes() -> int:
    """Get minimum thumbnail size to consider valid from settings."""
    return settings.YOUTUBE_THUMBNAIL_MIN_SIZE_BYTES


def get_thumbnail_timeout() -> float:
    """Get thumbnail fetch timeout from settings."""
    return settings.YOUTUBE_THUMBNAIL_TIMEOUT_SECONDS


# YouTube URL patterns for video ID extraction
# These patterns match various YouTube URL formats
YOUTUBE_URL_PATTERNS: List[Pattern[str]] = [
    re.compile(r"youtube\.com/embed/([a-zA-Z0-9_-]{11})"),
    re.compile(r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})"),
    re.compile(r"youtu\.be/([a-zA-Z0-9_-]{11})"),
    re.compile(r"img\.youtube\.com/vi/([a-zA-Z0-9_-]{11})"),
    re.compile(r"youtube\.com/v/([a-zA-Z0-9_-]{11})"),
]

# YouTube domains for URL detection
YOUTUBE_DOMAINS: List[str] = ["youtube.com", "youtu.be"]

# Video ID length (YouTube uses 11-character base64-like IDs)
VIDEO_ID_LENGTH: int = 11

# YouTube oEmbed endpoint (no API key required)
OEMBED_URL: str = "https://www.youtube.com/oembed"

# YouTube Data API v3 base endpoint
YOUTUBE_API_BASE_URL: str = "https://www.googleapis.com/youtube/v3"

# YouTube thumbnail base URL
YOUTUBE_THUMBNAIL_BASE_URL: str = "https://img.youtube.com/vi"

# YouTube watch URL template
YOUTUBE_WATCH_URL_TEMPLATE: str = "https://www.youtube.com/watch?v={video_id}"

# YouTube thumbnail quality options (best to worst)
# - maxresdefault: 1280x720 - not always available
# - sddefault: 640x480 - usually available
# - hqdefault: 480x360 - always available
# - mqdefault: 320x180 - always available
THUMBNAIL_QUALITIES: List[str] = [
    "maxresdefault.jpg",
    "sddefault.jpg",
    "hqdefault.jpg",
    "mqdefault.jpg",
]

# Default thumbnail quality (always available fallback)
DEFAULT_THUMBNAIL_QUALITY: str = "hqdefault.jpg"

# Video status values
VIDEO_STATUS_AVAILABLE: str = "available"
VIDEO_STATUS_UNAVAILABLE: str = "unavailable"
VIDEO_STATUS_PRIVATE: str = "private"
VIDEO_STATUS_REMOVED: str = "removed"
VIDEO_STATUS_ERROR: str = "error"
VIDEO_STATUS_CACHED_INVALID: str = "cached_invalid"

# HTTP status code interpretations for oEmbed
HTTP_STATUS_OK: int = 200
HTTP_STATUS_UNAUTHORIZED: int = 401
HTTP_STATUS_FORBIDDEN: int = 403
HTTP_STATUS_NOT_FOUND: int = 404

# Stream type identifier for cache
STREAM_TYPE_YOUTUBE: str = "youtube"
CONTENT_TYPE_YOUTUBE: str = "video/youtube"
