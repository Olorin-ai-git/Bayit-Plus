"""
SSRF Protection Utilities
Provides domain whitelisting and URL validation to prevent SSRF attacks
"""

import logging
from typing import List, Optional
from urllib.parse import urlparse

from app.core.config import settings

logger = logging.getLogger(__name__)


def validate_url_domain(url: str, allowed_domains: List[str]) -> bool:
    """
    Validate that a URL's domain is in the allowed domains list.

    Args:
        url: The URL to validate
        allowed_domains: List of allowed domain names

    Returns:
        True if domain is allowed, False otherwise
    """
    if not url or not url.startswith(("http://", "https://")):
        logger.warning(f"Invalid URL scheme: {url}")
        return False

    if not allowed_domains:
        logger.warning("No allowed domains configured - URL validation skipped")
        return True  # Allow if no whitelist configured (backward compatibility)

    try:
        parsed = urlparse(url)
        domain = parsed.netloc

        # Check exact match and subdomain match
        for allowed in allowed_domains:
            if domain == allowed or domain.endswith(f".{allowed}"):
                return True

        logger.error(
            f"SSRF Protection: Domain '{domain}' not in whitelist. "
            f"Allowed domains: {allowed_domains}"
        )
        return False

    except Exception as e:
        logger.error(f"Failed to parse URL for SSRF check: {url} - {e}")
        return False


def validate_image_url(url: str) -> bool:
    """Validate image URL against ALLOWED_IMAGE_DOMAINS."""
    return validate_url_domain(url, settings.parsed_image_domains)


def validate_audio_url(url: str) -> bool:
    """Validate audio URL against ALLOWED_AUDIO_DOMAINS."""
    return validate_url_domain(url, settings.parsed_audio_domains)


def validate_subtitle_url(url: str) -> bool:
    """Validate subtitle URL against ALLOWED_SUBTITLE_DOMAINS."""
    return validate_url_domain(url, settings.parsed_subtitle_domains)


def validate_epg_url(url: str) -> bool:
    """Validate EPG URL against ALLOWED_EPG_DOMAINS."""
    return validate_url_domain(url, settings.parsed_epg_domains)


def validate_scraper_url(url: str) -> bool:
    """Validate scraper URL against ALLOWED_SCRAPER_DOMAINS."""
    return validate_url_domain(url, settings.parsed_scraper_domains)


def extract_domain(url: str) -> Optional[str]:
    """
    Extract domain from URL.

    Args:
        url: The URL to parse

    Returns:
        Domain name or None if parsing fails
    """
    try:
        parsed = urlparse(url)
        return parsed.netloc
    except Exception:
        return None
