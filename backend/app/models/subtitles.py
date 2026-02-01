"""
Subtitle Models.
Stores subtitle tracks and translation cache.
"""

from datetime import datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field
from pymongo import TEXT, IndexModel


class SubtitleCueModel(BaseModel):
    """A single subtitle cue"""

    index: int
    start_time: float  # seconds
    end_time: float  # seconds
    text: str
    text_nikud: Optional[str] = None
    text_shoresh: Optional[str] = None
    text_heblish: Optional[str] = None  # English with Hebrew word injections
    text_grammar_flip: Optional[str] = None  # Hebrew words with English syntax
    text_slang_synthesis: Optional[str] = None  # Israeli/American slang blend
    text_engrew: Optional[str] = None  # Hebrew with English words in Hebrew letters


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

    # Shoresh version
    has_shoresh_version: bool = False
    shoresh_generated_at: Optional[datetime] = None

    # Heblish version (English subtitles only)
    has_heblish_version: bool = False
    heblish_generated_at: Optional[datetime] = None

    # Grammar-Flip version (Hebrew words with English syntax)
    has_grammar_flip_version: bool = False
    grammar_flip_generated_at: Optional[datetime] = None

    # Slang Synthesis version (Israeli/American slang blend)
    has_slang_synthesis_version: bool = False
    slang_synthesis_generated_at: Optional[datetime] = None

    # Engrew version (Hebrew with English in Hebrew letters)
    has_engrew_version: bool = False
    engrew_generated_at: Optional[datetime] = None

    # Metadata
    is_default: bool = False
    is_auto_generated: bool = False

    # External Source Tracking
    source: str = "embedded"  # "embedded", "opensubtitles", "tmdb", "manual"
    external_id: Optional[str] = None  # OpenSubtitles file_id or TMDB track_id
    external_url: Optional[str] = None  # Original download URL
    download_date: Optional[datetime] = None  # When external subtitle was downloaded

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "subtitle_tracks"
        indexes = [
            "content_id",
            "language",
            # Full-text search on subtitle cues for dialogue search
            # Use "none" language to disable stemming (Hebrew not supported by MongoDB text search)
            # Set language_override to a non-existent field to prevent reading "language" from documents
            IndexModel(
                [("cues.text", TEXT)],
                default_language="none",
                language_override="text_search_lang",
            ),
        ]

    @classmethod
    async def get_for_content(
        cls, content_id: str, language: Optional[str] = None
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
        track = await cls.find_one(cls.content_id == content_id, cls.is_default == True)
        if track:
            return track

        # Fall back to Hebrew
        return await cls.find_one(cls.content_id == content_id, cls.language == "he")


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
        cls, word: str, source_lang: str = "he", target_lang: str = "en"
    ) -> Optional["TranslationCacheDoc"]:
        """Get cached translation"""
        doc = await cls.find_one(
            cls.word == word,
            cls.source_lang == source_lang,
            cls.target_lang == target_lang,
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
        **kwargs,
    ) -> "TranslationCacheDoc":
        """Cache a translation"""
        existing = await cls.find_one(
            cls.word == word,
            cls.source_lang == source_lang,
            cls.target_lang == target_lang,
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
            **kwargs,
        )
        await doc.insert()
        return doc


class SubtitleSearchCacheDoc(Document):
    """
    Cache for subtitle search results to minimize API calls.
    Stores search results from OpenSubtitles and TMDB.
    """

    content_id: str
    imdb_id: Optional[str] = None
    tmdb_id: Optional[int] = None
    language: str

    # Search results
    found: bool  # True if subtitles were found
    source: Optional[str] = None  # "opensubtitles" or "tmdb"
    external_id: Optional[str] = None  # File ID for download
    external_url: Optional[str] = None

    # Cache metadata
    search_date: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime  # TTL for cache invalidation
    hit_count: int = 0

    class Settings:
        name = "subtitle_search_cache"
        indexes = [
            [("content_id", 1), ("language", 1)],
            [("imdb_id", 1), ("language", 1)],
            "expires_at",  # For TTL cleanup
        ]

    @classmethod
    async def get_cached_search(
        cls, content_id: str, language: str
    ) -> Optional["SubtitleSearchCacheDoc"]:
        """Get cached search result if not expired"""
        cache = await cls.find_one(
            {
                "content_id": content_id,
                "language": language,
                "expires_at": {"$gt": datetime.utcnow()},
            }
        )
        if cache:
            cache.hit_count += 1
            await cache.save()
        return cache


class SubtitleQuotaTrackerDoc(Document):
    """
    Track OpenSubtitles API usage to respect daily limits.
    One document per day.
    """

    date: str  # Format: "YYYY-MM-DD" for daily tracking
    downloads_used: int = 0
    searches_performed: int = 0
    last_download_at: Optional[datetime] = None

    # Rate limiting (40 requests per 10 seconds)
    recent_requests: List[datetime] = Field(default_factory=list)  # Keep last 40

    class Settings:
        name = "subtitle_quota_tracker"
        indexes = ["date"]

    @classmethod
    async def get_today(cls) -> "SubtitleQuotaTrackerDoc":
        """Get or create today's quota tracker"""
        today = datetime.utcnow().strftime("%Y-%m-%d")
        tracker = await cls.find_one({"date": today})
        if not tracker:
            tracker = cls(date=today)
            await tracker.insert()
        return tracker


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


