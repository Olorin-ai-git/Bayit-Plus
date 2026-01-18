"""
Culture models for multi-cultural content aggregation.

Supports Israeli, Chinese, Japanese, Korean, Indian and other cultural communities
with city-specific content, scrapers, and localized experiences.

Collections:
- cultures: Culture configurations with display settings
- culture_cities: City configurations within each culture
- culture_news_sources: News source configurations per culture/city
"""

from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from beanie import Document
from pydantic import BaseModel, Field


class CultureCityCategory(BaseModel):
    """Category configuration for a culture city."""

    id: str  # e.g., "history", "food", "tech"
    name: str  # English display name
    name_localized: Dict[str, str] = Field(default_factory=dict)  # {"he": "...", "en": "..."}
    icon_emoji: str = ""  # e.g., "🏛️", "🍜", "💻"
    keywords_native: List[str] = Field(default_factory=list)  # Keywords in native language
    keywords_english: List[str] = Field(default_factory=list)  # Keywords in English
    display_order: int = 0
    is_active: bool = True


class ScrapingConfig(BaseModel):
    """Configuration for web scraping a news source."""

    article_selector: Optional[str] = None  # CSS selector for article container
    title_selector: Optional[str] = None  # CSS selector for title
    summary_selector: Optional[str] = None  # CSS selector for summary
    image_selector: Optional[str] = None  # CSS selector for image
    date_selector: Optional[str] = None  # CSS selector for date
    date_format: Optional[str] = None  # strptime format string
    use_browser: bool = False  # Whether to use headless browser
    custom_headers: Dict[str, str] = Field(default_factory=dict)
    rate_limit_seconds: float = 1.0  # Delay between requests


class Culture(Document):
    """
    Configuration for a cultural community.

    Each culture has its own timezone, language preferences,
    content sources, and featured cities.
    """

    # Identity
    culture_id: str  # "israeli", "chinese", "japanese", "korean", "indian"
    name: str  # Display name in English
    name_localized: Dict[str, str] = Field(default_factory=dict)  # {"he": "...", "en": "...", "es": "..."}
    flag_emoji: str = ""  # "🇮🇱", "🇨🇳", "🇯🇵", "🇰🇷", "🇮🇳"
    country_code: str = ""  # ISO 3166-1 alpha-2: IL, CN, JP, KR, IN

    # Timezone & Language
    primary_timezone: str  # "Asia/Jerusalem", "Asia/Tokyo", etc.
    primary_language: str = "en"  # Primary content language code
    supported_languages: List[str] = Field(default_factory=lambda: ["en"])

    # Relevance scoring weights
    keyword_weight_native: float = 2.0  # Boost for native language keyword matches
    keyword_weight_english: float = 1.0  # Weight for English keyword matches

    # Feature flags
    has_shabbat_mode: bool = False  # True only for Israeli
    has_lunar_calendar: bool = False  # True for Chinese, Korean
    has_special_holidays: bool = False  # Culture-specific holiday calendar

    # Display settings
    display_order: int = 0
    is_active: bool = True
    is_default: bool = False  # True for Israeli (backward compatibility)

    # Background/theme
    background_image_key: Optional[str] = None  # Asset key for culture hero image
    accent_color: Optional[str] = None  # Hex color for UI theming

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "cultures"
        indexes = [
            "culture_id",
            "is_active",
            "display_order",
        ]


class CultureCity(Document):
    """
    Configuration for a featured city within a culture.

    Cities are the primary content grouping - each city has its own
    content sources, categories, and background imagery.
    """

    # Identity
    city_id: str  # "jerusalem", "tokyo", "shanghai", "seoul", "mumbai"
    culture_id: str  # Reference to Culture.culture_id
    name: str  # English name
    name_localized: Dict[str, str] = Field(default_factory=dict)  # {"he": "...", "en": "...", "es": "..."}
    name_native: Optional[str] = None  # Name in native script: "東京", "上海", "서울"

    # Location
    timezone: str  # City-specific timezone
    coordinates: Optional[Dict[str, float]] = None  # {"lat": 35.6762, "lng": 139.6503}
    country_code: str = ""  # ISO 3166-1 alpha-2

    # Content configuration
    categories: List[CultureCityCategory] = Field(default_factory=list)

    # Display settings
    display_order: int = 0
    is_active: bool = True
    is_featured: bool = True  # Shows on homepage

    # Visual assets
    background_image_key: Optional[str] = None  # GCS key for city background
    thumbnail_image_key: Optional[str] = None  # GCS key for city thumbnail
    accent_color: Optional[str] = None  # Hex color for city-specific theming

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "culture_cities"
        indexes = [
            "city_id",
            "culture_id",
            "is_active",
            "is_featured",
            ("culture_id", "display_order"),
        ]


