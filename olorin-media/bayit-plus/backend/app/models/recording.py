"""
Recording Models
Database models for live stream recording functionality
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field


class RecordingSession(Document):
    """Active recording session tracking"""

    user_id: str
    channel_id: str
    channel_name: str
    recording_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stream_url: str

    # Recording details
    started_at: datetime = Field(default_factory=datetime.utcnow)
    expected_end_at: Optional[datetime] = None
    actual_end_at: Optional[datetime] = None
    status: str = (
        "recording"  # 'recording', 'processing', 'completed', 'failed', 'cancelled'
    )

    # Subtitle capture
    subtitle_enabled: bool = False
    subtitle_target_language: Optional[str] = None
    subtitle_cues_count: int = 0

    # Technical details
    ffmpeg_pid: Optional[int] = None
    output_path: str
    file_size_bytes: int = 0
    duration_seconds: int = 0

    # Metadata
    trigger_type: str = "manual"  # 'manual' or 'scheduled'
    schedule_id: Optional[str] = None
    error_message: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "recording_sessions"
        indexes = [
            [("user_id", 1), ("status", 1)],
            [("channel_id", 1), ("status", 1)],
            [("recording_id", 1)],
        ]


class Recording(Document):
    """Completed recording metadata"""

    id: str
    user_id: str
    channel_id: str
    channel_name: str

    # Recording details
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None

    # Timing
    recorded_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: datetime
    ended_at: datetime
    duration_seconds: int

    # Storage
    video_url: str
    subtitle_url: Optional[str] = None
    file_size_bytes: int

    # Access & lifecycle
    is_private: bool = True
    auto_delete_at: datetime
    view_count: int = 0
    last_viewed_at: Optional[datetime] = None

    # Quality metadata
    video_codec: str = "libx264"
    audio_codec: str = "aac"
    resolution: str = "1080p"
    bitrate: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    @classmethod
    def from_session(cls, session: RecordingSession, video_url: str, file_size: int):
        """Create Recording from completed session"""
        return cls(
            id=session.recording_id,
            user_id=session.user_id,
            channel_id=session.channel_id,
            channel_name=session.channel_name,
            title=f"{session.channel_name} - {session.started_at.strftime('%Y-%m-%d %H:%M')}",
            started_at=session.started_at,
            ended_at=session.actual_end_at or datetime.now(timezone.utc),
            duration_seconds=session.duration_seconds,
            video_url=video_url,
            file_size_bytes=file_size,
            auto_delete_at=datetime.now(timezone.utc) + timedelta(days=30),
        )

    class Settings:
        name = "recordings"
        indexes = [
            [("user_id", 1), ("recorded_at", -1)],
            [("auto_delete_at", 1)],
            [("channel_id", 1)],
        ]


class RecordingSchedule(Document):
    """Scheduled recording configuration"""

    user_id: str
    channel_id: str
    channel_name: str

    # Schedule details
    program_title: str
    start_time: datetime
    end_time: datetime

    # Settings
    subtitle_enabled: bool = False
    subtitle_target_language: Optional[str] = None

    # Status
    status: str = (
        "pending"  # 'pending', 'recording', 'completed', 'failed', 'cancelled'
    )
    recording_id: Optional[str] = None

    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "recording_schedules"
        indexes = [
            [("user_id", 1), ("status", 1)],
            [("start_time", 1), ("status", 1)],
        ]


class RecordingSubtitleCue(Document):
    """Individual subtitle cues captured during recording"""

    recording_id: str
    sequence: int

    # Timing (relative to recording start)
    start_time_seconds: float
    end_time_seconds: float

    # Content
    text: str
    original_text: str
    source_lang: str
    target_lang: str
    confidence: float

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "recording_subtitle_cues"
        indexes = [
            [("recording_id", 1), ("sequence", 1)],
        ]


class RecordingQuota(BaseModel):
    """User recording quota tracking"""

    total_storage_bytes: int = 5_368_709_120  # 5GB default for premium
    used_storage_bytes: int = 0
    max_recording_duration_seconds: int = 14400  # 4 hours default
    max_concurrent_recordings: int = 1

    @property
    def available_storage_bytes(self) -> int:
        """Calculate available storage"""
        return max(0, self.total_storage_bytes - self.used_storage_bytes)

    @property
    def storage_usage_percentage(self) -> float:
        """Calculate storage usage percentage"""
        if self.total_storage_bytes == 0:
            return 0.0
        return (self.used_storage_bytes / self.total_storage_bytes) * 100

    def has_storage_available(self, required_bytes: int = 0) -> bool:
        """Check if storage is available"""
        return self.available_storage_bytes >= required_bytes
