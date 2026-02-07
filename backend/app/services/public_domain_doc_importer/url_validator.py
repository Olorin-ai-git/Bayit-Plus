"""URL validation with domain allowlist for documentary content sources."""

import logging
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

ALLOWED_DOMAINS = frozenset({
    "images-assets.nasa.gov",
    "images.nasa.gov",
    "images-api.nasa.gov",
    "cdn.dvidshub.net",
    "www.dvidshub.net",
    "catalog.archives.gov",
    "research.archives.gov",
    "media.nara.gov",
})

ALLOWED_EXTENSIONS = frozenset({
    ".mp4", ".mov", ".webm", ".m4v",
    ".jpg", ".jpeg", ".png", ".webp", ".gif",
})

BLOCKED_SCHEMES = frozenset({"javascript", "data", "ftp", "file"})


def validate_content_url(url: str, require_video: bool = False) -> bool:
    """Validate a URL against the domain allowlist and security rules."""
    if not url or not isinstance(url, str):
        return False

    try:
        parsed = urlparse(url)
    except Exception:
        logger.warning("Failed to parse URL", extra={"url_prefix": url[:50]})
        return False

    if parsed.scheme not in ("https",):
        logger.warning("URL rejected: non-HTTPS scheme", extra={"scheme": parsed.scheme})
        return False

    if parsed.scheme in BLOCKED_SCHEMES:
        return False

    hostname = parsed.hostname
    if not hostname:
        return False

    if hostname not in ALLOWED_DOMAINS:
        logger.warning("URL rejected: domain not in allowlist", extra={"domain": hostname})
        return False

    if ".." in parsed.path:
        logger.warning("URL rejected: path traversal detected")
        return False

    if require_video:
        path_lower = parsed.path.lower()
        video_extensions = {".mp4", ".mov", ".webm", ".m4v"}
        if not any(path_lower.endswith(ext) for ext in video_extensions):
            return False

    return True


def validate_thumbnail_url(url: str) -> bool:
    """Validate a thumbnail URL against the domain allowlist."""
    if not url or not isinstance(url, str):
        return False

    try:
        parsed = urlparse(url)
    except Exception:
        return False

    if parsed.scheme not in ("https",):
        return False

    hostname = parsed.hostname
    if not hostname or hostname not in ALLOWED_DOMAINS:
        return False

    if ".." in parsed.path:
        return False

    return True
