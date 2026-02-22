"""
GCS uploader for merged trailer MP4 files.

Uploads a local MP4 to the trailers prefix in the configured GCS bucket
and returns the public URL for direct playback.
"""

import asyncio
import logging
import os
from typing import Optional

from google.cloud import storage as gcs_storage

from app.core.config import settings

logger = logging.getLogger(__name__)


def _build_gcs_path(video_id: str) -> str:
    """Build the GCS object path for a trailer."""
    return f"{settings.TRAILER_GCS_PATH_PREFIX}/{video_id}.mp4"


def _build_public_url(gcs_path: str) -> str:
    """Build the public HTTPS URL for a GCS object."""
    return (
        f"https://storage.googleapis.com/"
        f"{settings.GCS_BUCKET_NAME}/{gcs_path}"
    )


def _upload_sync(local_path: str, gcs_path: str) -> Optional[str]:
    """Upload a file to GCS synchronously. Returns the public URL."""
    creds_path = settings.GOOGLE_APPLICATION_CREDENTIALS
    if creds_path and os.path.isfile(creds_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = creds_path
    else:
        os.environ.pop("GOOGLE_APPLICATION_CREDENTIALS", None)
    client = gcs_storage.Client(project=settings.GCS_PROJECT_ID or None)
    bucket = client.bucket(settings.GCS_BUCKET_NAME)
    blob = bucket.blob(gcs_path)

    if blob.exists():
        logger.info(
            "Trailer already in GCS, skipping upload",
            extra={"gcs_path": gcs_path},
        )
        return _build_public_url(gcs_path)

    file_size = os.path.getsize(local_path)
    logger.info(
        "Uploading trailer to GCS",
        extra={"gcs_path": gcs_path, "size_bytes": file_size},
    )

    blob.upload_from_filename(
        local_path,
        content_type="video/mp4",
    )

    return _build_public_url(gcs_path)


async def upload_trailer(
    local_path: str,
    video_id: str,
) -> Optional[str]:
    """
    Upload a merged trailer MP4 to GCS.

    Args:
        local_path: Path to the local merged MP4 file.
        video_id: YouTube video ID (used as the GCS filename).

    Returns:
        Public GCS URL of the uploaded trailer, or None on failure.
    """
    gcs_path = _build_gcs_path(video_id)

    loop = asyncio.get_running_loop()
    try:
        url = await loop.run_in_executor(
            None, _upload_sync, local_path, gcs_path,
        )
    except Exception:
        logger.exception(
            "GCS trailer upload failed",
            extra={"video_id": video_id, "gcs_path": gcs_path},
        )
        return None

    if url:
        logger.info(
            "Trailer uploaded to GCS",
            extra={"video_id": video_id, "url": url},
        )

    return url