class CultureNewsSource(Document):
    """
    Configuration for a news source within a culture.

    Sources can be culture-wide or city-specific.
    Supports RSS feeds and web scraping.
    """

    # Identity
    source_id: str  # Unique identifier
    culture_id: str  # Reference to Culture.culture_id
    city_id: Optional[str] = None  # If city-specific, reference to CultureCity.city_id
    name: str  # Display name in English
    name_localized: Dict[str, str] = Field(default_factory=dict)
    name_native: Optional[str] = None  # Name in native script

    # Source configuration
    source_type: str = "rss"  # "rss", "scrape", "api"
    rss_url: Optional[str] = None  # RSS feed URL
    website_url: str  # Main website URL
    api_endpoint: Optional[str] = None  # API endpoint if source_type is "api"

    # Scraping configuration
    scraping_config: Optional[ScrapingConfig] = None

    # Content settings
    content_type: str = "news"  # "news", "events", "culture", "entertainment"
    language: str = "en"  # Primary content language
    categories: List[str] = Field(default_factory=list)  # Categories this source covers

    # Keyword filters (only include articles matching these)
    keyword_filters: List[str] = Field(default_factory=list)

    # Status
    is_active: bool = True
    priority: int = 0  # Higher = more important

    # Fetch status
    last_fetched_at: Optional[datetime] = None
    fetch_error_count: int = 0
    last_error_message: Optional[str] = None

    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "culture_news_sources"
        indexes = [
            "source_id",
            "culture_id",
            "city_id",
            "source_type",
            "is_active",
            ("culture_id", "is_active"),
            ("culture_id", "city_id", "is_active"),
        ]


class CultureContentItem(Document):
    """
    A cached content item from a culture source.

    Items are stored with TTL for automatic cleanup.
    """

    # Source reference
    culture_id: str
    city_id: Optional[str] = None
    source_id: str
    source_name: str

    # Content
    title: str
    title_native: Optional[str] = None  # Title in native script
    title_localized: Dict[str, str] = Field(default_factory=dict)  # {"he": "...", "en": "..."}
    url: str
    published_at: datetime
    summary: Optional[str] = None
    summary_native: Optional[str] = None
    summary_localized: Dict[str, str] = Field(default_factory=dict)
    image_url: Optional[str] = None

    # Classification
    category: str = "general"
    category_label: Dict[str, str] = Field(default_factory=dict)  # {"he": "...", "en": "..."}
    tags: List[str] = Field(default_factory=list)

    # Scoring
    relevance_score: float = 0.0
    matched_keywords: List[str] = Field(default_factory=list)

    # Timestamps
    fetched_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "culture_content_items"
        indexes = [
            "culture_id",
            "city_id",
            "source_id",
            "category",
            "published_at",
            "url",
            ("culture_id", "category", "published_at"),
            ("culture_id", "city_id", "category", "published_at"),
            ("culture_id", "relevance_score", "published_at"),
        ]


# Response Models


class CultureResponse(BaseModel):
    """Response model for a culture."""

    id: str
    culture_id: str
    name: str
    name_localized: Dict[str, str] = Field(default_factory=dict)
    flag_emoji: str = ""
    country_code: str = ""
    primary_timezone: str
    primary_language: str = "en"
    supported_languages: List[str] = Field(default_factory=list)
    has_shabbat_mode: bool = False
    has_lunar_calendar: bool = False
    display_order: int = 0
    is_active: bool = True
    is_default: bool = False
    background_image_key: Optional[str] = None
    accent_color: Optional[str] = None

    class Config:
        from_attributes = True


class CultureCityResponse(BaseModel):
    """Response model for a culture city."""

    id: str
    city_id: str
    culture_id: str
    name: str
    name_localized: Dict[str, str] = Field(default_factory=dict)
    name_native: Optional[str] = None
    timezone: str
    coordinates: Optional[Dict[str, float]] = None
    categories: List[CultureCityCategory] = Field(default_factory=list)
    display_order: int = 0
    is_active: bool = True
    is_featured: bool = True
    background_image_key: Optional[str] = None
    thumbnail_image_key: Optional[str] = None
    accent_color: Optional[str] = None

    class Config:
        from_attributes = True


class CultureNewsSourceResponse(BaseModel):
    """Response model for a culture news source."""

    id: str
    source_id: str
    culture_id: str
    city_id: Optional[str] = None
    name: str
    name_localized: Dict[str, str] = Field(default_factory=dict)
    source_type: str
    website_url: str
    content_type: str
    language: str
    categories: List[str] = Field(default_factory=list)
    is_active: bool = True
    priority: int = 0
    last_fetched_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CultureContentItemResponse(BaseModel):
    """Response model for a culture content item."""

    id: str
    culture_id: str
    city_id: Optional[str] = None
    source_id: str
    source_name: str
    title: str
    title_native: Optional[str] = None
    title_localized: Dict[str, str] = Field(default_factory=dict)
    url: str
    published_at: datetime
    summary: Optional[str] = None
    summary_native: Optional[str] = None
    summary_localized: Dict[str, str] = Field(default_factory=dict)
    image_url: Optional[str] = None
    category: str
    category_label: Dict[str, str] = Field(default_factory=dict)
    tags: List[str] = Field(default_factory=list)
    relevance_score: float = 0.0

    class Config:
        from_attributes = True


class CultureContentAggregatedResponse(BaseModel):
    """Aggregated culture content response with pagination."""

    items: List[CultureContentItemResponse]
    pagination: Dict[str, Any]
    sources_count: int
    last_updated: datetime
    culture_id: str
    city_id: Optional[str] = None
    category: Optional[str] = None


class CultureFeaturedResponse(BaseModel):
    """Featured culture content for hero section."""

    featured: List[CultureContentItemResponse]
    trending: List[CultureContentItemResponse] = Field(default_factory=list)
    live_streams: List[Dict[str, Any]] = Field(default_factory=list)
    last_updated: datetime
    culture_id: str


class CultureTimeResponse(BaseModel):
    """Culture timezone information."""

    culture_id: str
    timezone: str
    current_time: str  # ISO format
    display_time: str  # Formatted for display (e.g., "10:30 PM")
    display_date: str  # Formatted date
    day_of_week: str
    is_weekend: bool = False
