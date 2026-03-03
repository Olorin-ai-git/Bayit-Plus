"""
Trailer extraction pipeline orchestrator.

Coordinates the full pipeline: download -> merge -> upload -> DB update.
Each content item is processed independently; failures are logged and
do not block subsequent items.
"""

import logging
import os
import shutil
from typing import Optional

from app.core.config import settings
from app.models.content import Content
from app.services.trailer_extraction.downloader import download_separate_streams
from app.services.trailer_extraction.gcs_upload import upload_trailer
from app.services.trailer_extraction.merger import merge_streams
from app.services.youtube_validator.url_parser import (
    extract_video_id,
    is_youtube_url,
)

logger = logging.getLogger(__name__)


async def extract_trailer_for_content(
    content: Content,
) -> Optional[str]:
    """
    Run the full trailer extraction pipeline for a single content item.

    Steps:
        1. Validate the trailer_url is a YouTube URL.
        2. Download separate HD video + audio streams via yt-dlp.
        3. Merge with ffmpeg into a single MP4.
        4. Upload the MP4 to GCS.
        5. Update the content record with the GCS URL.

    Args:
        content: Content document with a YouTube ``trailer_url``.

    Returns:
        The GCS URL of the extracted trailer, or None on failure.
    """
    trailer_url = content.trailer_url
    if not trailer_url:
        logger.debug(
            "Skipping content without trailer URL",
            extra={"content_id": str(content.id)},
        )
        return None

    if is_youtube_url(trailer_url):
        logger.info(
            "Rejecting YouTube trailer URL, marking permanently failed",
            extra={
                "content_id": str(content.id),
                "trailer_url": trailer_url,
            },
        )
        content.trailer_extraction_status = "failed"
        content.trailer_extraction_error = "YouTube extraction disabled"
        await content.save()
        return None

    video_id = extract_video_id(trailer_url)
    if not video_id:
        logger.warning(
            "Cannot extract video ID from trailer URL",
            extra={"content_id": str(content.id), "trailer_url": trailer_url},
        )
        return None

    if content.trailer_stream_url:
        logger.debug(
            "Content already has trailer_stream_url",
            extra={"content_id": str(content.id)},
        )
        return content.trailer_stream_url

    work_dir = os.path.join(
        settings.TRAILER_EXTRACTION_TEMP_DIR,
        video_id,
    )

    max_retries = settings.TRAILER_EXTRACTION_MAX_RETRIES

    try:
        result = await download_separate_streams(video_id, work_dir)
        if not result:
            await _record_failure(content, video_id, max_retries, "Download failed")
            return None

        merged_path = os.path.join(work_dir, f"{video_id}_merged.mp4")
        merged = await merge_streams(
            result.video_path,
            result.audio_path,
            merged_path,
        )
        if not merged:
            await _record_failure(content, video_id, max_retries, "Merge failed")
            return None

        gcs_url = await upload_trailer(merged, video_id)
        if not gcs_url:
            await _record_failure(content, video_id, max_retries, "Upload failed")
            return None

        content.trailer_stream_url = gcs_url
        content.trailer_extraction_status = "completed"
        content.trailer_extraction_error = None
        await content.save()

        logger.info(
            "Trailer extraction complete",
            extra={
                "content_id": str(content.id),
                "video_id": video_id,
                "gcs_url": gcs_url,
            },
        )

        return gcs_url

    except Exception as exc:
        logger.exception(
            "Trailer extraction pipeline failed",
            extra={
                "content_id": str(content.id),
                "video_id": video_id,
            },
        )
        await _record_failure(content, video_id, max_retries, str(exc))
        return None

    finally:
        if os.path.isdir(work_dir):
            shutil.rmtree(work_dir, ignore_errors=True)


async def _record_failure(
    content: Content,
    video_id: str,
    max_retries: int,
    error_message: str,
) -> None:
    """Increment attempt counter and mark permanently failed when exhausted."""
    content.trailer_extraction_attempts += 1
    content.trailer_extraction_error = error_message

    if content.trailer_extraction_attempts >= max_retries:
        content.trailer_extraction_status = "failed"
        logger.warning(
            "Trailer extraction permanently failed after max retries",
            extra={
                "content_id": str(content.id),
                "video_id": video_id,
                "attempts": content.trailer_extraction_attempts,
                "error": error_message,
            },
        )
    else:
        content.trailer_extraction_status = "pending"
        logger.info(
            "Trailer extraction attempt failed, will retry",
            extra={
                "content_id": str(content.id),
                "video_id": video_id,
                "attempts": content.trailer_extraction_attempts,
                "max_retries": max_retries,
                "error": error_message,
            },
        )

    await content.save()
