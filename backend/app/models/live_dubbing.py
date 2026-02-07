"""
Live Dubbing Session Model

Tracks real-time dubbing sessions for analytics, billing, and session management.
Part of the Olorin.ai platform capabilities.
"""

from datetime import datetime
from typing import Any, Dict, Optional

import pymongo
from beanie import Document
from pydantic import BaseModel, Field


class DubbingMetrics(BaseModel):
    """Metrics tracked during a dubbing session."""

    audio_seconds_processed: float = 0.0
    segments_transcribed: int = 0
    segments_translated: int = 0
    segments_synthesized: int = 0

    # Average latencies
    avg_stt_latency_ms: float = 0.0
    avg_translation_latency_ms: float = 0.0
    avg_tts_latency_ms: float = 0.0
    avg_total_latency_ms: float = 0.0

    # Percentile latencies (p50, p95, p99)
    p50_stt_latency_ms: float = 0.0
    p95_stt_latency_ms: float = 0.0
    p99_stt_latency_ms: float = 0.0
    p50_translation_latency_ms: float = 0.0
    p95_translation_latency_ms: float = 0.0
    p99_translation_latency_ms: float = 0.0
    p50_tts_latency_ms: float = 0.0
    p95_tts_latency_ms: float = 0.0
    p99_tts_latency_ms: float = 0.0

    # Network latency estimates
    avg_network_upload_latency_ms: float = 0.0
    avg_network_download_latency_ms: float = 0.0
    avg_network_roundtrip_latency_ms: float = 0.0

    # Error tracking
    errors_count: int = 0
    reconnections_count: int = 0

    # Cache performance
    translation_cache_hits: int = 0
    translation_cache_misses: int = 0


class LiveDubbingSession(Document):
    """
    Tracks a live dubbing session.

    Sessions are created when a user starts dubbing on a live channel
    and updated with metrics throughout the session.
    """

    # Session identification
    session_id: str = Field(..., description="Unique session identifier")
    user_id: str = Field(..., description="User who started the session")
    channel_id: str = Field(..., description="Live channel being dubbed")

    # Language configuration
    source_language: str = Field(default="he", description="Source audio language")
    target_language: str = Field(default="en", description="Target dubbing language")
    voice_id: str = Field(..., description="ElevenLabs voice ID used")

    # Session state
    status: str = Field(
        default="active",
        description="Session status: active, paused, completed, error",
    )
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    last_activity_at: datetime = Field(default_factory=datetime.utcnow)

    # Sync configuration
    sync_delay_ms: int = Field(default=600, description="Video sync delay in ms")

    # Performance metrics
    metrics: DubbingMetrics = Field(default_factory=DubbingMetrics)

    # Error tracking
    last_error: Optional[str] = None
    last_error_at: Optional[datetime] = None

    # Platform information
    platform: str = Field(
        default="web", description="Client platform: web, ios, tvos, android"
    )
    client_version: Optional[str] = None

    class Settings:
        name = "live_dubbing_sessions"
        indexes = [
            pymongo.IndexModel([("session_id", pymongo.ASCENDING)], unique=True),
            pymongo.IndexModel([("user_id", pymongo.ASCENDING)]),
            pymongo.IndexModel([("channel_id", pymongo.ASCENDING)]),
            pymongo.IndexModel([("status", pymongo.ASCENDING)]),
            pymongo.IndexModel([("started_at", pymongo.DESCENDING)]),
            pymongo.IndexModel(
                [("user_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)]
            ),
            pymongo.IndexModel(
                [("channel_id", pymongo.ASCENDING), ("status", pymongo.ASCENDING)]
            ),
            pymongo.IndexModel(
                [
                    ("status", pymongo.ASCENDING),
                    ("last_activity_at", pymongo.DESCENDING),
                ]
            ),
            # TTL index for automatic cleanup (30 days = 2592000 seconds)
            # Note: MongoDB requires explicit $eq operator in partialFilterExpression
            pymongo.IndexModel(
                [("ended_at", pymongo.ASCENDING)],
                expireAfterSeconds=2592000,
                partialFilterExpression={"status": {"$eq": "completed"}},
            ),
        ]


class DubbingMessage(BaseModel):
    """Message sent over WebSocket during dubbing."""

    type: str = Field(..., description="Message type")
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp_ms: int = Field(
        default_factory=lambda: int(datetime.utcnow().timestamp() * 1000)
    )


class DubbedAudioMessage(BaseModel):
    """Dubbed audio chunk message with continuous flow fields."""

    type: str = "dubbed_audio"
    data: str = Field(..., description="Base64-encoded audio data")
    original_text: str = Field(..., description="Original transcribed text")
    translated_text: str = Field(..., description="Translated text")
    sequence: int = Field(..., description="Sequence number for ordering")
    timestamp_ms: int = Field(
        default_factory=lambda: int(datetime.utcnow().timestamp() * 1000)
    )
    latency_ms: int = Field(..., description="Total pipeline latency")

    # Continuous flow fields for sync-focused playback
    video_timestamp_ms: Optional[int] = Field(
        default=None, description="Video timeline position for playback sync"
    )
    duration_ms: Optional[int] = Field(
        default=None, description="Audio duration for queue management"
    )
    processing_time_ms: Optional[int] = Field(
        default=None, description="Pipeline processing time"
    )


class BufferStatusMessage(BaseModel):
    """Buffer health status message for continuous flow."""

    type: str = "buffer_status"
    buffer_ahead_seconds: float = Field(
        ..., description="How far ahead processing is from playback"
    )
    buffer_health: str = Field(
        ..., description="Buffer state: healthy, warning, critical, emergency"
    )
    playback_started: bool = Field(
        ..., description="Whether initial buffer is filled and playback started"
    )
    playback_time_ms: int = Field(..., description="Current playback position")
    processed_time_ms: int = Field(..., description="Latest processed position")


class LatencyReport(BaseModel):
    """
    Enhanced periodic latency report message.

    Includes averages, percentiles, and network metrics for comprehensive monitoring.
    All new fields are optional for backward compatibility with existing clients.
    """

    type: str = "latency_report"

    # Average latencies (existing fields - required for backward compatibility)
    avg_stt_ms: int
    avg_translation_ms: int
    avg_tts_ms: int
    avg_total_ms: int
    segments_processed: int

    # Percentile latencies (p50, p95, p99) - NEW (optional)
    p50_stt_ms: Optional[int] = None
    p95_stt_ms: Optional[int] = None
    p99_stt_ms: Optional[int] = None
    p50_translation_ms: Optional[int] = None
    p95_translation_ms: Optional[int] = None
    p99_translation_ms: Optional[int] = None
    p50_tts_ms: Optional[int] = None
    p95_tts_ms: Optional[int] = None
    p99_tts_ms: Optional[int] = None
    p50_total_ms: Optional[int] = None
    p95_total_ms: Optional[int] = None
    p99_total_ms: Optional[int] = None

    # Network latency estimates (upload/download/roundtrip) - NEW (optional)
    avg_network_upload_ms: Optional[int] = None
    avg_network_download_ms: Optional[int] = None
    avg_network_roundtrip_ms: Optional[int] = None

    # Provider information - NEW (optional)
    translation_provider: Optional[str] = None  # "google", "openai", "claude"
    translation_cache_hit_rate: Optional[float] = (
        None  # Cache hit rate (0.0 - 1.0)
    )
