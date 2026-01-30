"""
Live Feature Quota Models
Per-user usage limits and tracking for live subtitles and dubbing features
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field


class FeatureType(str, Enum):
    """Type of live feature"""

    SUBTITLE = "subtitle"
    DUBBING = "dubbing"
    TRIVIA = "trivia"


class UsageSessionStatus(str, Enum):
    """Status of a usage session"""

    ACTIVE = "active"
    COMPLETED = "completed"
    ERROR = "error"
    INTERRUPTED = "interrupted"


class LiveFeatureQuota(Document):
    """Per-user usage limits for live features (subtitles & dubbing)"""

    user_id: str

    # Limits (in minutes) - configurable per user
    subtitle_minutes_per_hour: int = 30
    subtitle_minutes_per_day: int = 120
    subtitle_minutes_per_month: int = 1000

    dubbing_minutes_per_hour: int = 15
    dubbing_minutes_per_day: int = 60
    dubbing_minutes_per_month: int = 500

    trivia_facts_per_hour: int = 30
    trivia_facts_per_day: int = 120
    trivia_facts_per_month: int = 1000

    # Current usage tracking (rolling windows)
    subtitle_usage_current_hour: float = 0.0
    subtitle_usage_current_day: float = 0.0
    subtitle_usage_current_month: float = 0.0

    dubbing_usage_current_hour: float = 0.0
    dubbing_usage_current_day: float = 0.0
    dubbing_usage_current_month: float = 0.0

    trivia_usage_current_hour: int = 0
    trivia_usage_current_day: int = 0
    trivia_usage_current_month: int = 0

    # Window tracking (for reset)
    last_hour_reset: datetime = Field(default_factory=datetime.utcnow)
    last_day_reset: datetime = Field(default_factory=datetime.utcnow)
    last_month_reset: datetime = Field(default_factory=datetime.utcnow)

    # Soft limits (warning thresholds)
    warning_threshold_percentage: int = 80

    # Rollover tracking (up to 2x limit)
    max_rollover_multiplier: float = 2.0
    accumulated_subtitle_minutes: float = 0.0
    accumulated_dubbing_minutes: float = 0.0

    # Cost tracking (internal analytics)
    estimated_cost_current_month: float = 0.0
    total_lifetime_cost: float = 0.0

    # Admin notes
    notes: Optional[str] = None
    limit_extended_by: Optional[str] = None
    limit_extended_at: Optional[datetime] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "live_feature_quotas"
        indexes = [
            "user_id",
            [("last_hour_reset", 1)],
            [("last_day_reset", 1)],
            [("last_month_reset", 1)],
        ]


class LiveFeatureUsageSession(Document):
    """Individual usage session tracking"""

    session_id: str
    user_id: str
    channel_id: str
    feature_type: FeatureType

    # Session timing
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    last_activity_at: datetime = Field(default_factory=datetime.utcnow)
    duration_seconds: float = 0.0

    # Metrics
    audio_seconds_processed: float = 0.0
    segments_processed: int = 0
    errors_count: int = 0

    # Latency tracking (in milliseconds)
    stt_latency_ms: float = 0.0
    llm_first_token_ms: float = 0.0
    tts_first_audio_ms: float = 0.0
    end_to_end_latency_ms: float = 0.0

    # Cost tracking (estimated costs in USD)
    estimated_stt_cost: float = 0.0
    estimated_translation_cost: float = 0.0
    estimated_tts_cost: float = 0.0
    estimated_total_cost: float = 0.0

    # Status
    status: UsageSessionStatus = UsageSessionStatus.ACTIVE

    # Metadata
    source_language: Optional[str] = None
    target_language: Optional[str] = None
    platform: str = "web"

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "live_feature_usage_sessions"
        indexes = [
            "session_id",
            "user_id",
            [("user_id", 1), ("started_at", -1)],
            [("status", 1)],
            [("feature_type", 1), ("started_at", -1)],
        ]


class UsageStats(BaseModel):
    """Usage statistics for frontend display"""

    subtitle_usage_current_hour: float
    subtitle_usage_current_day: float
    subtitle_usage_current_month: float
    subtitle_minutes_per_hour: int
    subtitle_minutes_per_day: int
    subtitle_minutes_per_month: int
    subtitle_available_hour: float
    subtitle_available_day: float
    subtitle_available_month: float
    accumulated_subtitle_minutes: float

    dubbing_usage_current_hour: float
    dubbing_usage_current_day: float
    dubbing_usage_current_month: float
    dubbing_minutes_per_hour: int
    dubbing_minutes_per_day: int
    dubbing_minutes_per_month: int
    dubbing_available_hour: float
    dubbing_available_day: float
    dubbing_available_month: float
    accumulated_dubbing_minutes: float

    estimated_cost_current_month: float
    warning_threshold_percentage: int
