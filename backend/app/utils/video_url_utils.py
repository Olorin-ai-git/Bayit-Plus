"""
Video URL Validation and Metadata Extraction

Validates video URLs and extracts metadata via oEmbed APIs
(YouTube, Vimeo, Dailymotion) or HTML title / URL-path fallback.
"""

import re
from typing import List, Optional, Tuple
from urllib.parse import quote, unquote, urlparse

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

_DIRECT_VIDEO_EXTS = {".mp4", ".webm", ".mov", ".avi", ".mkv"}


def validate_video_url(url: str) -> Tuple[bool, str]:
    """Validate a video URL — any http/https URL is accepted."""
    if not url or not url.strip():
        return False, "URL is required"
    parsed = urlparse(url.strip())
    if parsed.scheme not in ("http", "https"):
        return False, "URL must use http or https"
    host = (parsed.hostname or "").lower()
    if not host:
        return False, "Invalid URL"
    return True, ""


def get_oembed_url(video_url: str) -> Optional[str]:
    """Return the oEmbed endpoint for a video URL, or None."""
    parsed = urlparse(video_url.strip())
    host = (parsed.hostname or "").lower()
    template = _OEMBED_HOSTS.get(host)
    if not template:
        return None
    return template.format(url=quote(video_url, safe=""))


_STRIP_PATTERNS = [
    re.compile(r"\s*[\(\[]\d{4}[\)\]]"),          # (1985) or [1985]
    re.compile(r"\s*[\(\[].*?[\)\]]"),             # any (text) or [text]
    re.compile(r"\s*[-–—|]\s*.+$"),                # everything after dash/pipe
    re.compile(
        r"\s*\b(?:official|theatrical|teaser|final|new|full)?\s*"
        r"(?:trailer|teaser|clip|promo|preview|featurette)\b.*$",
        re.IGNORECASE,
    ),
    re.compile(r"\s*\b(?:HD|4K|UHD|HQ|1080p|720p|IMAX)\b", re.IGNORECASE),
    re.compile(r"\s*\b(?:movie|film|video|scene)\s*$", re.IGNORECASE),
]


def clean_title_for_search(raw_title: str) -> List[str]:
    """
    Produce candidate search queries from a raw oEmbed title.

    Returns a list from most-cleaned to least-cleaned so callers can
    try each until TMDB returns a match.
    """
    cleaned_versions: List[str] = []
    current = raw_title.strip()
    for pattern in _STRIP_PATTERNS:
        cleaned = pattern.sub("", current).strip()
        if cleaned and cleaned != current:
            current = cleaned
            if current not in cleaned_versions:
                cleaned_versions.append(current)
    # Most-cleaned first (best TMDB match), raw title last as fallback
    cleaned_versions.reverse()
    if raw_title.strip() not in cleaned_versions:
        cleaned_versions.append(raw_title.strip())
    return cleaned_versions


async def extract_video_title(video_url: str) -> Optional[str]:
    """Extract title via oEmbed first, then HTML/URL-path fallback."""
    oembed_url = get_oembed_url(video_url)
    if oembed_url:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(oembed_url)
                if resp.status_code == 200:
                    title = resp.json().get("title")
                    if title:
                        return title
        except Exception:
            logger.warning(
                "oEmbed metadata fetch failed",
                extra={"url": video_url},
            )
    return await _extract_title_fallback(video_url)


async def _extract_title_fallback(video_url: str) -> Optional[str]:
    """Best-effort title from HTML <title> tag or URL path."""
    try:
        async with httpx.AsyncClient(
            timeout=10.0, follow_redirects=True,
        ) as client:
            resp = await client.get(
                video_url, headers={"Range": "bytes=0-32767"},
            )
            if resp.status_code in (200, 206):
                text = resp.text[:32768]
                match = re.search(
                    r"<title[^>]*>([^<]+)</title>", text, re.IGNORECASE,
                )
                if match:
                    return match.group(1).strip()
    except Exception:
        logger.debug(
            "HTML title fallback failed",
            extra={"url": video_url},
        )
    return _title_from_url_path(video_url)


def _title_from_url_path(video_url: str) -> Optional[str]:
    """Derive a title from the last path segment of a URL."""
    parsed = urlparse(video_url)
    path = unquote(parsed.path).rstrip("/")
    if not path or path == "/":
        return None
    segment = path.rsplit("/", 1)[-1]
    name = re.sub(r"\.[a-zA-Z0-9]{2,5}$", "", segment)
    name = re.sub(r"[-_]+", " ", name).strip()
    return name if name else None