# Language options - Complete list matching frontend support
SUBTITLE_LANGUAGES = [
    # Middle East & Hebrew
    {"code": "he", "name": "עברית", "name_en": "Hebrew", "rtl": True},
    {"code": "yi", "name": "ייִדיש", "name_en": "Yiddish", "rtl": True},
    {"code": "ar", "name": "العربية", "name_en": "Arabic", "rtl": True},
    {"code": "fa", "name": "فارسی", "name_en": "Persian", "rtl": True},
    {"code": "tr", "name": "Türkçe", "name_en": "Turkish", "rtl": False},

    # Major European
    {"code": "en", "name": "English", "name_en": "English", "rtl": False},
    {"code": "es", "name": "Español", "name_en": "Spanish", "rtl": False},
    {"code": "fr", "name": "Français", "name_en": "French", "rtl": False},
    {"code": "de", "name": "Deutsch", "name_en": "German", "rtl": False},
    {"code": "it", "name": "Italiano", "name_en": "Italian", "rtl": False},
    {"code": "pt", "name": "Português", "name_en": "Portuguese", "rtl": False},
    {"code": "ru", "name": "Русский", "name_en": "Russian", "rtl": False},

    # Northern European
    {"code": "nl", "name": "Nederlands", "name_en": "Dutch", "rtl": False},
    {"code": "sv", "name": "Svenska", "name_en": "Swedish", "rtl": False},
    {"code": "no", "name": "Norsk", "name_en": "Norwegian", "rtl": False},
    {"code": "da", "name": "Dansk", "name_en": "Danish", "rtl": False},
    {"code": "fi", "name": "Suomi", "name_en": "Finnish", "rtl": False},
    {"code": "is", "name": "Íslenska", "name_en": "Icelandic", "rtl": False},

    # Central & Eastern European
    {"code": "pl", "name": "Polski", "name_en": "Polish", "rtl": False},
    {"code": "cs", "name": "Čeština", "name_en": "Czech", "rtl": False},
    {"code": "sk", "name": "Slovenčina", "name_en": "Slovak", "rtl": False},
    {"code": "hu", "name": "Magyar", "name_en": "Hungarian", "rtl": False},
    {"code": "ro", "name": "Română", "name_en": "Romanian", "rtl": False},
    {"code": "bg", "name": "Български", "name_en": "Bulgarian", "rtl": False},
    {"code": "uk", "name": "Українська", "name_en": "Ukrainian", "rtl": False},
    {"code": "hr", "name": "Hrvatski", "name_en": "Croatian", "rtl": False},
    {"code": "sr", "name": "Српски", "name_en": "Serbian", "rtl": False},
    {"code": "sl", "name": "Slovenščina", "name_en": "Slovenian", "rtl": False},
    {"code": "el", "name": "Ελληνικά", "name_en": "Greek", "rtl": False},
    {"code": "lt", "name": "Lietuvių", "name_en": "Lithuanian", "rtl": False},
    {"code": "lv", "name": "Latviešu", "name_en": "Latvian", "rtl": False},
    {"code": "et", "name": "Eesti", "name_en": "Estonian", "rtl": False},

    # Asian
    {"code": "zh", "name": "中文", "name_en": "Chinese", "rtl": False},
    {"code": "ja", "name": "日本語", "name_en": "Japanese", "rtl": False},
    {"code": "ko", "name": "한국어", "name_en": "Korean", "rtl": False},
    {"code": "th", "name": "ไทย", "name_en": "Thai", "rtl": False},
    {"code": "vi", "name": "Tiếng Việt", "name_en": "Vietnamese", "rtl": False},
    {"code": "id", "name": "Bahasa Indonesia", "name_en": "Indonesian", "rtl": False},
    {"code": "ms", "name": "Bahasa Melayu", "name_en": "Malay", "rtl": False},
    {"code": "tl", "name": "Tagalog", "name_en": "Filipino", "rtl": False},

    # South Asian
    {"code": "hi", "name": "हिन्दी", "name_en": "Hindi", "rtl": False},
    {"code": "bn", "name": "বাংলা", "name_en": "Bengali", "rtl": False},
    {"code": "ta", "name": "தமிழ்", "name_en": "Tamil", "rtl": False},
    {"code": "te", "name": "తెలుగు", "name_en": "Telugu", "rtl": False},
    {"code": "mr", "name": "मराठी", "name_en": "Marathi", "rtl": False},
    {"code": "pa", "name": "ਪੰਜਾਬੀ", "name_en": "Punjabi", "rtl": False},
    {"code": "ur", "name": "اردو", "name_en": "Urdu", "rtl": True},

    # Other
    {"code": "af", "name": "Afrikaans", "name_en": "Afrikaans", "rtl": False},
    {"code": "sw", "name": "Kiswahili", "name_en": "Swahili", "rtl": False},
    {"code": "am", "name": "አማርኛ", "name_en": "Amharic", "rtl": False},
]


def get_language_name(code: str) -> str:
    """
    Get language name (English) for a language code.
    Falls back to uppercase code if language not found.
    """
    for lang in SUBTITLE_LANGUAGES:
        if lang["code"] == code:
            return lang["name_en"]
    return code.upper()


def get_language_native_name(code: str) -> str:
    """
    Get native language name for a language code.
    Falls back to uppercase code if language not found.
    """
    for lang in SUBTITLE_LANGUAGES:
        if lang["code"] == code:
            return lang["name"]
    return code.upper()
