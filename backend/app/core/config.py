from pydantic_settings import BaseSettings
from functools import lru_cache
import json


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Bayit+ API"
    DEBUG: bool = False
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"

    # MongoDB
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "bayit_plus"

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

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/google/callback"

    # ElevenLabs (speech-to-text and text-to-speech)
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_WEBHOOK_SECRET: str = ""
    ELEVENLABS_DEFAULT_VOICE_ID: str = "EXAVITQu4vr4xnSDxMaL"  # Rachel - multilingual voice, excellent for Hebrew

    # OpenAI (Whisper speech-to-text)
    OPENAI_API_KEY: str = ""

    # Speech-to-Text Provider Selection
    # Options: "google" (Google Cloud), "whisper" (OpenAI Whisper), or "elevenlabs" (ElevenLabs Scribe v2)
    # ElevenLabs offers lowest latency (~150ms) with excellent Hebrew support
    SPEECH_TO_TEXT_PROVIDER: str = "google"

    # Live Translation Provider Selection (for translating transcribed text)
    # Options: "google" (Google Cloud Translate), "openai" (GPT-4o-mini), or "claude" (Claude)
    LIVE_TRANSLATION_PROVIDER: str = "google"

    # CORS (supports JSON string from Secret Manager or list)
    BACKEND_CORS_ORIGINS: list[str] | str = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://bayit.tv",
        "https://www.bayit.tv",
        "https://bayit-plus.web.app",
        "https://api.bayit.tv",
    ]

    @property
    def parsed_cors_origins(self) -> list[str]:
        """Parse CORS origins from string or list"""
        if isinstance(self.BACKEND_CORS_ORIGINS, str):
            # JSON string from Secret Manager
            try:
                return json.loads(self.BACKEND_CORS_ORIGINS)
            except json.JSONDecodeError:
                # Comma-separated fallback
                return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]
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
    FRONTEND_WEB_URL: str = "https://bayit.tv"
    FRONTEND_MOBILE_URL: str = "bayitplus://"

    # Google Cloud Project
    GCP_PROJECT_ID: str

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

    # Kids Content Configuration
    # YouTube Data API v3 key for importing kids channel content
    YOUTUBE_API_KEY: str = ""

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

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
