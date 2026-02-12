"""
Voice-to-Voice Session Model.

Tracks V2V pronunciation correction sessions where the child's speech
is transcribed, corrected via TTS, then re-skinned with the child's
voice frequency via ElevenLabs Voice-to-Voice API.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


class V2VSessionStatus(str, Enum):
    """V2V session lifecycle."""

    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"


class V2VTransformRecord(BaseModel):
    """Single V2V transform within a session."""

    input_transcript: str = ""
    corrected_transcript: str = ""
    input_audio_gcs_path: Optional[str] = None
    tts_audio_gcs_path: Optional[str] = None
    v2v_audio_gcs_path: Optional[str] = None
    latency_ms: int = Field(default=0, ge=0)
    pronunciation_score_before: float = Field(default=0.0, ge=0.0, le=1.0)
    pronunciation_score_after: float = Field(default=0.0, ge=0.0, le=1.0)
    target_phrase_he: str = ""
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )


class V2VSession(Document):
    """
    Voice-to-Voice practice session.

    Tracks a series of V2V transforms for a child's pronunciation
    practice, including latency metrics and before/after scoring.
    """

    user_id: Indexed(str)
    profile_id: str
    avatar_id: Indexed(str)

    # Transform records
    transforms: List[V2VTransformRecord] = Field(default_factory=list)
    total_transforms: int = Field(default=0, ge=0)
    average_latency_ms: float = Field(default=0.0, ge=0.0)

    # Lifecycle
    status: V2VSessionStatus = V2VSessionStatus.ACTIVE
    credits_charged: float = Field(default=0.0, ge=0.0)

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "v2v_sessions"
        indexes = [
            [("user_id", 1), ("profile_id", 1)],
            [("avatar_id", 1)],
        ]

    def add_transform(self, record: V2VTransformRecord) -> None:
        """Add a transform record and update aggregate metrics."""
        self.transforms.append(record)
        self.total_transforms = len(self.transforms)
        latencies = [t.latency_ms for t in self.transforms if t.latency_ms > 0]
        if latencies:
            self.average_latency_ms = sum(latencies) / len(latencies)
        self.updated_at = datetime.now(timezone.utc)

    @property
    def score_improvement(self) -> float:
        """Average pronunciation score improvement across transforms."""
        deltas = [
            t.pronunciation_score_after - t.pronunciation_score_before
            for t in self.transforms
            if t.pronunciation_score_after > 0
        ]
        return sum(deltas) / len(deltas) if deltas else 0.0
