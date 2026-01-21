"""
Content utility functions.
"""

import logging
from datetime import timedelta

from google.cloud import storage

from app.core.config import settings

logger = logging.getLogger(__name__)

# Series category indicators (Hebrew and English)
SERIES_CATEGORY_KEYWORDS = ["series", "סדרות", "סדרה", "tv shows", "shows"]


def is_series_by_category(category_name: str) -> bool:
    """Check if category name indicates series content."""
    if not category_name:
        return False
    category_lower = category_name.lower()
    return any(keyword in category_lower for keyword in SERIES_CATEGORY_KEYWORDS)


def generate_signed_url_if_needed(url: str) -> str:
    """Generate signed URL for GCS files, return other URLs as-is."""
    if not url:
        return url

    if "storage.googleapis.com" not in url and "gs://" not in url:
        return url

    try:
        client = storage.Client(project=settings.GCS_PROJECT_ID or None)

        if url.startswith("gs://"):
            parts = url[5:].split("/", 1)
            bucket_name = parts[0]
            blob_name = parts[1] if len(parts) > 1 else ""
        elif "storage.googleapis.com" in url:
            parts = url.split("storage.googleapis.com/")[1].split("/", 1)
            bucket_name = parts[0]
            blob_name = parts[1] if len(parts) > 1 else ""
        else:
            return url

        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)

        if not blob.exists():
            logger.error(f"GCS blob does not exist: {blob_name}")
            return url

        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=4),
            method="GET",
        )

        logger.info(f"Generated signed URL for {blob_name}")
        return signed_url

    except Exception as e:
        logger.error(f"Failed to generate signed URL for {url}: {e}")
        return url


def convert_to_proxy_url(
    url: str, base_url: str = "https://api.bayit.tv/api/v1/proxy/media"
) -> str:
    """Convert GCS URL to proxied URL through our backend."""
    if not url or "storage.googleapis.com" not in url:
        return url

    try:
        import base64

        encoded_url = base64.urlsafe_b64encode(url.encode()).decode()
        return f"{base_url}/{encoded_url}"
    except Exception as e:
        logger.error(f"Failed to convert URL to proxy: {e}")
        return url
