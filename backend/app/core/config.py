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

    # Auth Service Integration
    AUTH_SERVICE_URL: str = Field(
        default="https://auth.olorin.ai",
        description="Olorin Auth Service URL for RS256 token verification"
    )
    AUTH_SERVICE_ENABLED: bool = Field(
        default=True,
        description="Enable auth service integration (dual-mode during migration)"
    )

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

    # ==========================================
    # PAYMENT FLOW FEATURE FLAGS
    # ==========================================
    REQUIRE_PAYMENT_ON_SIGNUP: bool = Field(
        default=False,  # Safe default - disabled until explicitly enabled
        env="REQUIRE_PAYMENT_ON_SIGNUP",
        description="Require immediate payment during signup (mandatory subscription model)"
    )

    REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE: int = Field(
        default=0,  # 0% = disabled, 100% = all users
        env="REQUIRE_PAYMENT_ON_SIGNUP_PERCENTAGE",
        description="Percentage of new signups requiring payment (0-100) for gradual rollout"
    )

    # ==========================================
    # PAYMENT FLOW CONFIGURATION
    # ==========================================
    SIGNUP_TRIAL_PERIOD_DAYS: int = Field(
        default=7,
        env="SIGNUP_TRIAL_PERIOD_DAYS",
        description="Free trial duration for new signups (days)"
    )

    FRONTEND_URL: str = Field(
        default="http://localhost:3000",
        env="FRONTEND_URL",
        description="Frontend base URL for payment redirects"
    )

    PAYMENT_SUCCESS_PATH: str = Field(
        default="/payment/success",
        env="PAYMENT_SUCCESS_PATH",
        description="Frontend path for successful payment redirect"
    )

    PAYMENT_CANCELLED_PATH: str = Field(
        default="/payment/cancelled",
        env="PAYMENT_CANCELLED_PATH",
        description="Frontend path for cancelled payment redirect"
    )

    PAYMENT_STATUS_POLL_INTERVAL_MS: int = Field(
        default=5000,  # 5 seconds
        env="PAYMENT_STATUS_POLL_INTERVAL_MS",
        description="Frontend polling interval for payment status (milliseconds)"
    )

    PAYMENT_PENDING_CLEANUP_DAYS: int = Field(
        default=7,
        env="PAYMENT_PENDING_CLEANUP_DAYS",
        description="Delete abandoned signups with payment_pending after N days"
    )

    PAYMENT_CHECKOUT_SESSION_TTL_HOURS: int = Field(
        default=24,
        env="PAYMENT_CHECKOUT_SESSION_TTL_HOURS",
        description="Stripe checkout session expiration (hours)"
    )

    # ==========================================
    # MIGRATION CONFIGURATION
    # ==========================================
    VIEWER_MIGRATION_BATCH_SIZE: int = Field(
        default=100,
        env="VIEWER_MIGRATION_BATCH_SIZE",
        description="Batch size for viewer-to-payment-pending migration"
    )

    # ==========================================
    # ROLLBACK CONFIGURATION
    # ==========================================
    PAYMENT_CONVERSION_THRESHOLD: float = Field(
        default=0.40,  # 40%
        env="PAYMENT_CONVERSION_THRESHOLD",
        description="Trigger rollback if payment conversion rate falls below this threshold"
    )

    # ==========================================
    # BETA 500 CLOSED BETA PROGRAM
    # ==========================================
    BETA_MAX_USERS: int = Field(
        default=500,
        env="BETA_MAX_USERS",
        description="Maximum number of users allowed in Beta 500 program"
    )

    BETA_AI_CREDITS: int = Field(
        default=5000,
        env="BETA_AI_CREDITS",
        description="Total AI credits allocated per beta user"
    )

    BETA_DURATION_DAYS: int = Field(
        default=90,
        env="BETA_DURATION_DAYS",
        description="Duration of beta program in days"
    )

    # Credit Rate Configuration
    CREDIT_RATE_LIVE_DUBBING: float = Field(
        default=1.0,
        env="CREDIT_RATE_LIVE_DUBBING",
        description="Credits consumed per second of live dubbing"
    )

    CREDIT_RATE_AI_SEARCH: float = Field(
        default=10.0,
        env="CREDIT_RATE_AI_SEARCH",
        description="Credits per AI search query"
    )

    CREDIT_RATE_AI_RECOMMENDATIONS: float = Field(
        default=5.0,
        env="CREDIT_RATE_AI_RECOMMENDATIONS",
        description="Credits per AI recommendation generation"
    )

    CREDIT_RATE_COMPREHENSION_QUESTION: float = Field(
        default=1.0,
        env="CREDIT_RATE_COMPREHENSION_QUESTION",
        description="Credits per comprehension question"
    )

    CREDIT_RATE_SUBTITLE_NIKUD: float = Field(
        default=15.0,
        env="CREDIT_RATE_SUBTITLE_NIKUD",
        description="Credits per nikud subtitle generation"
    )

    CREDIT_RATE_SUBTITLE_SHORESH: float = Field(
        default=15.0,
        env="CREDIT_RATE_SUBTITLE_SHORESH",
        description="Credits per shoresh subtitle generation"
    )

    CREDIT_RATE_SUBTITLE_HEBLISH: float = Field(
        default=15.0,
        env="CREDIT_RATE_SUBTITLE_HEBLISH",
        description="Credits per heblish subtitle generation"
    )

    CREDIT_RATE_SUBTITLE_GRAMMAR_FLIP: float = Field(
        default=15.0,
        env="CREDIT_RATE_SUBTITLE_GRAMMAR_FLIP",
        description="Credits per grammar-flip subtitle generation"
    )

    CREDIT_RATE_SUBTITLE_SLANG_SYNTHESIS: float = Field(
        default=15.0,
        env="CREDIT_RATE_SUBTITLE_SLANG_SYNTHESIS",
        description="Credits per slang-synthesis subtitle generation"
    )

    CREDIT_RATE_SUBTITLE_ENGREW: float = Field(
        default=15.0,
        env="CREDIT_RATE_SUBTITLE_ENGREW",
        description="Credits per engrew subtitle generation"
    )

    CREDIT_RATE_PHRASE_BREAKDOWN: float = Field(
        default=5.0,
        env="CREDIT_RATE_PHRASE_BREAKDOWN",
        description="Credits per phrase breakdown request"
    )

    CREDIT_RATE_CULTURAL_DETECT: float = Field(
        default=5.0,
        env="CREDIT_RATE_CULTURAL_DETECT",
        description="Credits per cultural reference detection"
    )

    CREDIT_RATE_CHAPTER_GENERATION: float = Field(
        default=10.0,
        env="CREDIT_RATE_CHAPTER_GENERATION",
        description="Credits per chapter generation request"
    )

    CREDIT_RATE_CHAT_TRANSLATION: float = Field(
        default=3.0,
        env="CREDIT_RATE_CHAT_TRANSLATION",
        description="Credits per chat translation request"
    )

    CREDIT_RATE_TALK_BACK_RESPOND: float = Field(
        default=5.0,
        env="CREDIT_RATE_TALK_BACK_RESPOND",
        description="Credits per Talk Back voice response evaluation"
    )

    CREDIT_RATE_BILINGUAL_SESSION: float = Field(
        default=10.0,
        env="CREDIT_RATE_BILINGUAL_SESSION",
        description="Credits per bilingual dubbing session start"
    )

    CREDIT_RATE_BILINGUAL_TRANSLATE: float = Field(
        default=3.0,
        env="CREDIT_RATE_BILINGUAL_TRANSLATE",
        description="Credits per bilingual segment translation"
    )

    CREDIT_RATE_ZINE_GENERATION: float = Field(
        default=15.0,
        env="CREDIT_RATE_ZINE_GENERATION",
        description="Credits per AI weekly zine generation"
    )

    # ==========================================
    # PLAYLIST CONFIGURATION
    # ==========================================
    PLAYLIST_MAX_ITEMS: int = Field(
        default=500,
        env="PLAYLIST_MAX_ITEMS",
        description="Maximum number of items per user playlist"
    )

    # Comprehension Quiz Feature
    COMPREHENSION_QUIZ_ENABLED: bool = Field(
        default=True,
        env="COMPREHENSION_QUIZ_ENABLED",
        description="Enable scene-triggered comprehension questions"
    )

    COMPREHENSION_QUIZ_ROLLOUT_PERCENTAGE: int = Field(
        default=100,
        env="COMPREHENSION_QUIZ_ROLLOUT_PERCENTAGE",
        description="Percentage of users with comprehension quiz (0-100)"
    )

    # Scene Detection Configuration
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

    # Question Generation Configuration
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

    # Credit Thresholds
    BETA_CREDIT_WARNING_THRESHOLD: int = Field(
        default=500,
        env="BETA_CREDIT_WARNING_THRESHOLD",
        description="Credit balance threshold for warning notification"
    )

    BETA_CREDIT_CRITICAL_THRESHOLD: int = Field(
        default=100,
        env="BETA_CREDIT_CRITICAL_THRESHOLD",
        description="Credit balance threshold for critical alert"
    )

    CREDIT_ABUSE_HOURLY_THRESHOLD: int = Field(
        default=500,
        env="CREDIT_ABUSE_HOURLY_THRESHOLD",
        description="Maximum credits per hour before flagging potential abuse"
    )

    # Session Management
    SESSION_CHECKPOINT_INTERVAL_SECONDS: int = Field(
        default=30,
        env="SESSION_CHECKPOINT_INTERVAL_SECONDS",
        description="Interval in seconds between credit checkpoint updates during live dubbing"
    )

    SESSION_CLEANUP_INTERVAL_SECONDS: int = Field(
        default=300,
        env="SESSION_CLEANUP_INTERVAL_SECONDS",
        description="Interval for background worker to clean up orphaned sessions"
    )

    SESSION_TIMEOUT_SECONDS: int = Field(
        default=3600,
        env="SESSION_TIMEOUT_SECONDS",
        description="Maximum inactive session duration before auto-termination"
    )

    # Email Verification
    EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS: int = Field(
        default=24,
        env="EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS",
        description="Expiration time for email verification tokens (hours)"
    )

    EMAIL_VERIFICATION_SECRET_KEY: str = Field(
        default="",  # MUST be set via GCloud Secret Manager in production
        env="EMAIL_VERIFICATION_SECRET_KEY",
        description="Secret key for HMAC-SHA256 email verification token signing (64+ hex chars)"
    )

    # Fraud Detection
    DISPOSABLE_EMAIL_DOMAINS: str = Field(
        default="tempmail.com,10minutemail.com,guerrillamail.com,mailinator.com,throwaway.email",
        env="DISPOSABLE_EMAIL_DOMAINS",
        description="Comma-separated list of disposable email domains to block"
    )

    # Beta Program URLs
    BETA_LANDING_PAGE_URL: str = Field(
        default="https://bayitplus.com/beta-500",
        env="BETA_LANDING_PAGE_URL",
        description="URL for beta program landing page"
    )

    BETA_SUPPORT_EMAIL: str = Field(
        default="beta@bayitplus.com",
        env="BETA_SUPPORT_EMAIL",
        description="Support email address for beta users"
    )

    @property
    def disposable_email_domains_list(self) -> list[str]:
        """Parse comma-separated disposable email domains into a list."""
        return [domain.strip() for domain in self.DISPOSABLE_EMAIL_DOMAINS.split(",") if domain.strip()]

    # Anthropic (Claude)
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-haiku-4-5-20251001"
    CLAUDE_MAX_TOKENS_SHORT: int = 200
    CLAUDE_MAX_TOKENS_LONG: int = 500

    # Subtitle AI Processing (Nikud & Shoresh)
    SUBTITLE_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="SUBTITLE_AI_MODEL",
        description="Claude model for subtitle nikud/shoresh generation"
    )
    SUBTITLE_NIKUD_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_NIKUD_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for nikud text"
    )
    SUBTITLE_SHORESH_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_SHORESH_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for shoresh text"
    )
    SUBTITLE_HEBLISH_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_HEBLISH_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for heblish text"
    )
    SUBTITLE_GRAMMAR_FLIP_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_GRAMMAR_FLIP_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for grammar-flip text"
    )
    SUBTITLE_SLANG_SYNTHESIS_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_SLANG_SYNTHESIS_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for slang synthesis text"
    )
    SUBTITLE_ENGREW_CACHE_MAX_SIZE: int = Field(
        default=10000,
        env="SUBTITLE_ENGREW_CACHE_MAX_SIZE",
        description="Maximum in-memory cache entries for engrew text"
    )
    SUBTITLE_AI_MAX_TOKENS: int = Field(
        default=4096,
        env="SUBTITLE_AI_MAX_TOKENS",
        description="Maximum tokens per AI request (prevents unbounded requests)"
    )

    # Tavily (Web Search & News API)
    TAVILY_API_KEY: str = ""

    # Exa.ai (Article Search & Extraction)
    EXA_API_KEY: str = ""

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

    # Wizard Voice Assistant Configuration
    WIZARD_CHAT_MAX_ITERATIONS: int = Field(
        default=3,
        env="WIZARD_CHAT_MAX_ITERATIONS",
        description="Maximum tool execution iterations for wizard chat"
    )
    WIZARD_CHAT_TIMEOUT_SECONDS: float = Field(
        default=30.0,
        env="WIZARD_CHAT_TIMEOUT_SECONDS",
        description="Timeout for wizard chat responses (seconds)"
    )
    WIZARD_CHAT_MAX_HISTORY: int = Field(
        default=10,
        env="WIZARD_CHAT_MAX_HISTORY",
        description="Maximum conversation messages to retain"
    )
    WIZARD_CHAT_MEMORY_TTL_MINUTES: int = Field(
        default=30,
        env="WIZARD_CHAT_MEMORY_TTL_MINUTES",
        description="Conversation memory expiry (minutes)"
    )

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
    GOOGLE_IOS_CLIENT_ID: str = ""  # iOS Google Sign-In SDK client ID

    # Apple OAuth (optional - only required if using Apple Sign-In)
    APPLE_CLIENT_ID: str = ""  # Service ID (e.g., com.bayit.bayit-plus)
    APPLE_TEAM_ID: str = ""  # Apple Developer Team ID
    APPLE_KEY_ID: str = ""  # Private Key ID
    APPLE_PRIVATE_KEY: str = ""  # Private Key content (PEM format)
    APPLE_JWKS_URL: str = "https://appleid.apple.com/auth/keys"  # Apple JWKS endpoint

    # Audible OAuth Integration (optional - enables audiobook syncing for premium users)
    # Obtain credentials from https://developer.amazon.com/
    # Leave empty to disable the feature gracefully
    AUDIBLE_CLIENT_ID: str = Field(
        default="",
        description="Audible OAuth Client ID (from Amazon Developer Console)"
    )
    AUDIBLE_CLIENT_SECRET: str = Field(
        default="",
        description="Audible OAuth Client Secret (from Amazon Developer Console)"
    )
    AUDIBLE_REDIRECT_URI: str = Field(
        default="",
        description="Audible OAuth Redirect URI (e.g., https://yourdomain.com/api/v1/user/audible/oauth/callback)"
    )
    AUDIBLE_INTEGRATION_ENABLED: bool = Field(
        default=False,
        description="Enable Audible integration (requires all three OAuth credentials to be set)"
    )

    @property
    def is_audible_configured(self) -> bool:
        """Check if all Audible OAuth credentials are present."""
        return bool(
            self.AUDIBLE_CLIENT_ID
            and self.AUDIBLE_CLIENT_SECRET
            and self.AUDIBLE_REDIRECT_URI
        )

    # Audible API Configuration (advanced - hardcoded URLs are safe, no env override needed)
    AUDIBLE_API_BASE_URL: str = Field(
        default="https://api.audible.com",
        description="Base URL for Audible API (stable, rarely changes)"
    )
    AUDIBLE_AUTH_URL: str = Field(
        default="https://www.audible.com/auth/oauth2",
        description="Base URL for Audible OAuth (stable, rarely changes)"
    )

    # Audible HTTP Client Configuration
    AUDIBLE_HTTP_TIMEOUT_SECONDS: int = Field(
        default=30,
        description="HTTP request timeout in seconds"
    )
    AUDIBLE_HTTP_CONNECT_TIMEOUT_SECONDS: int = Field(
        default=10,
        description="HTTP connection timeout in seconds"
    )
    AUDIBLE_HTTP_MAX_CONNECTIONS: int = Field(
        default=5,
        description="Maximum concurrent connections to Audible API"
    )
    AUDIBLE_HTTP_KEEPALIVE_CONNECTIONS: int = Field(
        default=2,
        description="Maximum keepalive connections to Audible API"
    )

    # Token Encryption Configuration
    AUDIBLE_TOKEN_ENCRYPTION_KEY: str = Field(
        default="",
        description="Fernet encryption key for Audible tokens (base64-encoded, generated via cryptography.fernet.Fernet.generate_key())"
    )

    # Rate Limiting Configuration for Audible OAuth
    AUDIBLE_RATE_LIMIT_PER_MINUTE: int = Field(
        default=10,
        description="Maximum OAuth callback attempts per minute per IP"
    )
    AUDIBLE_RATE_LIMIT_STORAGE: str = Field(
        default="memory",
        description="Rate limit storage backend: 'memory' or 'redis'"
    )

    # ElevenLabs (speech-to-text and text-to-speech)
    ELEVENLABS_API_URL: str = ""
    ELEVENLABS_API_KEY: str = ""
    ELEVENLABS_WEBHOOK_SECRET: str = ""
    ELEVENLABS_DEFAULT_VOICE_ID: str = (
        "ashjVK50jp28G73AUTnb"  # Olorin - male voice for consistent TTS experience
    )
    # Olorin Assistant Avatar - custom cloned voice for AI assistant interactions
    ELEVENLABS_ASSISTANT_VOICE_ID: str = (
        "ashjVK50jp28G73AUTnb"  # Olorin - custom cloned voice
    )
    # Olorin Support Avatar - custom cloned voice for support wizard (uses same voice as assistant)
    ELEVENLABS_SUPPORT_VOICE_ID: str = (
        "ashjVK50jp28G73AUTnb"  # Olorin - custom cloned voice
    )

    # Character Animation Provider Selection
    CHARACTER_ANIMATION_PROVIDER: str = Field(
        default="elevenlabs",
        description="Provider for character animation: 'elevenlabs' or 'creatify'"
    )

    # Creatify Aurora (Character animation and lip-sync - Alternative provider)
    CREATIFY_API_URL: str = Field(
        default="https://api.creatify.ai",
        description="Creatify Aurora API base URL"
    )
    CREATIFY_API_ID: str = Field(
        default="",
        description="Creatify API ID for authentication"
    )
    CREATIFY_API_KEY: str = Field(
        default="",
        description="Creatify API key for authentication"
    )

    # Creatify Stock Persona IDs (character animation fallbacks)
    CREATIFY_PERSONA_MALE: str = Field(
        default="0251876f-0da4-4c61-8320-8955d8be1f98",
        description="Creatify stock male persona UUID"
    )
    CREATIFY_PERSONA_FEMALE: str = Field(
        default="009f502d-3649-4624-a438-80b126f1fa30",
        description="Creatify stock female persona UUID"
    )

    # Character Voice IDs (ElevenLabs voices for VOD interaction characters)
    CHARACTER_VOICE_MOSHE: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="ElevenLabs voice ID for Moshe Rabbenu (wise, authoritative)"
    )
    CHARACTER_VOICE_DAVID: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="ElevenLabs voice ID for David HaMelech (strong, regal)"
    )
    CHARACTER_VOICE_MIRIAM: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="ElevenLabs voice ID for Miriam (warm, nurturing)"
    )
    CHARACTER_VOICE_ESTHER: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="ElevenLabs voice ID for Esther (graceful, confident)"
    )
    CHARACTER_VOICE_DEFAULT: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="Default ElevenLabs voice ID for unmatched characters"
    )

    # Back to the Future character voices
    CHARACTER_VOICE_DOC_BROWN: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="ElevenLabs voice ID for Doc Brown (eccentric, energetic)"
    )
    CHARACTER_VOICE_GEORGE_MCFLY: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="ElevenLabs voice ID for George McFly (timid, earnest)"
    )
    CHARACTER_VOICE_LORRAINE_BAINES: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="ElevenLabs voice ID for Lorraine Baines (warm, kind)"
    )
    CHARACTER_VOICE_MARTY_MCFLY: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="ElevenLabs voice ID for Marty McFly (energetic, teenage)"
    )
    CHARACTER_VOICE_JENNIFER_PARKER: str = Field(
        default="ashjVK50jp28G73AUTnb",
        description="ElevenLabs voice ID for Jennifer Parker (warm, supportive)"
    )

    @field_validator("CHARACTER_ANIMATION_PROVIDER")
    @classmethod
    def validate_animation_provider(cls, v: str) -> str:
        """Validate CHARACTER_ANIMATION_PROVIDER is a supported provider."""
        valid_providers = ["elevenlabs", "creatify"]
        if v.lower() not in valid_providers:
            raise ValueError(
                f"CHARACTER_ANIMATION_PROVIDER must be one of {valid_providers}, got '{v}'"
            )
        return v.lower()

    # OpenAI (Whisper speech-to-text)
    OPENAI_API_KEY: str = ""

    # GeoNames (Reverse geocoding for location-based features)
    GEONAMES_USERNAME: str = Field(
        default="",
        description="GeoNames API username for reverse geocoding (required for location features)"
    )
    GEONAMES_API_BASE_URL: str = Field(
        default="https://secure.geonames.org",
        description="GeoNames API base URL"
    )
    GEONAMES_TIMEOUT_SECONDS: int = Field(
        default=10,
        description="GeoNames API request timeout in seconds"
    )
    LOCATION_CACHE_TTL_HOURS: int = Field(
        default=24,
        description="Location cache TTL in hours (cached for 24h by default)"
    )
    LOCATION_CACHE_COLLECTION: str = Field(
        default="location_cache",
        description="MongoDB collection name for location cache"
    )
    LOCATION_CONTENT_TOPIC_TAGS: list[str] = Field(
        default=["israeli", "israel", "jewish_community"],
        description="Topic tags to filter for Israeli-focused content"
    )
    LOCATION_CONTENT_EVENT_TYPES: list[str] = Field(
        default=["community", "holiday", "shiur"],
        description="Event types to filter for Israeli-focused community events"
    )
    LOCATION_CONTENT_ARTICLE_FORMATS: list[str] = Field(
        default=["documentary", "news", "article"],
        description="Content formats to include for news articles"
    )
    LOCATION_REVERSE_GEOCODE_RATE_LIMIT: int = Field(
        default=30,
        description="Max reverse geocode requests per minute per IP"
    )
    LOCATION_CONTENT_RATE_LIMIT: int = Field(
        default=60,
        description="Max location content requests per minute per IP"
    )
    LOCATION_ENCRYPTION_KEY: str = Field(
        default="",
        description="Fernet key for encrypting location data at rest (base64-encoded)"
    )

    # Diagnostics Settings (System Health Monitoring)
    DIAGNOSTICS_ENABLED: bool = Field(
        default=True,
        description="Enable system diagnostics and health monitoring"
    )
    DIAGNOSTICS_HEARTBEAT_INTERVAL_SECONDS: int = Field(
        default=10,
        description="Client heartbeat interval in seconds"
    )
    DIAGNOSTICS_CLIENT_TIMEOUT_SECONDS: int = Field(
        default=300,
        description="Client timeout in seconds (5 minutes default)"
    )

    @field_validator("GEONAMES_USERNAME")
    @classmethod
    def validate_geonames_username(cls, v: str) -> str:
        """Validate GeoNames username is configured for production."""
        import os
        is_prod = os.getenv("ENVIRONMENT", "").lower() in ("production", "prod")

        if is_prod and not v:
            raise ValueError(
                "GEONAMES_USERNAME must be configured in production for location features. "
                "Obtain free account from https://www.geonames.org/login"
            )
        return v

    # Speech-to-Text Provider Selection
    # Options: "google" (Google Cloud), "whisper" (OpenAI Whisper), or "elevenlabs" (ElevenLabs Scribe v2)
    # ElevenLabs offers lowest latency (~150ms) with excellent Hebrew support
    SPEECH_TO_TEXT_PROVIDER: str = "elevenlabs"

    # Live Translation Provider Selection (for translating transcribed text)
    # Options: "google" (Google Cloud Translate), "openai" (GPT-4o-mini), or "claude" (Claude)
    LIVE_TRANSLATION_PROVIDER: str = "google"

    # API Domain (REQUIRED for WebSocket URL construction in synced streams)
    # Example: "api.bayit.plus" (production) or "localhost:8000" (development)
    API_DOMAIN: str = Field(
        default="localhost:8000",
        description="API domain for WebSocket URL construction (no protocol prefix)"
    )

    # Live Stream Base URL (REQUIRED for synced stream URL generation)
    # Example: "https://stream.bayitplus.com/live" (production)
    LIVE_STREAM_BASE_URL: str = Field(
        default="https://stream.bayitplus.com/live",
        description="Base URL for live HLS streams (used in synced stream fallback)"
    )

    # Video Buffering Configuration (for perfect audio-video synchronization)
    # Conservative latency estimates for dubbing and subtitle processing
    DEFAULT_DUBBING_LATENCY_MS: int = Field(
        default=10000,
        description="Default dubbing latency in milliseconds - matches ContinuousPlaybackController 10s buffer"
    )
    DEFAULT_SUBTITLE_LATENCY_MS: int = Field(
        default=400,
        description="Default subtitle latency estimate in milliseconds (before measurement)"
    )
    VIDEO_BUFFER_SAFETY_MS: int = Field(
        default=100,
        description="Safety buffer added to video delay to prevent audio arriving before video (ms)"
    )
    LATENCY_PROFILE_CACHE_TTL_HOURS: int = Field(
        default=1,
        description="How long to cache latency profiles before re-measurement (hours)"
    )
    LATENCY_EMA_ALPHA: float = Field(
        default=0.2,
        description="Exponential moving average smoothing factor for latency updates (0.0-1.0)"
    )
    MAX_LATENCY_PROFILES: int = Field(
        default=1000,
        description="Maximum number of latency profiles to cache in memory (LRU eviction)"
    )

    # Resource Limits for Synced Streams (prevent abuse and resource exhaustion)
    MAX_CONCURRENT_STREAMS_PER_USER: int = Field(
        default=3,
        description="Maximum number of concurrent synced streams per user"
    )
    MAX_STREAM_DURATION_HOURS: int = Field(
        default=24,
        description="Maximum duration for a single synced stream (hours)"
    )

    # CORS (REQUIRED - supports JSON string from Secret Manager or comma-separated list)
    # Example: '["https://bayit.tv","https://api.bayit.tv"]' or "https://bayit.tv,https://api.bayit.tv"
    BACKEND_CORS_ORIGINS: list[str] | str = ""  # Required, no hardcoded defaults

    @property
    def parsed_cors_origins(self) -> list[str]:
        """Parse CORS origins from string or list."""
        if not self.BACKEND_CORS_ORIGINS:
            # Return minimal defaults only for local development
            import os

            is_prod = os.getenv("ENVIRONMENT", "").lower() in (
                "production", "prod",
            )
            if not is_prod:
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
    GCP_REGION: str = Field(
        default="us-central1",
        env="GCP_REGION",
        description="GCP region for Vertex AI and other services",
    )

    # Apple Sign In / Push Notifications
    APPLE_KEY_ID: str = ""
    APPLE_TEAM_ID: str = ""
    APPLE_KEY_PATH: str = ""
    APPLE_BUNDLE_ID_IOS: str = ""
    APPLE_BUNDLE_ID_TVOS: str = ""

    # Librarian Agent Configuration
    # Daily Audit Schedule
    LIBRARIAN_DAILY_AUDIT_CRON: str = ""
    LIBRARIAN_DAILY_AUDIT_TIME: str = ""
    LIBRARIAN_DAILY_AUDIT_MODE: str = ""
    LIBRARIAN_DAILY_AUDIT_COST: str = ""
    LIBRARIAN_DAILY_AUDIT_STATUS: str = ""
    LIBRARIAN_DAILY_AUDIT_DESCRIPTION: str = ""

    # Weekly AI Audit Schedule
    LIBRARIAN_WEEKLY_AUDIT_CRON: str = ""
    LIBRARIAN_WEEKLY_AUDIT_TIME: str = ""
    LIBRARIAN_WEEKLY_AUDIT_MODE: str = ""
    LIBRARIAN_WEEKLY_AUDIT_COST: str = ""
    LIBRARIAN_WEEKLY_AUDIT_STATUS: str = ""
    LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION: str = ""

    # Librarian Audit Limits
    LIBRARIAN_MAX_ITERATIONS: int = 100
    LIBRARIAN_DEFAULT_BUDGET_USD: float = 5.0
    LIBRARIAN_MIN_BUDGET_USD: float = 1.0
    LIBRARIAN_MAX_BUDGET_USD: float = 50.0
    LIBRARIAN_BUDGET_STEP_USD: float = 1.0

    # Librarian Pagination
    LIBRARIAN_REPORTS_LIMIT: int = 50
    LIBRARIAN_ACTIONS_LIMIT: int = 100
    LIBRARIAN_ACTIVITY_PAGE_SIZE: int = 20

    # Librarian UI
    LIBRARIAN_ID_TRUNCATE_LENGTH: int = 8
    LIBRARIAN_MODAL_MAX_HEIGHT: int = 600

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

    # Schedules Direct EPG Service (for US and Israeli channels)
    # Signup at: https://www.schedulesdirect.org/
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

    # Recording Storage
    RECORDING_GCS_PATH_PREFIX: str = Field(
        default="recordings",
        env="RECORDING_GCS_PATH_PREFIX",
        description="GCS path prefix for recording files",
    )
    RECORDING_AUTO_DELETE_DAYS: int = Field(
        default=30,
        env="RECORDING_AUTO_DELETE_DAYS",
        description="Days before auto-deleting recordings",
    )
    RECORDING_SCHEDULER_BUFFER_SECONDS: int = Field(
        default=30,
        env="RECORDING_SCHEDULER_BUFFER_SECONDS",
        description="Seconds to start recording before EPG scheduled time",
    )
    RECORDING_MAX_SERIES_RULES_PER_USER: int = Field(
        default=10,
        env="RECORDING_MAX_SERIES_RULES_PER_USER",
        description="Maximum series recording rules per user",
    )
    RECORDING_RULE_SCAN_INTERVAL_MINUTES: int = Field(
        default=60,
        env="RECORDING_RULE_SCAN_INTERVAL_MINUTES",
        description="Interval in minutes to re-scan EPG for series rule matches",
    )
    RECORDING_RECOVERY_INTERVAL_MINUTES: int = Field(
        default=15,
        env="RECORDING_RECOVERY_INTERVAL_MINUTES",
        description="Interval in minutes for recovery service to check stuck sessions",
    )
    RECORDING_STUCK_TIMEOUT_MINUTES: int = Field(
        default=30,
        env="RECORDING_STUCK_TIMEOUT_MINUTES",
        description="Minutes after which a processing session is considered stuck",
    )
    RECORDING_ORPHAN_FILE_HOURS: int = Field(
        default=24,
        env="RECORDING_ORPHAN_FILE_HOURS",
        description="Hours after which orphaned temp recording files are cleaned up",
    )
    RECORDING_TEMP_DIR: str = Field(
        default="/tmp/recordings",
        env="RECORDING_TEMP_DIR",
        description="Temporary directory for recording files",
    )
    RECORDING_MISFIRE_GRACE_TIME_SECONDS: int = Field(
        default=300,
        env="RECORDING_MISFIRE_GRACE_TIME_SECONDS",
        description="Grace time in seconds for misfired APScheduler recording jobs",
    )
    RECORDING_QUERY_LIMIT: int = Field(
        default=500,
        env="RECORDING_QUERY_LIMIT",
        description="Maximum number of documents to return in unbounded recording queries",
    )

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
    SEARCH_MIN_TEXT_SCORE: float = 5.0  # Minimum text relevance score to include in results
    SEARCH_TITLE_BOOST_THRESHOLD: float = 8.0  # Score threshold for title-quality matches
    SEARCH_HISTORY_MAX_ENTRIES: int = 20  # Max search history entries per user
    SEARCH_TRENDING_LIMIT: int = 10  # Default trending searches count
    SEARCH_TRENDING_DAYS: int = 7  # Days window for trending computation

    # Chat Translation Configuration
    CHAT_TRANSLATION_ENABLED: bool = True
    CHAT_TRANSLATION_TIMEOUT_SECONDS: float = 2.0
    CHAT_TRANSLATION_CACHE_TTL_DAYS: int = 7
    TRANSLATION_MEMORY_CACHE_SIZE: int = 10000  # Increased for production load (was 1000)

    # Podcast Translation Configuration
    PODCAST_TRANSLATION_ENABLED: bool = Field(
        default=False, description="Enable automatic podcast translation"
    )
    PODCAST_TRANSLATION_AUTO_START: bool = Field(
        default=False, description="Auto-start translation worker on server startup"
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
    PODCAST_MAX_EPISODES_TO_KEEP: int = Field(
        default=20, description="Maximum episodes to keep per podcast during cleanup"
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

    # VOD Audio Generation Configuration
    VOD_AUDIO_TEMP_DIR: str = Field(
        default="/tmp/vod-audio",
        description="Temporary directory for VOD audio generation processing",
    )
    AUDIO_GENERATION_MAX_CONCURRENT_JOBS: int = Field(
        default=5,
        description="Maximum number of concurrent audio generation jobs",
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
    SUPPORT_VOICE_MAX_TOKENS: int = 120
    SUPPORT_VOICE_TRANSCRIPT_MAX_LENGTH: int = 500
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

    # Jerusalem/Tel Aviv Geolocation Settings
    JERUSALEM_DEFAULT_RADIUS_KM: float = 50.0
    TEL_AVIV_DEFAULT_RADIUS_KM: float = 20.0

    # Scoring weights (60% keywords + 30% proximity + 10% source)
    GEOLOCATION_KEYWORD_WEIGHT: float = 0.6
    GEOLOCATION_PROXIMITY_WEIGHT: float = 0.3
    GEOLOCATION_SOURCE_WEIGHT: float = 0.1

    # Minimum combined score threshold
    GEOLOCATION_MIN_COMBINED_SCORE: float = 0.3

    # City coordinate cache TTL (30 days - cities don't move)
    GEOLOCATION_CITY_CACHE_TTL_DAYS: int = 30

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

    # Kan Educational TV YouTube Channel Configuration
    KAN_EDUCATIONAL_YOUTUBE_CHANNEL_ID: str = Field(
        default="UCK3cyNmTx9t0wVsQC5vI93Q",  # כאן חינוכית channel ID
        env="KAN_EDUCATIONAL_YOUTUBE_CHANNEL_ID",
        description="YouTube channel ID for Kan Educational TV"
    )
    KAN_EDUCATIONAL_EPG_SYNC_INTERVAL_MINUTES: int = Field(
        default=60,
        env="KAN_EDUCATIONAL_EPG_SYNC_INTERVAL_MINUTES",
        description="How often to refresh Kan Educational EPG schedule (minutes)"
    )
    KAN_EDUCATIONAL_LOOP_PLAYLIST: bool = Field(
        default=True,
        env="KAN_EDUCATIONAL_LOOP_PLAYLIST",
        description="Whether to loop the playlist continuously"
    )

    # Trivia Feature Configuration
    TRIVIA_ENABLED: bool = Field(
        default=True, description="Enable trivia feature globally"
    )
    TRIVIA_DEFAULT_DISPLAY_DURATION_SECONDS: int = Field(
        default=15,
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
        default=4096, ge=256, le=8192, description="Max tokens for AI trivia generation"
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
    TRIVIA_AI_MAX_CHAIN_DEPTH: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Maximum follow-up depth per trivia chain",
    )
    TRIVIA_AI_MAX_CHAINS_PER_CONTENT: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum number of fact chains per content item",
    )
    TRIVIA_AI_CONTEXT_MAX_CAST: int = Field(
        default=10,
        ge=3,
        le=20,
        description="Maximum cast members to include in TMDB context for AI prompt",
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

    # ============================================
    # KIDS QUIZ FEATURE CONFIGURATION
    # ============================================
    # Interactive quizzes for kids content (ages 0-12)

    QUIZ_ENABLED: bool = Field(
        default=True,
        env="QUIZ_ENABLED",
        description="Enable kids quiz feature globally"
    )
    QUIZ_MIN_QUESTIONS: int = Field(
        default=5,
        ge=3,
        le=10,
        env="QUIZ_MIN_QUESTIONS",
        description="Minimum questions per quiz"
    )
    QUIZ_MAX_QUESTIONS: int = Field(
        default=10,
        ge=5,
        le=25,
        env="QUIZ_MAX_QUESTIONS",
        description="Maximum questions per quiz"
    )
    QUIZ_POINTS_EASY: int = Field(
        default=10,
        ge=1,
        le=50,
        env="QUIZ_POINTS_EASY",
        description="Points awarded for easy questions"
    )
    QUIZ_POINTS_MEDIUM: int = Field(
        default=20,
        ge=1,
        le=100,
        env="QUIZ_POINTS_MEDIUM",
        description="Points awarded for medium questions"
    )
    QUIZ_POINTS_HARD: int = Field(
        default=30,
        ge=1,
        le=150,
        env="QUIZ_POINTS_HARD",
        description="Points awarded for hard questions"
    )
    QUIZ_PERFECT_BONUS: int = Field(
        default=50,
        ge=0,
        le=500,
        env="QUIZ_PERFECT_BONUS",
        description="Bonus points for perfect score"
    )
    QUIZ_GENERATION_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="QUIZ_GENERATION_MODEL",
        description="Claude model for quiz generation"
    )
    QUIZ_AI_MAX_TOKENS: int = Field(
        default=2000,
        ge=500,
        le=4096,
        env="QUIZ_AI_MAX_TOKENS",
        description="Max tokens for AI quiz generation"
    )
    QUIZ_ROLLOUT_PERCENTAGE: int = Field(
        default=100,
        ge=0,
        le=100,
        env="QUIZ_ROLLOUT_PERCENTAGE",
        description="Percentage of kids profiles to show quiz"
    )
    QUIZ_CACHE_TTL_HOURS: int = Field(
        default=168,
        ge=1,
        le=720,
        env="QUIZ_CACHE_TTL_HOURS",
        description="Cache TTL for generated quizzes (168h = 1 week)"
    )

    @field_validator("QUIZ_ROLLOUT_PERCENTAGE")
    @classmethod
    def validate_quiz_rollout(cls, v: int) -> int:
        """Validate quiz rollout percentage is valid."""
        if v < 0 or v > 100:
            raise ValueError("QUIZ_ROLLOUT_PERCENTAGE must be between 0 and 100")
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

    # ============================================
    # PUBLIC DOMAIN DOCUMENTARY IMPORT
    # ============================================
    # NASA Images API (no API key needed)
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
    WEBAUTHN_RP_ID: str = ""
    # Relying Party Name - displayed to users during passkey creation
    WEBAUTHN_RP_NAME: str = ""
    # Expected origin(s) - comma-separated list of allowed origins
    # Example: "https://bayit.tv,https://www.bayit.tv"
    WEBAUTHN_ORIGIN: str = ""
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
    # CHROME EXTENSION B2C DUBBING CONFIGURATION
    # ============================================
    # User-facing dubbing for Chrome extension (not partner API)
    # Free tier: 5 minutes/day, Premium: unlimited ($5/month)
    FREE_TIER_MINUTES_PER_DAY: float = 15.0  # Free quota per day (Chrome extension)
    PREMIUM_TIER_PRICE_USD: float = 5.00  # Monthly subscription price
    WEBSOCKET_BASE_URL: str = ""  # WebSocket base URL for dubbing sessions
    MAX_SESSION_DURATION_MINUTES: int = 120  # Maximum dubbing session duration
    AUDIO_SAMPLE_RATE: int = 16000  # Audio sample rate for dubbing capture (Hz)
    SUPPORTED_EXTENSION_LANGUAGES: list[str] = ["en", "es"]  # Dubbing target languages
    SUPPORTED_EXTENSION_SITES: list[str] = [  # Supported streaming sites
        "screenil.com",
        "mako.co.il",
        "13tv.co.il",
        "kan.org.il",
    ]

    # ============================================
    # HEBREW ENGAGEMENT FEATURES CONFIGURATION
    # ============================================

    # Phase 1 - Phrase Breakdown / Cultural Context
    PHRASE_BREAKDOWN_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="PHRASE_BREAKDOWN_AI_MODEL",
        description="Claude model for phrase breakdown generation",
    )
    PHRASE_BREAKDOWN_CACHE_TTL_DAYS: int = Field(
        default=90,
        env="PHRASE_BREAKDOWN_CACHE_TTL_DAYS",
        description="Cache TTL for phrase breakdowns (days)",
    )

    # Phase 2 - Daily Missions / Gamification
    MISSIONS_DAILY_COUNT: int = Field(
        default=3, ge=1, le=10,
        env="MISSIONS_DAILY_COUNT",
        description="Number of daily missions generated per user",
    )
    SHEKEL_MISSION_EASY_MIN: int = Field(
        default=5, ge=1,
        env="SHEKEL_MISSION_EASY_MIN",
        description="Min shekels for easy missions",
    )
    SHEKEL_MISSION_EASY_MAX: int = Field(
        default=15, ge=1,
        env="SHEKEL_MISSION_EASY_MAX",
        description="Max shekels for easy missions",
    )
    SHEKEL_MISSION_MEDIUM_MIN: int = Field(
        default=15, ge=1,
        env="SHEKEL_MISSION_MEDIUM_MIN",
        description="Min shekels for medium missions",
    )
    SHEKEL_MISSION_MEDIUM_MAX: int = Field(
        default=30, ge=1,
        env="SHEKEL_MISSION_MEDIUM_MAX",
        description="Max shekels for medium missions",
    )
    SHEKEL_MISSION_HARD_MIN: int = Field(
        default=30, ge=1,
        env="SHEKEL_MISSION_HARD_MIN",
        description="Min shekels for hard missions",
    )
    SHEKEL_MISSION_HARD_MAX: int = Field(
        default=60, ge=1,
        env="SHEKEL_MISSION_HARD_MAX",
        description="Max shekels for hard missions",
    )
    SHEKEL_STREAK_BONUS_MULTIPLIER: float = Field(
        default=1.5,
        env="SHEKEL_STREAK_BONUS_MULTIPLIER",
        description="Multiplier for streak bonus shekels",
    )
    SHEKEL_PERFECT_QUIZ_BONUS: int = Field(
        default=50, ge=0,
        env="SHEKEL_PERFECT_QUIZ_BONUS",
        description="Bonus shekels for perfect quiz score",
    )
    SHEKEL_PHRASE_LEARN_REWARD: int = Field(
        default=5, ge=0,
        env="SHEKEL_PHRASE_LEARN_REWARD",
        description="Shekels earned per phrase learned",
    )
    SHEKEL_REWARD_EXCELLENT: int = Field(
        default=10, ge=0,
        env="SHEKEL_REWARD_EXCELLENT",
        description="Shekels earned for excellent pronunciation quality",
    )
    SHEKEL_REWARD_GOOD: int = Field(
        default=5, ge=0,
        env="SHEKEL_REWARD_GOOD",
        description="Shekels earned for good pronunciation quality",
    )
    SHEKEL_REWARD_FAIR: int = Field(
        default=2, ge=0,
        env="SHEKEL_REWARD_FAIR",
        description="Shekels earned for fair pronunciation quality",
    )
    SHEKEL_REWARD_NEEDS_PRACTICE: int = Field(
        default=1, ge=0,
        env="SHEKEL_REWARD_NEEDS_PRACTICE",
        description="Shekels earned for needs-practice pronunciation quality",
    )
    LEADERBOARD_DISPLAY_NAME_MAX_LENGTH: int = Field(
        default=50, ge=1, le=100,
        env="LEADERBOARD_DISPLAY_NAME_MAX_LENGTH",
        description="Max length for leaderboard display names",
    )
    LEADERBOARD_PAGE_SIZE: int = Field(
        default=25, ge=5, le=100,
        env="LEADERBOARD_PAGE_SIZE",
        description="Default page size for leaderboard queries",
    )
    LEADERBOARD_RECALCULATION_INTERVAL_HOURS: int = Field(
        default=1, ge=1,
        env="LEADERBOARD_RECALCULATION_INTERVAL_HOURS",
        description="Hours between leaderboard rank recalculations",
    )
    ZINE_GENERATION_DAY: int = Field(
        default=0, ge=0, le=6,
        env="ZINE_GENERATION_DAY",
        description="Day of week for zine generation (0=Monday)",
    )
    ZINE_MAX_PAGES: int = Field(
        default=8, ge=4, le=16,
        env="ZINE_MAX_PAGES",
        description="Maximum pages per weekly zine",
    )
    ZINE_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="ZINE_AI_MODEL",
        description="Claude model for zine content generation",
    )
    ZINE_MAX_TOKENS: int = Field(
        default=4096, ge=1024, le=8192,
        env="ZINE_MAX_TOKENS",
        description="Max tokens for zine generation response",
    )

    # Phase 3 - Talk Back
    TALK_BACK_RESPONSE_TIMEOUT_SECONDS: int = Field(
        default=15, ge=5, le=60,
        env="TALK_BACK_RESPONSE_TIMEOUT_SECONDS",
        description="Seconds to wait for child's voice response",
    )
    TALK_BACK_HINT_DELAY_SECONDS: int = Field(
        default=5, ge=2, le=30,
        env="TALK_BACK_HINT_DELAY_SECONDS",
        description="Seconds before showing hint after question",
    )
    TALK_BACK_GENERATE_MAX_CUES: int = Field(
        default=200, ge=10, le=1000,
        env="TALK_BACK_GENERATE_MAX_CUES",
        description="Max subtitle cues to send to AI for point generation",
    )
    TALK_BACK_GENERATE_MAX_TOKENS: int = Field(
        default=4096, ge=512, le=8192,
        env="TALK_BACK_GENERATE_MAX_TOKENS",
        description="Max tokens for AI Talk Back point generation",
    )

    # Phase 4 - Bilingual Bridge
    BILINGUAL_DUBBING_BEGINNER_MIN_RATIO: float = Field(
        default=0.10,
        env="BILINGUAL_DUBBING_BEGINNER_MIN_RATIO",
        description="Minimum Hebrew ratio for beginner level",
    )
    BILINGUAL_DUBBING_BEGINNER_MAX_RATIO: float = Field(
        default=0.30,
        env="BILINGUAL_DUBBING_BEGINNER_MAX_RATIO",
        description="Maximum Hebrew ratio for beginner level",
    )
    BILINGUAL_DUBBING_ELEMENTARY_MIN_RATIO: float = Field(
        default=0.20,
        env="BILINGUAL_DUBBING_ELEMENTARY_MIN_RATIO",
        description="Minimum Hebrew ratio for elementary level",
    )
    BILINGUAL_DUBBING_ELEMENTARY_MAX_RATIO: float = Field(
        default=0.50,
        env="BILINGUAL_DUBBING_ELEMENTARY_MAX_RATIO",
        description="Maximum Hebrew ratio for elementary level",
    )
    BILINGUAL_DUBBING_INTERMEDIATE_MIN_RATIO: float = Field(
        default=0.40,
        env="BILINGUAL_DUBBING_INTERMEDIATE_MIN_RATIO",
        description="Minimum Hebrew ratio for intermediate level",
    )
    BILINGUAL_DUBBING_INTERMEDIATE_MAX_RATIO: float = Field(
        default=0.70,
        env="BILINGUAL_DUBBING_INTERMEDIATE_MAX_RATIO",
        description="Maximum Hebrew ratio for intermediate level",
    )
    BILINGUAL_DUBBING_ADVANCED_MIN_RATIO: float = Field(
        default=0.60,
        env="BILINGUAL_DUBBING_ADVANCED_MIN_RATIO",
        description="Minimum Hebrew ratio for advanced level",
    )
    BILINGUAL_DUBBING_ADVANCED_MAX_RATIO: float = Field(
        default=0.90,
        env="BILINGUAL_DUBBING_ADVANCED_MAX_RATIO",
        description="Maximum Hebrew ratio for advanced level",
    )
    RATIO_ADJUSTMENT_STEP: float = Field(
        default=0.05,
        env="RATIO_ADJUSTMENT_STEP",
        description="Step size for ratio adjustments per session",
    )
    BILINGUAL_DUBBING_HEBREW_VOICE_ID: str = Field(
        default="",
        env="BILINGUAL_DUBBING_HEBREW_VOICE_ID",
        description="ElevenLabs voice ID for Hebrew in bilingual dubbing",
    )
    BILINGUAL_DUBBING_ENGLISH_VOICE_ID: str = Field(
        default="",
        env="BILINGUAL_DUBBING_ENGLISH_VOICE_ID",
        description="ElevenLabs voice ID for English in bilingual dubbing",
    )
    BILINGUAL_DUBBING_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="BILINGUAL_DUBBING_AI_MODEL",
        description="Claude model for code-switch translation",
    )
    BILINGUAL_DUBBING_MAX_TOKENS: int = Field(
        default=2048, ge=512, le=8192,
        env="BILINGUAL_DUBBING_MAX_TOKENS",
        description="Max tokens for code-switch translation",
    )
    BILINGUAL_DUBBING_VOCAB_TARGET: int = Field(
        default=20, ge=5, le=100,
        env="BILINGUAL_DUBBING_VOCAB_TARGET",
        description="Target vocabulary words per session",
    )

    # Phase 5 - Star in Story
    RUNWAY_API_KEY: str = Field(
        default="",
        env="RUNWAY_API_KEY",
        description="Runway Gen-4 API key for video generation",
    )
    RUNWAY_API_BASE_URL: str = Field(
        default="https://api.dev.runwayml.com/v1",
        env="RUNWAY_API_BASE_URL",
        description="Runway API base URL",
    )
    RUNWAY_MODEL_ID: str = Field(
        default="gen4_turbo",
        env="RUNWAY_MODEL_ID",
        description="Runway model ID for video generation",
    )
    STAR_STORY_SAFETY_THRESHOLD: float = Field(
        default=0.9, ge=0.0, le=1.0,
        env="STAR_STORY_SAFETY_THRESHOLD",
        description="Minimum safety score for generated content",
    )
    STAR_STORY_MAX_EPISODES_PER_DAY: int = Field(
        default=3, ge=1,
        env="STAR_STORY_MAX_EPISODES_PER_DAY",
        description="Maximum episode generations per user per day",
    )
    CREDIT_RATE_STAR_STORY_EPISODE: int = Field(
        default=75,
        env="CREDIT_RATE_STAR_STORY_EPISODE",
        description="Beta credits per Star in Story episode",
    )
    CREDIT_RATE_STAR_STORY_AVATAR: int = Field(
        default=10,
        env="CREDIT_RATE_STAR_STORY_AVATAR",
        description="Beta credits per avatar generation",
    )
    STAR_STORY_PHOTO_RETENTION_DAYS: int = Field(
        default=7, ge=1,
        env="STAR_STORY_PHOTO_RETENTION_DAYS",
        description="Days to retain original photos before auto-delete",
    )
    STAR_STORY_EPISODE_RETENTION_DAYS: int = Field(
        default=90, ge=1,
        env="STAR_STORY_EPISODE_RETENTION_DAYS",
        description="Days to retain generated episodes",
    )
    STAR_STORY_AI_MODEL: str = Field(
        default="claude-sonnet-4-5-20250929",
        env="STAR_STORY_AI_MODEL",
        description="Claude model for script generation and safety review",
    )
    STAR_STORY_AI_MAX_TOKENS: int = Field(
        default=8192, ge=1024, le=16384,
        env="STAR_STORY_AI_MAX_TOKENS",
        description="Max tokens for script generation",
    )
    STAR_STORY_NARRATOR_VOICE_ID: str = Field(
        default="",
        env="STAR_STORY_NARRATOR_VOICE_ID",
        description="ElevenLabs voice ID for Star in Story narration",
    )
    STAR_STORY_MIN_PHOTO_WIDTH: int = Field(
        default=480, ge=100,
        env="STAR_STORY_MIN_PHOTO_WIDTH",
        description="Minimum photo width in pixels for face detection",
    )
    STAR_STORY_MIN_PHOTO_HEIGHT: int = Field(
        default=480, ge=100,
        env="STAR_STORY_MIN_PHOTO_HEIGHT",
        description="Minimum photo height in pixels for face detection",
    )

    # ============================================
    # Phase 6 - Atzmi Ba'Sipur (Interactive Missions)
    # ============================================
    CREDIT_RATE_INTERACTIVE_MISSION: int = Field(
        default=100,
        env="CREDIT_RATE_INTERACTIVE_MISSION",
        description="Beta credits per interactive mission generation",
    )
    CREDIT_RATE_VIDEO_SELFIE_AVATAR: int = Field(
        default=15,
        env="CREDIT_RATE_VIDEO_SELFIE_AVATAR",
        description="Beta credits per video selfie avatar generation",
    )
    CREDIT_RATE_VOICE_CLONE_CHILD: int = Field(
        default=10,
        env="CREDIT_RATE_VOICE_CLONE_CHILD",
        description="Beta credits per child voice clone",
    )
    CREDIT_RATE_FAMILY_SNAP: int = Field(
        default=5,
        env="CREDIT_RATE_FAMILY_SNAP",
        description="Beta credits per family snap generation",
    )
    STABILITY_API_KEY: str = Field(
        default="",
        env="STABILITY_API_KEY",
        description="Stability AI API key for scene in-painting",
    )
    STABILITY_API_BASE_URL: str = Field(
        default="https://api.stability.ai/v2beta",
        env="STABILITY_API_BASE_URL",
        description="Stability AI API base URL",
    )
    STABILITY_API_TIMEOUT: float = Field(
        default=90.0, ge=10.0,
        env="STABILITY_API_TIMEOUT",
        description="HTTP timeout in seconds for Stability AI API requests",
    )
    DID_API_KEY: str = Field(
        default="",
        env="DID_API_KEY",
        description="D-ID API key for lip-sync talking head",
    )
    DID_API_BASE_URL: str = Field(
        default="https://api.d-id.com",
        env="DID_API_BASE_URL",
        description="D-ID API base URL",
    )
    MISSION_MAX_BRANCHES: int = Field(
        default=4, ge=2, le=6,
        env="MISSION_MAX_BRANCHES",
        description="Maximum branching paths per interactive mission",
    )
    MISSION_MAX_SCENES: int = Field(
        default=10, ge=4, le=20,
        env="MISSION_MAX_SCENES",
        description="Maximum scenes per interactive mission",
    )
    MISSION_SCENE_TIMEOUT_SECONDS: int = Field(
        default=30, ge=10, le=120,
        env="MISSION_SCENE_TIMEOUT_SECONDS",
        description="Seconds before decision timeout per scene",
    )
    MISSION_MAX_PER_DAY: int = Field(
        default=5, ge=1,
        env="MISSION_MAX_PER_DAY",
        description="Maximum mission generations per user per day",
    )
    MISSION_COMPOSITION_MODE: str = Field(
        default="both",
        env="MISSION_COMPOSITION_MODE",
        description="Composition mode: overlay, inpainting, or both (A/B)",
    )
    MISSION_PRERENDER_SCENES: int = Field(
        default=2, ge=1, le=5,
        env="MISSION_PRERENDER_SCENES",
        description="Scenes to pre-render for instant playback start",
    )
    MISSION_SAFETY_THRESHOLD: float = Field(
        default=0.9, ge=0.0, le=1.0,
        env="MISSION_SAFETY_THRESHOLD",
        description="Minimum safety score for mission content",
    )
    MISSION_AVATAR_CONSISTENCY_THRESHOLD: float = Field(
        default=0.85, ge=0.5, le=1.0,
        env="MISSION_AVATAR_CONSISTENCY_THRESHOLD",
        description="CLIP cosine similarity threshold for avatar consistency",
    )
    MISSION_COMPLETION_BASE_REWARD: int = Field(
        default=50, ge=0,
        env="MISSION_COMPLETION_BASE_REWARD",
        description="Base shekel reward for completing an interactive mission",
    )
    MISSION_COMPLETION_SCORE_MULTIPLIER: int = Field(
        default=10, ge=0,
        env="MISSION_COMPLETION_SCORE_MULTIPLIER",
        description="Score-to-shekel multiplier for mission completion bonus",
    )
    MISSION_SCENE_SHEKEL_MULTIPLIER: int = Field(
        default=5, ge=0,
        env="MISSION_SCENE_SHEKEL_MULTIPLIER",
        description="Score-to-shekel multiplier for individual scene rewards",
    )
    SNAP_SHARE_BASE_URL: str = Field(
        default="",
        env="SNAP_SHARE_BASE_URL",
        description="Base URL for family snap sharing links",
    )
    SNAP_WATERMARK_TEXT: str = Field(
        default="Made with Bayit+",
        env="SNAP_WATERMARK_TEXT",
        description="Watermark text for shared family snaps",
    )
    SNAP_THUMBNAIL_WIDTH: int = Field(
        default=300, ge=50, le=1000,
        env="SNAP_THUMBNAIL_WIDTH",
        description="Thumbnail width in pixels for family snaps",
    )
    SNAP_THUMBNAIL_HEIGHT: int = Field(
        default=300, ge=50, le=1000,
        env="SNAP_THUMBNAIL_HEIGHT",
        description="Thumbnail height in pixels for family snaps",
    )
    VIDEO_SELFIE_RECORDING_DURATION_MS: int = Field(
        default=10000, ge=3000, le=30000,
        env="VIDEO_SELFIE_RECORDING_DURATION_MS",
        description="Frontend video selfie recording duration in milliseconds",
    )
    DID_API_TIMEOUT: float = Field(
        default=120.0, ge=10.0,
        env="DID_API_TIMEOUT",
        description="HTTP timeout in seconds for D-ID API requests",
    )
    DID_MAX_POLLS: int = Field(
        default=60, ge=5,
        env="DID_MAX_POLLS",
        description="Maximum polling attempts for D-ID talk result",
    )
    DID_POLL_INTERVAL: float = Field(
        default=2.0, ge=0.5,
        env="DID_POLL_INTERVAL",
        description="Seconds between D-ID polling attempts",
    )
    VIDEO_SELFIE_MAX_SIZE_BYTES: int = Field(
        default=52428800, ge=1048576,
        env="VIDEO_SELFIE_MAX_SIZE_BYTES",
        description="Maximum video selfie file size in bytes (default 50MB)",
    )
    VIDEO_SELFIE_MAX_DURATION_SECONDS: float = Field(
        default=15.0, ge=5.0, le=60.0,
        env="VIDEO_SELFIE_MAX_DURATION_SECONDS",
        description="Maximum allowed video selfie duration in seconds",
    )
    FERNET_ENCRYPTION_KEY: str = Field(
        default="",
        env="FERNET_ENCRYPTION_KEY",
        description="Base64-encoded 32-byte Fernet key for video selfie encryption",
    )

    # ============================================
    # Phase 7 - Phonetic Mirror (Perfected Voice)
    # ============================================
    PERFECTED_VOICE_MAX_AUDIO_SECONDS: int = Field(
        default=15, ge=3, le=30,
        env="PERFECTED_VOICE_MAX_AUDIO_SECONDS",
        description="Maximum audio recording duration for phonetic mirror",
    )
    PERFECTED_VOICE_MIN_CONFIDENCE: float = Field(
        default=0.3, ge=0.0, le=1.0,
        env="PERFECTED_VOICE_MIN_CONFIDENCE",
        description="Minimum Whisper confidence to accept transcription",
    )
    PERFECTED_VOICE_PRONUNCIATION_THRESHOLD: float = Field(
        default=0.7, ge=0.0, le=1.0,
        env="PERFECTED_VOICE_PRONUNCIATION_THRESHOLD",
        description="Score threshold for acceptable pronunciation",
    )
    CREDIT_RATE_PHONETIC_MIRROR: float = Field(
        default=3.0,
        env="CREDIT_RATE_PHONETIC_MIRROR",
        description="Beta credits per phonetic mirror attempt",
    )
    PERFECTED_VOICE_MAX_PER_DAY: int = Field(
        default=20, ge=1,
        env="PERFECTED_VOICE_MAX_PER_DAY",
        description="Maximum phonetic mirror attempts per user per day",
    )
    PRONUNCIATION_THRESHOLD_EXCELLENT: float = Field(
        default=0.9, ge=0.0, le=1.0,
        env="PRONUNCIATION_THRESHOLD_EXCELLENT",
        description="Score threshold for excellent pronunciation quality",
    )
    PRONUNCIATION_THRESHOLD_GOOD: float = Field(
        default=0.7, ge=0.0, le=1.0,
        env="PRONUNCIATION_THRESHOLD_GOOD",
        description="Score threshold for good pronunciation quality",
    )
    PRONUNCIATION_THRESHOLD_FAIR: float = Field(
        default=0.5, ge=0.0, le=1.0,
        env="PRONUNCIATION_THRESHOLD_FAIR",
        description="Score threshold for fair pronunciation quality",
    )
    PRONUNCIATION_THRESHOLD_NEEDS_PRACTICE: float = Field(
        default=0.2, ge=0.0, le=1.0,
        env="PRONUNCIATION_THRESHOLD_NEEDS_PRACTICE",
        description="Score threshold for needs-practice pronunciation quality",
    )
    PHONEME_SIMILARITY_MATCH_THRESHOLD: float = Field(
        default=0.9, ge=0.0, le=1.0,
        env="PHONEME_SIMILARITY_MATCH_THRESHOLD",
        description="Similarity threshold above which phoneme is considered a match (no issue)",
    )

    # ============================================
    # Phase 8 - Voice-First Interactive Missions
    # ============================================
    MISSION_VOICE_MODE_ENABLED: bool = Field(
        default=True,
        env="MISSION_VOICE_MODE_ENABLED",
        description="Enable voice phrase decision type in missions",
    )
    MISSION_VOICE_TIMEOUT_SECONDS: int = Field(
        default=15, ge=5, le=60,
        env="MISSION_VOICE_TIMEOUT_SECONDS",
        description="Seconds to wait for voice decision input",
    )
    MISSION_VOICE_MAX_ATTEMPTS: int = Field(
        default=3, ge=1, le=10,
        env="MISSION_VOICE_MAX_ATTEMPTS",
        description="Maximum voice decision attempts per scene",
    )
    MISSION_VOICE_HINT_AFTER_ATTEMPT: int = Field(
        default=2, ge=1, le=5,
        env="MISSION_VOICE_HINT_AFTER_ATTEMPT",
        description="Show pronunciation hint after N failed attempts",
    )
    MISSION_VOICE_PRAISE_TEXT: str = Field(
        default="\u05DE\u05E6\u05D5\u05D9\u05DF!",
        env="MISSION_VOICE_PRAISE_TEXT",
        description="Hebrew praise text spoken in child voice on correct answer",
    )

    # ============================================
    # Phase 9 - Gamification Levels
    # ============================================
    GAMIFICATION_XP_PER_MISSION: int = Field(
        default=100, ge=0,
        env="GAMIFICATION_XP_PER_MISSION",
        description="XP awarded per completed interactive mission",
    )
    GAMIFICATION_XP_PER_MIRROR: int = Field(
        default=25, ge=0,
        env="GAMIFICATION_XP_PER_MIRROR",
        description="XP awarded per phonetic mirror session",
    )
    GAMIFICATION_XP_PER_TALK_BACK: int = Field(
        default=15, ge=0,
        env="GAMIFICATION_XP_PER_TALK_BACK",
        description="XP awarded per Talk Back attempt",
    )
    GAMIFICATION_LEVEL_BASE_XP: int = Field(
        default=500, ge=100,
        env="GAMIFICATION_LEVEL_BASE_XP",
        description="Base XP required for first level up",
    )
    GAMIFICATION_LEVEL_XP_MULTIPLIER: float = Field(
        default=1.5, ge=1.0, le=3.0,
        env="GAMIFICATION_LEVEL_XP_MULTIPLIER",
        description="Exponential multiplier for XP per level",
    )

    # ============================================
    # Phase 10 - Grandparent Bridge
    # ============================================
    GRANDPARENT_BRIDGE_NEWS_CLIP_DURATION: int = Field(
        default=30, ge=15, le=60,
        env="GRANDPARENT_BRIDGE_NEWS_CLIP_DURATION",
        description="Target duration in seconds for news clips",
    )
    CREDIT_RATE_NEWS_CLIP: int = Field(
        default=50, ge=0,
        env="CREDIT_RATE_NEWS_CLIP",
        description="Beta credits per news clip generation",
    )
    GRANDPARENT_VOICE_NOTE_MAX_SECONDS: int = Field(
        default=60, ge=15, le=180,
        env="GRANDPARENT_VOICE_NOTE_MAX_SECONDS",
        description="Maximum grandparent voice note duration in seconds",
    )
    GRANDPARENT_BRIDGE_SHARE_BASE_URL: str = Field(
        default="",
        env="GRANDPARENT_BRIDGE_SHARE_BASE_URL",
        description="Base URL for grandparent bridge sharing links",
    )
    GRANDPARENT_BRIDGE_VOICE_NOTE_RETENTION_DAYS: int = Field(
        default=90, ge=30,
        env="GRANDPARENT_BRIDGE_VOICE_NOTE_RETENTION_DAYS",
        description="Days to retain grandparent voice notes before cleanup",
    )
    GRANDPARENT_VOICE_NOTE_MAX_SIZE_BYTES: int = Field(
        default=10_485_760, ge=1_048_576,
        env="GRANDPARENT_VOICE_NOTE_MAX_SIZE_BYTES",
        description="Maximum voice note upload size in bytes (default 10 MB)",
    )
    GRANDPARENT_BRIDGE_ALLOWED_AUDIO_TYPES: list[str] = Field(
        default=[
            "audio/webm", "audio/wav", "audio/mp3",
            "audio/mpeg", "audio/ogg", "audio/m4a",
        ],
        env="GRANDPARENT_BRIDGE_ALLOWED_AUDIO_TYPES",
        description="Allowed MIME types for grandparent voice note uploads",
    )

    # ============================================
    # Phase 11 - Chameleon Engine (Visual Style Sync)
    # ============================================
    CHAMELEON_STYLE_CACHE_TTL_HOURS: int = Field(
        default=168, ge=1,
        env="CHAMELEON_STYLE_CACHE_TTL_HOURS",
        description="Hours to cache style-transferred avatar variants",
    )
    CHAMELEON_MAX_STYLE_VARIATIONS: int = Field(
        default=3, ge=1, le=10,
        env="CHAMELEON_MAX_STYLE_VARIATIONS",
        description="Maximum cached style variations per avatar",
    )
    CHAMELEON_STYLE_SIMILARITY_THRESHOLD: float = Field(
        default=0.75, ge=0.5, le=1.0,
        env="CHAMELEON_STYLE_SIMILARITY_THRESHOLD",
        description="CLIP similarity threshold for style transfer quality",
    )
    CREDIT_RATE_STYLE_TRANSFER: int = Field(
        default=20, ge=0,
        env="CREDIT_RATE_STYLE_TRANSFER",
        description="Beta credits per style transfer generation",
    )
    CHAMELEON_FRAME_SAMPLE_COUNT: int = Field(
        default=5, ge=1, le=20,
        env="CHAMELEON_FRAME_SAMPLE_COUNT",
        description="Number of frames to sample for style analysis",
    )

    # ============================================
    # ZEH ANI: DIGITAL SOUL (Phase 1 - 3D Mesh + Biometrics)
    # ============================================
    READY_PLAYER_ME_API_KEY: str = Field(
        default="",
        env="READY_PLAYER_ME_API_KEY",
        description="Ready Player Me API key for 3D avatar mesh generation",
    )
    READY_PLAYER_ME_APP_ID: str = Field(
        default="",
        env="READY_PLAYER_ME_APP_ID",
        description="Ready Player Me application identifier",
    )
    READY_PLAYER_ME_BASE_URL: str = Field(
        default="https://api.readyplayer.me",
        env="READY_PLAYER_ME_BASE_URL",
        description="Ready Player Me API base URL",
    )
    READY_PLAYER_ME_TIMEOUT: float = Field(
        default=120.0, ge=10.0, le=300.0,
        env="READY_PLAYER_ME_TIMEOUT",
        description="Timeout in seconds for RPM mesh generation requests",
    )
    READY_PLAYER_ME_POLL_INTERVAL: float = Field(
        default=3.0, ge=1.0, le=30.0,
        env="READY_PLAYER_ME_POLL_INTERVAL",
        description="Interval in seconds between RPM status polls",
    )
    READY_PLAYER_ME_MAX_POLLS: int = Field(
        default=40, ge=5, le=200,
        env="READY_PLAYER_ME_MAX_POLLS",
        description="Maximum number of RPM status poll attempts",
    )
    CREDIT_RATE_CREATIFY_AVATAR: int = Field(
        default=30, ge=0,
        env="CREDIT_RATE_CREATIFY_AVATAR",
        description="Beta credits per Creatify persona creation",
    )
    CREDIT_RATE_CREATIFY_LIPSYNC: int = Field(
        default=20, ge=0,
        env="CREDIT_RATE_CREATIFY_LIPSYNC",
        description="Beta credits per Creatify lip-sync video generation",
    )
    CREATIFY_SIGNED_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="CREATIFY_SIGNED_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for avatar images sent to Creatify API",
    )
    CONTROLNET_API_BASE_URL: str = Field(
        default="",
        env="CONTROLNET_API_BASE_URL",
        description="ControlNet (Replicate) API base URL for style transfer",
    )
    CONTROLNET_API_KEY: str = Field(
        default="",
        env="CONTROLNET_API_KEY",
        description="ControlNet (Replicate) API key",
    )
    CONTROLNET_TIMEOUT: float = Field(
        default=90.0, ge=10.0, le=300.0,
        env="CONTROLNET_TIMEOUT",
        description="Timeout in seconds for ControlNet style transfer requests",
    )
    CONTROLNET_STYLE_STRENGTH: float = Field(
        default=0.65, ge=0.0, le=1.0,
        env="CONTROLNET_STYLE_STRENGTH",
        description="ControlNet IP-Adapter style transfer strength",
    )
    BIOMETRIC_VECTOR_ENCRYPTION_KEY_ID: str = Field(
        default="",
        env="BIOMETRIC_VECTOR_ENCRYPTION_KEY_ID",
        description="KMS key ID for encrypting biometric latent vectors",
    )
    BIOMETRIC_LATENT_VECTOR_MAX_SIZE_BYTES: int = Field(
        default=8192, ge=1024, le=65536,
        env="BIOMETRIC_LATENT_VECTOR_MAX_SIZE_BYTES",
        description="Maximum allowed size in bytes for biometric latent vectors",
    )

    # ============================================
    # ZEH ANI: PHONETIC MIRROR V2 (Phase 2 - V2V Audio Pipeline)
    # ============================================
    ELEVENLABS_V2V_MODEL: str = Field(
        default="eleven_english_sts_v2",
        env="ELEVENLABS_V2V_MODEL",
        description="ElevenLabs voice-to-voice model ID",
    )
    ELEVENLABS_V2V_TIMEOUT: float = Field(
        default=10.0, ge=2.0, le=60.0,
        env="ELEVENLABS_V2V_TIMEOUT",
        description="Timeout in seconds for V2V transform requests",
    )
    ELEVENLABS_V2V_SIMILARITY_BOOST: float = Field(
        default=0.8, ge=0.0, le=1.0,
        env="ELEVENLABS_V2V_SIMILARITY_BOOST",
        description="Voice similarity boost for V2V transforms",
    )
    ELEVENLABS_V2V_STABILITY: float = Field(
        default=0.5, ge=0.0, le=1.0,
        env="ELEVENLABS_V2V_STABILITY",
        description="Voice stability parameter for V2V transforms",
    )
    CREDIT_RATE_V2V_TRANSFORM: float = Field(
        default=8.0, ge=0.0,
        env="CREDIT_RATE_V2V_TRANSFORM",
        description="Beta credits per V2V voice transform",
    )
    WHISPER_CHILD_SPEECH_MODEL: str = Field(
        default="large-v3",
        env="WHISPER_CHILD_SPEECH_MODEL",
        description="Whisper model optimized for child speech recognition",
    )
    WHISPER_CODE_SWITCH_ENABLED: bool = Field(
        default=True,
        env="WHISPER_CODE_SWITCH_ENABLED",
        description="Enable Hebrew-English code-switch detection",
    )
    WHISPER_LANGUAGE_HINTS: str = Field(
        default="he,en",
        env="WHISPER_LANGUAGE_HINTS",
        description="Comma-separated language hints for Whisper ASR",
    )
    V2V_MAX_LATENCY_MS: int = Field(
        default=1500, ge=500, le=5000,
        env="V2V_MAX_LATENCY_MS",
        description="Maximum acceptable latency in ms for V2V pipeline",
    )
    V2V_EDGE_CACHE_TTL_SECONDS: int = Field(
        default=300, ge=60, le=3600,
        env="V2V_EDGE_CACHE_TTL_SECONDS",
        description="TTL for edge-cached V2V transform results",
    )

    # ============================================
    # ZEH ANI: NARRATIVE ORCHESTRATION (Phase 3 - Live Layer + Magic Mirror)
    # ============================================
    SYNCLABS_API_KEY: str = Field(
        default="",
        env="SYNCLABS_API_KEY",
        description="SyncLabs API key for real-time lip-sync",
    )
    SYNCLABS_BASE_URL: str = Field(
        default="https://api.synclabs.so",
        env="SYNCLABS_BASE_URL",
        description="SyncLabs API base URL",
    )
    SYNCLABS_TIMEOUT: float = Field(
        default=15.0, ge=5.0, le=60.0,
        env="SYNCLABS_TIMEOUT",
        description="Timeout in seconds for SyncLabs requests",
    )
    SYNCLABS_WEBSOCKET_URL: str = Field(
        default="wss://api.synclabs.so/ws",
        env="SYNCLABS_WEBSOCKET_URL",
        description="SyncLabs WebSocket URL for streaming lip-sync",
    )
    CREDIT_RATE_LIVE_LAYER: float = Field(
        default=2.0, ge=0.0,
        env="CREDIT_RATE_LIVE_LAYER",
        description="Beta credits per live layer interaction",
    )
    CREDIT_RATE_SYNCLABS_LIPSYNC: float = Field(
        default=3.0, ge=0.0,
        env="CREDIT_RATE_SYNCLABS_LIPSYNC",
        description="Beta credits per SyncLabs lip-sync generation",
    )
    SCENE_TRIGGER_LOOKAHEAD_SECONDS: float = Field(
        default=5.0, ge=1.0, le=30.0,
        env="SCENE_TRIGGER_LOOKAHEAD_SECONDS",
        description="Seconds to look ahead for upcoming scene triggers",
    )
    SCENE_TRIGGER_MAX_PER_CONTENT: int = Field(
        default=20, ge=1, le=100,
        env="SCENE_TRIGGER_MAX_PER_CONTENT",
        description="Maximum scene triggers per content item",
    )
    MAGIC_MIRROR_GREETING_REFRESH_HOURS: int = Field(
        default=12, ge=1, le=48,
        env="MAGIC_MIRROR_GREETING_REFRESH_HOURS",
        description="Hours between magic mirror greeting refreshes",
    )
    CREDIT_RATE_MAGIC_MIRROR: float = Field(
        default=5.0, ge=0.0,
        env="CREDIT_RATE_MAGIC_MIRROR",
        description="Beta credits per magic mirror greeting generation",
    )

    # VOD Avatar Interaction (Character Conversations)
    CREDIT_RATE_VOD_INTERACTION_MESSAGE: int = Field(
        default=1, ge=0,
        env="CREDIT_RATE_VOD_INTERACTION_MESSAGE",
        description="Beta credits per character dialogue exchange",
    )
    CREDIT_RATE_VOD_INTERACTION_REEL: int = Field(
        default=25, ge=0,
        env="CREDIT_RATE_VOD_INTERACTION_REEL",
        description="Beta credits per interaction reel generation",
    )
    VOD_INTERACTION_MAX_DURATION: int = Field(
        default=30, ge=10, le=120,
        env="VOD_INTERACTION_MAX_DURATION",
        description="Maximum reel duration in seconds",
    )
    VOD_INTERACTION_MAX_EXCHANGES: int = Field(
        default=5, ge=1, le=20,
        env="VOD_INTERACTION_MAX_EXCHANGES",
        description="Maximum dialogue exchanges per session",
    )
    VOD_INTERACTION_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="VOD_INTERACTION_AI_MODEL",
        description="Claude model for character dialogue generation",
    )
    VOD_INTERACTION_AI_MAX_TOKENS: int = Field(
        default=200, ge=50, le=1000,
        env="VOD_INTERACTION_AI_MAX_TOKENS",
        description="Max tokens for character dialogue response",
    )

    # Phase 3: Voice Interaction (WS1)
    VOD_INTERACTION_VOICE_ENABLED: bool = Field(
        default=True,
        env="VOD_INTERACTION_VOICE_ENABLED",
        description="Enable voice interaction via WebSocket",
    )
    VOD_INTERACTION_MAX_AUDIO_CHUNK_BYTES: int = Field(
        default=512000, ge=10000, le=2000000,
        env="VOD_INTERACTION_MAX_AUDIO_CHUNK_BYTES",
        description="Max audio data size per utterance in bytes",
    )
    VOD_INTERACTION_VOICE_TIMEOUT_SECONDS: int = Field(
        default=30, ge=5, le=120,
        env="VOD_INTERACTION_VOICE_TIMEOUT_SECONDS",
        description="Inactivity timeout for voice interaction WebSocket",
    )
    VOD_INTERACTION_VOICE_MAX_EXCHANGES: int = Field(
        default=10, ge=1, le=30,
        env="VOD_INTERACTION_VOICE_MAX_EXCHANGES",
        description="Max voice exchanges per session",
    )

    # Phase 3: Smart Avatar Positioning (WS2)
    VOD_INTERACTION_SMART_POSITIONING: bool = Field(
        default=True,
        env="VOD_INTERACTION_SMART_POSITIONING",
        description="Enable smart avatar placement based on scene analysis",
    )
    VOD_INTERACTION_DEFAULT_AVATAR_POSITION: str = Field(
        default="bottom_left",
        env="VOD_INTERACTION_DEFAULT_AVATAR_POSITION",
        description="Default avatar position quadrant",
    )
    VOD_INTERACTION_AVATAR_SIZE_RATIO: float = Field(
        default=0.15, ge=0.05, le=0.4,
        env="VOD_INTERACTION_AVATAR_SIZE_RATIO",
        description="Avatar size as ratio of frame dimensions",
    )

    # Phase 3: Multi-Character Interaction (WS3)
    VOD_INTERACTION_MULTI_CHARACTER_ENABLED: bool = Field(
        default=True,
        env="VOD_INTERACTION_MULTI_CHARACTER_ENABLED",
        description="Enable multi-character interactions",
    )
    VOD_INTERACTION_MAX_CHARACTERS_PER_MOMENT: int = Field(
        default=3, ge=1, le=5,
        env="VOD_INTERACTION_MAX_CHARACTERS_PER_MOMENT",
        description="Max characters in a single interactive moment",
    )
    VOD_INTERACTION_REACTIONS_ENABLED: bool = Field(
        default=True,
        env="VOD_INTERACTION_REACTIONS_ENABLED",
        description="Enable text reactions from non-addressed characters",
    )
    VOD_INTERACTION_REACTION_PROBABILITY: float = Field(
        default=0.4, ge=0.0, le=1.0,
        env="VOD_INTERACTION_REACTION_PROBABILITY",
        description="Probability of non-addressed character reacting",
    )

    # Phase 3: Shared Interactive Sessions (WS4)
    VOD_INTERACTION_SHARED_ENABLED: bool = Field(
        default=True,
        env="VOD_INTERACTION_SHARED_ENABLED",
        description="Enable shared interactive sessions in watch parties",
    )
    VOD_INTERACTION_MAX_SHARED_PARTICIPANTS: int = Field(
        default=4, ge=2, le=8,
        env="VOD_INTERACTION_MAX_SHARED_PARTICIPANTS",
        description="Max participants in shared interaction session",
    )
    VOD_INTERACTION_TURN_TIMEOUT_SECONDS: int = Field(
        default=30, ge=10, le=120,
        env="VOD_INTERACTION_TURN_TIMEOUT_SECONDS",
        description="Auto-advance after this many seconds of inactivity",
    )
    VOD_INTERACTION_TURN_WARNING_SECONDS: int = Field(
        default=10, ge=3, le=30,
        env="VOD_INTERACTION_TURN_WARNING_SECONDS",
        description="Seconds before timeout to send countdown warning",
    )
    VOD_INTERACTION_MAX_TURNS_PER_PARTICIPANT: int = Field(
        default=3, ge=1, le=10,
        env="VOD_INTERACTION_MAX_TURNS_PER_PARTICIPANT",
        description="Max turns each participant gets in shared session",
    )
    CREDIT_RATE_VOD_INTERACTION_SHARED_REEL: int = Field(
        default=15, ge=0,
        env="CREDIT_RATE_VOD_INTERACTION_SHARED_REEL",
        description="Credits per shared interaction reel (split among participants)",
    )

    # ============================================
    # MOVIE INTERACTIONS HUB (Zeh Ani Phase 4 - Browse & Talk to Characters)
    # ============================================
    MOVIE_INTERACTION_MAX_CHARACTERS: int = Field(
        default=6, ge=1, le=20,
        env="MOVIE_INTERACTION_MAX_CHARACTERS",
        description="Max characters to extract per movie from TMDB cast",
    )
    MOVIE_INTERACTION_QUESTIONS_PER_CHARACTER: int = Field(
        default=5, ge=1, le=10,
        env="MOVIE_INTERACTION_QUESTIONS_PER_CHARACTER",
        description="Number of AI-generated questions per character",
    )
    MOVIE_INTERACTION_DEFAULT_VOICE_MALE: str = Field(
        default="",
        env="MOVIE_INTERACTION_DEFAULT_VOICE_MALE",
        description="ElevenLabs voice ID for male characters",
    )
    MOVIE_INTERACTION_DEFAULT_VOICE_FEMALE: str = Field(
        default="",
        env="MOVIE_INTERACTION_DEFAULT_VOICE_FEMALE",
        description="ElevenLabs voice ID for female characters",
    )
    MOVIE_INTERACTION_AI_MODEL: str = Field(
        default="claude-sonnet-4-20250514",
        env="MOVIE_INTERACTION_AI_MODEL",
        description="Claude model for character profile generation",
    )

    # ============================================
    # VOICE CLONING (Character Voice Matching)
    # ============================================
    VOICE_CLONE_MIN_AUDIO_DURATION_SEC: float = Field(
        default=30.0, ge=5.0, le=120.0,
        env="VOICE_CLONE_MIN_AUDIO_DURATION_SEC",
        description="Minimum audio duration (seconds) required for voice cloning",
    )
    VOICE_CLONE_TARGET_AUDIO_DURATION_SEC: float = Field(
        default=90.0, ge=30.0, le=300.0,
        env="VOICE_CLONE_TARGET_AUDIO_DURATION_SEC",
        description="Target audio duration (seconds) per character sample",
    )
    VOICE_CLONE_MAX_CHARACTERS_PER_CONTENT: int = Field(
        default=4, ge=1, le=10,
        env="VOICE_CLONE_MAX_CHARACTERS_PER_CONTENT",
        description="Maximum characters to clone voices for per content item",
    )
    VOICE_CLONE_TARGET_CUE_COUNT: int = Field(
        default=25, ge=5, le=100,
        env="VOICE_CLONE_TARGET_CUE_COUNT",
        description="Target subtitle cues to collect per character",
    )
    VOICE_CLONE_AUTO_AFTER_EXTRACTION: bool = Field(
        default=False,
        env="VOICE_CLONE_AUTO_AFTER_EXTRACTION",
        description="Auto-trigger voice cloning after character extraction",
    )
    VOICE_CLONE_AUDIO_FILTER: str = Field(
        default="highpass=f=200,lowpass=f=3000",
        env="VOICE_CLONE_AUDIO_FILTER",
        description="FFmpeg audio filter for isolating speech frequencies",
    )
    VOICE_CLONE_FFMPEG_TIMEOUT: int = Field(
        default=300, ge=30, le=1800,
        env="VOICE_CLONE_FFMPEG_TIMEOUT",
        description="FFmpeg extraction timeout in seconds",
    )
    VOICE_CLONE_SUBTITLE_LANG_PRIORITY: str = Field(
        default="en,he",
        env="VOICE_CLONE_SUBTITLE_LANG_PRIORITY",
        description="Comma-separated subtitle language priority for cue matching",
    )

    # ============================================
    # ZEH ANI: GRANDPARENT LOOP (Phase 4 - Highlights + WhatsApp)
    # ============================================
    HIGHLIGHT_REEL_DURATION_SECONDS: int = Field(
        default=30, ge=10, le=120,
        env="HIGHLIGHT_REEL_DURATION_SECONDS",
        description="Target duration for generated highlight reels",
    )
    HIGHLIGHT_REEL_MIN_INTERACTIONS: int = Field(
        default=3, ge=1, le=20,
        env="HIGHLIGHT_REEL_MIN_INTERACTIONS",
        description="Minimum interactions required for reel generation",
    )
    CREDIT_RATE_HIGHLIGHT_REEL: int = Field(
        default=20, ge=0,
        env="CREDIT_RATE_HIGHLIGHT_REEL",
        description="Beta credits per highlight reel generation",
    )
    TWILIO_WHATSAPP_NUMBER: str = Field(
        default="",
        env="TWILIO_WHATSAPP_NUMBER",
        description="Twilio WhatsApp sender number",
    )
    TWILIO_WHATSAPP_TEMPLATE_SID: str = Field(
        default="",
        env="TWILIO_WHATSAPP_TEMPLATE_SID",
        description="Twilio WhatsApp approved template SID",
    )
    TWILIO_WHATSAPP_CONTENT_SID: str = Field(
        default="",
        env="TWILIO_WHATSAPP_CONTENT_SID",
        description="Twilio WhatsApp content SID for media messages",
    )
    TWILIO_WHATSAPP_WEBHOOK_URL: str = Field(
        default="",
        env="TWILIO_WHATSAPP_WEBHOOK_URL",
        description="Full public URL of the Twilio WhatsApp webhook for signature verification",
    )
    GRANDPARENT_FEEDBACK_NOTIFICATION_ENABLED: bool = Field(
        default=True,
        env="GRANDPARENT_FEEDBACK_NOTIFICATION_ENABLED",
        description="Enable in-app notifications for grandparent replies",
    )
    GRANDPARENT_REPLY_TRANSCRIPTION_ENABLED: bool = Field(
        default=True,
        env="GRANDPARENT_REPLY_TRANSCRIPTION_ENABLED",
        description="Enable automatic transcription of grandparent voice replies",
    )
    VOICE_MESSAGE_FALLBACKS: dict = Field(
        default={
            "he": "\u05e9\u05dc\u05d7 \u05d4\u05d5\u05d3\u05e2\u05d4 \u05e7\u05d5\u05dc\u05d9\u05ea",
            "en": "Sent a voice message",
            "es": "Envi\u00f3 un mensaje de voz",
            "fr": "A envoy\u00e9 un message vocal",
            "it": "Ha inviato un messaggio vocale",
            "ja": "\u97f3\u58f0\u30e1\u30c3\u30bb\u30fc\u30b8\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f",
            "zh": "\u53d1\u9001\u4e86\u8bed\u97f3\u6d88\u606f",
            "hi": "\u090f\u0915 \u0935\u0949\u092f\u0938 \u092e\u0948\u0938\u0947\u091c \u092d\u0947\u091c\u093e",
            "ta": "\u0b95\u0bc1\u0bb0\u0bb2\u0bcd \u0b9a\u0bc6\u0baf\u0bcd\u0ba4\u0bbf \u0b85\u0ba9\u0bc1\u0baa\u0bcd\u0baa\u0bbf\u0baf\u0ba4\u0bc1",
            "bn": "\u098f\u0995\u099f\u09bf \u09ad\u09df\u09c7\u09b8 \u09ae\u09c7\u09b8\u09c7\u099c \u09aa\u09be\u09a0\u09bf\u09df\u09c7\u099b\u09c7",
        },
        description="Localized fallback text for voice message notifications (keyed by ISO 639-1)",
    )
    WHATSAPP_SHARE_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="WHATSAPP_SHARE_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for WhatsApp shared highlight videos",
    )
    PHONE_HASH_SALT: str = Field(
        default="",
        env="PHONE_HASH_SALT",
        description="HMAC salt for phone number hashing (prevents rainbow table attacks)",
    )
    WEBSOCKET_MAX_AUDIO_PAYLOAD_BYTES: int = Field(
        default=1048576, ge=65536, le=10485760,
        env="WEBSOCKET_MAX_AUDIO_PAYLOAD_BYTES",
        description="Maximum audio payload size in bytes for WebSocket messages (1MB default)",
    )
    MESH_SIGNED_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="MESH_SIGNED_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for mesh .glb file downloads",
    )
    SYNCLABS_SIGNED_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="SYNCLABS_SIGNED_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for audio files sent to SyncLabs API",
    )
    HIGHLIGHT_SHARE_URL_EXPIRY_SECONDS: int = Field(
        default=3600, ge=300, le=86400,
        env="HIGHLIGHT_SHARE_URL_EXPIRY_SECONDS",
        description="Signed URL expiry for public highlight reel share links",
    )

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
