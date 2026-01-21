"""Chat translation cache and related models."""

from datetime import datetime
from typing import Dict, Optional

from beanie import Document
from pydantic import BaseModel, Field


class ChatTranslationCacheDoc(Document):
    """Cached translation for chat messages."""

    message_hash: str = Field(..., index=True)
    source_lang: str
    target_lang: str
    original_text: str
    translated_text: str
    hit_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

    class Settings:
        name = "chat_translation_cache"
        indexes = [
            "message_hash",
            [("source_lang", 1), ("target_lang", 1)],
            "expires_at",
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
