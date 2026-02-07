"""Chat translation cache and related models."""

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import BaseModel, Field


class ChatTranslationCacheDoc(Document):
    """
    Cached translation for chat messages.

    TTL (Time To Live) Index:
    MongoDB automatically deletes documents when `expires_at` is reached.
    The TTL index is created manually via migration script or database.py init.
    See: scripts/create_ttl_indexes.py for setup.
    """

    message_hash: str = Field(..., index=True)
    source_lang: str
    target_lang: str
    original_text: str
    translated_text: str
    hit_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime = Field(..., description="Document auto-deleted when this time is reached")

    class Settings:
        name = "chat_translation_cache"
        indexes = [
            "message_hash",
            [("source_lang", 1), ("target_lang", 1)],
            "expires_at",  # Regular index (TTL created separately via ensure_ttl_index)
        ]


class TranslationResult(BaseModel):
    """Result of a translation operation."""

    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    is_cached: bool = False
    confidence: Optional[float] = None


class LanguageDetectionResult(BaseModel):
    """Result of language detection."""

    detected_language: str
    confidence: float
    is_cached: bool = False
