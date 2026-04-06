"""SCORM export job model for training platform."""

from datetime import datetime, timezone
from typing import List, Literal, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel

CompletionRule = Literal["video_only", "video_plus_quiz", "engagement"]
VideoSource = Literal["stream", "embedded"]
ExportStatus = Literal[
    "pending",
    "enriching_faces",
    "enriching_voices",
    "expanding",
    "generating_audio",
    "generating_video",
    "packaging",
    "validating",
    "ready",
    "failed",
]
ExportTier = Literal["team", "organization", "enterprise"]


class CharacterExportStatus(BaseModel):
    """Per-character enrichment and generation status."""

    name: str
    face_extracted: bool = False
    voice_cloned: bool = False
    qa_expanded: bool = False
    audio_generated: bool = False
    video_generated: bool = False
    fallback_reason: Optional[str] = None


class ScormExport(Document):
    """Background SCORM export job for a training content item."""

    partner_id: str = Field(..., description="Organization partner_id")
    content_id: str = Field(..., description="Content document ID")
    created_by: str = Field(..., description="Admin TrainingUser ID")

    status: ExportStatus = Field(default="pending")
    progress_pct: int = Field(default=0, ge=0, le=100)
    error: Optional[str] = None

    # Admin configuration
    completion_rule: CompletionRule = Field(default="video_plus_quiz")
    video_threshold_pct: int = Field(default=80, ge=1, le=100)
    quiz_pass_pct: int = Field(default=70, ge=1, le=100)
    included_characters: Optional[List[str]] = Field(
        default=None, description="Character names to include, None=all"
    )
    video_source: VideoSource = Field(default="stream")

    # Scoped token
    export_token: str = Field(
        ..., description="Crypto-random URL-safe token"
    )
    token_cap: int = Field(default=500, ge=0)
    token_used: int = Field(default=0, ge=0)
    token_expires_at: Optional[datetime] = None

    # Output
    package_url: Optional[str] = None
    package_size_bytes: Optional[int] = None
    tier_at_export: ExportTier = Field(default="team")
    characters_included: int = Field(default=0)
    qa_pairs_generated: int = Field(default=0)

    # Per-character status
    character_status: List[CharacterExportStatus] = Field(
        default_factory=list
    )

    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    completed_at: Optional[datetime] = None

    class Settings:
        name = "scorm_exports"
        indexes = [
            IndexModel(
                [("partner_id", ASCENDING), ("created_at", -1)],
                name="partner_exports",
            ),
            IndexModel(
                [("export_token", ASCENDING)],
                unique=True,
                name="token_unique",
            ),
            "status",
            "content_id",
        ]
