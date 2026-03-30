"""Domain config: Youngsters content, documentary import, and series linker."""
from pydantic import Field


class KidsDocumentaryConfigMixin:
    """Youngsters content, public domain documentary import, and series linking."""

    # Youngsters Content Configuration (ages 12-17)
    YOUNGSTERS_YOUTUBE_CHANNEL_IDS: str = ""
    YOUNGSTERS_PODCAST_RSS_FEEDS: str = ""
    YOUNGSTERS_ARCHIVE_ORG_ENABLED: bool = True
    YOUNGSTERS_CONTENT_AGE_RATINGS: str = "12,13,14,15,16,17"
    YOUNGSTERS_CONTENT_ALLOWED_RATINGS: str = "G,PG,PG-13,TV-G,TV-PG,TV-14"
    YOUNGSTERS_CONTENT_AUTO_APPROVE_THRESHOLD: float = 0.9
    YOUNGSTERS_CONTENT_REQUIRE_MODERATION: bool = True
    YOUNGSTERS_LIBRARIAN_AUDIT_CRON: str = "0 4 * * *"
    YOUNGSTERS_LIBRARIAN_AUDIT_ENABLED: bool = True
    YOUNGSTERS_CONTENT_CACHE_TTL_MINUTES: int = 15
    YOUNGSTERS_CONTENT_MIN_RELEVANCE_SCORE: float = 0.3
    YOUNGSTERS_CONTENT_SAFE_SEARCH_ENABLED: bool = True
    YOUNGSTERS_CONTENT_DEFAULT_AGE_MAX: int = 17

    # Public Domain Documentary Import - NASA (no API key needed)
    NASA_API_BASE_URL: str = Field(
        default="https://images-api.nasa.gov",
        env="NASA_API_BASE_URL",
        description="NASA Images API base URL",
    )
    NASA_IMPORT_ENABLED: bool = Field(
        default=True,
        env="NASA_IMPORT_ENABLED",
        description="Enable NASA public domain documentary import",
    )

    # DVIDS API (key required - skip gracefully if empty)
    DVIDS_API_BASE_URL: str = Field(
        default="https://api.dvidshub.net",
        env="DVIDS_API_BASE_URL",
        description="DVIDS API base URL",
    )
    DVIDS_API_KEY: str = Field(
        default="",
        env="DVIDS_API_KEY",
        description="DVIDS API key (via GCloud Secret Manager)",
    )
    DVIDS_IMPORT_ENABLED: bool = Field(
        default=True,
        env="DVIDS_IMPORT_ENABLED",
        description="Enable DVIDS public domain documentary import",
    )

    # NARA / National Archives API (no API key needed)
    NARA_API_BASE_URL: str = Field(
        default="https://catalog.archives.gov/api/v1",
        env="NARA_API_BASE_URL",
        description="National Archives API base URL",
    )
    NARA_IMPORT_ENABLED: bool = Field(
        default=True,
        env="NARA_IMPORT_ENABLED",
        description="Enable NARA public domain documentary import",
    )

    # Documentary import HTTP settings
    DOC_IMPORT_HTTP_TIMEOUT_SECONDS: int = Field(
        default=30,
        env="DOC_IMPORT_HTTP_TIMEOUT_SECONDS",
        description="HTTP timeout for documentary source API calls",
    )
    DOC_IMPORT_RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(
        default=30,
        env="DOC_IMPORT_RATE_LIMIT_REQUESTS_PER_MINUTE",
        description="Rate limit for documentary source API calls per minute",
    )
    DOC_IMPORT_RETRY_MAX_ATTEMPTS: int = Field(
        default=3,
        env="DOC_IMPORT_RETRY_MAX_ATTEMPTS",
        description="Max retry attempts for failed documentary API calls",
    )
    DOC_IMPORT_RETRY_BACKOFF_BASE_SECONDS: float = Field(
        default=2.0,
        env="DOC_IMPORT_RETRY_BACKOFF_BASE_SECONDS",
        description="Base seconds for exponential backoff on retries",
    )
    DOC_IMPORT_BATCH_SIZE: int = Field(
        default=20,
        env="DOC_IMPORT_BATCH_SIZE",
        description="Batch size for documentary import operations",
    )
    DOC_IMPORT_DOCUMENTARIES_SECTION_SLUG: str = Field(
        default="documentaries",
        env="DOC_IMPORT_DOCUMENTARIES_SECTION_SLUG",
        description="Slug for the documentaries content section",
    )

    # Auto-link series configuration
    SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD: float = 0.85
    SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD: float = 0.90
    SERIES_LINKER_AUTO_LINK_BATCH_SIZE: int = 50
    SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY: str = "keep_highest_quality"
    SERIES_LINKER_CREATE_MISSING_SERIES: bool = True
