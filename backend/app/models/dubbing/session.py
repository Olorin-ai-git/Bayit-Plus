"""
User Dubbing and Live Subtitle Session Models

Supports both audio dubbing and live subtitle generation
"""

from datetime import datetime, timezone
from typing import Literal, Optional

from beanie import Document
from pydantic import BaseModel, Field


class DubbingSessionType(BaseModel):
    """Session type configuration"""

    audio_dubbing: bool = True  # Enable audio dubbing
    live_subtitles: bool = False  # Enable live subtitles
    subtitle_language: Optional[str] = None  # Subtitle language if enabled


class UserDubbingSession(Document):
    """
    User-facing dubbing/subtitle session

    Tracks real-time dubbing and subtitle generation sessions
    Enforces per-user quota limits (free tier: 5 mins/day)
    """

    # User and session info
    user_id: str = Field(..., index=True)
    session_id: str = Field(..., index=True)

    # Session type
    session_type: DubbingSessionType

    # Language configuration
    source_language: str = "he"  # Hebrew (default)
    target_language: str = "en"  # English, Spanish, etc.

    # Voice configuration (for audio dubbing)
    voice_id: Optional[str] = None
    voice_gender: Optional[Literal["male", "female"]] = None

    # Session state
    status: Literal["active", "completed", "failed", "expired"] = "active"
    start_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None

    # Usage tracking
    duration_seconds: float = 0.0
    audio_chunks_processed: int = 0
    subtitles_generated: int = 0
    bytes_transferred: int = 0

    # WebSocket connection info
    websocket_connected: bool = False
    last_activity: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Error tracking
    error_message: Optional[str] = None
    error_count: int = 0

    # Extension metadata
    extension_version: Optional[str] = None
    browser: Optional[str] = None
    platform: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "user_dubbing_sessions"
        indexes = [
            "user_id",
            "session_id",
            "status",
            "start_time",
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "user_12345",
                "session_id": "session_67890",
                "session_type": {
                    "audio_dubbing": True,
                    "live_subtitles": True,
                    "subtitle_language": "en",
                },
                "source_language": "he",
                "target_language": "en",
                "voice_id": "voice_123",
                "status": "active",
            }
        }


class UserQuota(Document):
    """
    User quota tracking for dubbing/subtitle services

    Free tier: 5 minutes per day
    Premium: Unlimited
    """

    user_id: str = Field(..., index=True)

    # Daily usage (resets at midnight UTC)
    daily_minutes_used: float = 0.0
    last_reset_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    # Lifetime statistics
    total_minutes_used: float = 0.0
    total_sessions: int = 0

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "user_quotas"
        indexes = ["user_id"]


# Request/Response Models


class CreateSessionRequest(BaseModel):
    """Request to create dubbing/subtitle session"""

    source_language: str = "he"
    target_language: str = "en"
    voice_id: Optional[str] = None

    # Session type configuration
    audio_dubbing: bool = True
    live_subtitles: bool = False
    subtitle_language: Optional[str] = None

    # Extension metadata
    extension_version: Optional[str] = None
    browser: Optional[str] = None
    platform: Optional[str] = None


class SessionResponse(BaseModel):
    """Response with session info"""

    session_id: str
    websocket_url: str
    quota_remaining_minutes: float
    session_type: DubbingSessionType
    expires_at: datetime

    class Config:
        json_schema_extra = {
            "example": {
                "session_id": "session_67890",
                "websocket_url": "wss://api.bayit.tv/api/v1/dubbing/ws/session_67890",
                "quota_remaining_minutes": 4.2,
                "session_type": {
                    "audio_dubbing": True,
                    "live_subtitles": True,
                    "subtitle_language": "en",
                },
                "expires_at": "2026-01-28T12:00:00Z",
            }
        }


class SessionStatusResponse(BaseModel):
    """Response with detailed session status"""

    session_id: str
    status: str
    duration_seconds: float
    audio_chunks_processed: int
    subtitles_generated: int
    websocket_connected: bool
    created_at: datetime
    updated_at: datetime


class QuotaCheckResponse(BaseModel):
    """Response for quota check"""

    has_quota: bool
    minutes_used: float
    minutes_total: float
    minutes_remaining: float
    is_premium: bool
    reset_at: datetime


class UsageSyncRequest(BaseModel):
    """Request to sync usage data"""

    daily_minutes_used: float
    last_reset_date: str  # ISO date string


class UsageSyncResponse(BaseModel):
    """Response with server-side usage data"""

    daily_minutes_used: float
    quota_remaining: float
    is_premium: bool
