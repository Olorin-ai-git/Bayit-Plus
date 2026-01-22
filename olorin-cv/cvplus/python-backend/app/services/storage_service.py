"""
Storage Service
Google Cloud Storage integration following Olorin patterns
"""

import logging
from typing import Optional

from google.cloud import storage
from google.cloud.exceptions import GoogleCloudError

from app.core.config import get_settings

logger = logging.getLogger(__name__)


class StorageService:
    """
    Google Cloud Storage service
    Follows Olorin storage patterns
    Uses lazy initialization to avoid import-time errors
    """

    _client: Optional[storage.Client] = None
    _bucket: Optional[storage.Bucket] = None

    def __init__(self):
        self._settings = get_settings()
        self.bucket_name = self._settings.storage_bucket

    @property
    def client(self) -> storage.Client:
        """Lazy initialization of GCS client."""
        if self._client is None:
            self._client = storage.Client(project=self._settings.firebase_project_id)
        return self._client

    @property
    def bucket(self) -> storage.Bucket:
        """Lazy initialization of GCS bucket."""
        if self._bucket is None:
            self._bucket = self.client.bucket(self.bucket_name)
        return self._bucket

    async def upload_file(
        self,
        content: bytes,
        filename: str,
        content_type: str = "application/octet-stream"
    ) -> str:
        """
        Upload file to Google Cloud Storage

        Args:
            content: File content as bytes
            filename: Destination filename (path)
            content_type: MIME type

        Returns:
            Public URL of uploaded file
        """
        logger.info(f"Uploading file to GCS", extra={
            "filename": filename,
            "size": len(content),
            "content_type": content_type,
        })

        try:
            blob = self.bucket.blob(filename)
            blob.upload_from_string(content, content_type=content_type)

            # Make blob publicly accessible (for profile sharing)
            blob.make_public()

            url = blob.public_url

            logger.info(f"File uploaded successfully", extra={
                "filename": filename,
                "url": url,
            })

            return url

        except GoogleCloudError as e:
            logger.error(f"GCS upload failed: {e}", exc_info=True)
            raise

    async def upload_text(
        self,
        text: str,
        filename: str,
        content_type: str = "text/plain"
    ) -> str:
        """Upload text content to GCS"""

        return await self.upload_file(
            text.encode("utf-8"),
            filename,
            content_type
        )

    async def download_file(self, filename: str) -> bytes:
        """Download file from GCS"""

        logger.info(f"Downloading file from GCS: {filename}")

        try:
            blob = self.bucket.blob(filename)
            content = blob.download_as_bytes()

            logger.info(f"File downloaded successfully: {filename}")

            return content

        except GoogleCloudError as e:
            logger.error(f"GCS download failed: {e}", exc_info=True)
            raise

    async def delete_file(self, filename: str):
        """Delete file from GCS"""

        logger.info(f"Deleting file from GCS: {filename}")

        try:
            blob = self.bucket.blob(filename)
            blob.delete()

            logger.info(f"File deleted successfully: {filename}")

        except GoogleCloudError as e:
            logger.error(f"GCS delete failed: {e}", exc_info=True)
            raise

    async def get_signed_url(
        self,
        filename: str,
        expiration_minutes: int = 60
    ) -> str:
        """
        Generate signed URL for temporary access

        Args:
            filename: File path in bucket
            expiration_minutes: URL expiration time

        Returns:
            Signed URL
        """
        logger.info(f"Generating signed URL for: {filename}")

        try:
            blob = self.bucket.blob(filename)

            from datetime import timedelta
            url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(minutes=expiration_minutes),
                method="GET"
            )

            logger.info(f"Signed URL generated: {filename}")

            return url

        except GoogleCloudError as e:
            logger.error(f"Signed URL generation failed: {e}", exc_info=True)
            raise

    def get_public_url(self, filename: str) -> str:
        """Get public URL for a file"""

        return f"https://storage.googleapis.com/{self.bucket_name}/{filename}"
