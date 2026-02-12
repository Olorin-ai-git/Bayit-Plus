"""
Highlight Reel Model.

Auto-generated 30-second video reels showcasing the child's best
Hebrew learning moments. Shareable via token-based URLs and
automatically sent to approved grandparent contacts.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field


class HighlightSourceType(str, Enum):
    """Sources of highlight moments."""

    V2V_SESSION = "v2v_session"
    TRIGGER_RESPONSE = "trigger_response"
    MIRROR_ATTEMPT = "mirror_attempt"
    MISSION_COMPLETION = "mission_completion"


class ReelStatus(str, Enum):
    """Highlight reel generation lifecycle."""

    PENDING = "pending"
    SELECTING = "selecting"
    RENDERING = "rendering"
    READY = "ready"
    FAILED = "failed"


class HighlightMoment(BaseModel):
    """A single highlight moment selected for the reel."""

    source_type: HighlightSourceType
    source_id: str = Field(..., description="ID of the source document")
    timestamp_start: float = Field(default=0.0, ge=0.0)
    timestamp_end: float = Field(default=0.0, ge=0.0)
    score: float = Field(default=0.0, ge=0.0, le=1.0)
    transcript_he: str = ""
    audio_gcs_path: Optional[str] = None


class HighlightReel(Document):
    """
    Auto-generated highlight reel of a child's best learning moments.

    Rendered as a 30-second video concatenating top-scoring interactions
    with crossfade transitions. Shareable via unique token URL.
    """

    user_id: Indexed(str)
    profile_id: str
    avatar_id: str

    # Selected moments
    moments: List[HighlightMoment] = Field(default_factory=list)

    # Rendered output
    video_gcs_path: Optional[str] = None
    thumbnail_gcs_path: Optional[str] = None

    # Sharing
    share_token: Indexed(str, unique=True)
    auto_sent_to: List[str] = Field(
        default_factory=list,
        description="Contact IDs that received auto-send",
    )

    # Lifecycle
    status: ReelStatus = ReelStatus.PENDING
    credits_charged: int = Field(default=0, ge=0)
    error_message: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "highlight_reels"
        indexes = [
            [("user_id", 1), ("profile_id", 1)],
        ]

    @property
    def is_ready(self) -> bool:
        return self.status == ReelStatus.READY and self.video_gcs_path is not None

    @property
    def moment_count(self) -> int:
        return len(self.moments)
