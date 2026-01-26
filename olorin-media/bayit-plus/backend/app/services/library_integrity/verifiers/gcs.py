"""
GCS File Verification

Verifies GCS file existence and accessibility.
"""

import logging

import httpx

from app.models.content import Content
from app.services.upload_service.gcs import gcs_uploader

from ..models import GCSVerificationResult
from .hash import _extract_gcs_path

logger = logging.getLogger(__name__)


async def verify_gcs_file(content: Content) -> GCSVerificationResult:
    """
    Verify GCS file existence and accessibility.

    Checks:
    1. File exists in GCS (using gcs_uploader.file_exists())
    2. File accessible via HTTP HEAD request
    3. Content-Length matches database file_size

    Args:
        content: Content item to verify

    Returns:
        GCSVerificationResult
    """
    result = GCSVerificationResult(exists=False)

    try:
        # Extract GCS path from stream URL
        gcs_path = _extract_gcs_path(content.stream_url)

        # Check existence using gcs_uploader
        exists = await gcs_uploader.file_exists(gcs_path)
        result.exists = exists

        if not exists:
            return result

        # Check accessibility via HTTP HEAD
        async with httpx.AsyncClient() as client:
            response = await client.head(content.stream_url, timeout=5)
            result.status_code = response.status_code
            result.accessible = response.status_code < 400

            # Check size
            if result.accessible and content.file_size:
                content_length = response.headers.get("Content-Length")
                if content_length:
                    result.actual_size = int(content_length)
                    result.expected_size = content.file_size
                    result.size_matches = result.actual_size == result.expected_size

    except Exception as e:
        result.error = str(e)
        logger.error(f"GCS verification failed for {content.title}: {e}")

    return result
