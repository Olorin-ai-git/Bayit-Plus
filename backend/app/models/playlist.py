"""
Playlist Model
User playlist for ordered content playback queue.
Separate from Watchlist (save-for-later) - this is an ordered playback queue.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field, field_validator

from app.core.logging_config import get_logger

logger = get_logger(__name__)

CONTENT_ID_PATTERN = r"^[a-zA-Z0-9_-]{1,64}$"
MAX_PLAYLIST_ITEMS = 100


class ContentType(str, Enum):
    """Allowed content types for playlist items."""

    VOD = "vod"
    LIVE = "live"
    RADIO = "radio"
    PODCAST = "podcast"


class PlaylistItem(BaseModel):
    """Individual item in a user playlist."""

    content_id: str = Field(..., pattern=CONTENT_ID_PATTERN)
    content_type: ContentType
    title: str = Field(..., min_length=1, max_length=500)
    thumbnail: Optional[str] = None
    duration: Optional[float] = None
    position: int = 0
    added_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("content_id")
    @classmethod
    def validate_content_id(cls, v: str) -> str:
        """Ensure content_id is safe against injection."""
        import re

        if not re.match(CONTENT_ID_PATTERN, v):
            raise ValueError("Invalid content_id format")
        return v


class UserPlaylist(Document):
    """User playlist document - one playlist per user."""

    user_id: str
    items: List[PlaylistItem] = Field(default_factory=list, max_length=MAX_PLAYLIST_ITEMS)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "playlists"
        indexes = [
            "user_id",
        ]

    @classmethod
    async def get_or_create(cls, user_id: str) -> "UserPlaylist":
        """Get existing playlist or create a new empty one."""
        playlist = await cls.find_one(cls.user_id == user_id)
        if not playlist:
            playlist = cls(user_id=user_id)
            await playlist.insert()
        return playlist

    def recalculate_positions(self) -> None:
        """Recalculate item positions after add/remove/reorder."""
        for idx, item in enumerate(self.items):
            item.position = idx
