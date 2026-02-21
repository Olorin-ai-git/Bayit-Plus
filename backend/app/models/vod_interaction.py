"""
VOD Avatar Interaction Models

Data models for interactive VOD moments where avatars talk to movie characters.
Supports live interactions with AI-generated character responses and reel generation.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, model_validator
from beanie import Document


class BoundingBox(BaseModel):
    """Normalized bounding box for region of interest detection"""
    x: float = Field(..., ge=0.0, le=1.0, description="Left edge (normalized)")
    y: float = Field(..., ge=0.0, le=1.0, description="Top edge (normalized)")
    w: float = Field(..., ge=0.0, le=1.0, description="Width (normalized)")
    h: float = Field(..., ge=0.0, le=1.0, description="Height (normalized)")
    label: str = Field(default="roi", description="Region label")


class AvatarPlacement(BaseModel):
    """Computed safe placement for avatar overlay on video frame"""
    position: str = Field(..., description="Quadrant: top_left, top_right, bottom_left, bottom_right")
    offset_x: float = Field(default=0.0, description="Horizontal offset within quadrant (normalized)")
    offset_y: float = Field(default=0.0, description="Vertical offset within quadrant (normalized)")
    confidence: float = Field(default=0.0, ge=0.0, le=1.0, description="Placement confidence score")
    fallback_position: str = Field(default="bottom_left", description="Fallback position if primary fails")
    regions_of_interest: List[BoundingBox] = Field(
        default_factory=list,
        description="Detected regions to avoid overlapping",
    )


class CharacterProfile(BaseModel):
    """Character profile for multi-character interactions"""
    name: str = Field(..., description="Character display name")
    voice_id: str = Field(..., description="ElevenLabs voice ID")
    frame_url: str = Field(..., description="GCS URL of character still frame")
    personality_traits: List[str] = Field(
        default_factory=list,
        description="Key personality traits for AI prompt",
    )
    relationship_to_others: Optional[str] = Field(
        None,
        description="Relationship context with other characters",
    )


class InteractiveMoment(BaseModel):
    """Marks an interactive moment in content metadata"""
    # These three fields default to sentinel values so documents written before
    # the required constraint was enforced still deserialise without errors.
    # Moments with timestamp == 0.0 or empty scene_context are considered
    # incomplete and must be filtered out by callers before presenting to users.
    timestamp: float = Field(default=0.0, description="Seconds into video")
    duration: float = Field(default=30.0, description="Interaction window duration")
    scene_context: str = Field(default="", description="Scene subtitles/description for AI")
    character_name: str = Field(..., description="Character to interact with")
    character_frame_url: Optional[str] = Field(None, description="GCS URL of character still")
    interaction_prompt: str = Field(default="", description="Display text for user")
    voice_id: str = Field(..., description="ElevenLabs voice ID for character")

    @property
    def is_complete(self) -> bool:
        """Returns True only if the moment has all fields needed to display."""
        return self.timestamp > 0.0 and bool(self.scene_context) and bool(self.interaction_prompt)
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
    # Phase 3: Smart Positioning (WS2)
    avatar_placement: Optional[AvatarPlacement] = Field(
        None, description="Pre-computed safe avatar placement for this moment",
    )
    # Phase 3: Multi-Character (WS3)
    characters: List[CharacterProfile] = Field(
        default_factory=list,
        description="Characters available for multi-character interaction",
    )
    allow_cross_character_reactions: bool = Field(
        default=True,
        description="Whether non-addressed characters can react",
    )
    max_active_characters: int = Field(
        default=3, ge=1, le=5,
        description="Max simultaneous active characters",
    )


class DialogueExchange(BaseModel):
    """Single conversation turn in an interaction"""
    speaker: str = Field(..., description="'user' or 'character'")
    message_text: str = Field(..., description="Text content of message")
    audio_url: Optional[str] = Field(None, description="TTS audio URL (character only)")
    animated_video_url: Optional[str] = Field(None, description="Creatify video URL")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    # Pause & Ask: user avatar animation
    user_animated_video_url: Optional[str] = Field(
        None, description="Lip-sync video of user avatar speaking",
    )
    polished_text: Optional[str] = Field(
        None, description="Grammar-polished version of user message",
    )
    # Phase 3: Multi-Character (WS3)
    character_name: Optional[str] = Field(
        None, description="Character name for multi-character exchanges",
    )
    addressed_to: Optional[str] = Field(
        None, description="Character being addressed (multi-char)",
    )
    reaction_to: Optional[str] = Field(
        None, description="If set, this is a reaction to another character's response",
    )
    # Phase 3: Shared Sessions (WS4)
    participant_user_id: Optional[str] = Field(
        None, description="User ID of participant in shared session",
    )
    participant_name: Optional[str] = Field(
        None, description="Display name of participant in shared session",
    )


class SharedParticipant(BaseModel):
    """Participant in a shared interactive session"""
    user_id: str = Field(..., description="Participant user ID")
    profile_id: str = Field(..., description="Participant profile ID")
    avatar_id: str = Field(..., description="Participant avatar ID")
    avatar_image_url: Optional[str] = Field(None, description="Participant avatar image URL")
    display_name: str = Field(..., description="Participant display name")


class SharedSessionMetadata(BaseModel):
    """Metadata for shared interactive sessions within watch parties"""
    party_id: str = Field(..., description="Watch party ID")
    participants: List[SharedParticipant] = Field(default_factory=list)
    turn_order: List[str] = Field(
        default_factory=list,
        description="User IDs in turn order",
    )
    current_turn_user_id: Optional[str] = Field(
        None, description="User ID whose turn it is",
    )
    current_turn_started_at: Optional[datetime] = Field(
        None, description="When current turn started",
    )
    turns_completed: int = Field(default=0, description="Total turns completed")
    max_turns_per_participant: int = Field(
        default=3, description="Max turns each participant gets",
    )


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
    # Phase 3: Shared Sessions (WS4)
    is_shared: bool = Field(default=False, description="Whether this is a shared session")
    shared_metadata: Optional[SharedSessionMetadata] = Field(
        None, description="Shared session state (participants, turns)",
    )

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
    actor_name: Optional[str] = Field(None, description="Actor who plays this character")
    gender: Optional[str] = Field(None, description="male/female for voice/persona assignment")
    voice_clone_status: Optional[str] = Field(
        None, description="Voice cloning status: cloned, skipped, failed",
    )
    voice_clone_audio_url: Optional[str] = Field(
        None, description="GCS URL of the audio sample used for cloning",
    )
    voice_clone_preview_url: Optional[str] = Field(
        None, description="GCS URL of lip-synced preview clip verifying voice+face",
    )
    suggested_questions: List[str] = Field(
        default_factory=list,
        description="AI-generated character-specific questions",
    )


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
