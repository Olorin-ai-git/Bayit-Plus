"""
Subtitle Models.
Stores subtitle tracks and translation cache.
"""
from datetime import datetime
from typing import Optional, List
from beanie import Document
from pydantic import BaseModel, Field


class SubtitleCueModel(BaseModel):
    """A single subtitle cue"""
    index: int
    start_time: float  # seconds
    end_time: float  # seconds
    text: str
    text_nikud: Optional[str] = None


class SubtitleTrackDoc(Document):
    """
    Stores subtitle track for content.
    Supports multiple languages per content.
    """
    content_id: str
    content_type: str = "vod"  # vod, live
    language: str = "he"  # he, en, ar, ru
    language_name: str = "עברית"

    # Subtitle data
    format: str = "vtt"  # vtt, srt
    source_url: Optional[str] = None
    cues: List[SubtitleCueModel] = Field(default_factory=list)

    # Nikud version
    has_nikud_version: bool = False
    nikud_generated_at: Optional[datetime] = None

    # Metadata
    is_default: bool = False
    is_auto_generated: bool = False

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "subtitle_tracks"
        indexes = [
            "content_id",
            "language",
        ]

    @classmethod
    async def get_for_content(
        cls,
        content_id: str,
        language: Optional[str] = None
    ) -> List["SubtitleTrackDoc"]:
        """Get all subtitle tracks for content"""
        query = cls.find(cls.content_id == content_id)
        if language:
            query = query.find(cls.language == language)
        return await query.to_list()

    @classmethod
    async def get_default_track(cls, content_id: str) -> Optional["SubtitleTrackDoc"]:
        """Get default subtitle track for content"""
        # Try to find explicitly marked default
        track = await cls.find_one(
            cls.content_id == content_id,
            cls.is_default == True
        )
        if track:
            return track

        # Fall back to Hebrew
        return await cls.find_one(
            cls.content_id == content_id,
            cls.language == "he"
        )


class TranslationCacheDoc(Document):
    """
    Caches word translations for faster lookup.
    Used by tap-to-translate feature.
    """
    word: str
    source_lang: str = "he"
    target_lang: str = "en"

    # Translation data
    translation: str
    transliteration: Optional[str] = None
    part_of_speech: Optional[str] = None
    example: Optional[str] = None
    example_translation: Optional[str] = None

    # Metadata
    lookup_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_accessed: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "translation_cache"
        indexes = [
            [("word", 1), ("source_lang", 1), ("target_lang", 1)],
            "lookup_count",
        ]

    @classmethod
    async def get_translation(
        cls,
        word: str,
        source_lang: str = "he",
        target_lang: str = "en"
    ) -> Optional["TranslationCacheDoc"]:
        """Get cached translation"""
        doc = await cls.find_one(
            cls.word == word,
            cls.source_lang == source_lang,
            cls.target_lang == target_lang
        )
        if doc:
            doc.lookup_count += 1
            doc.last_accessed = datetime.utcnow()
            await doc.save()
        return doc

    @classmethod
    async def cache_translation(
        cls,
        word: str,
        translation: str,
        source_lang: str = "he",
        target_lang: str = "en",
        **kwargs
    ) -> "TranslationCacheDoc":
        """Cache a translation"""
        existing = await cls.find_one(
            cls.word == word,
            cls.source_lang == source_lang,
            cls.target_lang == target_lang
        )

        if existing:
            existing.translation = translation
            for key, value in kwargs.items():
                if hasattr(existing, key):
                    setattr(existing, key, value)
            await existing.save()
            return existing

        doc = cls(
            word=word,
            translation=translation,
            source_lang=source_lang,
            target_lang=target_lang,
            **kwargs
        )
        await doc.insert()
        return doc


# API Response Models
class SubtitleCueResponse(BaseModel):
    """API response for a subtitle cue"""
    index: int
    start_time: float
    end_time: float
    text: str
    text_nikud: Optional[str] = None
    formatted_start: str
    formatted_end: str
    words: List[dict] = []

    class Config:
        from_attributes = True


class SubtitleTrackResponse(BaseModel):
    """API response for subtitle track metadata"""
    id: str
    content_id: str
    language: str
    language_name: str
    format: str
    has_nikud_version: bool
    is_default: bool
    cue_count: int

    class Config:
        from_attributes = True


class TranslationResponse(BaseModel):
    """API response for word translation"""
    word: str
    translation: str
    transliteration: Optional[str] = None
    part_of_speech: Optional[str] = None
    example: Optional[str] = None
    example_translation: Optional[str] = None

    class Config:
        from_attributes = True


# Language options
SUBTITLE_LANGUAGES = [
    {"code": "he", "name": "עברית", "name_en": "Hebrew", "rtl": True},
    {"code": "en", "name": "English", "name_en": "English", "rtl": False},
    {"code": "ar", "name": "العربية", "name_en": "Arabic", "rtl": True},
    {"code": "ru", "name": "Русский", "name_en": "Russian", "rtl": False},
    {"code": "fr", "name": "Français", "name_en": "French", "rtl": False},
    {"code": "es", "name": "Español", "name_en": "Spanish", "rtl": False},
]
