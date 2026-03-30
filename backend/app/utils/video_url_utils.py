"""
Video URL Validation and Metadata Extraction

Validates consumer-submitted video URLs and extracts metadata
via oEmbed APIs (YouTube, Vimeo) or HTML title fallback.
"""

from typing import Optional, Tuple
from urllib.parse import quote, urlparse

import httpx

from app.core.logging_config import get_logger

logger = get_logger(__name__)

_OEMBED_HOSTS = {
    "youtube.com": "https://www.youtube.com/oembed?url={url}&format=json",
    "www.youtube.com": "https://www.youtube.com/oembed?url={url}&format=json",
    "youtu.be": "https://www.youtube.com/oembed?url={url}&format=json",
    "vimeo.com": "https://vimeo.com/api/oembed.json?url={url}",
    "www.vimeo.com": "https://vimeo.com/api/oembed.json?url={url}",
    "dailymotion.com": "https://www.dailymotion.com/services/oembed?url={url}&format=json",
    "www.dailymotion.com": "https://www.dailymotion.com/services/oembed?url={url}&format=json",
}

_ALLOWED_HOSTS = set(_OEMBED_HOSTS.keys())

_DIRECT_VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi", ".mkv"}


def validate_video_url(url: str) -> Tuple[bool, str]:
    """Validate a consumer-submitted video URL. Returns (ok, error)."""
    if not url or not url.strip():
        return False, "URL is required"
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        return False, "URL must use http or https"
    host = (parsed.hostname or "").lower()
    if not host:
        return False, "Invalid URL"
    if host in _ALLOWED_HOSTS:
        return True, ""
    path_lower = parsed.path.lower()
    if any(path_lower.endswith(ext) for ext in _DIRECT_VIDEO_EXTS):
        return True, ""
    return False, f"Unsupported video source: {host}. Try YouTube, Vimeo, or a direct video link."


def get_oembed_url(video_url: str) -> Optional[str]:
    """Return the oEmbed endpoint for a video URL, or None."""
    parsed = urlparse(video_url.strip())
    host = (parsed.hostname or "").lower()
    template = _OEMBED_HOSTS.get(host)
    if not template:
        return None
    return template.format(url=quote(video_url, safe=""))


async def extract_video_title(video_url: str) -> Optional[str]:
    """Extract video title via oEmbed API. Returns None on failure."""
    oembed_url = get_oembed_url(video_url)
    if not oembed_url:
        return None
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(oembed_url)
            if resp.status_code != 200:
                return None
            data = resp.json()
            return data.get("title")
    except Exception:
        logger.warning(
            "oEmbed metadata fetch failed",
            extra={"url": video_url},
        )
        return None
