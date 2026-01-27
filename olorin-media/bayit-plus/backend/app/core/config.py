import json
import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings

from app.core.olorin_config import OlorinSettings

# Load environment files in proper hierarchy
# 1. Base platform config (olorin-infra/.env) - lowest priority
# 2. Backend-specific config (backend/.env) - overrides base platform
# Path structure: backend/app/core/config.py -> backend/ -> bayit-plus/ -> olorin-media/ -> olorin/ -> olorin-infra/
try:
    base_platform_env = Path(__file__).resolve().parents[5] / "olorin-infra" / ".env"
    if base_platform_env.exists():
        load_dotenv(base_platform_env, override=False)  # Load base platform config first
except (IndexError, OSError):
    # In containerized environments, the monorepo structure doesn't exist
    # All configuration should come from environment variables
    pass

try:
    backend_env = Path(__file__).resolve().parents[2] / ".env"
    if backend_env.exists():
        load_dotenv(backend_env, override=True)  # Backend config overrides base platform
except (IndexError, OSError):
    # In containerized environments, no local .env file
    # All configuration must come from environment variables
    pass


class Settings(BaseSettings):
    # App
    APP_NAME: str = "Bayit+ API"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"  # Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL
    API_V1_PREFIX: str = "/api/v1"

    # Security (REQUIRED - no defaults for sensitive fields)
    SECRET_KEY: str  # Required, minimum 32 characters
    SECRET_KEY_OLD: str = (
        ""  # Old secret for zero-downtime JWT rotation (remove after 7 days)
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7  # 7 days for refresh tokens
    ALGORITHM: str = "HS256"
    CSRF_ENABLED: bool = False  # CSRF protection disabled by default

    # MongoDB (REQUIRED - no defaults for connection strings)
    MONGODB_URI: str  # Required, must be set via environment
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
                'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )
        if len(v) < 32:
            raise ValueError(
                f"SECRET_KEY must be at least 32 characters (got {len(v)}). "
                'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )
        return v

    @field_validator("MONGODB_URI")
    @classmethod
    def validate_mongodb_uri(cls, v: str) -> str:
        """Validate MongoDB URI is not a placeholder.

        Allows localhost in CI/test environments (when DEBUG=true, CI=true, or ENVIRONMENT=test).
        """
        if not v:
            raise ValueError(
                "MONGODB_URI must be configured. Set it to your MongoDB Atlas or server URL."
            )
        # Allow localhost in CI/test environments
        is_test_env = (
            os.getenv("DEBUG", "").lower() == "true"
            or os.getenv("CI", "").lower() == "true"
            or os.getenv("ENVIRONMENT", "").lower() in ("test", "testing", "ci")
        )
        if v == "mongodb://localhost:27017" and not is_test_env:
            raise ValueError(
                "MONGODB_URI must be configured. Set it to your MongoDB Atlas or server URL."
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
    CLAUDE_MODEL: str = "claude-haiku-4-5-20251001"
    CLAUDE_MAX_TOKENS_SHORT: int = 200
    CLAUDE_MAX_TOKENS_LONG: int = 500

    # NLP Features (opt-in, requires ANTHROPIC_API_KEY)
    NLP_ENABLED: bool = Field(
        default=False,
        validation_alias=AliasChoices('OLORIN_NLP_ENABLED', 'NLP_ENABLED')
    )
    NLP_CONFIDENCE_THRESHOLD: float = Field(
        default=0.7,
        validation_alias=AliasChoices('OLORIN_NLP_CONFIDENCE_THRESHOLD', 'NLP_CONFIDENCE_THRESHOLD')
    )
    NLP_MAX_COST_PER_QUERY: float = Field(
        default=0.10,
        validation_alias=AliasChoices('OLORIN_NLP_MAX_COST_PER_QUERY', 'NLP_MAX_COST_PER_QUERY')
    )

    # Agent Execution (for multi-step workflows)
    AGENT_MAX_ITERATIONS: int = Field(default=20)
    AGENT_BUDGET_LIMIT_USD: float = Field(default=0.50)

    # NLP Session Management
    NLP_SESSION_TTL_MINUTES: int = Field(
        default=30,
        description="Session expiry time in minutes",
    )
    NLP_SESSION_MAX_HISTORY: int = Field(
        default=50,
        description="Maximum messages to retain in session history",
    )
    NLP_SESSION_CLEANUP_INTERVAL_MINUTES: int = Field(
        default=5,
        description="Interval for cleaning up expired sessions",
    )

    # NLP Ecosystem Context
    NLP_ECOSYSTEM_CONTEXT_CACHE_TTL_SECONDS: int = Field(
        default=30,
        description="Cache TTL for ecosystem context",
    )
    NLP_GIT_CONTEXT_CACHE_TTL_SECONDS: int = Field(
        default=300,
        description="Cache TTL for git context (5 minutes)",
    )
    NLP_GIT_CONTEXT_MAX_COMMITS: int = Field(
        default=10,
        description="Maximum recent commits to include in context",
    )

    # NLP Action Execution
    NLP_DEFAULT_ACTION_MODE: str = Field(
        default="smart",
        description="Default action mode: smart or confirm_all",
    )
    NLP_ACTION_TOKEN_TTL_SECONDS: int = Field(
        default=300,
        description="TTL for pending action tokens (5 minutes)",
    )

    # NLP Rate Limiting
    NLP_RATE_LIMIT_REQUESTS_PER_MINUTE: int = Field(
        default=30,
        description="Max NLP requests per minute per user",
    )
    NLP_RATE_LIMIT_COST_PER_HOUR_USD: float = Field(
        default=5.00,
        description="Max API cost per hour per user",
    )

    # Voice Commands (opt-in)
    VOICE_COMMANDS_ENABLED: bool = Field(default=False)
    VOICE_RESPONSE_ENABLED: bool = Field(default=True)
    TTS_VOICE_ID: str = Field(
        default="21m00Tcm4TlvDq8ikWAM"
    )  # Default ElevenLabs voice for CLI responses

    # Semantic Search (opt-in)
    SEMANTIC_SEARCH_ENABLED: bool = Field(default=False)
    SEMANTIC_SEARCH_RERANK: bool = Field(default=True)

    # Google OAuth (optional - only required if using Google sign-in)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = (
        ""  # Required if using Google OAuth, no localhost defaults
    )

    # Audible OAuth Integration (optional - enables audiobook syncing for premium users)
    # Obtain credentials from https://developer.audible.com/
    # Leave empty to disable the feature gracefully
    AUDIBLE_CLIENT_ID: str = Field(
        default="",
        description="Audible OAuth Client ID (from developer.audible.com)"
    )
    AUDIBLE_CLIENT_SECRET: str = Field(
        default="",
        description="Audible OAuth Client Secret (from developer.audible.com)"
    )
    AUDIBLE_REDIRECT_URI: str = Field(
        default="",
        description="Audible OAuth Redirect URI (e.g., https://yourdomain.com/api/v1/user/audible/oauth/callback)"
    )
    AUDIBLE_INTEGRATION_ENABLED: bool = Field(
        default=False,
        description="Enable Audible integration (requires all three credentials to be set)"
    )

    @property
    def is_audible_configured(self) -> bool:
        """Check if all Audible OAuth credentials are present."""
        return bool(
            self.AUDIBLE_CLIENT_ID
            and self.AUDIBLE_CLIENT_SECRET
            and self.AUDIBLE_REDIRECT_URI
        )

    # ElevenLabs (speech-to-text and text-to-speech)
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_WEBHOOK_SECRET: str = ""
    ELEVENLABS_DEFAULT_VOICE_ID: str = (
        "EXAVITQu4vr4xnSDxMaL"  # Rachel - multilingual female voice for general TTS
    )
    # Olorin Assistant Avatar - custom cloned voice for AI assistant interactions
    ELEVENLABS_ASSISTANT_VOICE_ID: str = (
        "ashjVK50jp28G73AUTnb"  # Olorin - custom cloned voice
    )
    # Olorin Support Avatar - custom cloned voice for support wizard (uses same voice as assistant)
    ELEVENLABS_SUPPORT_VOICE_ID: str = (
        "ashjVK50jp28G73AUTnb"  # Olorin - custom cloned voice
    )

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
                return [
                    "http://localhost:3200",
                    "http://localhost:3211",
                    "http://localhost:8000",
                    "http://localhost:8001",
                ]
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
                return [
                    origin.strip()
                    for origin in self.BACKEND_CORS_ORIGINS.split(",")
                    if origin.strip()
                ]
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
    GOOGLE_APPLICATION_CREDENTIALS: str = (
        ""  # Path to service account key JSON file for local development
    )

    # GCS Upload Configuration (for large file uploads)
    GCS_UPLOAD_TIMEOUT_SECONDS: int = 600  # 10 minutes timeout per chunk
    GCS_UPLOAD_CHUNK_SIZE_MB: int = 8  # 8MB chunks for resumable uploads
    GCS_UPLOAD_MAX_RETRIES: int = 5  # Maximum retry attempts for transient failures
    GCS_UPLOAD_RETRY_INITIAL_DELAY_SECONDS: float = (
        1.0  # Initial delay for exponential backoff
    )
    GCS_UPLOAD_RETRY_MAX_DELAY_SECONDS: float = 60.0  # Maximum delay between retries

    # HLS Conversion Configuration
    HLS_CONVERSION_ENABLED: bool = True  # Enable automatic HLS conversion for uploads
    HLS_SEGMENT_DURATION: int = 10  # Duration of each HLS segment in seconds
    HLS_CONVERSION_TIMEOUT: int = 7200  # Max time for conversion (2 hours)
    HLS_TEMP_DIR: str = "/tmp/hls-conversion"  # Temp directory for HLS processing

    # CDN (optional, works with both S3 CloudFront and GCS Cloud CDN)
    CDN_BASE_URL: str = ""

    # Upload Monitoring Configuration
    UPLOAD_MONITOR_ENABLED: bool = (
        False  # Disabled by default - enable via environment variable if needed
    )
    UPLOAD_MONITOR_INTERVAL: int = 3600  # Seconds between scans (default: 1 hour)
    UPLOAD_DEFAULT_FOLDERS: str = ""  # Comma-separated paths to monitor on startup

    # Upload Session Cleanup Configuration
    UPLOAD_SESSION_MAX_AGE_HOURS: int = 24  # Maximum age for orphaned upload sessions
    UPLOAD_SESSION_CLEANUP_INTERVAL_SECONDS: int = (
        3600  # Cleanup task interval (1 hour)
    )
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

    # Librarian Audit Recovery
    AUDIT_STUCK_TIMEOUT_MINUTES: int = 30  # Audit considered stuck after 30 minutes
    AUDIT_NO_ACTIVITY_TIMEOUT_MINUTES: int = (
        15  # No activity for 15 minutes is suspicious
    )
    AUDIT_HEALTH_CHECK_INTERVAL_SECONDS: int = 300  # Check every 5 minutes

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

    # Podcast Translation Configuration
    PODCAST_TRANSLATION_ENABLED: bool = Field(
        default=False, description="Enable automatic podcast translation"
    )
    PODCAST_TRANSLATION_POLL_INTERVAL: int = Field(
        default=300,
        description="Interval in seconds to check for untranslated episodes",
    )
    PODCAST_TRANSLATION_MAX_CONCURRENT: int = Field(
        default=2, description="Maximum number of concurrent translation workers"
    )
    TEMP_AUDIO_DIR: str = Field(
        default="/tmp/podcast_audio",
        description="Temporary directory for audio processing",
    )
    PODCAST_DEFAULT_ORIGINAL_LANGUAGE: str = Field(
        default="he", description="Default language for podcasts without detection"
    )
    ALLOWED_AUDIO_DOMAINS: list[str] = Field(
        default_factory=lambda: [
            # Common podcast hosting platforms
            "anchor.fm",
            "spotify.com",
            "podcasts.apple.com",
            "feeds.buzzsprout.com",
            "feeds.transistor.fm",
            "feeds.soundcloud.com",
            "feeds.megaphone.fm",
            "feeds.simplecast.com",
            "feeds.art19.com",
            "feeds.howstuffworks.com",
            "feeds.npr.org",
            "feeds.podcastone.com",
            "rss.art19.com",
            "traffic.megaphone.fm",
            "traffic.libsyn.com",
            "media.blubrry.com",
            "dcs.megaphone.fm",
            # Storage services
            "storage.googleapis.com",
            "s3.amazonaws.com",
            "cloudfront.net",
        ],
        description="Whitelisted domains for audio downloads (SSRF protection)",
    )

    # SSRF Protection - Whitelisted domains for external HTTP requests
    # These can be configured via environment variables as JSON arrays or comma-separated strings
    ALLOWED_IMAGE_DOMAINS: str | list[str] = Field(
        default="",
        description="Whitelisted domains for image downloads (SSRF protection)",
    )
    ALLOWED_SUBTITLE_DOMAINS: str | list[str] = Field(
        default="",
        description="Whitelisted domains for subtitle downloads (SSRF protection)",
    )
    ALLOWED_EPG_DOMAINS: str | list[str] = Field(
        default="",
        description="Whitelisted domains for EPG data fetching (SSRF protection)",
    )
    ALLOWED_SCRAPER_DOMAINS: str | list[str] = Field(
        default="",
        description="Whitelisted domains for content scrapers (SSRF protection)",
    )

    @property
    def parsed_image_domains(self) -> list[str]:
        """Parse ALLOWED_IMAGE_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_IMAGE_DOMAINS,
            default=[
                "image.tmdb.org",
                "api.themoviedb.org",
                "storage.googleapis.com",
                "lh3.googleusercontent.com",
                "i.ytimg.com",
                "img.youtube.com",
            ],
        )

    @property
    def parsed_subtitle_domains(self) -> list[str]:
        """Parse ALLOWED_SUBTITLE_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_SUBTITLE_DOMAINS,
            default=[
                "api.opensubtitles.com",
                "rest.opensubtitles.org",
                "storage.googleapis.com",
            ],
        )

    @property
    def parsed_epg_domains(self) -> list[str]:
        """Parse ALLOWED_EPG_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_EPG_DOMAINS,
            default=[
                "www.kan.org.il",
                "kan.org.il",
                "api.mako.co.il",
                "raw.githubusercontent.com",
                "github.com",
                "iptv-org.github.io",
                "tv.schedulesdirect.org",
                "storage.googleapis.com",
            ],
        )

    @property
    def parsed_scraper_domains(self) -> list[str]:
        """Parse ALLOWED_SCRAPER_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_SCRAPER_DOMAINS,
            default=[
                "youtube.com",
                "youtu.be",
                "www.youtube.com",
                "podcasts.apple.com",
                "rss.art19.com",
                "feeds.megaphone.fm",
                "feeds.simplecast.com",
                "feeds.howstuffworks.com",
                "feeds.npr.org",
                "feeds.podcastone.com",
                "feeds.buzzsprout.com",
                "feeds.transistor.fm",
                "feeds.soundcloud.com",
                "anchor.fm",
                "storage.googleapis.com",
            ],
        )

    @property
    def parsed_audio_domains(self) -> list[str]:
        """Parse ALLOWED_AUDIO_DOMAINS from environment variable."""
        return self._parse_domain_list(
            self.ALLOWED_AUDIO_DOMAINS,
            default=[
                "anchor.fm",
                "spotify.com",
                "podcasts.apple.com",
                "feeds.buzzsprout.com",
                "feeds.transistor.fm",
                "feeds.soundcloud.com",
                "feeds.megaphone.fm",
                "feeds.simplecast.com",
                "feeds.art19.com",
                "feeds.howstuffworks.com",
                "feeds.npr.org",
                "feeds.podcastone.com",
                "rss.art19.com",
                "traffic.megaphone.fm",
                "traffic.libsyn.com",
                "media.blubrry.com",
                "dcs.megaphone.fm",
                "storage.googleapis.com",
                "s3.amazonaws.com",
                "cloudfront.net",
            ],
        )

    def _parse_domain_list(
        self, value: str | list[str], default: list[str]
    ) -> list[str]:
        """
        Parse domain list from string or list.

        Args:
            value: String (JSON or comma-separated) or list of domains
            default: Default list if value is empty

        Returns:
            List of domain strings
        """
        if not value:
            return default

        if isinstance(value, list):
            return value

        # Try JSON parsing first
        try:
            parsed = json.loads(value)
            if isinstance(parsed, list):
                return parsed
        except (json.JSONDecodeError, TypeError):
            pass

        # Fallback to comma-separated parsing
        return [domain.strip() for domain in value.split(",") if domain.strip()]

    # Audio Processing Settings
    AUDIO_SEPARATION_MODEL: str = Field(
        default="htdemucs_6s", description="Demucs model for vocal separation"
    )
    AUDIO_SEPARATION_DEVICE: str = Field(
        default="cpu", description="Device for audio processing (cpu/cuda)"
    )
    STT_MODEL: str = Field(default="large-v3", description="Whisper model for STT")
    STT_DEVICE: str = Field(
        default="cpu", description="Device for Whisper STT (cpu/cuda)"
    )

    # Audio Quality Settings
    TARGET_LUFS: float = Field(
        default=-16.0, description="Target LUFS for normalization"
    )
    PEAK_LIMITER: float = Field(default=-1.5, description="Peak limiter in dB")
    VOCAL_VOLUME_DB: float = Field(default=0.0, description="Vocal volume adjustment")
    BACKGROUND_VOLUME_DB: float = Field(
        default=-12.0, description="Background volume ducking"
    )

    # ElevenLabs Voice Settings
    ELEVENLABS_STABILITY: float = Field(
        default=0.75, description="Voice stability (0.7-0.8 for podcast)"
    )
    ELEVENLABS_SIMILARITY_BOOST: float = Field(
        default=0.85, description="Similarity boost for consistent voice"
    )
    ELEVENLABS_STYLE: float = Field(
        default=0.4, description="Style/expressiveness level"
    )
    ELEVENLABS_SPEAKER_BOOST: bool = Field(
        default=True, description="Enable speaker boost for clarity"
    )
    ELEVENLABS_MODEL: str = Field(
        default="eleven_multilingual_v2",
        description="ElevenLabs TTS model (v2 multilingual with Hebrew support)",
    )
    ELEVENLABS_HEBREW_VOICE_ID: str = Field(
        default="", description="ElevenLabs voice ID for Hebrew (female)"
    )
    ELEVENLABS_ENGLISH_VOICE_ID: str = Field(
        default="", description="ElevenLabs voice ID for English (female)"
    )
    ELEVENLABS_HEBREW_MALE_VOICE_ID: str = Field(
        default="", description="ElevenLabs voice ID for Hebrew (male)"
    )
    ELEVENLABS_ENGLISH_MALE_VOICE_ID: str = Field(
        default="", description="ElevenLabs voice ID for English (male)"
    )

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
    US_JEWISH_REGIONS: str = (
        "nyc,la,chicago,miami,boston,philadelphia,atlanta,dallas,denver,seattle"
    )
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
    CULTURES_SUPPORTED: str = (
        "israeli,chinese,japanese,korean,indian"  # Comma-separated
    )

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

    # Trivia Feature Configuration
    TRIVIA_ENABLED: bool = Field(
        default=True, description="Enable trivia feature globally"
    )
    TRIVIA_DEFAULT_DISPLAY_DURATION_SECONDS: int = Field(
        default=10,
        ge=5,
        le=30,
        description="Default trivia display duration in seconds",
    )
    TRIVIA_MIN_INTERVAL_SECONDS: int = Field(
        default=300, ge=60, le=1800, description="Minimum interval between trivia facts"
    )
    TRIVIA_MAX_FACTS_PER_CONTENT: int = Field(
        default=50, ge=10, le=100, description="Maximum trivia facts per content item"
    )
    TRIVIA_ROLLOUT_PERCENTAGE: int = Field(
        default=100, ge=0, le=100, description="Percentage of users to show trivia"
    )
    TRIVIA_AI_MAX_TOKENS: int = Field(
        default=1024, ge=256, le=4096, description="Max tokens for AI trivia generation"
    )
    TRIVIA_SANITIZE_TITLE_MAX_LEN: int = Field(
        default=200, ge=50, le=500, description="Max length for title sanitization"
    )
    TRIVIA_SANITIZE_DESCRIPTION_MAX_LEN: int = Field(
        default=500,
        ge=100,
        le=2000,
        description="Max length for description sanitization",
    )
    TRIVIA_SANITIZE_FIELD_MAX_LEN: int = Field(
        default=100,
        ge=50,
        le=500,
        description="Max length for other field sanitization",
    )

    @field_validator("TRIVIA_MIN_INTERVAL_SECONDS")
    @classmethod
    def validate_trivia_interval(cls, v: int) -> int:
        """Validate trivia interval is reasonable."""
        if v < 60:
            raise ValueError("TRIVIA_MIN_INTERVAL_SECONDS must be at least 60 seconds")
        if v > 1800:
            raise ValueError("TRIVIA_MIN_INTERVAL_SECONDS must not exceed 1800 seconds")
        return v

    @field_validator("TRIVIA_ROLLOUT_PERCENTAGE")
    @classmethod
    def validate_trivia_rollout(cls, v: int) -> int:
        """Validate rollout percentage is valid."""
        if v < 0 or v > 100:
            raise ValueError("TRIVIA_ROLLOUT_PERCENTAGE must be between 0 and 100")
        return v

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
    # LIVE FEATURE QUOTAS (Subtitles & Dubbing)
    # ============================================
    # Per-user usage limits for live subtitles and live dubbing features

    # Default quota limits for Premium tier (minutes)
    LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_HOUR: int = 60
    LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_DAY: int = 240
    LIVE_QUOTA_PREMIUM_SUBTITLE_MINUTES_PER_MONTH: int = 2000
    LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_HOUR: int = 30
    LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_DAY: int = 120
    LIVE_QUOTA_PREMIUM_DUBBING_MINUTES_PER_MONTH: int = 1000

    # Default quota limits for Family tier (minutes) - 2x Premium
    LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_HOUR: int = 120
    LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_DAY: int = 480
    LIVE_QUOTA_FAMILY_SUBTITLE_MINUTES_PER_MONTH: int = 4000
    LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_HOUR: int = 60
    LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_DAY: int = 240
    LIVE_QUOTA_FAMILY_DUBBING_MINUTES_PER_MONTH: int = 2000

    # Rollover settings
    LIVE_QUOTA_MAX_ROLLOVER_MULTIPLIER: float = 2.0
    LIVE_QUOTA_WARNING_THRESHOLD_PERCENTAGE: int = 80

    # Cost estimation for internal analytics (USD)
    LIVE_QUOTA_COST_STT_PER_MINUTE: float = 0.006
    LIVE_QUOTA_COST_TRANSLATION_PER_1K_CHARS: float = 0.020
    LIVE_QUOTA_COST_TTS_PER_1K_CHARS: float = 0.016

    # Average characters per minute for cost estimation
    LIVE_QUOTA_AVG_CHARS_PER_MINUTE_HEBREW: int = 600
    LIVE_QUOTA_AVG_CHARS_PER_MINUTE_ENGLISH: int = 750

    # Session cleanup TTL (days)
    LIVE_QUOTA_SESSION_TTL_DAYS: int = 90

    # Rate limiting (requests per minute)
    LIVE_QUOTA_WEBSOCKET_RATE_LIMIT: int = 5  # Max WebSocket connections per minute
    LIVE_QUOTA_API_RATE_LIMIT: int = 100  # Max API requests per minute
    LIVE_QUOTA_CHECK_RATE_LIMIT: int = 20  # Max quota checks per minute

    # ============================================
    # URL MIGRATION CONFIGURATION (for script consolidation)
    # ============================================
    # Configuration for URL transformation scripts (bucket upgrades, S3→GCS migration)
    OLD_BUCKET_NAME: str = Field(
        default="bayit-plus-media/", description="Old GCS bucket name for URL migration"
    )
    NEW_BUCKET_NAME: str = Field(
        default="bayit-plus-media-new/",
        description="New GCS bucket name for URL migration",
    )
    S3_PATTERN: str = Field(
        default=r"s3\.amazonaws\.com",
        description="S3 URL pattern to replace during migration",
    )
    GCS_PATTERN: str = Field(
        default="storage.googleapis.com",
        description="GCS URL pattern for S3→GCS migration",
    )

    # ============================================
    # OLORIN.AI PLATFORM CONFIGURATION (NESTED)
    # ============================================

    olorin: OlorinSettings = Field(
        default_factory=OlorinSettings,
        description="Olorin.ai platform configuration (nested)",
    )

    # ElevenLabs Voice IDs for Dubbing (JSON array of voice configs)
    # Format: '[{"id":"voice_id","name":"Name","lang":"multilingual","desc":"Description"}]'
    ELEVENLABS_DUBBING_VOICES: str = (
        '[{"id":"21m00Tcm4TlvDq8ikWAM","name":"Adam","lang":"multilingual","desc":"Deep male voice"},{"id":"AZnzlk1XvdvUeBnXmlld","name":"Domi","lang":"multilingual","desc":"Youthful female voice"},{"id":"MF3mGyEYCl7XYWbV9V6O","name":"Elli","lang":"multilingual","desc":"Warm female voice"},{"id":"TxGEqnHWrfWFTfGW9XjX","name":"Josh","lang":"multilingual","desc":"Conversational male voice"}]'
    )

    # ============================================
    # OLORIN.AI BACKWARD COMPATIBILITY PROPERTIES
    # ============================================
    # Legacy settings are provided via @property methods below.
    # They delegate to settings.olorin.* and emit deprecation warnings.
    # New code should use settings.olorin.* directly.

    @property
    def webauthn_origins(self) -> list[str]:
        """Parse WebAuthn origins from comma-separated string."""
        return [
            origin.strip()
            for origin in self.WEBAUTHN_ORIGIN.split(",")
            if origin.strip()
        ]

    @property
    def MONGODB_URL(self) -> str:
        """DEPRECATED: Use MONGODB_URI instead (centralized olorin-shared naming convention)."""
        import warnings

        warnings.warn(
            "MONGODB_URL is deprecated. Use MONGODB_URI instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.MONGODB_URI

    # ============================================
    # BACKWARD-COMPATIBLE PROPERTIES FOR OLORIN CONFIG
    # ============================================
    # These properties provide backward compatibility during migration.
    # They include deprecation warnings and delegate to settings.olorin.*
    # Will be removed in a future version.

    @property
    def PINECONE_API_KEY(self) -> str:
        """DEPRECATED: Use settings.olorin.pinecone.api_key"""
        import warnings

        warnings.warn(
            "PINECONE_API_KEY is deprecated. Use settings.olorin.pinecone.api_key instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.pinecone.api_key

    @property
    def PINECONE_ENVIRONMENT(self) -> str:
        """DEPRECATED: Use settings.olorin.pinecone.environment"""
        import warnings

        warnings.warn(
            "PINECONE_ENVIRONMENT is deprecated. Use settings.olorin.pinecone.environment instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.pinecone.environment

    @property
    def PINECONE_INDEX_NAME(self) -> str:
        """DEPRECATED: Use settings.olorin.pinecone.index_name"""
        import warnings

        warnings.warn(
            "PINECONE_INDEX_NAME is deprecated. Use settings.olorin.pinecone.index_name instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.pinecone.index_name

    @property
    def EMBEDDING_MODEL(self) -> str:
        """DEPRECATED: Use settings.olorin.embedding.model"""
        import warnings

        warnings.warn(
            "EMBEDDING_MODEL is deprecated. Use settings.olorin.embedding.model instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.embedding.model

    @property
    def EMBEDDING_DIMENSIONS(self) -> int:
        """DEPRECATED: Use settings.olorin.embedding.dimensions"""
        import warnings

        warnings.warn(
            "EMBEDDING_DIMENSIONS is deprecated. Use settings.olorin.embedding.dimensions instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.embedding.dimensions

    @property
    def DUBBING_MAX_CONCURRENT_SESSIONS(self) -> int:
        """DEPRECATED: Use settings.olorin.dubbing.max_concurrent_sessions"""
        import warnings

        warnings.warn(
            "DUBBING_MAX_CONCURRENT_SESSIONS is deprecated. Use settings.olorin.dubbing.max_concurrent_sessions instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.dubbing.max_concurrent_sessions

    @property
    def DUBBING_SESSION_TIMEOUT_MINUTES(self) -> int:
        """DEPRECATED: Use settings.olorin.dubbing.session_timeout_minutes"""
        import warnings

        warnings.warn(
            "DUBBING_SESSION_TIMEOUT_MINUTES is deprecated. Use settings.olorin.dubbing.session_timeout_minutes instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.dubbing.session_timeout_minutes

    @property
    def DUBBING_TARGET_LATENCY_MS(self) -> int:
        """DEPRECATED: Use settings.olorin.dubbing.target_latency_ms"""
        import warnings

        warnings.warn(
            "DUBBING_TARGET_LATENCY_MS is deprecated. Use settings.olorin.dubbing.target_latency_ms instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.dubbing.target_latency_ms

    @property
    def RECAP_MAX_CONTEXT_TOKENS(self) -> int:
        """DEPRECATED: Use settings.olorin.recap.max_context_tokens"""
        import warnings

        warnings.warn(
            "RECAP_MAX_CONTEXT_TOKENS is deprecated. Use settings.olorin.recap.max_context_tokens instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.recap.max_context_tokens

    @property
    def RECAP_WINDOW_DEFAULT_MINUTES(self) -> int:
        """DEPRECATED: Use settings.olorin.recap.window_default_minutes"""
        import warnings

        warnings.warn(
            "RECAP_WINDOW_DEFAULT_MINUTES is deprecated. Use settings.olorin.recap.window_default_minutes instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.recap.window_default_minutes

    @property
    def RECAP_SUMMARY_MAX_TOKENS(self) -> int:
        """DEPRECATED: Use settings.olorin.recap.summary_max_tokens"""
        import warnings

        warnings.warn(
            "RECAP_SUMMARY_MAX_TOKENS is deprecated. Use settings.olorin.recap.summary_max_tokens instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.recap.summary_max_tokens

    @property
    def CULTURAL_REFERENCE_CACHE_TTL_HOURS(self) -> int:
        """DEPRECATED: Use settings.olorin.cultural.reference_cache_ttl_hours"""
        import warnings

        warnings.warn(
            "CULTURAL_REFERENCE_CACHE_TTL_HOURS is deprecated. Use settings.olorin.cultural.reference_cache_ttl_hours instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.cultural.reference_cache_ttl_hours

    @property
    def CULTURAL_DETECTION_MIN_CONFIDENCE(self) -> float:
        """DEPRECATED: Use settings.olorin.cultural.detection_min_confidence"""
        import warnings

        warnings.warn(
            "CULTURAL_DETECTION_MIN_CONFIDENCE is deprecated. Use settings.olorin.cultural.detection_min_confidence instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.cultural.detection_min_confidence

    @property
    def PARTNER_API_KEY_SALT(self) -> str:
        """DEPRECATED: Use settings.olorin.partner.api_key_salt"""
        import warnings

        warnings.warn(
            "PARTNER_API_KEY_SALT is deprecated. Use settings.olorin.partner.api_key_salt instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.partner.api_key_salt

    @property
    def PARTNER_DEFAULT_RATE_LIMIT_RPM(self) -> int:
        """DEPRECATED: Use settings.olorin.partner.default_rate_limit_rpm"""
        import warnings

        warnings.warn(
            "PARTNER_DEFAULT_RATE_LIMIT_RPM is deprecated. Use settings.olorin.partner.default_rate_limit_rpm instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.partner.default_rate_limit_rpm

    @property
    def PARTNER_WEBHOOK_TIMEOUT_SECONDS(self) -> float:
        """DEPRECATED: Use settings.olorin.partner.webhook_timeout_seconds"""
        import warnings

        warnings.warn(
            "PARTNER_WEBHOOK_TIMEOUT_SECONDS is deprecated. Use settings.olorin.partner.webhook_timeout_seconds instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.partner.webhook_timeout_seconds

    @property
    def OLORIN_DUBBING_ENABLED(self) -> bool:
        """DEPRECATED: Use settings.olorin.dubbing_enabled"""
        import warnings

        warnings.warn(
            "OLORIN_DUBBING_ENABLED is deprecated. Use settings.olorin.dubbing_enabled instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.dubbing_enabled

    @property
    def OLORIN_SEMANTIC_SEARCH_ENABLED(self) -> bool:
        """DEPRECATED: Use settings.olorin.semantic_search_enabled"""
        import warnings

        warnings.warn(
            "OLORIN_SEMANTIC_SEARCH_ENABLED is deprecated. Use settings.olorin.semantic_search_enabled instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.semantic_search_enabled

    @property
    def OLORIN_CULTURAL_CONTEXT_ENABLED(self) -> bool:
        """DEPRECATED: Use settings.olorin.cultural_context_enabled"""
        import warnings

        warnings.warn(
            "OLORIN_CULTURAL_CONTEXT_ENABLED is deprecated. Use settings.olorin.cultural_context_enabled instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.cultural_context_enabled

    @property
    def OLORIN_RECAP_ENABLED(self) -> bool:
        """DEPRECATED: Use settings.olorin.recap_enabled"""
        import warnings

        warnings.warn(
            "OLORIN_RECAP_ENABLED is deprecated. Use settings.olorin.recap_enabled instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.olorin.recap_enabled

    class Config:
        env_file = ".env"
        case_sensitive = True
        # Allow extra environment variables during Olorin config migration
        # This enables backward compatibility while old env vars are still in .env files
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
