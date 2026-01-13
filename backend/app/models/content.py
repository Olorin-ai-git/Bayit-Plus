from datetime import datetime
from typing import Optional, List, Union, Dict, Any
from beanie import Document
from pydantic import BaseModel, Field


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
    category_id: str
    category_name: Optional[str] = None

    # Metadata
    duration: Optional[str] = None  # e.g., "1:45:00"
    year: Optional[int] = None
    rating: Optional[Union[str, float]] = None  # e.g., "PG-13" or 7.839 (accepts both for compatibility)
    genre: Optional[str] = None  # Primary genre (legacy field, kept for backward compatibility)
    genre_en: Optional[str] = None  # English genre translation
    genre_es: Optional[str] = None  # Spanish genre translation
    genres: Optional[List[str]] = None  # Multiple genres from TMDB
    cast: Optional[List[str]] = None
    director: Optional[str] = None
    content_type: Optional[str] = None  # "movie", "series", "documentary", etc.

    # Streaming
    stream_url: str
    stream_type: str = "hls"  # hls, dash
    is_drm_protected: bool = False
    drm_key_id: Optional[str] = None
    file_hash: Optional[str] = None  # SHA256 hash for duplicate detection

    # Subtitle tracking
    has_subtitles: bool = False
    available_subtitle_languages: List[str] = Field(default_factory=list)  # ["en", "he", "es"]
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
    requires_subscription: str = "basic"  # basic, premium, family

    # Children content fields
    is_kids_content: bool = False
    age_rating: Optional[int] = None  # Minimum age (e.g., 3, 7, 12)
    content_rating: Optional[str] = None  # G, PG, etc.
    educational_tags: List[str] = Field(default_factory=list)  # ["hebrew", "math", "music"]

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
            "category_id",
            "is_featured",
            "is_published",
            "series_id",
            "created_at",
            "updated_at",
            "file_hash",
            ("category_id", "is_published"),
            ("is_featured", "is_published"),
        ]


class Category(Document):
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    slug: str
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    thumbnail: Optional[str] = None
    icon: Optional[str] = None  # Icon name or URL
    order: int = 0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "categories"


class LiveChannel(Document):
    name: str
    name_en: Optional[str] = None
    name_es: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    description_es: Optional[str] = None
    thumbnail: Optional[str] = None
    logo: Optional[str] = None

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
    available_translation_languages: List[str] = Field(default_factory=lambda: ["en", "es", "ar", "ru", "fr", "de", "it", "pt", "yi", "he"])

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
        ]


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

    class Settings:
        name = "podcast_episodes"
        indexes = [
            "podcast_id",
            ("podcast_id", "published_at"),
            "guid",  # Index GUID for fast duplicate detection
        ]
