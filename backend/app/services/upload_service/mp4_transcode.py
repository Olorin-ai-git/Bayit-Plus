"""
MP4 Faststart Transcoding Module - Convert videos to seekable MP4 format

Converts MKV/AVI/etc files with incompatible audio (AC3/DTS) to MP4 with
AAC audio and faststart flag for instant seeking in web browsers.
"""

import asyncio
import logging
import os
import tempfile
from pathlib import Path
from typing import Optional

from google.cloud import storage as gcs_storage

from app.core.config import settings

logger = logging.getLogger(__name__)


class MP4TranscodeService:
    """Handles MP4 faststart transcoding and upload operations."""

    REQUIRES_TRANSCODE = {".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"}
    INCOMPATIBLE_AUDIO = {"ac3", "dts", "truehd", "eac3", "dca", "pcm_s24le"}

    def __init__(self):
        self._gcs_client: Optional[gcs_storage.Client] = None

    async def get_client(self) -> gcs_storage.Client:
        """Get or create GCS client."""
        if self._gcs_client is None:
            self._gcs_client = gcs_storage.Client()
        return self._gcs_client

    def needs_transcode(self, filename: str) -> bool:
        """Check if file needs transcoding based on extension."""
        ext = Path(filename).suffix.lower()
        return ext in self.REQUIRES_TRANSCODE

    async def transcode_and_upload(
        self,
        source_path: str,
        gcs_destination_path: str,
        on_progress: Optional[callable] = None,
    ) -> Optional[str]:
        """
        Transcode video to MP4 with faststart and upload to GCS.

        Args:
            source_path: Local path to source video file
            gcs_destination_path: GCS blob path for output (without extension)
            on_progress: Optional callback(message, progress_percent)

        Returns:
            GCS URL to the transcoded MP4, or None if failed
        """
        temp_file = None
        try:
            base_path = gcs_destination_path.rsplit(".", 1)[0]
            output_blob_path = f"{base_path}_web.mp4"

            with tempfile.NamedTemporaryFile(
                suffix=".mp4", delete=False
            ) as tmp:
                temp_file = tmp.name

            if on_progress:
                await on_progress("Transcoding to MP4...", 10)

            logger.info(f"Starting MP4 transcode: {source_path}")

            cmd = [
                "ffmpeg",
                "-y",
                "-i", source_path,
                "-c:v", "copy",
                "-c:a", "aac",
                "-b:a", "192k",
                "-ac", "2",
                "-movflags", "+faststart",
                temp_file,
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode != 0:
                error_msg = stderr.decode()[-500:] if stderr else "Unknown error"
                logger.error(f"FFmpeg transcode failed: {error_msg}")
                raise RuntimeError(f"Transcode failed: {error_msg}")

            file_size = os.path.getsize(temp_file)
            logger.info(f"Transcode complete: {file_size / 1024 / 1024:.1f} MB")

            if on_progress:
                await on_progress("Uploading transcoded file...", 60)

            client = await self.get_client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(output_blob_path)

            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: blob.upload_from_filename(
                    temp_file, content_type="video/mp4"
                ),
            )

            output_url = (
                f"https://storage.googleapis.com/"
                f"{settings.GCS_BUCKET_NAME}/{output_blob_path}"
            )

            logger.info(f"MP4 upload complete: {output_url}")

            if on_progress:
                await on_progress("Transcoding complete", 100)

            return output_url

        except Exception as e:
            logger.error(f"MP4 transcode failed: {e}", exc_info=True)
            return None

        finally:
            if temp_file and os.path.exists(temp_file):
                try:
                    os.unlink(temp_file)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp file: {e}")


mp4_transcode_service = MP4TranscodeService()
