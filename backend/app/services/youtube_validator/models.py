"""
YouTube Validator Data Models

Data classes and result types for YouTube validation.
"""

from dataclasses import dataclass
from typing import Optional

from app.services.youtube_validator.constants import VIDEO_STATUS_ERROR


@dataclass
class YouTubeValidationResult:
    """Result of YouTube video validation."""

    url: str
    video_id: str
    is_valid: bool
    status: str  # "available", "unavailable", "private", "removed", "error"
    title: Optional[str] = None
    author: Optional[str] = None
    response_time_ms: Optional[int] = None
    error_message: Optional[str] = None

    @classmethod
    def create_error(
        cls,
        url: str,
        video_id: str,
        error_message: str,
        response_time_ms: Optional[int] = None,
    ) -> "YouTubeValidationResult":
        """
        Create an error result.

        Args:
            url: Original URL
            video_id: Extracted video ID (may be empty)
            error_message: Description of the error
            response_time_ms: Optional response time

        Returns:
            YouTubeValidationResult with error status
        """
        return cls(
            url=url,
            video_id=video_id,
            is_valid=False,
            status=VIDEO_STATUS_ERROR,
            error_message=error_message,
            response_time_ms=response_time_ms,
        )

    @classmethod
    def create_invalid_url(cls, url: str) -> "YouTubeValidationResult":
        """
        Create a result for an invalid URL (cannot extract video ID).

        Args:
            url: Original URL

        Returns:
            YouTubeValidationResult indicating invalid URL
        """
        return cls(
            url=url,
            video_id="",
            is_valid=False,
            status=VIDEO_STATUS_ERROR,
            error_message="Could not extract video ID from URL",
        )
