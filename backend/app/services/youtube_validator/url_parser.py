"""
YouTube URL Parser

Functions for parsing YouTube URLs and extracting video IDs.
Supports multiple URL formats: embed, watch, short URLs, and thumbnail URLs.
"""

from typing import Optional

from app.services.youtube_validator.constants import (
    YOUTUBE_URL_PATTERNS,
    YOUTUBE_DOMAINS,
    YOUTUBE_THUMBNAIL_BASE_URL,
    THUMBNAIL_QUALITIES,
    DEFAULT_THUMBNAIL_QUALITY,
)


def extract_video_id(url: str) -> Optional[str]:
    """
    Extract YouTube video ID from various URL formats.

    Supported formats:
    - Embed URLs: https://www.youtube.com/embed/{video_id}
    - Watch URLs: https://www.youtube.com/watch?v={video_id}
    - Short URLs: https://youtu.be/{video_id}
    - Thumbnail URLs: https://img.youtube.com/vi/{video_id}/...
    - Legacy v/ URLs: https://www.youtube.com/v/{video_id}

    Args:
        url: YouTube URL in any format

    Returns:
        11-character video ID or None if not found
    """
    if not url:
        return None

    for pattern in YOUTUBE_URL_PATTERNS:
        match = pattern.search(url)
        if match:
            return match.group(1)

    return None


def is_youtube_url(url: str) -> bool:
    """
    Check if URL is a YouTube video URL.

    Args:
        url: URL to check

    Returns:
        True if URL contains a YouTube domain, False otherwise
    """
    if not url:
        return False
    url_lower = url.lower()
    return any(domain in url_lower for domain in YOUTUBE_DOMAINS)


def build_watch_url(video_id: str) -> str:
    """
    Build a standard YouTube watch URL from a video ID.

    Args:
        video_id: 11-character YouTube video ID

    Returns:
        Full YouTube watch URL
    """
    return f"https://www.youtube.com/watch?v={video_id}"


def build_embed_url(video_id: str) -> str:
    """
    Build a YouTube embed URL from a video ID.

    Args:
        video_id: 11-character YouTube video ID

    Returns:
        Full YouTube embed URL
    """
    return f"https://www.youtube.com/embed/{video_id}"


def get_thumbnail_url(video_id: str, quality: str = DEFAULT_THUMBNAIL_QUALITY) -> str:
    """
    Get YouTube thumbnail URL for a video ID.

    Args:
        video_id: 11-character YouTube video ID
        quality: Thumbnail quality (maxresdefault, sddefault, hqdefault, mqdefault)

    Returns:
        Thumbnail URL
    """
    return f"{YOUTUBE_THUMBNAIL_BASE_URL}/{video_id}/{quality}"


def normalize_youtube_url(url: str) -> Optional[str]:
    """
    Normalize any YouTube URL to a standard watch URL format.

    Args:
        url: YouTube URL in any format

    Returns:
        Normalized watch URL or None if video ID cannot be extracted
    """
    video_id = extract_video_id(url)
    if not video_id:
        return None
    return build_watch_url(video_id)


def validate_video_id_format(video_id: str) -> bool:
    """
    Validate that a string matches YouTube video ID format.

    YouTube video IDs are 11 characters using base64url alphabet:
    - Letters (a-z, A-Z)
    - Numbers (0-9)
    - Underscore (_)
    - Hyphen (-)

    Args:
        video_id: String to validate

    Returns:
        True if string is a valid video ID format, False otherwise
    """
    if not video_id or len(video_id) != 11:
        return False

    allowed_chars = set(
        "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
    )
    return all(char in allowed_chars for char in video_id)
