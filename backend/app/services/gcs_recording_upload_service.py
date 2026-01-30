"""
GCS Recording Upload Service
Handles upload of recording files (video, subtitle, dubbed audio, thumbnail) to GCS.
"""

import logging
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.services.olorin.resilience import circuit_breaker

logger = logging.getLogger(__name__)

GCS_RECORDINGS_BREAKER = "gcs_recordings"


class GCSRecordingUploadService:
    """Handles upload of recording assets to Google Cloud Storage."""

    def __init__(self):
        self._client = None
        self._bucket = None

    def _get_bucket(self):
        """Lazy-load GCS bucket."""
        if self._bucket is None:
            from google.cloud import storage as gcs_storage

            self._client = gcs_storage.Client(
                project=settings.GCS_PROJECT_ID or None
            )
            self._bucket = self._client.bucket(settings.GCS_BUCKET_NAME)
        return self._bucket

    def _build_gcs_path(self, user_id: str, recording_id: str, filename: str) -> str:
        """Build the GCS blob path for a recording asset."""
        prefix = settings.RECORDING_GCS_PATH_PREFIX
        return f"{prefix}/{user_id}/{recording_id}/{filename}"

    def _build_public_url(self, blob_name: str) -> str:
        """Build the public URL for a GCS blob."""
        if settings.CDN_BASE_URL:
            return f"{settings.CDN_BASE_URL}/{blob_name}"
        return f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{blob_name}"

    async def _upload(self, local_path: str, blob_name: str, content_type: str) -> str:
        """Upload a file using the resumable upload utility."""
        from app.services.gcs_resumable_upload import resumable_upload

        return await resumable_upload(
            bucket=self._get_bucket(),
            blob_name=blob_name,
            local_path=local_path,
            content_type=content_type,
            build_url_fn=self._build_public_url,
        )

    @circuit_breaker(GCS_RECORDINGS_BREAKER)
    async def upload_recording(self, local_path: str, recording_id: str, user_id: str) -> str:
        """Upload video recording to GCS."""
        file_path = Path(local_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Recording file not found: {local_path}")

        blob_name = self._build_gcs_path(user_id, recording_id, "video.mp4")
        url = await self._upload(str(file_path), blob_name, "video/mp4")

        logger.info(
            "Recording video uploaded to GCS",
            extra={
                "recording_id": recording_id,
                "user_id": user_id,
                "blob_name": blob_name,
                "file_size": file_path.stat().st_size,
            },
        )
        return url

    @circuit_breaker(GCS_RECORDINGS_BREAKER)
    async def upload_subtitle_file(self, local_path: str, recording_id: str, user_id: str) -> str:
        """Upload WebVTT subtitle file to GCS."""
        file_path = Path(local_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Subtitle file not found: {local_path}")

        blob_name = self._build_gcs_path(user_id, recording_id, "subtitles.vtt")
        url = await self._upload(str(file_path), blob_name, "text/vtt")

        logger.info(
            "Subtitle file uploaded to GCS",
            extra={"recording_id": recording_id, "blob_name": blob_name},
        )
        return url

    @circuit_breaker(GCS_RECORDINGS_BREAKER)
    async def upload_dubbed_audio(self, local_path: str, recording_id: str, user_id: str) -> str:
        """Upload dubbed audio track (.aac) to GCS."""
        file_path = Path(local_path)
        if not file_path.exists():
            raise FileNotFoundError(f"Dubbed audio file not found: {local_path}")

        blob_name = self._build_gcs_path(user_id, recording_id, "dubbed_audio.aac")
        url = await self._upload(str(file_path), blob_name, "audio/aac")

        logger.info(
            "Dubbed audio uploaded to GCS",
            extra={"recording_id": recording_id, "blob_name": blob_name},
        )
        return url

    @circuit_breaker(GCS_RECORDINGS_BREAKER)
    async def generate_and_upload_thumbnail(
        self, video_path: str, recording_id: str, user_id: str
    ) -> Optional[str]:
        """Extract thumbnail from video via FFmpeg and upload to GCS."""
        from app.services.ffmpeg_service import ffmpeg_service

        video_file = Path(video_path)
        if not video_file.exists():
            logger.warning(
                "Cannot generate thumbnail: video file not found",
                extra={"video_path": video_path},
            )
            return None

        thumbnail_path = video_file.parent / f"{recording_id}_thumb.jpg"
        try:
            await ffmpeg_service.extract_thumbnail(
                input_path=str(video_file),
                output_path=str(thumbnail_path),
                time_offset_seconds=5,
            )

            if not thumbnail_path.exists():
                logger.warning(
                    "Thumbnail extraction produced no output",
                    extra={"recording_id": recording_id},
                )
                return None

            blob_name = self._build_gcs_path(user_id, recording_id, "thumbnail.jpg")
            url = await self._upload(str(thumbnail_path), blob_name, "image/jpeg")

            logger.info(
                "Thumbnail uploaded to GCS",
                extra={"recording_id": recording_id, "blob_name": blob_name},
            )
            return url

        except Exception as e:
            logger.warning(
                "Failed to generate/upload thumbnail",
                extra={"recording_id": recording_id, "error": str(e)},
            )
            return None
        finally:
            if thumbnail_path.exists():
                thumbnail_path.unlink(missing_ok=True)


# Singleton instance
gcs_recording_upload_service = GCSRecordingUploadService()
