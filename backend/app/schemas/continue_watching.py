"""
Continue Watching Schemas
Pydantic models for continue watching API responses
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class ContinueWatchingItem(BaseModel):
    """
    Single continue watching item.

    Represents one piece of content the user is currently watching
    with playback progress information.
    """

    id: str = Field(
        ...,
        description="Content ID (movie, series episode, audiobook, or podcast episode)",
        example="the-chosen-s2e5",
    )

    title: str = Field(
        ...,
        description="Display title (includes series name for episodes)",
        example="The Chosen: S2E5 - I Saw You",
    )

    type: str = Field(
        ...,
        description="Content type",
        example="episode",
        pattern="^(movie|episode|audiobook|podcast)$",
    )

    cover_url: Optional[str] = Field(
        None,
        description="Cover image URL (poster, thumbnail, or artwork)",
        example="https://cdn.bayit.tv/covers/chosen-s2.jpg",
    )

    duration: int = Field(
        ...,
        description="Total content duration in seconds",
        example=3600,
        ge=0,
    )

    position: int = Field(
        ...,
        description="Current playback position in seconds",
        example=2340,
        ge=0,
    )

    @property
    def progress(self) -> float:
        """Calculate progress as percentage (0.0 to 1.0)"""
        if self.duration == 0:
            return 0.0
        return min(self.position / self.duration, 1.0)

    @property
    def progress_percent(self) -> int:
        """Get progress as integer percentage (0-100)"""
        return int(self.progress * 100)

    @property
    def time_remaining(self) -> int:
        """Get time remaining in seconds"""
        return max(self.duration - self.position, 0)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "the-chosen-s2e5",
                "title": "The Chosen: S2E5 - I Saw You",
                "type": "episode",
                "cover_url": "https://cdn.bayit.tv/covers/chosen-s2.jpg",
                "duration": 3600,
                "position": 2340,
            }
        }


class ContinueWatchingResponse(BaseModel):
    """
    Continue watching API response.

    Returns list of content items user is currently watching,
    ordered by most recently watched.
    """

    items: List[ContinueWatchingItem] = Field(
        ...,
        description="List of continue watching items, ordered by most recent",
        max_length=50,
    )

    class Config:
        json_schema_extra = {
            "example": {
                "items": [
                    {
                        "id": "the-chosen-s2e5",
                        "title": "The Chosen: S2E5 - I Saw You",
                        "type": "episode",
                        "cover_url": "https://cdn.bayit.tv/covers/chosen-s2.jpg",
                        "duration": 3600,
                        "position": 2340,
                    },
                    {
                        "id": "sapiens-audiobook",
                        "title": "Sapiens: A Brief History of Humankind",
                        "type": "audiobook",
                        "cover_url": "https://cdn.bayit.tv/covers/sapiens.jpg",
                        "duration": 28800,
                        "position": 10080,
                    },
                    {
                        "id": "torah-today-ep42",
                        "title": "Torah Today: Episode 42",
                        "type": "podcast",
                        "cover_url": "https://cdn.bayit.tv/covers/torah-today.jpg",
                        "duration": 2700,
                        "position": 720,
                    },
                ]
            }
        }
