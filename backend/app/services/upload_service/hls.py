"""
HLS Conversion Module - Convert videos to HLS format for web playback

Handles converting video files to HLS (HTTP Live Streaming) format with
AAC audio for browser compatibility, and uploading segments to GCS.
"""

import asyncio
import logging
import os
import shutil
import tempfile
from pathlib import Path
from typing import Optional

from google.cloud import storage as gcs_storage

from app.core.config import settings
from app.services.ffmpeg.conversion import convert_to_hls

logger = logging.getLogger(__name__)


class HLSConversionService:
    """Handles HLS conversion and upload operations."""

    # File extensions that require HLS conversion (non-web-compatible formats)
    REQUIRES_CONVERSION = {".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"}

    # Audio codecs that browsers cannot play (require re-encoding to AAC)
    INCOMPATIBLE_AUDIO_CODECS = {"ac3", "dts", "truehd", "eac3", "dca"}

    def __init__(self):
        self._gcs_client: Optional[gcs_storage.Client] = None

    async def get_client(self) -> gcs_storage.Client:
        """Get or create GCS client."""
        if self._gcs_client is None:
            self._gcs_client = gcs_storage.Client()
        return self._gcs_client

    def needs_conversion(self, filename: str) -> bool:
        """Check if file needs HLS conversion based on extension."""
        ext = Path(filename).suffix.lower()
        return ext in self.REQUIRES_CONVERSION

    async def convert_and_upload(
        self,
        source_path: str,
        content_title: str,
        content_type: str = "movies",
        on_progress: Optional[callable] = None,
    ) -> Optional[str]:
        """
        Convert a video file to HLS and upload to GCS.

        Args:
            source_path: Local path OR URL to the source video file
                         FFmpeg can read directly from HTTP/HTTPS URLs
            content_title: Title for organizing in GCS (e.g., "25th Hour")
            content_type: Content type for GCS path (e.g., "movies", "series")
            on_progress: Optional callback for progress updates

        Returns:
            GCS URL to the M3U8 playlist, or None if conversion fails
        """
        temp_dir = None
        try:
            # Create temp directory for HLS output
            temp_dir = tempfile.mkdtemp(prefix="hls_")

            # FFmpeg can read directly from URLs - no need to download first
            is_url = source_path.startswith("http://") or source_path.startswith("https://")
            source_type = "URL" if is_url else "local file"
            logger.info(f"Starting HLS conversion from {source_type}: {source_path} -> {temp_dir}")

            if on_progress:
                await on_progress("Converting to HLS...", 10)

            # Convert to HLS using FFmpeg
            # FFmpeg reads directly from URL (no download needed)
            # Uses libx264 for video and AAC for audio (browser-compatible)
            result = await convert_to_hls(
                input_path=source_path,
                output_dir=temp_dir,
                segment_duration=10,
                playlist_name="playlist.m3u8",
                timeout=14400,  # 4 hours max (streaming from URL can be slower)
            )

            playlist_path = result["playlist_path"]
            segment_count = result["segment_count"]

            logger.info(f"HLS conversion complete: {segment_count} segments")

            if on_progress:
                await on_progress(f"Uploading {segment_count} HLS segments...", 50)

            # Upload all HLS files to GCS
            safe_title = self._sanitize_title(content_title)
            gcs_hls_path = f"{content_type}/{safe_title}/hls"

            playlist_url = await self._upload_hls_directory(
                temp_dir, gcs_hls_path, on_progress
            )

            logger.info(f"HLS upload complete: {playlist_url}")
            return playlist_url

        except Exception as e:
            logger.error(f"HLS conversion failed: {e}", exc_info=True)
            return None

        finally:
            # Clean up temp directory
            if temp_dir and os.path.exists(temp_dir):
                try:
                    shutil.rmtree(temp_dir)
                    logger.debug(f"Cleaned up temp directory: {temp_dir}")
                except Exception as e:
                    logger.warning(f"Failed to clean up temp dir {temp_dir}: {e}")

    async def _upload_hls_directory(
        self,
        local_dir: str,
        gcs_path: str,
        on_progress: Optional[callable] = None,
    ) -> str:
        """
        Upload all HLS files from local directory to GCS.

        Args:
            local_dir: Local directory containing HLS files
            gcs_path: GCS path prefix (e.g., "movies/Title/hls")
            on_progress: Optional progress callback

        Returns:
            GCS URL to the M3U8 playlist
        """
        client = await self.get_client()
        bucket = client.bucket(settings.GCS_BUCKET_NAME)

        # Get all files to upload
        files = list(Path(local_dir).glob("*"))
        total_files = len(files)
        uploaded = 0

        playlist_url = None

        for file_path in files:
            if file_path.is_file():
                blob_name = f"{gcs_path}/{file_path.name}"
                blob = bucket.blob(blob_name)

                # Set appropriate content type
                content_type = self._get_hls_content_type(file_path.name)

                # Upload file
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: blob.upload_from_filename(
                        str(file_path),
                        content_type=content_type,
                    ),
                )

                uploaded += 1

                # Track playlist URL
                if file_path.suffix == ".m3u8":
                    playlist_url = (
                        f"https://storage.googleapis.com/"
                        f"{settings.GCS_BUCKET_NAME}/{blob_name}"
                    )

                # Update progress
                if on_progress and total_files > 0:
                    progress = 50 + (uploaded / total_files) * 45
                    await on_progress(
                        f"Uploaded {uploaded}/{total_files} segments", progress
                    )

        if not playlist_url:
            raise ValueError("No M3U8 playlist found in HLS output")

        return playlist_url

    def _get_hls_content_type(self, filename: str) -> str:
        """Get content type for HLS files."""
        ext = Path(filename).suffix.lower()
        content_types = {
            ".m3u8": "application/vnd.apple.mpegurl",
            ".ts": "video/MP2T",
        }
        return content_types.get(ext, "application/octet-stream")

    def _sanitize_title(self, title: str) -> str:
        """Sanitize title for use in file paths."""
        import re
        # Remove special characters, keep alphanumeric, spaces, and common chars
        safe = re.sub(r"[^\w\s\-\.]", "", title)
        # Replace spaces with underscores
        safe = safe.replace(" ", "_")
        # Limit length
        return safe[:100] if len(safe) > 100 else safe

    async def download_from_gcs(self, gcs_url: str, local_path: str) -> bool:
        """
        Download a file from GCS to local path.

        Args:
            gcs_url: Full GCS URL (https://storage.googleapis.com/bucket/path)
            local_path: Local path to save the file

        Returns:
            True if download succeeded, False otherwise
        """
        try:
            # Parse GCS URL
            # Format: https://storage.googleapis.com/BUCKET/PATH
            import re
            match = re.match(
                r"https://storage\.googleapis\.com/([^/]+)/(.+)",
                gcs_url
            )
            if not match:
                logger.error(f"Invalid GCS URL format: {gcs_url}")
                return False

            bucket_name = match.group(1)
            blob_path = match.group(2)

            client = await self.get_client()
            bucket = client.bucket(bucket_name)
            blob = bucket.blob(blob_path)

            # Ensure parent directory exists
            Path(local_path).parent.mkdir(parents=True, exist_ok=True)

            # Download file
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: blob.download_to_filename(local_path)
            )

            logger.info(f"Downloaded {gcs_url} to {local_path}")
            return True

        except Exception as e:
            logger.error(f"Failed to download from GCS: {e}", exc_info=True)
            return False


# Global HLS conversion service instance
hls_service = HLSConversionService()
