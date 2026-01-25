"""
Live Dubbing Session Model

Tracks real-time dubbing sessions for analytics, billing, and session management.
Part of the Olorin.ai platform capabilities.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

import pymongo
from beanie import Document
from pydantic import BaseModel, Field


class DubbingMetrics(BaseModel):
    """Metrics tracked during a dubbing session."""

    audio_seconds_processed: float = 0.0
    segments_transcribed: int = 0
    segments_translated: int = 0
    segments_synthesized: int = 0
    avg_stt_latency_ms: float = 0.0
    avg_translation_latency_ms: float = 0.0
    avg_tts_latency_ms: float = 0.0
    avg_total_latency_ms: float = 0.0
    errors_count: int = 0
    reconnections_count: int = 0


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
            # TTL index for automatic cleanup of old completed sessions (30 days = 2592000 seconds)
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
    """Dubbed audio chunk message."""

    type: str = "dubbed_audio"
    data: str = Field(..., description="Base64-encoded audio data")
    original_text: str = Field(..., description="Original transcribed text")
    translated_text: str = Field(..., description="Translated text")
    sequence: int = Field(..., description="Sequence number for ordering")
    timestamp_ms: int = Field(
        default_factory=lambda: int(datetime.utcnow().timestamp() * 1000)
    )
    latency_ms: int = Field(..., description="Total pipeline latency")


class LatencyReport(BaseModel):
    """Periodic latency report message."""

    type: str = "latency_report"
    avg_stt_ms: int
    avg_translation_ms: int
    avg_tts_ms: int
    avg_total_ms: int
    segments_processed: int
