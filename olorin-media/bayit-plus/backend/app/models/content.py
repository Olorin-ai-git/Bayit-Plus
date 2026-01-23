from datetime import datetime
from typing import Any, Dict, List, Optional, Union

import pymongo
from beanie import Document
from pydantic import BaseModel, ConfigDict, Field, field_validator


class ContentBase(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None


class ContentCreate(ContentBase):
    category_id: str
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[Union[str, float]] = None
    genre: Optional[str] = None
    cast: Optional[List[str]] = None
    stream_url: str
    is_drm_protected: bool = False


class ContentResponse(ContentBase):
    id: str
    category: Optional[str] = None
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[Union[str, float]] = None
    type: str = "vod"

    class Config:
        from_attributes = True


class Content(Document):
    title: str
    title_en: Optional[str] = None  # English title for bilingual support
    title_es: Optional[str] = None  # Spanish title for trilingual support
    description: Optional[str] = None
    description_en: Optional[str] = None  # English description
    description_es: Optional[str] = None  # Spanish description
    thumbnail: Optional[str] = None  # URL (kept for backward compatibility)
    thumbnail_data: Optional[str] = None  # Base64-encoded image data URI
    backdrop: Optional[str] = None  # URL (kept for backward compatibility)
    backdrop_data: Optional[str] = None  # Base64-encoded image data URI
    poster_url: Optional[str] = None  # TMDB poster URL

    # === NEW TAXONOMY FIELDS (5-axis classification system) ===
    # Section: Where content lives in navigation (can appear in multiple sections)
    section_ids: List[str] = Field(
        default_factory=list
    )  # ["movies", "judaism"] - cross-listing
    primary_section_id: Optional[str] = (
        None  # Main section for sorting/display priority
    )

    # Format: Structural content type
    content_format: Optional[str] = (
        None  # "movie", "series", "documentary", "short", "clip"
    )

    # Audience: Age appropriateness
    audience_id: Optional[str] = None  # "general", "kids", "family", "mature"

    # Genre: Mood/style (multiple allowed)
    genre_ids: List[str] = Field(default_factory=list)  # ["drama", "thriller"]

    # Topic Tags: Themes (multiple allowed)
    topic_tags: List[str] = Field(default_factory=list)  # ["jewish", "educational"]

    # Sub-categories: Section-specific organization (can be in multiple)
    subcategory_ids: List[str] = Field(default_factory=list)  # ["shiurim", "cartoons"]

    # === LEGACY FIELDS (kept for backward compatibility during migration) ===
    category_id: str  # Maps to primary_section_id after migration
    category_name: Optional[str] = None  # Deprecated - remove after migration

    # Metadata
    duration: Optional[str] = None  # e.g., "1:45:00"
    year: Optional[int] = None
    rating: Optional[Union[str, float]] = (
        None  # e.g., "PG-13" or 7.839 (accepts both for compatibility)
    )
    genre: Optional[str] = (
        None  # Primary genre (legacy field, kept for backward compatibility)
    )
    genre_en: Optional[str] = None  # English genre translation
    genre_es: Optional[str] = None  # Spanish genre translation
    genres: Optional[List[str]] = (
        None  # Multiple genres from TMDB (legacy - use genre_ids)
    )
    cast: Optional[List[str]] = None
    director: Optional[str] = None
    content_type: Optional[str] = None  # Legacy - use content_format instead

    # Streaming
    stream_url: str
    stream_type: str = "hls"  # hls, dash
    is_drm_protected: bool = False
    drm_key_id: Optional[str] = None
    file_hash: Optional[str] = None  # SHA256 hash for duplicate detection
    file_size: Optional[int] = None  # File size in bytes for quick duplicate checks

    # Subtitle tracking
    has_subtitles: bool = False
    available_subtitle_languages: List[str] = Field(
        default_factory=list
    )  # ["en", "he", "es"]
    embedded_subtitle_count: int = 0  # Number of subtitle tracks in MKV file
    subtitle_extraction_status: Optional[str] = None  # "pending", "completed", "failed"
    subtitle_last_checked: Optional[datetime] = None

    # Video metadata (from FFmpeg analysis)
    video_metadata: Optional[Dict[str, Any]] = None
    # {
    #   "duration": 7265.5,
    #   "width": 1920,
    #   "height": 1080,
    #   "codec": "h264",
    #   "bitrate": 2500000,
    #   "fps": 23.976
    # }

    # Quality variant fields (for multi-resolution content)
    quality_tier: Optional[str] = None  # "480p", "720p", "1080p", "4k"
    primary_content_id: Optional[str] = None  # ID of primary (highest quality) version
    quality_variants: List[Dict[str, Any]] = Field(default_factory=list)
    # [{"content_id": "...", "quality_tier": "720p", "resolution_height": 720, "stream_url": "..."}]
    is_quality_variant: bool = False  # True if linked as variant of another content

    # Series info
    is_series: bool = False
    season: Optional[int] = None
    episode: Optional[int] = None
    series_id: Optional[str] = None
    total_seasons: Optional[int] = None
    total_episodes: Optional[int] = None

    # TMDB Integration
    tmdb_id: Optional[int] = None
    imdb_id: Optional[str] = None  # e.g., "tt1234567"
    imdb_rating: Optional[float] = None
    imdb_votes: Optional[int] = None

    # Trailer/Preview
    trailer_url: Optional[str] = None
    preview_url: Optional[str] = None  # 5-second preview clip

    # Visibility
    is_published: bool = True
    is_featured: bool = False
    requires_subscription: str = "basic"  # basic, premium, family, none
    # Content access visibility mode:
    # - "public": Visible to all users (default)
    # - "private": Hidden from discovery, direct link only
    # - "passkey_protected": Requires passkey authentication to view
    visibility_mode: str = "public"

    # Children content fields
    is_kids_content: bool = False
    age_rating: Optional[int] = None  # Minimum age (e.g., 3, 7, 12)
    content_rating: Optional[str] = None  # G, PG, etc.
    educational_tags: List[str] = Field(
        default_factory=list
    )  # ["hebrew", "math", "music"]

    # Kids content moderation
    kids_moderation_status: Optional[str] = None  # "pending", "approved", "rejected"
    kids_moderated_by: Optional[str] = None  # User ID who moderated
    kids_moderated_at: Optional[datetime] = None  # When moderation occurred

    # Youngsters content fields (ages 12-17)
    is_youngsters_content: bool = False
    youngsters_age_rating: Optional[int] = None  # Age rating (12, 14, 17)
    youngsters_moderation_status: Optional[str] = (
        None  # "pending", "approved", "rejected"
    )
    youngsters_moderated_by: Optional[str] = None  # User ID who moderated
    youngsters_moderated_at: Optional[datetime] = None  # When moderation occurred
    youngsters_educational_tags: List[str] = Field(
        default_factory=list
    )  # ["study-help", "career-prep", etc.]

    # Manual review flags (set by AI agent for broken streams, integrity issues, etc.)
    needs_review: bool = False
    review_reason: Optional[str] = None
    review_priority: Optional[str] = None  # "low", "medium", "high", "critical"
    review_issue_type: Optional[str] = (
        None  # "broken_stream", "missing_metadata", "duplicate", etc.
    )
    review_flagged_at: Optional[datetime] = None

    # Analytics
    view_count: int = 0
    avg_rating: float = 0.0

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    published_at: Optional[datetime] = None

    class Settings:
        name = "content"
        indexes = [
            # Legacy category indexes (backward compatibility)
            "category_id",
            ("category_id", "is_published"),
            # New taxonomy indexes
            "section_ids",
            "primary_section_id",
            "content_format",
            "audience_id",
            "genre_ids",
            "topic_tags",
            "subcategory_ids",
            ("section_ids", "is_published"),
            ("primary_section_id", "is_published"),
            ("audience_id", "is_published"),
            ("content_format", "is_published"),
            # Multi-field taxonomy queries
            ("section_ids", "audience_id", "is_published"),
            # Note: Cannot use ("section_ids", "genre_ids", "is_published") - MongoDB doesn't allow
            # compound indexes with multiple array fields (parallel arrays)
            ("genre_ids", "is_published"),
            # Core indexes
            "is_featured",
            "is_published",
            "series_id",
            "created_at",
            "updated_at",
            ("is_featured", "is_published"),
            # Series episode indexes for duplicate detection and linking
            ("series_id", "season", "episode"),
            ("content_type", "series_id"),
            # Filter indexes for advanced search
            "year",
            "genres",
            "available_subtitle_languages",
            "requires_subscription",
            "is_kids_content",
            "content_type",
            # Kids content indexes
            "age_rating",
            ("is_kids_content", "age_rating"),
            ("is_kids_content", "is_published", "age_rating"),
            # Youngsters content indexes
            "is_youngsters_content",
            "youngsters_age_rating",
            ("is_youngsters_content", "youngsters_age_rating"),
            ("is_youngsters_content", "is_published", "youngsters_age_rating"),
            # Manual review indexes
            "needs_review",
            ("needs_review", "review_priority"),
            # Visibility mode indexes (for passkey-protected content filtering)
            "visibility_mode",
            ("visibility_mode", "is_published"),
            ("visibility_mode", "is_published", "section_ids"),
        ]


class LiveChannel(Document):
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    thumbnail: Optional[str] = None
    logo: Optional[str] = None
    category: Optional[str] = None  # news, entertainment, sports, kids, music

    # Culture association (Global Cultures feature)
    culture_id: str = "israeli"  # Default for backward compatibility

    # Stream
    stream_url: str
    stream_type: str = "hls"
    is_drm_protected: bool = False

    # EPG
    epg_source: Optional[str] = None
    current_show: Optional[str] = None
    next_show: Optional[str] = None

    # Real-time subtitle support (Premium feature)
    supports_live_subtitles: bool = False
    primary_language: str = "he"  # Source language for live translation
    available_translation_languages: List[str] = Field(
        default_factory=lambda: [
            "en",
            "es",
            "ar",
            "ru",
            "fr",
            "de",
            "it",
            "pt",
            "yi",
            "he",
        ]
    )

    # Real-time dubbing support (Premium feature)
    supports_live_dubbing: bool = False
    dubbing_source_language: str = "he"  # Source language for dubbing
    available_dubbing_languages: List[str] = Field(
        default_factory=lambda: ["en", "es", "ar", "ru"]
    )
    default_dubbing_voice_id: Optional[str] = None  # Override default ElevenLabs voice
    dubbing_sync_delay_ms: int = 600  # Default sync delay for this channel

    # Visibility
    is_active: bool = True
    order: int = 0
    requires_subscription: str = "premium"

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "live_channels"
        indexes = [
            "order",
            "is_active",
            "created_at",
            "culture_id",
            ("culture_id", "is_active"),
            ("culture_id", "category"),
            # Compound index covering all common query patterns
            ("is_active", "culture_id", "category", "order"),
        ]


class EPGEntry(Document):
    channel_id: str
    title: str
    description: Optional[str] = None
    start_time: datetime
    end_time: datetime
    category: Optional[str] = None
    thumbnail: Optional[str] = None

    # Additional metadata for search
    cast: Optional[List[str]] = None
    genres: Optional[List[str]] = None
    rating: Optional[str] = None
    director: Optional[str] = None

    # Recording link (for catch-up TV)
    recording_id: Optional[str] = None

    class Settings:
        name = "epg_entries"
        indexes = [
            "channel_id",
            ("channel_id", "start_time"),
            ("start_time", "end_time"),
        ]


class RadioStation(Document):
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    logo: Optional[str] = None
    genre: Optional[str] = None
    genre_en: Optional[str] = None
    genre_es: Optional[str] = None

    # Culture association (Global Cultures feature)
    culture_id: str = "israeli"  # Default for backward compatibility

    stream_url: str
    stream_type: str = "audio"  # audio, hls

    current_show: Optional[str] = None
    current_song: Optional[str] = None

    is_active: bool = True
    order: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "radio_stations"
        indexes = [
            "order",
            "is_active",
            "genre",
            "culture_id",
            ("culture_id", "is_active"),
            ("culture_id", "genre"),
        ]


class Podcast(Document):
    title: str
    title_en: Optional[str] = None
    title_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    author: Optional[str] = None
    author_en: Optional[str] = None
    author_es: Optional[str] = None
    cover: Optional[str] = None
    category: Optional[str] = None
    category_en: Optional[str] = None
    category_es: Optional[str] = None

    # Culture association (Global Cultures feature)
    culture_id: str = "israeli"  # Default for backward compatibility

    rss_feed: Optional[str] = None
    website: Optional[str] = None

    episode_count: int = 0
    latest_episode_date: Optional[datetime] = None

    is_active: bool = True
    order: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "podcasts"
        indexes = [
            "category",
            "is_active",
            "latest_episode_date",
            "culture_id",
            ("culture_id", "is_active"),
            ("culture_id", "category"),
        ]


class PodcastEpisodeTranslation(BaseModel):
    """Embedded document for translation data"""

    language: str  # "en" or "he"
    audio_url: str  # GCS URL to translated MP3
    transcript: str  # Original transcript
    translated_text: str  # Translated transcript
    voice_id: str  # ElevenLabs voice ID used
    duration: Optional[str] = None  # Duration of translated audio
    created_at: datetime = Field(default_factory=datetime.utcnow)
    file_size: Optional[int] = None  # Size in bytes


class PodcastEpisodeMinimal(BaseModel):
    """Minimal projection for translation worker queries - reduces network transfer."""

    id: str = Field(alias="_id")
    title: str
    audio_url: Optional[str] = None
    original_language: str = "he"
    translation_status: str = "pending"
    retry_count: int = 0
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid_to_str(cls, v: Any) -> str:
        """Convert ObjectId to string."""
        if hasattr(v, "__str__"):
            return str(v)
        return v


class PodcastEpisode(Document):
    podcast_id: str
    title: str
    title_en: Optional[str] = None
    title_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    audio_url: Optional[str] = None
    duration: Optional[str] = None
    episode_number: Optional[int] = None
    season_number: Optional[int] = None
    published_at: datetime
    thumbnail: Optional[str] = None
    guid: Optional[str] = None  # RSS feed unique identifier to prevent duplicates

    # Translation fields
    translations: Dict[str, PodcastEpisodeTranslation] = Field(default_factory=dict)
    available_languages: List[str] = Field(default_factory=list)  # ["he", "en"]
    original_language: str = ""  # Populated at runtime from detection or config
    translation_status: str = "pending"  # pending, processing, completed, failed

    # Retry tracking
    retry_count: int = 0
    max_retries: int = 3
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "podcast_episodes"
        indexes = [
            "podcast_id",
            ("podcast_id", "published_at"),
            "guid",  # Index GUID for fast duplicate detection
            # Compound indexes for translation worker queries
            [
                ("translation_status", pymongo.ASCENDING),
                ("published_at", pymongo.DESCENDING),
            ],
            [
                ("translation_status", pymongo.ASCENDING),
                ("updated_at", pymongo.ASCENDING),
            ],
            "available_languages",  # For filtering by language support
        ]


def determine_quality_tier(height: int) -> str:
    """Determine quality tier based on video resolution height."""
    if height >= 2160:
        return "4k"
    if height >= 1080:
        return "1080p"
    if height >= 720:
        return "720p"
    if height >= 480:
        return "480p"
    return "unknown"
