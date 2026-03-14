"""
Download Model

Tracks user download records for offline content playback.
Client-first architecture: clients download directly from stream URLs,
backend stores metadata only as a registry.
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field


class DownloadContentType(str, Enum):
    """Downloadable content types."""

    MOVIE = "movie"
    EPISODE = "episode"
    PODCAST = "podcast"
    AUDIOBOOK = "audiobook"
    # Backward compatibility aliases
    VOD = "vod"
    PODCAST_EPISODE = "podcast_episode"


class DownloadStatus(str, Enum):
    """Download lifecycle states."""

    PENDING = "pending"
    DOWNLOADING = "downloading"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"


class DownloadQuality(str, Enum):
    """Download quality levels."""

    SD = "sd"
    HD = "hd"
    FHD = "fhd"


class Download(Document):
    """User download record stored in MongoDB."""

    user_id: str
    content_id: str
    content_type: DownloadContentType
    quality: DownloadQuality = DownloadQuality.HD
    status: DownloadStatus = DownloadStatus.PENDING
    progress: int = 0
    file_size: Optional[int] = None
    downloaded_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: Optional[datetime] = None
    retry_count: int = 0

    class Settings:
        name = "downloads"
        indexes = [
            [("user_id", 1), ("content_id", 1)],
            "user_id",
        ]


class DownloadAdd(BaseModel):
    """Request model: register a single download."""

    content_id: str
    content_type: DownloadContentType
    quality: DownloadQuality = DownloadQuality.HD


class DownloadBatchAdd(BaseModel):
    """Request model: register multiple downloads (collection queue)."""

    items: list[DownloadAdd]


class DownloadResponse(BaseModel):
    """Response model for download records."""

    id: str
    content_id: str
    content_type: str
    title: Optional[str] = None
    thumbnail: Optional[str] = None
    quality: str
    status: str
    progress: int
    file_size: Optional[int] = None
    downloaded_at: str
    retry_count: int = 0


class DownloadStatsResponse(BaseModel):
    """Response model for download statistics."""

    total_count: int
    total_size_bytes: int
    by_status: dict[str, int]
