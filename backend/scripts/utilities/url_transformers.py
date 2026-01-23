"""
URL transformation utilities for migration scripts.

Provides configuration-driven URL transformation for bucket upgrades,
S3→GCS migration, and URL validation. NO HARDCODED VALUES.
"""
import re
from typing import Optional
from urllib.parse import urlparse

from app.core.config import settings


class URLTransformer:
    """
    Configuration-driven URL transformation utilities.

    All transformation rules loaded from settings - NO HARDCODED VALUES.
    Supports bucket upgrades, S3→GCS migration, and URL validation.
    """

    def __init__(self):
        """Initialize transformer with configuration from settings."""
        # Load all configuration from settings (NO hardcoded values)
        self.old_bucket = settings.OLD_BUCKET_NAME
        self.new_bucket = settings.NEW_BUCKET_NAME
        self.s3_pattern = settings.S3_PATTERN
        self.gcs_pattern = settings.GCS_PATTERN

    def bucket_upgrade(self, url: Optional[str]) -> Optional[str]:
        """
        Transform old bucket URLs to new bucket.

        Args:
            url: URL to transform (can be None)

        Returns:
            Transformed URL, or None if input was None

        Example:
            >>> transformer = URLTransformer()
            >>> transformer.bucket_upgrade("gs://bayit-plus-media/movie.mp4")
            'gs://bayit-plus-media-new/movie.mp4'
        """
        if not url:
            return url

        # Replace old bucket with new bucket
        if self.old_bucket in url:
            return url.replace(self.old_bucket, self.new_bucket)

        return url

    def s3_to_gcs(self, url: Optional[str]) -> Optional[str]:
        """
        Transform S3 URLs to GCS.

        Args:
            url: URL to transform (can be None)

        Returns:
            Transformed URL, or None if input was None

        Example:
            >>> transformer = URLTransformer()
            >>> transformer.s3_to_gcs("https://s3.amazonaws.com/bucket/file.mp4")
            'https://storage.googleapis.com/bucket/file.mp4'
        """
        if not url:
            return url

        # Replace S3 pattern with GCS pattern
        return re.sub(self.s3_pattern, self.gcs_pattern, url)

    def atlas_url_fix(self, url: Optional[str]) -> Optional[str]:
        """
        Fix Atlas-specific URL issues.

        Handles MongoDB Atlas URL patterns that need fixing.

        Args:
            url: URL to fix (can be None)

        Returns:
            Fixed URL, or None if input was None
        """
        if not url:
            return url

        # Add atlas-specific fixes here as needed
        # Example: fix double slashes, incorrect protocols, etc.
        url = re.sub(r"(?<!:)//+", "/", url)  # Remove double slashes except after protocol

        return url

    def validate_url(self, url: Optional[str]) -> bool:
        """
        Validate URL after transformation.

        Checks that URL has valid scheme and netloc.

        Args:
            url: URL to validate

        Returns:
            True if valid, False otherwise

        Example:
            >>> transformer = URLTransformer()
            >>> transformer.validate_url("https://storage.googleapis.com/bucket/file.mp4")
            True
            >>> transformer.validate_url("invalid-url")
            False
        """
        if not url:
            return True  # Empty/None URLs are valid (optional fields)

        try:
            result = urlparse(url)
            # Must have scheme (http/https/gs) and netloc (domain)
            return all([result.scheme, result.netloc])
        except Exception:
            return False

    def batch_transform(
        self, urls: list[Optional[str]], transformation: str
    ) -> list[Optional[str]]:
        """
        Batch transform multiple URLs.

        Args:
            urls: List of URLs to transform
            transformation: Transformation to apply ("bucket_upgrade" or "s3_to_gcs")

        Returns:
            List of transformed URLs

        Raises:
            ValueError: If transformation name is invalid
        """
        transform_func = getattr(self, transformation, None)

        if not transform_func:
            raise ValueError(
                f"Unknown transformation: {transformation}. "
                f"Valid options: bucket_upgrade, s3_to_gcs, atlas_url_fix"
            )

        return [transform_func(url) for url in urls]

    def get_transformation_config(self) -> dict:
        """
        Get current transformation configuration.

        Returns:
            Dictionary with configuration values (for debugging/verification)
        """
        return {
            "old_bucket": self.old_bucket,
            "new_bucket": self.new_bucket,
            "s3_pattern": self.s3_pattern,
            "gcs_pattern": self.gcs_pattern,
        }
