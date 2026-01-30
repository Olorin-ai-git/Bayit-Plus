"""
GCS Resumable Upload Utility
Handles resumable file uploads to Google Cloud Storage with retry logic.
"""

import asyncio
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


async def resumable_upload(
    bucket,
    blob_name: str,
    local_path: str,
    content_type: str,
    build_url_fn,
) -> str:
    """
    Perform resumable upload to GCS with exponential backoff retry.

    Args:
        bucket: GCS bucket object
        blob_name: Destination blob name
        local_path: Path to local file
        content_type: MIME content type
        build_url_fn: Callable to build public URL from blob name

    Returns:
        Public URL of uploaded blob
    """
    blob = bucket.blob(blob_name)
    blob.cache_control = "public, max-age=31536000"

    chunk_size_bytes = settings.GCS_UPLOAD_CHUNK_SIZE_MB * 1024 * 1024
    blob.chunk_size = chunk_size_bytes

    max_retries = settings.GCS_UPLOAD_MAX_RETRIES
    initial_delay = settings.GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS
    max_delay = settings.GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS
    timeout = settings.GCS_UPLOAD_TIMEOUT_SECONDS

    last_exception = None
    for attempt in range(max_retries):
        try:
            await asyncio.to_thread(
                blob.upload_from_filename,
                local_path,
                content_type=content_type,
                timeout=timeout,
            )
            return build_url_fn(blob_name)

        except Exception as e:
            last_exception = e
            if attempt < max_retries - 1:
                delay = min(initial_delay * (2 ** attempt), max_delay)
                logger.warning(
                    "GCS upload attempt failed, retrying",
                    extra={
                        "blob_name": blob_name,
                        "attempt": attempt + 1,
                        "max_retries": max_retries,
                        "delay_seconds": delay,
                        "error": str(e),
                    },
                )
                await asyncio.sleep(delay)

    raise Exception(
        f"GCS upload failed after {max_retries} attempts: {last_exception}"
    )
