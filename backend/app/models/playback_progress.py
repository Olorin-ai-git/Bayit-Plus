"""
Playback Progress Model
Tracks user's playback position for movies, series, audiobooks, and podcasts
"""

from datetime import datetime
from typing import Optional
from beanie import Document, Indexed
from pydantic import Field


class PlaybackProgress(Document):
    """
    Playback progress tracking for all content types.

    Stores the user's current position in any piece of content,
    allowing resume functionality across devices and the widget.
    """

    user_id: Indexed(str) = Field(
        ...,
        description="User ID who is watching",
    )

    content_id: Indexed(str) = Field(
        ...,
        description="Content ID (movie, episode, audiobook chapter, podcast episode)",
    )

    content_type: str = Field(
        ...,
        description="Type of content",
        pattern="^(movie|episode|audiobook|podcast)$",
    )

    position: int = Field(
        ...,
        description="Current playback position in seconds",
        ge=0,
    )

    duration: Optional[int] = Field(
        None,
        description="Total content duration in seconds (cached for quick access)",
        ge=0,
    )

    progress: float = Field(
        default=0.0,
        description="Progress as percentage (0.0 to 1.0)",
        ge=0.0,
        le=1.0,
    )

    device_id: Optional[str] = Field(
        None,
        description="Device ID where playback occurred (for analytics)",
    )

    platform: Optional[str] = Field(
        None,
        description="Platform: web, ios, android, tvos",
    )

    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="When playback was first tracked",
    )

    updated_at: Indexed(datetime) = Field(
        default_factory=datetime.utcnow,
        description="When playback was last updated",
    )

    class Settings:
        name = "playback_progress"
        indexes = [
            [("user_id", 1), ("content_id", 1)],  # Composite index for lookups
            [("user_id", 1), ("updated_at", -1)],  # For continue watching queries
            [("updated_at", -1)],  # For cleanup of old entries
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_123",
                "content_id": "the-chosen-s2e5",
                "content_type": "episode",
                "position": 2340,
                "duration": 3600,
                "progress": 0.65,
                "device_id": "iphone_abc123",
                "platform": "ios",
                "created_at": "2026-02-14T10:30:00Z",
                "updated_at": "2026-02-14T11:45:00Z",
            }
        }

    def update_position(self, position: int, duration: Optional[int] = None) -> None:
        """
        Update playback position and recalculate progress.

        Args:
            position: New position in seconds
            duration: Total duration in seconds (optional, uses existing if not provided)
        """
        self.position = position
        self.updated_at = datetime.utcnow()

        if duration is not None:
            self.duration = duration

        if self.duration and self.duration > 0:
            self.progress = min(position / self.duration, 1.0)
        else:
            self.progress = 0.0

    def is_completed(self, threshold: float = 0.95) -> bool:
        """
        Check if content is completed.

        Args:
            threshold: Progress threshold to consider completed (default 95%)

        Returns:
            True if progress >= threshold
        """
        return self.progress >= threshold

    def time_remaining(self) -> int:
        """
        Get time remaining in seconds.

        Returns:
            Seconds remaining, or 0 if duration unknown
        """
        if not self.duration:
            return 0
        return max(self.duration - self.position, 0)
