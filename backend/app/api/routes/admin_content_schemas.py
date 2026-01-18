"""
Pydantic schemas for admin content management.
Request/response models for all content types.
"""

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


# Content Models
class ContentCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    category_id: str
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[str] = None
    genre: Optional[str] = None
    cast: Optional[List[str]] = None
    director: Optional[str] = None
    stream_url: str
    stream_type: str = "hls"
    is_drm_protected: bool = False
    drm_key_id: Optional[str] = None
    is_series: bool = False
    season: Optional[int] = None
    episode: Optional[int] = None
    series_id: Optional[str] = None
    is_published: bool = True
    is_featured: bool = False
    requires_subscription: str = "basic"
    is_kids_content: bool = False
    age_rating: Optional[int] = None
    content_rating: Optional[str] = None
    educational_tags: List[str] = Field(default_factory=list)


class ContentUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    category_id: Optional[str] = None
    duration: Optional[str] = None
    year: Optional[int] = None
    rating: Optional[str] = None
    genre: Optional[str] = None
    cast: Optional[List[str]] = None
    director: Optional[str] = None
    stream_url: Optional[str] = None
    stream_type: Optional[str] = None
    is_drm_protected: Optional[bool] = None
    drm_key_id: Optional[str] = None
    is_series: Optional[bool] = None
    season: Optional[int] = None
    episode: Optional[int] = None
    series_id: Optional[str] = None
    is_published: Optional[bool] = None
    is_featured: Optional[bool] = None
    requires_subscription: Optional[str] = None
    is_kids_content: Optional[bool] = None
    age_rating: Optional[int] = None
    content_rating: Optional[str] = None
    educational_tags: Optional[List[str]] = None


# Category Models
class CategoryCreateRequest(BaseModel):
    name: str
    name_en: Optional[str] = None
    slug: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    order: int = 0
    is_active: bool = True


class CategoryUpdateRequest(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    order: Optional[int] = None
    is_active: Optional[bool] = None


# Live Channel Models
class LiveChannelCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    logo: Optional[str] = None
    category: Optional[str] = None  # news, entertainment, sports, kids, music
    culture_id: str = "israeli"  # Culture association (Global Cultures feature)
    stream_url: str
    stream_type: str = "hls"
    is_drm_protected: bool = False
    epg_source: Optional[str] = None
    current_show: Optional[str] = None
    next_show: Optional[str] = None
    is_active: bool = True
    order: int = 0
    requires_subscription: str = "premium"
    supports_live_subtitles: bool = False
    primary_language: str = "he"
    available_translation_languages: List[str] = Field(default_factory=lambda: ["en", "es", "ar", "ru", "fr", "de", "it", "pt", "yi", "he"])


class LiveChannelUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    logo: Optional[str] = None
    category: Optional[str] = None  # news, entertainment, sports, kids, music
    culture_id: Optional[str] = None  # Culture association (Global Cultures feature)
    stream_url: Optional[str] = None
    stream_type: Optional[str] = None
    is_drm_protected: Optional[bool] = None
    epg_source: Optional[str] = None
    current_show: Optional[str] = None
    next_show: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None
    requires_subscription: Optional[str] = None
    supports_live_subtitles: Optional[bool] = None
    primary_language: Optional[str] = None
    available_translation_languages: Optional[List[str]] = None


# Radio Station Models
class RadioStationCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    logo: Optional[str] = None
    genre: Optional[str] = None
    culture_id: str = "israeli"  # Culture association (Global Cultures feature)
    stream_url: str
    stream_type: str = "audio"
    current_show: Optional[str] = None
    current_song: Optional[str] = None
    is_active: bool = True
    order: int = 0


class RadioStationUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    logo: Optional[str] = None
    genre: Optional[str] = None
    culture_id: Optional[str] = None  # Culture association (Global Cultures feature)
    stream_url: Optional[str] = None
    stream_type: Optional[str] = None
    current_show: Optional[str] = None
    current_song: Optional[str] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None


# Podcast Models
class PodcastCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    author: Optional[str] = None
    cover: Optional[str] = None
    category: Optional[str] = None
    culture_id: str = "israeli"  # Culture association (Global Cultures feature)
    rss_feed: Optional[str] = None
    website: Optional[str] = None
    episode_count: int = 0
    latest_episode_date: Optional[datetime] = None
    is_active: bool = True
    order: int = 0


class PodcastUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    author: Optional[str] = None
    cover: Optional[str] = None
    category: Optional[str] = None
    culture_id: Optional[str] = None  # Culture association (Global Cultures feature)
    rss_feed: Optional[str] = None
    website: Optional[str] = None
    episode_count: Optional[int] = None
    latest_episode_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    order: Optional[int] = None


# Podcast Episode Models
class PodcastEpisodeCreateRequest(BaseModel):
    title: str
    description: Optional[str] = None
    audio_url: str
    duration: Optional[str] = None
    episode_number: Optional[int] = None
    season_number: Optional[int] = None
    published_at: datetime
    thumbnail: Optional[str] = None


class PodcastEpisodeUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    audio_url: Optional[str] = None
    duration: Optional[str] = None
    episode_number: Optional[int] = None
    season_number: Optional[int] = None
    published_at: Optional[datetime] = None
    thumbnail: Optional[str] = None
