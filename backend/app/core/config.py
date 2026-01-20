from pydantic_settings import BaseSettings
from pydantic import field_validator
from functools import lru_cache
import json


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Bayit+ API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Security (REQUIRED - no defaults for sensitive fields)
    SECRET_KEY: str  # Required, minimum 32 characters
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"

    # MongoDB (REQUIRED - no defaults for connection strings)
    MONGODB_URL: str  # Required, must be set via environment
    MONGODB_DB_NAME: str = "bayit_plus"

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate SECRET_KEY is secure."""
        insecure_values = [
            "your-secret-key-change-in-production",
            "secret",
            "changeme",
            "password",
            "test",
            "dev",
            "development",
        ]
        if v.lower() in insecure_values or v.lower().startswith("your-"):
            raise ValueError(
                "SECRET_KEY must be a secure random value. "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        if len(v) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters (got {len(v)}). "
                "Generate one with: python -c \"import secrets; print(secrets.token_urlsafe(32))\""
            )
        return v

    @field_validator("MONGODB_URL")
    @classmethod
    def validate_mongodb_url(cls, v: str) -> str:
        """Validate MongoDB URL is not a placeholder."""
        if not v or v == "mongodb://localhost:27017":
            raise ValueError(
                "MONGODB_URL must be configured. Set it to your MongoDB Atlas or server URL."
            )
        return v

    # Stripe
    STRIPE_API_KEY: str = ""
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_BASIC: str = ""
    STRIPE_PRICE_PREMIUM: str = ""
    STRIPE_PRICE_FAMILY: str = ""

    # Anthropic (Claude)
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-sonnet-4-20250514"
    CLAUDE_MAX_TOKENS_SHORT: int = 200
    CLAUDE_MAX_TOKENS_LONG: int = 500

    # Google OAuth (optional - only required if using Google sign-in)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = ""  # Required if using Google OAuth, no localhost defaults

    # ElevenLabs (speech-to-text and text-to-speech)
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_WEBHOOK_SECRET: str = ""
    ELEVENLABS_DEFAULT_VOICE_ID: str = "EXAVITQu4vr4xnSDxMaL"  # Rachel - multilingual female voice for general TTS
    # Olorin Support Avatar - custom cloned voice for support wizard
    ELEVENLABS_SUPPORT_VOICE_ID: str = "iwNTMolqpkQ3cGUnKlX8"  # Olorin - custom cloned voice

    # OpenAI (Whisper speech-to-text)
    OPENAI_API_KEY: str = ""

    # Speech-to-Text Provider Selection
    # Options: "google" (Google Cloud), "whisper" (OpenAI Whisper), or "elevenlabs" (ElevenLabs Scribe v2)
    # ElevenLabs offers lowest latency (~150ms) with excellent Hebrew support
    SPEECH_TO_TEXT_PROVIDER: str = "google"

    # Live Translation Provider Selection (for translating transcribed text)
    # Options: "google" (Google Cloud Translate), "openai" (GPT-4o-mini), or "claude" (Claude)
    LIVE_TRANSLATION_PROVIDER: str = "google"

    # CORS (REQUIRED - supports JSON string from Secret Manager or comma-separated list)
    # Example: '["https://bayit.tv","https://api.bayit.tv"]' or "https://bayit.tv,https://api.bayit.tv"
    BACKEND_CORS_ORIGINS: list[str] | str = ""  # Required, no hardcoded defaults

    @property
    def parsed_cors_origins(self) -> list[str]:
        """Parse CORS origins from string or list."""
        if not self.BACKEND_CORS_ORIGINS:
            # Return minimal defaults only for local development
            import os
            if os.getenv("DEBUG", "").lower() == "true":
                return ["http://localhost:3000", "http://localhost:8000"]
            raise ValueError(
                "BACKEND_CORS_ORIGINS must be configured in production. "
                "Set it as JSON array or comma-separated URLs."
            )
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            # JSON string from Secret Manager
            try:
                return json.loads(self.BACKEND_CORS_ORIGINS)
            except json.JSONDecodeError:
                # Comma-separated fallback
                return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]
        return self.BACKEND_CORS_ORIGINS

    # DRM (optional)
    DRM_LICENSE_URL: str = ""
    DRM_API_KEY: str = ""

    # Storage (local, S3, or GCS)
    STORAGE_TYPE: str = "gcs"  # "local", "s3", or "gcs"
    UPLOAD_DIR: str = "/tmp/bayit-uploads"

    # AWS S3 (optional, only needed if STORAGE_TYPE is "s3")
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_S3_REGION: str = "us-east-1"

    # Google Cloud Storage (optional, only needed if STORAGE_TYPE is "gcs")
    GCS_BUCKET_NAME: str = ""
    GCS_PROJECT_ID: str = ""  # Optional, auto-detected from Cloud Run
    GOOGLE_APPLICATION_CREDENTIALS: str = ""  # Path to service account key JSON file for local development

    # GCS Upload Configuration (for large file uploads)
    GCS_UPLOAD_TIMEOUT_SECONDS: int = 600  # 10 minutes timeout per chunk
    GCS_UPLOAD_CHUNK_SIZE_MB: int = 8  # 8MB chunks for resumable uploads
    GCS_UPLOAD_MAX_RETRIES: int = 5  # Maximum retry attempts for transient failures
    GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS: float = 1.0  # Initial delay for exponential backoff
    GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS: float = 60.0  # Maximum delay between retries

    # CDN (optional, works with both S3 CloudFront and GCS Cloud CDN)
    CDN_BASE_URL: str = ""

    # Upload Monitoring Configuration
    UPLOAD_MONITOR_ENABLED: bool = False  # Disabled auto-scan to prevent server overload
    UPLOAD_MONITOR_INTERVAL: int = 3600  # Seconds between scans (default: 1 hour)
    UPLOAD_DEFAULT_FOLDERS: str = ""  # Comma-separated paths to monitor on startup

    # Upload Session Cleanup Configuration
    UPLOAD_SESSION_MAX_AGE_HOURS: int = 24  # Maximum age for orphaned upload sessions
    UPLOAD_SESSION_CLEANUP_INTERVAL_SECONDS: int = 3600  # Cleanup task interval (1 hour)
    UPLOAD_SESSION_TIMEOUT_HOURS: int = 2  # Timeout for inactive upload sessions

    # Frontend URL (for password reset links, email verification, etc.)
    # REQUIRED for email functionality - no production defaults
    FRONTEND_URL: str = ""

    # Email Service (for Librarian AI Agent notifications)
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@bayitplus.com"
    ADMIN_EMAIL_ADDRESSES: str = ""  # Comma-separated list of admin emails

    # TMDB (The Movie Database) API
    TMDB_API_KEY: str = ""
    TMDB_API_TOKEN: str = ""  # Bearer token for TMDB API v4

    # OpenSubtitles Configuration
    OPENSUBTITLES_API_KEY: str = ""
    OPENSUBTITLES_USERNAME: str = ""  # Required for downloads
    OPENSUBTITLES_PASSWORD: str = ""  # Required for downloads
    OPENSUBTITLES_API_BASE_URL: str = "https://api.opensubtitles.com/api/v1"
    OPENSUBTITLES_USER_AGENT: str = "Bayit+ v1.0"
    OPENSUBTITLES_DOWNLOAD_LIMIT_PER_DAY: int = 1500
    OPENSUBTITLES_RATE_LIMIT_REQUESTS: int = 40
    OPENSUBTITLES_RATE_LIMIT_WINDOW_SECONDS: int = 10

    # Subtitle Caching Configuration
    SUBTITLE_SEARCH_CACHE_TTL_DAYS: int = 7
    SUBTITLE_NOT_FOUND_CACHE_TTL_DAYS: int = 30
    SUBTITLE_BATCH_SIZE: int = 20

    # Twilio SMS Verification
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # Verification Settings
    EMAIL_VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PHONE_VERIFICATION_CODE_EXPIRE_MINUTES: int = 10
    MAX_VERIFICATION_ATTEMPTS_PER_HOUR: int = 3

    # Frontend URLs (for verification links)
    # REQUIRED for verification functionality - no production defaults
    FRONTEND_WEB_URL: str = ""
    FRONTEND_MOBILE_URL: str = "bayitplus://"  # Mobile deep link scheme (app-specific)

    # Google Cloud Project
    GCP_PROJECT_ID: str

    # Apple Sign In / Push Notifications
    APPLE_KEY_ID: str = ""
    APPLE_TEAM_ID: str = ""
    APPLE_KEY_PATH: str = ""
    APPLE_BUNDLE_ID_IOS: str = ""
    APPLE_BUNDLE_ID_TVOS: str = ""

    # Librarian Agent Configuration
    # Daily Audit Schedule
    LIBRARIAN_DAILY_AUDIT_CRON: str
    LIBRARIAN_DAILY_AUDIT_TIME: str
    LIBRARIAN_DAILY_AUDIT_MODE: str
    LIBRARIAN_DAILY_AUDIT_COST: str
    LIBRARIAN_DAILY_AUDIT_STATUS: str
    LIBRARIAN_DAILY_AUDIT_DESCRIPTION: str

    # Weekly AI Audit Schedule
    LIBRARIAN_WEEKLY_AUDIT_CRON: str
    LIBRARIAN_WEEKLY_AUDIT_TIME: str
    LIBRARIAN_WEEKLY_AUDIT_MODE: str
    LIBRARIAN_WEEKLY_AUDIT_COST: str
    LIBRARIAN_WEEKLY_AUDIT_STATUS: str
    LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION: str

    # Librarian Audit Limits
    LIBRARIAN_MAX_ITERATIONS: int
    LIBRARIAN_DEFAULT_BUDGET_USD: float
    LIBRARIAN_MIN_BUDGET_USD: float
    LIBRARIAN_MAX_BUDGET_USD: float
    LIBRARIAN_BUDGET_STEP_USD: float

    # Librarian Pagination
    LIBRARIAN_REPORTS_LIMIT: int
    LIBRARIAN_ACTIONS_LIMIT: int
    LIBRARIAN_ACTIVITY_PAGE_SIZE: int

    # Librarian UI
    LIBRARIAN_ID_TRUNCATE_LENGTH: int
    LIBRARIAN_MODAL_MAX_HEIGHT: int

    # EPG Configuration
    EPG_DEFAULT_TIME_WINDOW_HOURS: int = 6
    EPG_PAST_HOURS: int = 2
    EPG_FUTURE_HOURS: int = 4
    EPG_CACHE_TTL_SECONDS: int = 300
    EPG_INGESTION_INTERVAL_HOURS: int = 6

    # Catch-Up TV
    CATCHUP_RETENTION_DAYS: int = 7
    CATCHUP_MAX_DURATION_HOURS: int = 4

    # LLM Search
    LLM_SEARCH_MAX_RESULTS: int = 50
    LLM_SEARCH_TIMEOUT_SECONDS: int = 30

    # Search Configuration
    SEARCH_CACHE_TTL_SECONDS: int = 300  # 5 minutes cache for search results
    SEARCH_SUGGESTIONS_LIMIT: int = 5  # Max autocomplete suggestions
    SEARCH_SUBTITLE_RESULT_LIMIT: int = 50  # Max subtitle search results
    SEARCH_DEFAULT_PAGE_SIZE: int = 20  # Default results per page
    SEARCH_MAX_PAGE_SIZE: int = 50  # Maximum results per page

    # Chat Translation Configuration
    CHAT_TRANSLATION_ENABLED: bool = True
    CHAT_TRANSLATION_TIMEOUT_SECONDS: float = 2.0
    CHAT_TRANSLATION_CACHE_TTL_DAYS: int = 7
    TRANSLATION_MEMORY_CACHE_SIZE: int = 1000

    # Jewish News Aggregation Configuration
    JEWISH_NEWS_CACHE_TTL_MINUTES: int = 15
    JEWISH_NEWS_SYNC_INTERVAL_MINUTES: int = 30
    JEWISH_NEWS_REQUEST_TIMEOUT_SECONDS: float = 10.0

    # Jewish Calendar Integration (HebCal & Sefaria APIs)
    HEBCAL_API_BASE_URL: str = "https://www.hebcal.com"
    SEFARIA_API_BASE_URL: str = "https://www.sefaria.org/api"
    JEWISH_CALENDAR_CACHE_TTL_HOURS: int = 6

    # Jewish Community Directory Configuration
    COMMUNITY_SEARCH_RADIUS_MILES: int = 25
    COMMUNITY_DEFAULT_REGION: str = "nyc"
    US_JEWISH_REGIONS: str = "nyc,la,chicago,miami,boston,philadelphia,atlanta,dallas,denver,seattle"
    COMMUNITY_SCRAPE_INTERVAL_HOURS: int = 168  # Weekly scrape

    # Torah Content RSS Configuration
    YUTORAH_RSS_URL: str = "https://www.yutorah.org/rss/"
    CHABAD_MULTIMEDIA_RSS_URL: str = "https://www.chabad.org/multimedia/rss.xml"
    TORAHANYTIME_RSS_URL: str = "https://www.torahanytime.com/feed"

    # Picovoice Porcupine (Wake Word Detection)
    # Access key from https://console.picovoice.ai/
    PICOVOICE_ACCESS_KEY: str = ""

    # Support System Configuration
    SUPPORT_CHAT_MAX_TOKENS: int = 300
    SUPPORT_CONTEXT_MAX_DOCS: int = 3
    SUPPORT_ESCALATION_THRESHOLD: float = 0.5
    SUPPORT_TICKET_ADMIN_EMAILS: str = ""

    # Jerusalem Content Configuration
    JERUSALEM_CONTENT_CACHE_TTL_MINUTES: int = 15
    JERUSALEM_CONTENT_REQUEST_TIMEOUT_SECONDS: float = 10.0
    JERUSALEM_CONTENT_MIN_RELEVANCE_SCORE: float = 0.3

    # Tel Aviv Content Configuration
    TEL_AVIV_CONTENT_CACHE_TTL_MINUTES: int = 15
    TEL_AVIV_CONTENT_REQUEST_TIMEOUT_SECONDS: float = 10.0
    TEL_AVIV_CONTENT_MIN_RELEVANCE_SCORE: float = 0.3

    # Global Cultures Configuration
    CULTURES_ENABLED: bool = True
    CULTURES_CACHE_TTL_MINUTES: int = 15
    CULTURES_REQUEST_TIMEOUT_SECONDS: float = 10.0
    CULTURES_MIN_RELEVANCE_SCORE: float = 0.3
    CULTURES_DEFAULT_LIMIT: int = 20
    CULTURES_MAX_LIMIT: int = 50
    CULTURES_DEFAULT_ID: str = "israeli"  # Backward compatibility default
    CULTURES_SUPPORTED: str = "israeli,chinese,japanese,korean,indian"  # Comma-separated

    # Kids Content Configuration
    # YouTube Data API v3 key for importing kids channel content
    YOUTUBE_API_KEY: str = ""

    # YouTube Validation Configuration
    # Concurrent limit for batch validation (lower to avoid rate limiting)
    YOUTUBE_VALIDATION_CONCURRENT_LIMIT: int = 5
    # Timeout in seconds for individual video validation requests
    YOUTUBE_VALIDATION_TIMEOUT_SECONDS: float = 10.0
    # Cache TTL in hours for valid YouTube videos
    YOUTUBE_CACHE_TTL_VALID_HOURS: int = 72
    # Cache TTL in hours for invalid YouTube videos (recheck sooner)
    YOUTUBE_CACHE_TTL_INVALID_HOURS: int = 12
    # Minimum thumbnail file size in bytes to consider valid (avoid placeholder images)
    YOUTUBE_THUMBNAIL_MIN_SIZE_BYTES: int = 1000
    # Timeout in seconds for thumbnail fetch requests
    YOUTUBE_THUMBNAIL_TIMEOUT_SECONDS: float = 5.0

    # JSON list of YouTube channel IDs to sync for kids content
    # e.g., '["UCxxxxxxx", "UCyyyyyyy"]'
    KIDS_YOUTUBE_CHANNEL_IDS: str = ""

    # JSON list of kids podcast RSS feed URLs
    # e.g., '["https://rss.example.com/kids1", "https://rss.example.com/kids2"]'
    KIDS_PODCAST_RSS_FEEDS: str = ""

    # Enable Archive.org public domain kids content import
    KIDS_ARCHIVE_ORG_ENABLED: bool = True

    # Comma-separated age ratings for kids content (used for filtering)
    KIDS_CONTENT_AGE_RATINGS: str = "3,5,7,10,12"

    # Kids content moderation settings
    KIDS_CONTENT_AUTO_APPROVE_THRESHOLD: float = 0.9
    KIDS_CONTENT_REQUIRE_MODERATION: bool = True

    # Kids librarian audit schedule (runs after main daily audit)
    KIDS_LIBRARIAN_AUDIT_CRON: str = "0 3 * * *"
    KIDS_LIBRARIAN_AUDIT_ENABLED: bool = True

    # Kids Content Runtime Service Configuration
    KIDS_CONTENT_CACHE_TTL_MINUTES: int = 15
    KIDS_CONTENT_MIN_RELEVANCE_SCORE: float = 0.3
    KIDS_CONTENT_SAFE_SEARCH_ENABLED: bool = True
    KIDS_CONTENT_DEFAULT_AGE_MAX: int = 12

    # Kids Educational Sites Configuration (JSON mapping subcategory -> URLs)
    # Example: '{"learning-hebrew": ["https://site1.com", "https://site2.com"]}'
    KIDS_EDUCATIONAL_SITES_CONFIG: str = ""

    # Youngsters Content Configuration (ages 12-17)
    # YouTube Data API v3 key (shared with kids content)
    # JSON list of YouTube channel IDs to sync for youngsters content
    # e.g., '["UCxxxxxxx", "UCyyyyyyy"]' (Kan Noar, teen educational channels, etc.)
    YOUNGSTERS_YOUTUBE_CHANNEL_IDS: str = ""

    # JSON list of youngsters podcast RSS feed URLs
    # e.g., '["https://rss.example.com/youngsters1", "https://rss.example.com/youngsters2"]'
    YOUNGSTERS_PODCAST_RSS_FEEDS: str = ""

    # Enable Archive.org public domain youngsters content import
    YOUNGSTERS_ARCHIVE_ORG_ENABLED: bool = True

    # Comma-separated age ratings for youngsters content (used for filtering)
    YOUNGSTERS_CONTENT_AGE_RATINGS: str = "12,13,14,15,16,17"

    # Allowed content ratings for youngsters (PG-13 and below)
    YOUNGSTERS_CONTENT_ALLOWED_RATINGS: str = "G,PG,PG-13,TV-G,TV-PG,TV-14"

    # Youngsters content moderation settings
    YOUNGSTERS_CONTENT_AUTO_APPROVE_THRESHOLD: float = 0.9
    YOUNGSTERS_CONTENT_REQUIRE_MODERATION: bool = True

    # Youngsters librarian audit schedule (runs after kids audit)
    YOUNGSTERS_LIBRARIAN_AUDIT_CRON: str = "0 4 * * *"
    YOUNGSTERS_LIBRARIAN_AUDIT_ENABLED: bool = True

    # Youngsters Content Runtime Service Configuration
    YOUNGSTERS_CONTENT_CACHE_TTL_MINUTES: int = 15
    YOUNGSTERS_CONTENT_MIN_RELEVANCE_SCORE: float = 0.3
    YOUNGSTERS_CONTENT_SAFE_SEARCH_ENABLED: bool = True
    YOUNGSTERS_CONTENT_DEFAULT_AGE_MAX: int = 17

    # Series Linker Configuration
    # Minimum similarity ratio (0-1) for matching episode titles to series names
    SERIES_LINKER_TITLE_SIMILARITY_THRESHOLD: float = 0.85
    # Minimum confidence (0-1) required for auto-linking episodes to series
    SERIES_LINKER_AUTO_LINK_CONFIDENCE_THRESHOLD: float = 0.90
    # Maximum number of episodes to process in one auto-link batch
    SERIES_LINKER_AUTO_LINK_BATCH_SIZE: int = 50
    # Strategy for resolving duplicate episodes: keep_highest_quality, keep_oldest, keep_newest, keep_most_complete
    SERIES_LINKER_DUPLICATE_RESOLUTION_STRATEGY: str = "keep_highest_quality"
    # Whether to create new series from TMDB when no local match is found
    SERIES_LINKER_CREATE_MISSING_SERIES: bool = True

    # Sentry Configuration (Error Tracking & Monitoring)
    SENTRY_DSN: str = ""  # Optional, empty = disabled
    SENTRY_ENVIRONMENT: str = "development"
    SENTRY_RELEASE: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.2

    # Logging Configuration
    LOG_LEVEL: str = "INFO"
    CORRELATION_ID_HEADER: str = "X-Correlation-ID"
    REQUEST_TIMEOUT_WARNING_MS: int = 5000

    # WebAuthn (Passkey) Configuration
    # Relying Party ID - must match the domain where passkeys are created
    # For production, this should be the main domain (e.g., "bayit.tv")
    WEBAUTHN_RP_ID: str
    # Relying Party Name - displayed to users during passkey creation
    WEBAUTHN_RP_NAME: str
    # Expected origin(s) - comma-separated list of allowed origins
    # Example: "https://bayit.tv,https://www.bayit.tv"
    WEBAUTHN_ORIGIN: str
    # Session duration for passkey-authenticated sessions (default 7 days)
    PASSKEY_SESSION_DURATION_DAYS: int = 7
    # Challenge expiration time in seconds (default 5 minutes)
    PASSKEY_CHALLENGE_EXPIRY_SECONDS: int = 300
    # Maximum number of passkeys per user
    PASSKEY_MAX_CREDENTIALS_PER_USER: int = 10

    # ============================================
    # OLORIN.AI PLATFORM CONFIGURATION
    # ============================================

    # Pinecone Vector Database (Phase 3)
    PINECONE_API_KEY: str = ""
    PINECONE_ENVIRONMENT: str = "us-east-1-aws"
    PINECONE_INDEX_NAME: str = "olorin-content"

    # Embeddings
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSIONS: int = 1536

    # Realtime Dubbing (Phase 1)
    DUBBING_MAX_CONCURRENT_SESSIONS: int = 100
    DUBBING_SESSION_TIMEOUT_MINUTES: int = 120
    DUBBING_TARGET_LATENCY_MS: int = 2000

    # ElevenLabs Voice IDs for Dubbing (JSON array of voice configs)
    # Format: '[{"id":"voice_id","name":"Name","lang":"multilingual","desc":"Description"}]'
    ELEVENLABS_DUBBING_VOICES: str = '[{"id":"21m00Tcm4TlvDq8ikWAM","name":"Adam","lang":"multilingual","desc":"Deep male voice"},{"id":"AZnzlk1XvdvUeBnXmlld","name":"Domi","lang":"multilingual","desc":"Youthful female voice"},{"id":"MF3mGyEYCl7XYWbV9V6O","name":"Elli","lang":"multilingual","desc":"Warm female voice"},{"id":"TxGEqnHWrfWFTfGW9XjX","name":"Josh","lang":"multilingual","desc":"Conversational male voice"}]'

    # Recap Agent (Phase 5)
    RECAP_MAX_CONTEXT_TOKENS: int = 8000
    RECAP_WINDOW_DEFAULT_MINUTES: int = 15
    RECAP_SUMMARY_MAX_TOKENS: int = 300

    # Cultural Context (Phase 4)
    CULTURAL_REFERENCE_CACHE_TTL_HOURS: int = 24
    CULTURAL_DETECTION_MIN_CONFIDENCE: float = 0.7

    # Partner API (Phase 2)
    PARTNER_API_KEY_SALT: str = ""  # Required for API key hashing
    PARTNER_DEFAULT_RATE_LIMIT_RPM: int = 60
    PARTNER_WEBHOOK_TIMEOUT_SECONDS: float = 10.0

    # Feature Flags (all disabled by default for gradual rollout)
    OLORIN_DUBBING_ENABLED: bool = False
    OLORIN_SEMANTIC_SEARCH_ENABLED: bool = False
    OLORIN_CULTURAL_CONTEXT_ENABLED: bool = False
    OLORIN_RECAP_ENABLED: bool = False

    @property
    def webauthn_origins(self) -> list[str]:
        """Parse WebAuthn origins from comma-separated string."""
        return [origin.strip() for origin in self.WEBAUTHN_ORIGIN.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
