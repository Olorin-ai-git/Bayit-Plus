"""
Grandparent Bridge models.

NewsClip: AI-generated news report video starring the child's avatar,
summarizing their learning session for grandparents.

GrandparentVoiceNote: Encrypted voice reply from grandparent,
with transcript and language detection.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from pymongo import IndexModel


class NewsClipStatus(str, Enum):
    """News clip generation lifecycle."""

    GENERATING = "generating"
    READY = "ready"
    FAILED = "failed"
    DELETED = "deleted"


class VoiceNoteIntegrationStatus(str, Enum):
    """Voice note episode integration state."""

    PENDING = "pending"
    PROCESSING = "processing"
    INTEGRATED = "integrated"
    FAILED = "failed"


class NewsClip(Document):
    """AI-generated news clip summarizing a child's learning session."""

    user_id: Indexed(str)
    profile_id: Indexed(str)
    avatar_id: str
    script_text: str = ""
    script_text_he: str = ""
    vocabulary_featured: List[str] = Field(default_factory=list)
    video_gcs_path: Optional[str] = None
    thumbnail_gcs_path: Optional[str] = None
    share_token: Indexed(str, unique=True)
    share_url: Optional[str] = None
    share_pin_verified: bool = False
    whatsapp_sent: bool = False
    recipient_name: Optional[str] = None
    recipient_phone_hash: Optional[str] = None
    status: NewsClipStatus = NewsClipStatus.GENERATING
    credits_charged: int = 0
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "grandparent_news_clips"
        indexes = [
            IndexModel([("user_id", 1), ("profile_id", 1)]),
            IndexModel([("share_token", 1)], unique=True),
            IndexModel([("user_id", 1), ("created_at", -1)]),
        ]


class GrandparentVoiceNote(Document):
    """Encrypted grandparent voice reply to a news clip."""

    user_id: str
    profile_id: str
    news_clip_id: Indexed(str)
    encrypted_audio_gcs_path: Optional[str] = None
    duration: float = 0.0
    transcript: Optional[str] = None
    detected_language: Optional[str] = None
    integrated_into_episode: bool = False
    integration_status: VoiceNoteIntegrationStatus = (
        VoiceNoteIntegrationStatus.PENDING
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )

    class Settings:
        name = "grandparent_voice_notes"
        indexes = [
            IndexModel([("news_clip_id", 1)]),
            IndexModel([("user_id", 1), ("profile_id", 1)]),
        ]


class NewsClipResponse(BaseModel):
    """API response for a news clip."""

    id: str
    avatar_id: str
    script_text: str
    script_text_he: str
    vocabulary_featured: List[str]
    video_gcs_path: Optional[str]
    thumbnail_gcs_path: Optional[str]
    share_url: Optional[str]
    whatsapp_sent: bool
    status: str
    credits_charged: int
    created_at: str

    class Config:
        from_attributes = True


class ShareLandingResponse(BaseModel):
    """Public share landing page data (no auth required)."""

    clip_id: str
    avatar_id: str
    script_text: str
    video_gcs_path: Optional[str]
    thumbnail_gcs_path: Optional[str]
    recipient_name: Optional[str]
    share_pin_verified: bool
