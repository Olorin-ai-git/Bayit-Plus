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
    # Options: "google" (Google Cloud Speech-to-Text) or "whisper" (OpenAI Whisper)
    SPEECH_TO_TEXT_PROVIDER: str = "google"

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
    STORAGE_TYPE: str = "local"  # "local", "s3", or "gcs"
    UPLOAD_DIR: str = "uploads"

    # AWS S3 (optional, only needed if STORAGE_TYPE is "s3")
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_S3_BUCKET: str = ""
    AWS_S3_REGION: str = "us-east-1"

    # Google Cloud Storage (optional, only needed if STORAGE_TYPE is "gcs")
    GCS_BUCKET_NAME: str = ""
    GCS_PROJECT_ID: str = ""  # Optional, auto-detected from Cloud Run

    # CDN (optional, works with both S3 CloudFront and GCS Cloud CDN)
    CDN_BASE_URL: str = ""

    # Email Service (for Librarian AI Agent notifications)
    SENDGRID_API_KEY: str = ""
    SENDGRID_FROM_EMAIL: str = "noreply@bayitplus.com"
    ADMIN_EMAIL_ADDRESSES: str = ""  # Comma-separated list of admin emails

    # TMDB (The Movie Database) API
    TMDB_API_KEY: str = ""
    TMDB_API_TOKEN: str = ""  # Bearer token for TMDB API v4

    # OpenSubtitles Configuration
    OPENSUBTITLES_API_KEY: str = ""
    OPENSUBTITLES_API_BASE_URL: str = "https://api.opensubtitles.com/api/v1"
    OPENSUBTITLES_USER_AGENT: str = "Bayit+ v1.0"
    OPENSUBTITLES_DOWNLOAD_LIMIT_PER_DAY: int = 20
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

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
