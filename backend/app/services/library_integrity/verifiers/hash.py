"""
File Hash Verification

Recalculates SHA256 hash from GCS files for integrity verification.
"""

import hashlib
import logging
import tempfile
from pathlib import Path

from app.core.config import settings
from app.services.upload_service.gcs import gcs_uploader

logger = logging.getLogger(__name__)


def _extract_gcs_path(stream_url: str) -> str:
    """
    Extract GCS path from public URL.

    Args:
        stream_url: Full GCS URL

    Returns:
        GCS path (without bucket and domain)

    Raises:
        ValueError: If URL format is invalid
    """
    gcs_pattern = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/"
    if gcs_pattern in stream_url:
        return stream_url.replace(gcs_pattern, "")

    raise ValueError(f"Cannot extract GCS path from URL: {stream_url}")


async def recalculate_hash(stream_url: str) -> str:
    """
    Recalculate SHA256 hash from GCS file.

    Downloads file and calculates hash in chunks (reuses UploadService pattern).

    Args:
        stream_url: GCS file URL

    Returns:
        SHA256 hash string

    Raises:
        Exception if download or hash calculation fails
    """
    gcs_path = _extract_gcs_path(stream_url)

    temp_path = None
    try:
        # Create temp file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".tmp")
        temp_path = temp_file.name
        temp_file.close()

        # Download from GCS
        client = await gcs_uploader.get_client()
        bucket = client.bucket(settings.GCS_BUCKET_NAME)
        blob = bucket.blob(gcs_path)
        blob.download_to_filename(temp_path)

        # Calculate hash (reuse pattern from UploadService)
        sha256_hash = hashlib.sha256()
        with open(temp_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)

        return sha256_hash.hexdigest()

    finally:
        # Cleanup temp file
        if temp_path and Path(temp_path).exists():
            Path(temp_path).unlink()
