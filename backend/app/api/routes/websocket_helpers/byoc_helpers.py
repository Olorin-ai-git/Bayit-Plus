"""
BYOC (Bring Your Own Content) helpers for WebSocket endpoints.

Validates user-provided stream URLs and creates channel stubs
for BYOC sessions that bypass the LiveChannel database lookup.
"""

import hashlib
import logging
import re
from dataclasses import dataclass, field
from typing import Optional, Tuple
from urllib.parse import urlparse

from app.core.config import settings

logger = logging.getLogger(__name__)

BYOC_CHANNEL_ID = "byoc"

DANGEROUS_PATTERNS = [
    r"[;&|`$]",
    r"\.\./",
    r"file://",
    r"data:",
    r"javascript:",
    r"\x00",
]

BYOC_DEFAULT_LANGUAGES = ["en", "es", "ar", "ru", "fr", "de", "it", "pt"]


@dataclass
class BYOCChannelStub:
    """Minimal channel-like object for BYOC sessions."""

    id: str
    stream_url: str
    supports_live_dubbing: bool = True
    supports_live_subtitles: bool = True
    dubbing_source_language: str = "he"
    dubbing_sync_delay_ms: Optional[int] = None
    default_dubbing_voice_id: Optional[str] = None
    available_dubbing_languages: list = field(
        default_factory=lambda: list(BYOC_DEFAULT_LANGUAGES)
    )
    available_translation_languages: list = field(
        default_factory=lambda: list(BYOC_DEFAULT_LANGUAGES)
    )
    primary_language: str = "he"


def get_byoc_manager_key(stream_url: str) -> str:
    """Generate a unique manager key for a BYOC stream URL."""
    url_hash = hashlib.sha256(stream_url.encode()).hexdigest()[:16]
    return f"byoc:{url_hash}"


def validate_byoc_stream_url(stream_url: str) -> Tuple[bool, Optional[str]]:
    """
    Validate a BYOC stream URL for safety.

    Checks HTTPS scheme and dangerous patterns (injection prevention).
    Does NOT check domain allowlist (BYOC users bring arbitrary URLs).

    Returns:
        (valid, error_message)
    """
    if not stream_url or not isinstance(stream_url, str):
        return False, "Stream URL is required"

    if len(stream_url) > 2048:
        return False, "Stream URL exceeds maximum length"

    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, stream_url):
            logger.warning(
                "BYOC stream URL contains dangerous pattern",
                extra={"url_prefix": stream_url[:60]},
            )
            return False, "Stream URL contains invalid characters"

    try:
        parsed = urlparse(stream_url)
    except Exception:
        return False, "Invalid stream URL format"

    if parsed.scheme.lower() != "https":
        return False, "Stream URL must use HTTPS"

    if not parsed.hostname:
        return False, "Stream URL must include a hostname"

    hostname = parsed.hostname.lower()
    if hostname in ("localhost", "127.0.0.1", "::1", "0.0.0.0"):
        return False, "Stream URL cannot point to localhost"

    logger.info(
        "BYOC stream URL validated",
        extra={"hostname": hostname, "url_prefix": stream_url[:60]},
    )
    return True, None


def create_byoc_channel_stub(
    stream_url: str,
    source_lang: str = "he",
) -> BYOCChannelStub:
    """Create a minimal channel stub for BYOC sessions."""
    manager_key = get_byoc_manager_key(stream_url)
    return BYOCChannelStub(
        id=manager_key,
        stream_url=stream_url,
        dubbing_source_language=source_lang,
    )
