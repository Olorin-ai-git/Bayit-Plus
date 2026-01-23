from datetime import datetime
from typing import List, Optional
import re

from beanie import Document
from pydantic import BaseModel, Field, field_validator, ValidationError


class ParticipantState(BaseModel):
    """State of a participant in a watch party"""

    user_id: str
    user_name: str
    is_speaking: bool = False
    is_muted: bool = False
    is_video_on: bool = False
    joined_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("user_name")
    @classmethod
    def validate_user_name(cls, v: str) -> str:
        """Validate and sanitize username"""
        if not v or not isinstance(v, str):
            raise ValueError("Username must be a non-empty string")

        v = v.strip()

        # Length validation
        if len(v) == 0:
            raise ValueError("Username cannot be empty")
        if len(v) > 50:
            raise ValueError("Username must be 50 characters or less")

        # Remove dangerous characters
        if re.search(r'[<>\'\"&]', v):
            raise ValueError("Username contains invalid characters")

        # Check for XSS patterns
        xss_patterns = [
            r'<script',
            r'javascript:',
            r'on\w+=',
            r'data:text/html',
        ]
        for pattern in xss_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Username contains suspicious patterns")

        return v


class WatchParty(Document):
    """A watch party / viewing room for shared content viewing"""

    host_id: str
    host_name: str
    content_id: str
    content_type: str  # live, vod
    content_title: Optional[str] = None

    # Room settings
    room_code: str  # Short code for joining (e.g., "ABC123")
    is_private: bool = True
    max_participants: int = 10

    # Feature flags
    audio_enabled: bool = True
    chat_enabled: bool = True
    sync_playback: bool = True  # Sync video position across participants

    # Participants
    participants: List[ParticipantState] = Field(default_factory=list)

    # LiveKit room info (for audio bridge)
    livekit_room_name: Optional[str] = None
    livekit_room_token: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None

    class Settings:
        name = "watch_parties"
        indexes = [
            "host_id",
            "room_code",
            "content_id",
        ]

    @property
    def is_active(self) -> bool:
        return self.ended_at is None

    @property
    def participant_count(self) -> int:
        return len(self.participants)


class ChatMessage(Document):
    """A chat message in a watch party"""

    party_id: str
    user_id: str
    user_name: str
    message: str
    message_type: str = "text"  # text, emoji, system

    # Translation fields
    source_language: str = "he"
    has_translations: bool = False
    translations: dict = Field(
        default_factory=dict
    )  # {"en": "translated text", "es": "texto traducido"}

    # For reactions
    reactions: dict = Field(default_factory=dict)  # {"emoji": ["user_id1", "user_id2"]}

    timestamp: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("user_name")
    @classmethod
    def validate_user_name(cls, v: str) -> str:
        """Validate and sanitize username"""
        if not v or not isinstance(v, str):
            raise ValueError("Username must be a non-empty string")

        v = v.strip()

        if len(v) == 0:
            raise ValueError("Username cannot be empty")
        if len(v) > 50:
            raise ValueError("Username must be 50 characters or less")

        if re.search(r'[<>\'\"&]', v):
            raise ValueError("Username contains invalid characters")

        xss_patterns = [
            r'<script',
            r'javascript:',
            r'on\w+=',
            r'data:text/html',
        ]
        for pattern in xss_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Username contains suspicious patterns")

        return v

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate and sanitize chat message"""
        if not v or not isinstance(v, str):
            raise ValueError("Message must be a non-empty string")

        v = v.strip()

        # Length validation
        if len(v) == 0:
            raise ValueError("Message cannot be empty")
        if len(v) > 500:
            raise ValueError("Message must be 500 characters or less")

        # Remove null bytes
        v = v.replace('\0', '')

        # Remove control characters (except newlines and tabs)
        v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', v)

        # Check for XSS patterns
        xss_patterns = [
            r'<script',
            r'javascript:',
            r'on\w+=',
            r'data:text/html',
        ]
        for pattern in xss_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Message contains suspicious patterns")

        return v

    class Settings:
        name = "chat_messages"
        indexes = [
            "party_id",
            "timestamp",
        ]


class WatchPartyCreate(BaseModel):
    """Request model for creating a watch party"""

    content_id: str
    content_type: str  # live, vod
    content_title: Optional[str] = None
    is_private: bool = True
    audio_enabled: bool = True
    chat_enabled: bool = True
    sync_playback: bool = True


class WatchPartyResponse(BaseModel):
    """Response model for watch party data"""

    id: str
    host_id: str
    host_name: str
    content_id: str
    content_type: str
    content_title: Optional[str]
    room_code: str
    is_private: bool
    max_participants: int
    audio_enabled: bool
    chat_enabled: bool
    sync_playback: bool
    participants: List[ParticipantState]
    participant_count: int
    is_active: bool
    created_at: datetime
    started_at: Optional[datetime]

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    """Request model for sending a chat message"""

    message: str
    message_type: str = "text"

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        """Validate and sanitize chat message"""
        if not v or not isinstance(v, str):
            raise ValueError("Message must be a non-empty string")

        v = v.strip()

        # Length validation
        if len(v) == 0:
            raise ValueError("Message cannot be empty")
        if len(v) > 500:
            raise ValueError("Message must be 500 characters or less")

        # Remove null bytes
        v = v.replace('\0', '')

        # Remove control characters (except newlines and tabs)
        v = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', v)

        # Check for XSS patterns
        xss_patterns = [
            r'<script',
            r'javascript:',
            r'on\w+=',
            r'data:text/html',
        ]
        for pattern in xss_patterns:
            if re.search(pattern, v, re.IGNORECASE):
                raise ValueError("Message contains suspicious patterns")

        return v

    @field_validator("message_type")
    @classmethod
    def validate_message_type(cls, v: str) -> str:
        """Validate message type"""
        allowed_types = ["text", "emoji", "system"]
        if v not in allowed_types:
            raise ValueError(f"Message type must be one of: {', '.join(allowed_types)}")
        return v


class ChatMessageResponse(BaseModel):
    """Response model for chat message"""

    id: str
    party_id: str
    user_id: str
    user_name: str
    message: str
    display_message: str  # translated text if available for recipient
    message_type: str
    source_language: str = "he"
    is_translated: bool = False
    translation_available: bool = False
    reactions: dict
    timestamp: datetime

    class Config:
        from_attributes = True


class PlaybackSync(BaseModel):
    """Model for syncing playback position"""

    party_id: str
    user_id: str
    position: float  # Current playback position in seconds
    is_playing: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)
