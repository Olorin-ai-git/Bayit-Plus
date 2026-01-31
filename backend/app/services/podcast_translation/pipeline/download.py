"""Audio download with SSRF protection."""
import logging
import uuid
from pathlib import Path
from urllib.parse import urlparse

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


async def download_audio(url: str, temp_dir: Path) -> str:
    """
    Download audio file with SSRF protection.

    Args:
        url: Audio file URL
        temp_dir: Temporary directory for downloads

    Returns:
        Path to downloaded file

    Raises:
        ValueError: If URL is not allowed or invalid
    """
    parsed = urlparse(url)

    # SSRF Protection: Validate URL against whitelist
    allowed_domains = settings.parsed_audio_domains
    if not allowed_domains:
        raise ValueError(
            "ALLOWED_AUDIO_DOMAINS not configured - cannot download audio"
        )

    if parsed.netloc not in allowed_domains:
        raise ValueError(f"Audio download from {parsed.netloc} not allowed")

    # Block internal IPs
    if parsed.hostname in ["localhost", "127.0.0.1"] or (
        parsed.hostname and parsed.hostname.startswith("192.168.")
    ):
        raise ValueError("Cannot download from internal IP addresses")

    # Download with timeout and size limit
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(url, follow_redirects=True)
        response.raise_for_status()

        # Verify content type
        content_type = response.headers.get("content-type", "")
        if not content_type.startswith(("audio/", "application/octet-stream")):
            raise ValueError(f"Invalid content type: {content_type}")

        # Check file size (max 500MB for podcasts)
        content_length = int(response.headers.get("content-length", 0))
        if content_length > 500 * 1024 * 1024:
            raise ValueError(f"Audio file too large: {content_length} bytes")

        # Save to temp directory
        filename = f"{uuid.uuid4()}.mp3"
        file_path = temp_dir / filename

        with open(file_path, "wb") as f:
            f.write(response.content)

        logger.info(f"Downloaded audio: {file_path} ({content_length} bytes)")
        return str(file_path)
