"""
Dubbing API Models

Request/Response models for dubbing endpoints.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class CreateSessionRequest(BaseModel):
    """Request to create a dubbing session."""

    source_language: str = Field(default="he", description="Source language code")
    target_language: str = Field(default="en", description="Target language code")
    voice_id: Optional[str] = Field(
        default=None,
        description="ElevenLabs voice ID (optional, uses default if not specified)",
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
