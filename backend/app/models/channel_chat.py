"""
Channel Chat Models for live channel public chat.

MongoDB models (Beanie ODM) for:
- ChannelChatMessage: Main chat messages
- ChatTranslationCacheEntry: Separate translation cache per DB Expert
- ChatReaction: Separate reactions per DB Expert
- ModerationAuditLog: Append-only audit trail per Security Expert
"""

import html
import re
from datetime import datetime
from enum import Enum
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field, field_validator
from pymongo import IndexModel

from app.core.config import settings


class ModerationStatus(str, Enum):
    """Moderation status for chat messages."""

    APPROVED = "approved"
    PENDING = "pending"
    FLAGGED = "flagged"
    REMOVED = "removed"


class AuditAction(str, Enum):
    """Actions tracked in moderation audit log."""

    MESSAGE_DELETE = "message_delete"
    MESSAGE_PIN = "message_pin"
    MESSAGE_UNPIN = "message_unpin"
    USER_MUTE = "user_mute"
    USER_UNMUTE = "user_unmute"


# Dangerous patterns for XSS prevention
_DANGEROUS_PATTERNS = [
    r"<script",
    r"javascript:",
    r"onerror\s*=",
    r"eval\s*\(",
    r"expression\s*\(",
    r"import\s*\(",
    r"data:text/html",
    r"vbscript:",
    r"<iframe",
    r"on\w+\s*=",
]


def _sanitize_message_text(text: str) -> str:
    """
    Multi-layer input sanitization (Security Expert).

    Layer 1: Length enforcement (done by Pydantic max_length)
    Layer 2: Strip HTML tags completely (no HTML in chat)
    Layer 3: Dangerous pattern blocking
    Layer 4: html.escape as final fallback
    """
    # Strip leading/trailing whitespace
    cleaned = text.strip()

    # Layer 2: Remove all HTML tags
    cleaned = re.sub(r"<[^>]+>", "", cleaned)

    # Layer 3: Check for dangerous patterns
    for pattern in _DANGEROUS_PATTERNS:
        if re.search(pattern, cleaned, re.IGNORECASE):
            # Layer 4: Escape if dangerous pattern detected
            cleaned = html.escape(cleaned)
            break

    return cleaned


class ChannelChatMessage(Document):
    """
    Main chat message model.

    Stores original message with detected language.
    Translations stored in separate collection (ChatTranslationCacheEntry).
    """

    channel_id: str
    user_id: str
    user_name: str
    message: str = Field(max_length=500)
    original_language: str = Field(default="he")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    is_pinned: bool = False
    pinned_by: Optional[str] = None
    is_deleted: bool = False
    deleted_at: Optional[datetime] = None
    moderation_status: ModerationStatus = ModerationStatus.APPROVED

    @field_validator("message")
    @classmethod
    def validate_and_sanitize_message(cls, v: str) -> str:
        """Sanitize message text and validate non-empty."""
        sanitized = _sanitize_message_text(v)
        if not sanitized:
            raise ValueError("Message cannot be empty after sanitization")
        return sanitized

    @field_validator("channel_id", "user_id")
    @classmethod
    def validate_id_format(cls, v: str) -> str:
        """Validate ID format to prevent NoSQL injection."""
        if not re.match(r"^[a-zA-Z0-9_-]+$", v):
            raise ValueError("Invalid ID format")
        return v

    class Settings:
        name = "channel_chat_messages"
        indexes = [
            IndexModel(
                [("channel_id", 1), ("timestamp", -1)],
                name="channel_timestamp_idx",
            ),
            IndexModel(
                [("channel_id", 1), ("is_pinned", 1)],
                name="channel_pinned_idx",
            ),
            IndexModel(
                [("channel_id", 1), ("user_id", 1), ("timestamp", -1)],
                name="channel_user_history_idx",
            ),
            IndexModel(
                [("channel_id", 1), ("moderation_status", 1), ("timestamp", -1)],
                name="channel_moderation_idx",
            ),
            IndexModel(
                [("timestamp", 1)],
                name="message_ttl_idx",
                expireAfterSeconds=90 * 86400,
            ),
        ]


class ChatTranslationCacheEntry(Document):
    """
    Separate collection for translation cache (per DB Expert).

    Keyed by message_id + language for efficient lookup.
    """

    message_id: str
    language: str
    translated_text: str
    cached_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chat_translation_cache"
        indexes = [
            IndexModel(
                [("message_id", 1), ("language", 1)],
                unique=True,
                name="message_language_unique_idx",
            ),
            IndexModel(
                [("cached_at", 1)],
                name="cache_ttl_idx",
                expireAfterSeconds=90 * 86400,
            ),
        ]


class ChatReaction(Document):
    """
    Separate collection for reactions (per DB Expert).

    One reaction type per user per message.
    """

    message_id: str
    channel_id: str
    user_id: str
    reaction_type: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "chat_reactions"
        indexes = [
            IndexModel(
                [("message_id", 1), ("user_id", 1)],
                unique=True,
                name="message_user_unique_idx",
            ),
            IndexModel(
                [("channel_id", 1), ("created_at", -1)],
                name="channel_cleanup_idx",
            ),
            IndexModel(
                [("created_at", 1)],
                name="reaction_ttl_idx",
                expireAfterSeconds=90 * 86400,
            ),
        ]


class ModerationAuditLog(Document):
    """
    Append-only audit trail for moderation actions (Security Expert).

    NO delete operations permitted. Separate retention policy.
    """

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    actor_id: str
    actor_role: str
    actor_ip: str
    action: AuditAction
    channel_id: str
    target_user_id: Optional[str] = None
    target_message_id: Optional[str] = None
    reason: Optional[str] = None
    metadata: dict = Field(default_factory=dict)

    class Settings:
        name = "moderation_audit_logs"
        indexes = [
            IndexModel(
                [("channel_id", 1), ("timestamp", -1)],
                name="channel_audit_trail_idx",
            ),
            IndexModel(
                [("actor_id", 1), ("timestamp", -1)],
                name="actor_activity_idx",
            ),
        ]
