"""
Audiobook Security Utilities

Provides validation functions for audiobook data to prevent SSRF and injection attacks.
"""

import re
from typing import Optional
from urllib.parse import urlparse

from fastapi import HTTPException, status


def validate_audio_url(url: str) -> None:
    """
    Validate audio stream URL to prevent SSRF attacks.

    Prevents:
    - Access to internal IP ranges (127.0.0.1, 10.x.x.x, 172.16.x.x, 192.168.x.x)
    - Access to cloud metadata services (169.254.169.254, file://, gopher://, etc.)
    - Access to localhost variants (localhost, 0.0.0.0)

    Args:
        url: The audio stream URL to validate

    Raises:
        HTTPException: If URL is invalid or points to restricted location
    """
    if not url or not isinstance(url, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Stream URL must be a non-empty string",
        )

    try:
        parsed = urlparse(url)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid stream URL format",
        )

    # Validate scheme
    allowed_schemes = {"http", "https", "hls", "rtmp", "rtmps"}
    if parsed.scheme not in allowed_schemes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Stream URL scheme must be one of: {', '.join(allowed_schemes)}",
        )

    # Only validate hostname for http/https
    if parsed.scheme in {"http", "https"}:
        hostname = parsed.hostname
        if not hostname:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stream URL must contain a valid hostname",
            )

        # Block localhost variants
        if hostname in {"localhost", "0.0.0.0", "127.0.0.1"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stream URLs cannot point to localhost",
            )

            # Block private IP ranges and cloud metadata endpoints
        private_ip_patterns = [
            r"^127\.",  # 127.0.0.0/8
            r"^10\.",  # 10.0.0.0/8
            r"^172\.(1[6-9]|2[0-9]|3[01])\.",  # 172.16.0.0/12
            r"^192\.168\.",  # 192.168.0.0/16
            r"^169\.254\.",  # 169.254.0.0/16 (link-local, AWS metadata)
        ]

        metadata_services = {
            "metadata.google.internal",  # GCP metadata
            "metadata.azure.com",  # Azure metadata
            "169.254.169.254",  # AWS metadata (covered by pattern above)
        }

        for pattern in private_ip_patterns:
            if re.match(pattern, hostname):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Stream URLs cannot point to private IP ranges",
                )

        if hostname in metadata_services:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stream URLs cannot point to cloud metadata services",
            )


def validate_drm_key_id(key_id: Optional[str]) -> None:
    """
    Validate DRM Key ID to prevent injection attacks.

    Allows: alphanumeric characters, hyphens, underscores
    Disallows: special characters that could be used in injections

    Args:
        key_id: The DRM key ID to validate

    Raises:
        HTTPException: If key ID contains invalid characters
    """
    if key_id is None:
        return

    if not isinstance(key_id, str):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DRM Key ID must be a string",
        )

    if len(key_id) > 128:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DRM Key ID must be 128 characters or less",
        )

    if not re.match(r"^[a-zA-Z0-9\-_]*$", key_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="DRM Key ID can only contain alphanumeric characters, hyphens, and underscores",
        )


def validate_audio_quality(quality: Optional[str]) -> None:
    """
    Validate audio quality format to prevent invalid values.

    Allowed values: 8-bit, 16-bit, 24-bit, 32-bit, high-fidelity, standard, premium, lossless
    """
    if quality is None:
        return

    allowed_qualities = {
        "8-bit",
        "16-bit",
        "24-bit",
        "32-bit",
        "high-fidelity",
        "standard",
        "premium",
        "lossless",
    }

    if quality not in allowed_qualities:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio quality must be one of: {', '.join(sorted(allowed_qualities))}",
        )


def validate_isbn(isbn: Optional[str]) -> None:
    """
    Validate ISBN-10 or ISBN-13 format (basic validation).

    Args:
        isbn: The ISBN to validate (with or without hyphens)

    Raises:
        HTTPException: If ISBN format is invalid
    """
    if isbn is None:
        return

    # Remove hyphens for validation
    clean_isbn = isbn.replace("-", "").replace(" ", "")

    # Check if it's a valid ISBN-10 or ISBN-13 format
    if not re.match(r"^(978|979)?[0-9]{9}[0-9X]$", clean_isbn):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="ISBN must be in valid ISBN-10 or ISBN-13 format",
        )
