"""
GCS Upload Module - Google Cloud Storage upload operations

Handles file uploads to GCS with progress tracking, retry logic,
and resumable upload support.
"""

import asyncio
import hashlib
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Optional

import requests.exceptions
import urllib3.exceptions
from google.api_core.exceptions import (InternalServerError,
                                        ServiceUnavailable, TooManyRequests)
from google.cloud import storage as gcs_storage

from app.core.config import settings
from app.models.upload import UploadJob

logger = logging.getLogger(__name__)


class GCSUploader:
    """Handles Google Cloud Storage upload operations with progress tracking."""

    def __init__(self):
        self._gcs_client: Optional[gcs_storage.Client] = None

    async def get_client(self) -> gcs_storage.Client:
        """Get or create GCS client."""
        if self._gcs_client is None:
            self._gcs_client = gcs_storage.Client()
        return self._gcs_client

    def is_retryable_error(self, exception: Exception) -> bool:
        """
        Check if an upload exception is retryable (transient network/server error).
        FileNotFoundError and similar permanent failures are not retryable.
        """
        # Non-retryable errors - file doesn't exist, no point retrying
        if isinstance(exception, (FileNotFoundError, PermissionError)):
            return False

        if isinstance(
            exception, (ServiceUnavailable, TooManyRequests, InternalServerError)
        ):
            return True

        error_str = str(exception).lower()
        retryable_patterns = [
            "timeout",
            "timed out",
            "connection aborted",
            "connection reset",
            "broken pipe",
            "ssl error",
            "connection refused",
            "temporary failure",
            "service unavailable",
            "503",
            "502",
            "504",
        ]

        if any(pattern in error_str for pattern in retryable_patterns):
            return True

        if isinstance(
            exception,
            (
                requests.exceptions.Timeout,
                requests.exceptions.ConnectionError,
                urllib3.exceptions.TimeoutError,
                urllib3.exceptions.ProtocolError,
                TimeoutError,
                ConnectionError,
                BrokenPipeError,
            ),
        ):
            return True

        cause = getattr(exception, "__cause__", None)
        if cause and cause is not exception:
            return self.is_retryable_error(cause)

        return False

    def get_content_type(self, filename: str) -> str:
        """Determine MIME type from filename."""
        ext = Path(filename).suffix.lower()

        content_types = {
            ".mp4": "video/mp4",
            ".mkv": "video/x-matroska",
            ".avi": "video/x-msvideo",
            ".mov": "video/quicktime",
            ".webm": "video/webm",
            ".mp3": "audio/mpeg",
            ".m4a": "audio/mp4",
            ".wav": "audio/wav",
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".srt": "text/plain",
            ".vtt": "text/vtt",
        }

        return content_types.get(ext, "application/octet-stream")

    async def upload_file(
        self,
        job: UploadJob,
        on_progress: Optional[Callable[[float, int, float, Optional[int]], Any]] = None,
    ) -> Optional[str]:
        """
        Upload file to Google Cloud Storage with progress tracking.
        Includes retry logic with exponential backoff for transient errors.

        Args:
            job: Upload job with source_path and metadata
            on_progress: Callback(progress, bytes_uploaded, speed, eta_seconds)

        Returns:
            Public URL of uploaded file
        """
        import re

        try:
            client = await self.get_client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME)

            content_type_path = job.type.value + "s"
            filename = Path(job.filename).name

            if job.metadata.get("title"):
                safe_title = re.sub(r"[^\w\s-]", "", job.metadata["title"]).replace(
                    " ", "_"
                )
                destination_blob_name = f"{content_type_path}/{safe_title}/{filename}"
            else:
                file_hash = (
                    job.file_hash[:8]
                    if job.file_hash
                    else hashlib.md5(job.source_path.encode()).hexdigest()[:8]
                )
                destination_blob_name = f"{content_type_path}/{file_hash}_{filename}"

            job.gcs_path = destination_blob_name
            await job.save()

            chunk_size_bytes = settings.GCS_UPLOAD_CHUNK_SIZE_MB * 1024 * 1024
            blob = bucket.blob(destination_blob_name, chunk_size=chunk_size_bytes)

            if blob.exists():
                logger.info(f"File already exists in GCS: {destination_blob_name}")
                public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
                job.progress = 100.0
                job.bytes_uploaded = job.file_size or 0
                await job.save()
                return public_url

            content_type = self.get_content_type(job.filename)

            start_time = datetime.utcnow()
            file_size = job.file_size or Path(job.source_path).stat().st_size

            job.progress = 25.0
            job.bytes_uploaded = 0
            await job.save()
            if on_progress:
                await on_progress(25.0, 0, 0.0, None)

            # Progress tracking state
            class ProgressState:
                def __init__(self):
                    self.bytes_read = 0
                    self.progress = 25.0
                    self.upload_speed = 0.0
                    self.eta_seconds = None
                    self.done = False
                    self.retry_count = 0
                    self.last_error = None

            progress_state = ProgressState()

            class ProgressFileWrapper:
                def __init__(self, file_obj, state, file_size, start_time):
                    self.file = file_obj
                    self.state = state
                    self.file_size = file_size
                    self.start_time = start_time

                def read(self, size=-1):
                    chunk = self.file.read(size)
                    if chunk:
                        self.state.bytes_read += len(chunk)
                        upload_progress = (
                            self.state.bytes_read / self.file_size
                        ) * 70.0
                        self.state.progress = 25.0 + upload_progress

                        elapsed = (datetime.utcnow() - self.start_time).total_seconds()
                        if elapsed > 0:
                            self.state.upload_speed = self.state.bytes_read / elapsed
                            remaining_bytes = self.file_size - self.state.bytes_read
                            self.state.eta_seconds = (
                                int(remaining_bytes / self.state.upload_speed)
                                if self.state.upload_speed > 0
                                else None
                            )

                    return chunk

                def seek(self, pos, whence=0):
                    return self.file.seek(pos, whence)

                def tell(self):
                    return self.file.tell()

            async def progress_updater():
                last_bytes = 0
                while not progress_state.done:
                    if progress_state.bytes_read > last_bytes:
                        job.progress = progress_state.progress
                        job.bytes_uploaded = progress_state.bytes_read
                        job.upload_speed = progress_state.upload_speed
                        job.eta_seconds = progress_state.eta_seconds
                        await job.save()
                        if on_progress:
                            await on_progress(
                                progress_state.progress,
                                progress_state.bytes_read,
                                progress_state.upload_speed,
                                progress_state.eta_seconds,
                            )
                        last_bytes = progress_state.bytes_read
                    await asyncio.sleep(1)

            def blocking_upload_with_retry():
                max_retries = settings.GCS_UPLOAD_MAX_RETRIES
                initial_delay = settings.GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS
                max_delay = settings.GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS
                timeout = settings.GCS_UPLOAD_TIMEOUT_SECONDS

                # Validate file exists before attempting upload
                if not Path(job.source_path).exists():
                    raise FileNotFoundError(f"Source file not found: {job.source_path}")

                last_exception = None

                for attempt in range(max_retries + 1):
                    try:
                        with open(job.source_path, "rb") as file_obj:
                            progress_wrapper = ProgressFileWrapper(
                                file_obj, progress_state, file_size, start_time
                            )
                            blob.upload_from_file(
                                progress_wrapper,
                                content_type=content_type,
                                size=file_size,
                                timeout=timeout,
                            )
                        progress_state.done = True
                        return

                    except Exception as e:
                        last_exception = e
                        progress_state.last_error = str(e)

                        if not self.is_retryable_error(e):
                            logger.error(f"Non-retryable upload error: {e}")
                            raise

                        if attempt < max_retries:
                            delay = min(initial_delay * (2**attempt), max_delay)
                            progress_state.retry_count = attempt + 1

                            logger.warning(
                                f"Upload attempt {attempt + 1}/{max_retries + 1} failed: {e}. "
                                f"Retrying in {delay:.1f}s..."
                            )

                            progress_state.bytes_read = 0
                            progress_state.progress = 25.0

                            time.sleep(delay)
                        else:
                            logger.error(
                                f"Upload failed after {max_retries + 1} attempts: {e}"
                            )
                            raise

                if last_exception:
                    raise last_exception

            loop = asyncio.get_event_loop()
            updater_task = asyncio.create_task(progress_updater())
            try:
                await loop.run_in_executor(None, blocking_upload_with_retry)
            finally:
                progress_state.done = True
                await updater_task

            if progress_state.retry_count > 0:
                logger.info(
                    f"Upload succeeded after {progress_state.retry_count} retries"
                )

            job.progress = 95.0
            job.bytes_uploaded = file_size

            elapsed = (datetime.utcnow() - start_time).total_seconds()
            if elapsed > 0:
                job.upload_speed = file_size / elapsed

            job.eta_seconds = None
            await job.save()
            if on_progress:
                await on_progress(95.0, file_size, job.upload_speed, None)

            public_url = f"https://storage.googleapis.com/{settings.GCS_BUCKET_NAME}/{destination_blob_name}"
            logger.info(f"Uploaded to GCS: {public_url}")

            return public_url

        except Exception as e:
            logger.error(f"GCS upload failed: {e}", exc_info=True)
            return None

    async def delete_file(self, gcs_path: str) -> bool:
        """
        Delete a file from GCS.

        Args:
            gcs_path: The path to the file in GCS (e.g., "movies/title/file.mp4")

        Returns:
            True if the file was deleted or didn't exist, False on error
        """
        try:
            client = await self.get_client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(gcs_path)

            if blob.exists():
                blob.delete()
                logger.info(f"Deleted GCS file: {gcs_path}")
                return True
            else:
                logger.debug(
                    f"GCS file not found (already deleted or never existed): {gcs_path}"
                )
                return True

        except Exception as e:
            logger.error(f"Failed to delete GCS file {gcs_path}: {e}", exc_info=True)
            return False

    async def file_exists(self, gcs_path: str) -> bool:
        """
        Check if a file exists in GCS.

        Args:
            gcs_path: The path to the file in GCS

        Returns:
            True if the file exists, False otherwise
        """
        try:
            client = await self.get_client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME)
            blob = bucket.blob(gcs_path)
            return blob.exists()

        except Exception as e:
            logger.error(
                f"Failed to check GCS file existence {gcs_path}: {e}", exc_info=True
            )
            return False

    async def list_files(self, prefix: str) -> list:
        """
        List files in GCS with a given prefix.

        Args:
            prefix: The prefix to filter files (e.g., "movies/")

        Returns:
            List of blob names matching the prefix
        """
        try:
            client = await self.get_client()
            bucket = client.bucket(settings.GCS_BUCKET_NAME)
            blobs = bucket.list_blobs(prefix=prefix)
            return [blob.name for blob in blobs]

        except Exception as e:
            logger.error(
                f"Failed to list GCS files with prefix {prefix}: {e}", exc_info=True
            )
            return []


# Global GCS uploader instance
gcs_uploader = GCSUploader()
