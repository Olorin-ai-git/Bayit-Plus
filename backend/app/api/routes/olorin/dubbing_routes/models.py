"""
Dubbing API Models

Request/Response models for dubbing endpoints.
VoiceSettingsRequest defined before CreateSessionRequest (Code Review #3).
Includes NaN/Infinity validation (Security #6).
"""

import math
from typing import List, Optional

from pydantic import BaseModel, Field, field_validator


class VoiceSettingsRequest(BaseModel):
    """P3-2: Per-session voice customization settings."""

    stability: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Voice consistency"
    )
    similarity_boost: float = Field(
        default=0.75, ge=0.0, le=1.0, description="Voice matching strength"
    )
    style: float = Field(
        default=0.0, ge=0.0, le=1.0, description="Style exaggeration"
    )
    # Voice Tech #13: Default False for real-time dubbing (saves 30-80ms)
    speaker_boost: bool = Field(
        default=False,
        description="Enable speaker boost for clarity (adds latency)",
    )

    # Security #6: Reject NaN and Infinity values
    @field_validator("stability", "similarity_boost", "style", mode="before")
    @classmethod
    def reject_non_finite(cls, v: float) -> float:
        """Reject NaN and Infinity float values."""
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            raise ValueError("NaN and Infinity values are not allowed")
        return v


class CreateSessionRequest(BaseModel):
    """Request to create a dubbing session."""

    source_language: str = Field(default="he", description="Source language code")
    target_language: str = Field(default="en", description="Target language code")
    voice_id: Optional[str] = Field(
        default=None,
        description="ElevenLabs voice ID (optional, uses default if not specified)",
    )
    voice_settings: Optional[VoiceSettingsRequest] = Field(
        default=None,
        description="P3-2: Per-session voice customization settings",
    )


class SessionResponse(BaseModel):
    """Dubbing session information."""

    session_id: str
    partner_id: str
    source_language: str
    target_language: str
    voice_id: Optional[str]
    status: str
    started_at: str
    websocket_url: str


class SessionEndResponse(BaseModel):
    """Response when ending a dubbing session."""

    session_id: str
    partner_id: str
    segments_processed: int
    audio_seconds: float
    avg_latency_ms: Optional[float]
    error_count: int
    estimated_cost_usd: float


class VoiceInfo(BaseModel):
    """Voice information."""

    voice_id: str
    name: str
    language: str
    description: Optional[str] = None


class VoicesResponse(BaseModel):
    """List of available voices."""

    voices: List[VoiceInfo]


# P3-1: Voice training models


class CreateCustomVoiceRequest(BaseModel):
    """Request to create a custom voice for training."""

    voice_name: str = Field(
        ..., min_length=1, max_length=100, description="Display name for the voice"
    )
    description: Optional[str] = Field(
        default=None, max_length=500, description="Voice description"
    )
    language: str = Field(
        default="multilingual", description="Primary language for the voice"
    )


class CustomVoiceResponse(BaseModel):
    """Custom voice information."""

    id: str
    partner_id: str
    voice_id: str
    voice_name: str
    description: Optional[str]
    language: str
    status: str
    training_sample_count: int
    created_at: str
    ready_at: Optional[str]


class CustomVoiceListResponse(BaseModel):
    """List of custom voices."""

    voices: List[CustomVoiceResponse]
