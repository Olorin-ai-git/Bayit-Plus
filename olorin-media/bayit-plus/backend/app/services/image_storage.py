"""
Image Storage Service
Downloads images from URLs and stores them in MongoDB as base64-encoded data
Includes SSRF protection via domain whitelisting
"""

import base64
import logging
from io import BytesIO
from typing import Optional, Tuple

import httpx
from PIL import Image

from app.core.ssrf_protection import validate_image_url

logger = logging.getLogger(__name__)


async def download_and_encode_image(
    url: str, max_size: Tuple[int, int] = (1920, 1080), quality: int = 85
) -> Optional[str]:
    """
    Download image from URL, optimize it, and return as base64 data URI.
    Includes SSRF protection via domain whitelisting.

    Args:
        url: The image URL to download
        max_size: Maximum dimensions (width, height) for the image
        quality: JPEG quality (1-100)

    Returns:
        Base64-encoded data URI (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
        or None if download/processing fails
    """
    # SSRF Protection: Validate domain whitelist
    if not validate_image_url(url):
        logger.error(f"SSRF Protection: Blocked image download from {url}")
        return None

    try:
        # Download image with timeout and proper headers
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            "Referer": "https://www.google.com/",
        }
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()

            # Check content type
            content_type = response.headers.get("content-type", "")
            if not content_type.startswith("image/"):
                logger.warning(
                    f"URL does not point to an image: {url} (type: {content_type})"
                )
                return None

            # Check file size (limit to 10MB)
            if len(response.content) > 10 * 1024 * 1024:
                logger.warning(
                    f"Image too large: {len(response.content)} bytes from {url}"
                )
                return None

            # Open and process image
            image = Image.open(BytesIO(response.content))

            # Convert RGBA to RGB if needed
            if image.mode in ("RGBA", "LA", "P"):
                background = Image.new("RGB", image.size, (255, 255, 255))
                if image.mode == "P":
                    image = image.convert("RGBA")
                background.paste(
                    image,
                    mask=image.split()[-1] if image.mode in ("RGBA", "LA") else None,
                )
                image = background
            elif image.mode != "RGB":
                image = image.convert("RGB")

            # Resize if needed
            if image.size[0] > max_size[0] or image.size[1] > max_size[1]:
                image.thumbnail(max_size, Image.Resampling.LANCZOS)
                logger.info(f"Resized image from {url} to {image.size}")

            # Convert to JPEG and encode as base64
            buffer = BytesIO()
            image.save(buffer, format="JPEG", quality=quality, optimize=True)
            buffer.seek(0)

            # Create data URI
            image_data = base64.b64encode(buffer.getvalue()).decode("utf-8")
            data_uri = f"data:image/jpeg;base64,{image_data}"

            logger.info(
                f"Successfully downloaded and encoded image from {url} (size: {len(data_uri)} chars)"
            )
            return data_uri

    except httpx.HTTPError as e:
        logger.error(f"HTTP error downloading image from {url}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error processing image from {url}: {e}")
        return None


async def is_valid_image_url(url: str) -> bool:
    """
    Check if URL points to a valid, accessible image.
    Includes SSRF protection via domain whitelisting.

    Args:
        url: The URL to check

    Returns:
        True if URL is valid and accessible, False otherwise
    """
    # SSRF Protection: Validate domain whitelist
    if not validate_image_url(url):
        return False

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.head(url, follow_redirects=True)
            response.raise_for_status()

            content_type = response.headers.get("content-type", "")
            return content_type.startswith("image/")
    except Exception as e:
        logger.warning(f"Failed to validate image URL {url}: {e}")
        return False
