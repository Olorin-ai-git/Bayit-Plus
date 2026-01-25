from datetime import datetime, timezone
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field


class PlaybackSessionBase(BaseModel):
    """Base model for playback session"""

    user_id: str
    device_id: str
    content_id: str
    content_type: str
    device_name: Optional[str] = None
    ip_address: Optional[str] = None


class PlaybackSessionCreate(BaseModel):
    """Model for creating a playback session"""

    device_id: str
    content_id: str
    content_type: str
    device_name: Optional[str] = None
    ip_address: Optional[str] = None


class PlaybackSessionResponse(BaseModel):
    """Response model for playback session"""

    id: str
    user_id: str
    device_id: str
    device_name: Optional[str] = None
    content_id: str
    content_type: str
    started_at: datetime
    last_heartbeat: datetime
    ip_address: Optional[str] = None

    class Config:
        from_attributes = True


class PlaybackSession(Document):
    """
    Tracks active playback sessions for concurrent stream limit enforcement.

    A session is created when a user starts playback and is kept alive via
    heartbeat updates every 30 seconds. Sessions are automatically expired
    if no heartbeat is received for 2+ minutes.
    """

    user_id: str
    device_id: str  # Unique device fingerprint (SHA-256 hash)
    content_id: str  # Currently playing content
    content_type: str  # vod, live, podcast, radio
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_heartbeat: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    ended_at: Optional[datetime] = None
    device_name: Optional[str] = None  # e.g., "iPhone 15 Pro", "Chrome on Windows 11"
    ip_address: Optional[str] = None

    class Settings:
        name = "playback_sessions"
        indexes = [
            "user_id",
            "device_id",
            ("user_id", "ended_at"),  # Compound index for active sessions query
            "last_heartbeat",  # For cleanup queries
        ]

    def to_response(self) -> PlaybackSessionResponse:
        """Convert to response model"""
        return PlaybackSessionResponse(
            id=str(self.id),
            user_id=self.user_id,
            device_id=self.device_id,
            device_name=self.device_name,
            content_id=self.content_id,
            content_type=self.content_type,
            started_at=self.started_at,
            last_heartbeat=self.last_heartbeat,
            ip_address=self.ip_address,
        )

    def is_active(self, timeout_seconds: int = 120) -> bool:
        """
        Check if session is still active based on heartbeat timeout.

        Args:
            timeout_seconds: Seconds after which session is considered stale (default 120)

        Returns:
            True if session has not ended and heartbeat is within timeout
        """
        if self.ended_at is not None:
            return False

        now = datetime.now(timezone.utc)
        time_since_heartbeat = (now - self.last_heartbeat).total_seconds()
        return time_since_heartbeat <= timeout_seconds

    async def update_heartbeat(self) -> None:
        """Update the last heartbeat timestamp"""
        self.last_heartbeat = datetime.now(timezone.utc)
        await self.save()

    async def end_session(self) -> None:
        """Mark session as ended"""
        self.ended_at = datetime.now(timezone.utc)
        await self.save()
