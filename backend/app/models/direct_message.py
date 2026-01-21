"""Direct message model for friend-to-friend messaging."""

from datetime import datetime
from typing import Dict, List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class DirectMessage(Document):
    """Direct message between friends."""

    sender_id: str
    sender_name: str
    sender_avatar: Optional[str] = None
    receiver_id: str
    receiver_name: str
    receiver_avatar: Optional[str] = None
    message: str
    message_type: str = "text"  # text, emoji, system

    # Translation fields
    source_language: str = "he"
    translated_text: Optional[str] = None  # Translation for receiver
    has_translation: bool = False

    # Status
    read: bool = False
    read_at: Optional[datetime] = None

    # Reactions
    reactions: Dict[str, List[str]] = Field(default_factory=dict)

    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "direct_messages"
        indexes = [
            [("sender_id", 1), ("receiver_id", 1)],
            "timestamp",
            "read",
        ]


class DirectMessageCreate(BaseModel):
    """Request model for sending a direct message."""

    message: str
    message_type: str = "text"


class DirectMessageResponse(BaseModel):
    """Response model for direct message."""

    id: str
    sender_id: str
    sender_name: str
    sender_avatar: Optional[str] = None
    receiver_id: str
    receiver_name: str
    receiver_avatar: Optional[str] = None
    message: str
    display_message: str  # translated_text if available, else original message
    message_type: str
    source_language: str
    is_translated: bool
    translation_available: bool
    read: bool
    read_at: Optional[datetime] = None
    reactions: Dict[str, List[str]]
    timestamp: datetime

    class Config:
        from_attributes = True


class ConversationSummary(BaseModel):
    """Summary of a conversation with a friend."""

    friend_id: str
    friend_name: str
    friend_avatar: Optional[str] = None
    last_message: str
    last_message_at: datetime
    unread_count: int
