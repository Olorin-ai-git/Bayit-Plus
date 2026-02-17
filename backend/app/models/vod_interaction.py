"""
VOD Avatar Interaction Models

Data models for interactive VOD moments where avatars talk to movie characters.
Supports live interactions with AI-generated character responses and reel generation.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field
from beanie import Document


class InteractiveMoment(BaseModel):
    """Marks an interactive moment in content metadata"""
    timestamp: float = Field(..., description="Seconds into video")
    duration: float = Field(default=30.0, description="Interaction window duration")
    scene_context: str = Field(..., description="Scene subtitles/description for AI")
    character_name: str = Field(..., description="Character to interact with")
    character_frame_url: Optional[str] = Field(None, description="GCS URL of character still")
    interaction_prompt: str = Field(..., description="Display text for user")
    voice_id: str = Field(..., description="ElevenLabs voice ID for character")
    dialogue_options: List[str] = Field(
        default_factory=list,
        description="Predefined dialogue choices shown to user",
    )
    lipsync_video_url: Optional[str] = Field(
        None,
        description="Pre-generated Creatify lip-sync video URL",
    )
    character_response_text: Optional[str] = Field(
        None,
        description="Pre-generated character dialogue response text",
    )
    character_response_audio_url: Optional[str] = Field(
        None,
        description="Pre-generated character response TTS audio URL",
    )
    character_response_video_url: Optional[str] = Field(
        None,
        description="Pre-generated character response lip-sync video URL",
    )


class DialogueExchange(BaseModel):
    """Single conversation turn in an interaction"""
    speaker: str = Field(..., description="'user' or 'character'")
    message_text: str = Field(..., description="Text content of message")
    audio_url: Optional[str] = Field(None, description="TTS audio URL (character only)")
    animated_video_url: Optional[str] = Field(None, description="Creatify video URL")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class VODInteractionSession(Document):
    """Tracks a live interaction session between user avatar and character"""
    user_id: str
    profile_id: str
    avatar_id: str
    content_id: str
    moment_timestamp: float
    character_name: str
    scene_context: Optional[str] = Field(None, description="Denormalized scene/movie context")
    character_description: Optional[str] = Field(None, description="Denormalized character desc")
    character_voice_id: Optional[str] = Field(None, description="Denormalized voice ID")
    character_frame_url: Optional[str] = Field(None, description="Denormalized frame URL")
    dialogue_exchanges: List[DialogueExchange] = Field(default_factory=list)
    status: str = Field(default="active", description="active, recording, completed")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "vod_interaction_sessions"
        indexes = [
            "user_id",
            "profile_id",
            "content_id",
            "status",
            "created_at",
        ]


class VODInteractionReel(Document):
    """Final saved reel from interaction sessions"""
    user_id: str
    profile_id: str
    content_id: str
    session_ids: List[str] = Field(..., description="Sessions included in reel")
    duration: float = Field(..., description="Total duration in seconds")
    video_gcs_path: str = Field(..., description="GCS path to final video")
    thumbnail_url: str
    share_token: Optional[str] = Field(None, description="Token for opt-in sharing")
    credits_charged: int = Field(..., description="Credits used for generation")
    is_public: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "vod_interaction_reels"
        indexes = [
            "user_id",
            "profile_id",
            "content_id",
            "share_token",
            "created_at",
        ]


class AnimatedResponse(BaseModel):
    """Response from character animation service"""
    audio_url: str
    video_url: str
    duration: float


class ContentCharacter(BaseModel):
    """Character available for dialogue in a content item."""
    name: str = Field(..., description="Character display name")
    voice_id: str = Field(..., description="ElevenLabs voice ID")
    frame_url: str = Field(..., description="GCS URL of character still frame")
    description: str = Field(..., description="Character personality description")
    movie_context: str = Field(..., description="Movie/scene context for AI prompt")


class CharacterResponse(BaseModel):
    """Response from character AI service"""
    text: str
    emotion: Optional[str] = None


class VideoSegment(BaseModel):
    """Video segment for reel compositing"""
    path: str
    start_time: float
    end_time: float
    duration: float
