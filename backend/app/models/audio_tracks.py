"""
Audio Tracks Database Model

Stores metadata for AI-generated audio tracks for VOD content.
Supports 4 subtitle variants: Heblish, Slang, Grammar-Flip, Engrew.
"""

from datetime import datetime
from typing import Optional
from beanie import Document
from pydantic import Field


class AudioTrackDoc(Document):
    """
    Stores metadata for AI-generated audio tracks for VOD content.
    One document per audio variant per content item.

    Only 4 variants are supported (visual-only variants like Nikud and Shoresh
    are excluded to optimize costs by 33%).
    """

    # Content Reference
    content_id: str  # FK to Content._id
    content_type: str = "vod"

    # Audio Variant Info (4 variants only: heblish, slang, grammar_flip, engrew)
    variant_type: str  # "heblish", "slang", "grammar_flip", "engrew"
    variant_display_name: str  # "Heblish Audio", "Israeli Slang Audio", etc.
    language: str = "he"  # ISO 639-1 language code
    language_name: str = "עברית"  # Human-readable language name

    # Storage
    audio_url: Optional[str] = None  # GCS URL to audio.m4a file
    audio_format: str = "aac"  # Audio codec (AAC for HLS compatibility)
    duration_seconds: Optional[float] = None  # Total audio duration
    file_size_bytes: Optional[int] = None  # File size for storage tracking

    # Generation Status
    generation_status: str = "pending"  # pending, processing, completed, failed
    generation_progress: int = 0  # Progress percentage (0-100)
    generation_started_at: Optional[datetime] = None
    generation_completed_at: Optional[datetime] = None
    generation_error: Optional[str] = None  # Error message if failed

    # ElevenLabs Metadata
    elevenlabs_voice_id: Optional[str] = None  # Voice used for TTS
    elevenlabs_model: str = "eleven_multilingual_v2"  # TTS model
    elevenlabs_cost_usd: Optional[float] = None  # API cost tracking

    # Subtitle Source
    subtitle_track_id: Optional[str] = None  # FK to SubtitleTrackDoc
    subtitle_cue_count: int = 0  # Number of subtitle cues processed
    subtitle_version_hash: Optional[str] = None  # SHA256 hash for change detection

    # Metadata
    is_default: bool = False  # Default audio track in player
    is_enabled: bool = True  # Available for playback
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "audio_tracks"
        indexes = [
            "content_id",
            "variant_type",
            "generation_status",
            [("content_id", 1), ("variant_type", 1)],  # Unique constraint
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "content_id": "507f1f77bcf86cd799439011",
                "content_type": "vod",
                "variant_type": "heblish",
                "variant_display_name": "Heblish Audio",
                "language": "multilingual",
                "language_name": "English + עברית",
                "audio_url": "https://storage.googleapis.com/bayit-plus-media/vod-audio/507f1f77bcf86cd799439011/heblish/audio.m4a",
                "audio_format": "aac",
                "duration_seconds": 5400.5,
                "file_size_bytes": 86400000,
                "generation_status": "completed",
                "generation_progress": 100,
                "elevenlabs_voice_id": "EXAVITQu4vr4xnSDxMaL",
                "elevenlabs_model": "eleven_multilingual_v2",
                "elevenlabs_cost_usd": 8.50,
                "subtitle_track_id": "507f1f77bcf86cd799439012",
                "subtitle_cue_count": 1500,
                "is_default": False,
                "is_enabled": True,
            }
        }

    def update_status(
        self,
        status: str,
        progress: Optional[int] = None,
        error: Optional[str] = None,
    ) -> None:
        """Update generation status with timestamps."""
        self.generation_status = status
        if progress is not None:
            self.generation_progress = progress
        if error:
            self.generation_error = error

        if status == "processing" and not self.generation_started_at:
            self.generation_started_at = datetime.utcnow()
        elif status in ("completed", "failed"):
            self.generation_completed_at = datetime.utcnow()

        self.updated_at = datetime.utcnow()

    def to_dict_api(self) -> dict:
        """Convert to API response format."""
        return {
            "id": str(self.id),
            "content_id": self.content_id,
            "content_type": self.content_type,
            "variant_type": self.variant_type,
            "variant_display_name": self.variant_display_name,
            "language": self.language,
            "language_name": self.language_name,
            "audio_url": self.audio_url,
            "audio_format": self.audio_format,
            "duration_seconds": self.duration_seconds,
            "file_size_bytes": self.file_size_bytes,
            "generation_status": self.generation_status,
            "generation_progress": self.generation_progress,
            "generation_error": self.generation_error,
            "is_default": self.is_default,
            "is_enabled": self.is_enabled,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }
