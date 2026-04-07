"""Restored Settings fields dropped during mixin decomposition."""

from pydantic import Field
from pydantic_settings import BaseSettings


class RestoredFieldsMixin(BaseSettings):
    """Fields dropped during config decomposition."""

    SCENE_GAP_THRESHOLD_SECONDS: float = Field(
        default=5.0,
        env="SCENE_GAP_THRESHOLD_SECONDS",
        description="Minimum subtitle gap (seconds) to detect scene boundary"
    )
    MIN_SCENE_DURATION_SECONDS: float = Field(
        default=30.0,
        env="MIN_SCENE_DURATION_SECONDS",
        description="Minimum scene duration (seconds) to trigger question"
    )
    COMPREHENSION_QUESTION_MODEL: str = Field(
        default="claude-3-5-sonnet-20241022",
        env="COMPREHENSION_QUESTION_MODEL",
        description="Claude model for generating comprehension questions"
    )
    COMPREHENSION_AI_MAX_TOKENS: int = Field(
        default=1500,
        env="COMPREHENSION_AI_MAX_TOKENS",
        description="Maximum tokens for question generation API call"
    )
    DRM_LICENSE_URL: str = ""
    DRM_API_KEY: str = ""
    STORAGE_TYPE: str = "gcs"  # "local", "s3", or "gcs"
    UPLOAD_DIR: str = "/tmp/bayit-uploads"
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_S3_REGION: str = "us-east-1"
    GCS_BUCKET_NAME: str = ""
    GCS_PROJECT_ID: str = ""  # Optional, auto-detected from Cloud Run
    GOOGLE_APPLICATION_CREDENTIALS: str = (
        ""  # Path to service account key JSON file for local development
    )
    GCS_UPLOAD_TIMEOUT_SECONDS: int = 600  # 10 minutes timeout per chunk
    GCS_UPLOAD_CHUNK_SIZE_MB: int = 8  # 8MB chunks for resumable uploads
    GCS_UPLOAD_MAX_RETRIES: int = 5  # Maximum retry attempts for transient failures
    GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS: float = (
        1.0  # Initial delay for exponential backoff
    )
    GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS: float = 60.0  # Maximum delay between retries
    HLS_CONVERSION_ENABLED: bool = True  # Enable automatic HLS conversion for uploads
    HLS_SEGMENT_DURATION: int = 10  # Duration of each HLS segment in seconds
    HLS_CONVERSION_TIMEOUT: int = 7200  # Max time for conversion (2 hours)
    HLS_TEMP_DIR: str = "/tmp/hls-conversion"  # Temp directory for HLS processing
    CDN_BASE_URL: str = ""
    UPLOAD_MONITOR_ENABLED: bool = (
        False  # Disabled by default - enable via environment variable if needed
    )
    UPLOAD_MONITOR_INTERVAL: int = 3600  # Seconds between scans (default: 1 hour)
    UPLOAD_DEFAULT_FOLDERS: str = ""  # Comma-separated paths to monitor on startup
    UPLOAD_SESSION_MAX_AGE_HOURS: int = 24  # Maximum age for orphaned upload sessions
    UPLOAD_SESSION_CLEANUP_INTERVAL_SECONDS: int = (
        3600  # Cleanup task interval (1 hour)
    )
    UPLOAD_SESSION_TIMEOUT_HOURS: int = 2  # Timeout for inactive upload sessions
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@olorin.ai"
    RESEND_API_KEY: str = ""
    ADMIN_EMAIL_ADDRESSES: str = ""  # Comma-separated list of admin emails
    TMDB_API_KEY: str = ""
    TMDB_API_TOKEN: str = ""  # Bearer token for TMDB API v4
    OPENSUBTITLES_API_KEY: str = ""
    OPENSUBTITLES_USERNAME: str = ""  # Required for downloads
    OPENSUBTITLES_PASSWORD: str = ""  # Required for downloads
    OPENSUBTITLES_API_BASE_URL: str = "https://api.opensubtitles.com/api/v1"
    OPENSUBTITLES_USER_AGENT: str = "Bayit+ v1.0"
    OPENSUBTITLES_DOWNLOAD_LIMIT_PER_DAY: int = 1500
    OPENSUBTITLES_RATE_LIMIT_REQUESTS: int = 40
    OPENSUBTITLES_RATE_LIMIT_WINDOW_SECONDS: int = 10
    SUBTITLE_SEARCH_CACHE_TTL_DAYS: int = 7
    SUBTITLE_NOT_FOUND_CACHE_TTL_DAYS: int = 30
    SUBTITLE_BATCH_SIZE: int = 20
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PHONE_VERIFICATION_CODE_EXPIRE_MINUTES: int = 10
    MAX_VERIFICATION_ATTEMPTS_PER_HOUR: int = 3
    FRONTEND_WEB_URL: str = ""
    FRONTEND_MOBILE_URL: str = "bayitplus://"  # Mobile deep link scheme (app-specific)
    GCP_PROJECT_ID: str = ""
    GCP_REGION: str = Field(
        default="us-central1",
        env="GCP_REGION",
        description="GCP region for Vertex AI and other services",
    )
    APPLE_KEY_PATH: str = ""
    APPLE_BUNDLE_ID_IOS: str = ""
    APPLE_BUNDLE_ID_TVOS: str = ""
    LIBRARIAN_DAILY_AUDIT_CRON: str = ""
    LIBRARIAN_DAILY_AUDIT_TIME: str = ""
    LIBRARIAN_DAILY_AUDIT_MODE: str = ""
    LIBRARIAN_DAILY_AUDIT_COST: str = ""
    LIBRARIAN_DAILY_AUDIT_STATUS: str = ""
    LIBRARIAN_DAILY_AUDIT_DESCRIPTION: str = ""
    LIBRARIAN_WEEKLY_AUDIT_CRON: str = ""
    LIBRARIAN_WEEKLY_AUDIT_TIME: str = ""
    LIBRARIAN_WEEKLY_AUDIT_MODE: str = ""
    LIBRARIAN_WEEKLY_AUDIT_COST: str = ""
    LIBRARIAN_WEEKLY_AUDIT_STATUS: str = ""
    LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION: str = ""
    LIBRARIAN_MAX_ITERATIONS: int = 100
    LIBRARIAN_DEFAULT_BUDGET_USD: float = 5.0
    LIBRARIAN_MIN_BUDGET_USD: float = 1.0
    LIBRARIAN_MAX_BUDGET_USD: float = 50.0
    LIBRARIAN_BUDGET_STEP_USD: float = 1.0
    LIBRARIAN_REPORTS_LIMIT: int = 50
    LIBRARIAN_ACTIONS_LIMIT: int = 100
    LIBRARIAN_ACTIVITY_PAGE_SIZE: int = 20
    LIBRARIAN_ID_TRUNCATE_LENGTH: int = 8
    LIBRARIAN_MODAL_MAX_HEIGHT: int = 600
    AUDIT_STUCK_TIMEOUT_MINUTES: int = 30  # Audit considered stuck after 30 minutes
    AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES: int = (
        15  # No activity for 15 minutes is suspicious
    )
    AUDIT_HEALTH_CHECK_INTERVAL_SECONDS: int = 300  # Check every 5 minutes
    EPG_DEFAULT_TIME_WINDOW_HOURS: int = 6
    EPG_PAST_HOURS: int = 2
    EPG_FUTURE_HOURS: int = 4
    EPG_CACHE_TTL_SECONDS: int = 300
    EPG_INGESTION_INTERVAL_HOURS: int = 6
    SCHEDULES_DIRECT_USERNAME: str = Field(
        default="",
        env="SCHEDULES_DIRECT_USERNAME",
        description="Schedules Direct username for EPG data"
    )
    SCHEDULES_DIRECT_PASSWORD: str = Field(
        default="",
        env="SCHEDULES_DIRECT_PASSWORD",
        description="Schedules Direct password (will be SHA1 hashed)"
    )
    CATCHUP_RETENTION_DAYS: int = 7
    CATCHUP_MAX_DURATION_HOURS: int = 4
    LLM_SEARCH_MAX_RESULTS: int = 50
    LLM_SEARCH_TIMEOUT_SECONDS: int = 30
    SEARCH_CACHE_TTL_SECONDS: int = 300  # 5 minutes cache for search results
    SEARCH_SUGGESTIONS_LIMIT: int = 5  # Max autocomplete suggestions
    SEARCH_SUBTITLE_RESULT_LIMIT: int = 50  # Max subtitle search results
    SEARCH_DEFAULT_PAGE_SIZE: int = 20  # Default results per page
    SEARCH_MAX_PAGE_SIZE: int = 50  # Maximum results per page
    SEARCH_MIN_TEXT_SCORE: float = 5.0  # Minimum text relevance score to include in results
    SEARCH_TITLE_BOOST_THRESHOLD: float = 8.0  # Score threshold for title-quality matches
    SEARCH_HISTORY_MAX_ENTRIES: int = 20  # Max search history entries per user
    SEARCH_TRENDING_LIMIT: int = 10  # Default trending searches count
    SEARCH_TRENDING_DAYS: int = 7  # Days window for trending computation
    FEATURED_CACHE_TTL_SECONDS: int = 120
    AUDIOBOOK_LIST_CACHE_TTL_SECONDS: int = 120
    AUDIOBOOK_AUTHORS_CACHE_TTL_SECONDS: int = 300
    AUDIOBOOK_DETAIL_CACHE_TTL_SECONDS: int = 120
    AUDIOBOOK_CHAPTERS_CACHE_TTL_SECONDS: int = 120
    CHAT_TRANSLATION_ENABLED: bool = True
    CHAT_TRANSLATION_TIMEOUT_SECONDS: float = 2.0
    CHAT_TRANSLATION_CACHE_TTL_DAYS: int = 7
    TRANSLATION_MEMORY_CACHE_SIZE: int = 10000  # Increased for production load (was 1000)
    JEWISH_NEWS_CACHE_TTL_MINUTES: int = 15
    JEWISH_NEWS_SYNC_INTERVAL_MINUTES: int = 30
    JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS: float = 10.0
    HEBCAL_API_BASE_URL: str = "https://www.hebcal.com"
    SEFARIA_API_BASE_URL: str = "https://www.sefaria.org/api"
    JEWISH_CALENDAR_CACHE_TTL_HOURS: int = 6
    COMMUNITY_SEARCH_RADIUS_MILES: int = 25
    COMMUNITY_DEFAULT_REGION: str = "nyc"
    US_JEWISH_REGIONS: str = (
        "nyc,la,chicago,miami,boston,philadelphia,atlanta,dallas,denver,seattle"
    )
    COMMUNITY_SCRAPE_INTERVAL_HOURS: int = 168  # Weekly scrape
    YUTORAH_RSS_URL: str = "https://www.yutorah.org/rss/"
    CHABAD_MULTIMEDIA_RSS_URL: str = "https://www.chabad.org/multimedia/rss.xml"
    TORAHANYTIME_RSS_URL: str = "https://www.torahanytime.com/feed"
    PICOVOICE_ACCESS_KEY: str = ""
    SUPPORT_CHAT_MAX_TOKENS: int = 300
    SUPPORT_VOICE_MAX_TOKENS: int = 120
    SUPPORT_VOICE_TRANSCRIPT_MAX_LENGTH: int = 500
    SUPPORT_CONTEXT_MAX_DOCS: int = 3
    SUPPORT_ESCALATION_THRESHOLD: float = 0.5
    SUPPORT_TICKET_ADMIN_EMAILS: str = ""
    JERUSALEM_CONTENT_CACHE_TTL_MINUTES: int = 15
    JERUSALEM_CONTENT_REQUEST_TIMEOUT_SECONDS: float = 10.0
    JERUSALEM_CONTENT_MIN_RELEVANCE_SCORE: float = 0.3
    TEL_AVIV_CONTENT_CACHE_TTL_MINUTES: int = 15
    TEL_AVIV_CONTENT_REQUEST_TIMEOUT_SECONDS: float = 10.0
    TEL_AVIV_CONTENT_MIN_RELEVANCE_SCORE: float = 0.3
    JERUSALEM_DEFAULT_RADIUS_KM: float = 50.0
    TEL_AVIV_DEFAULT_RADIUS_KM: float = 20.0
    GEOLOCATION_KEYWORD_WEIGHT: float = 0.6
    GEOLOCATION_PROXIMITY_WEIGHT: float = 0.3
    GEOLOCATION_SOURCE_WEIGHT: float = 0.1
    GEOLOCATION_MIN_COMBINED_SCORE: float = 0.3
    GEOLOCATION_CITY_CACHE_TTL_DAYS: int = 30
    CULTURES_ENABLED: bool = True
    CULTURES_CACHE_TTL_MINUTES: int = 15
    CULTURES_REQUEST_TIMEOUT_SECONDS: float = 10.0
    CULTURES_MIN_RELEVANCE_SCORE: float = 0.3
    CULTURES_DEFAULT_LIMIT: int = 20
    CULTURES_MAX_LIMIT: int = 50
    CULTURES_DEFAULT_ID: str = "israeli"  # Backward compatibility default
    CULTURES_SUPPORTED: str = (
        "israeli,chinese,japanese,korean,indian"  # Comma-separated
    )
    YOUTUBE_API_KEY: str = ""
    TRAILER_STREAM_CACHE_TTL_HOURS: int = Field(
        default=4,
        description="Cache TTL in hours for resolved YouTube stream URLs",
    )
    YOUTUBE_VALIDATION_CONCURRENT_LIMIT: int = 5
    YOUTUBE_VALIDATION_TIMEOUT_SECONDS: float = 10.0
    YOUTUBE_CACHE_TTL_VALID_HOURS: int = 72
    YOUTUBE_CACHE_TTL_INVALID_HOURS: int = 12
    YOUTUBE_THUMBNAIL_MIN_SIZE_BYTES: int = 1000
    YOUTUBE_THUMBNAIL_TIMEOUT_SECONDS: float = 5.0
    KIDS_YOUTUBE_CHANNEL_IDS: str = ""
    KIDS_PODCAST_RSS_FEEDS: str = ""
    KIDS_ARCHIVE_ORG_ENABLED: bool = True
    KIDS_CONTENT_AGE_RATINGS: str = "3,5,7,10,12"
    KIDS_CONTENT_AUTO_APPROVE_THRESHOLD: float = 0.9
    KIDS_CONTENT_REQUIRE_MODERATION: bool = True
    KIDS_LIBRARIAN_AUDIT_CRON: str = "0 3 * * *"
    KIDS_LIBRARIAN_AUDIT_ENABLED: bool = True
    KIDS_CONTENT_CACHE_TTL_MINUTES: int = 15
    KIDS_CONTENT_MIN_RELEVANCE_SCORE: float = 0.3
    KIDS_CONTENT_SAFE_SEARCH_ENABLED: bool = True
    KIDS_CONTENT_DEFAULT_AGE_MAX: int = 12
