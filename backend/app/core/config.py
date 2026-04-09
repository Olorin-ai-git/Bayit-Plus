import os
from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings

from app.core.config_domains.ai_nlp import AINLPConfigMixin
from app.core.config_domains.auth_external import AuthExternalConfigMixin
from app.core.config_domains.backward_compat import BackwardCompatPropertiesMixin
from app.core.config_domains.beta_credits import BetaCreditsConfigMixin
from app.core.config_domains.dubbing import DubbingConfigMixin
from app.core.config_domains.dubbing_latency import DubbingLatencyConfigMixin
from app.core.config_domains.freemium import FreemiumConfigMixin
from app.core.config_domains.hebrew_advanced import HebrewAdvancedConfigMixin
from app.core.config_domains.hebrew_bilingual import HebrewBilingualConfigMixin
from app.core.config_domains.hebrew_engagement import HebrewEngagementConfigMixin
from app.core.config_domains.hebrew_phase6 import HebrewPhase6ConfigMixin
from app.core.config_domains.hebrew_phases10_11 import HebrewPhases10To11ConfigMixin
from app.core.config_domains.interactive import InteractiveConfigMixin
from app.core.config_domains.interactive_movies import InteractiveMoviesConfigMixin
from app.core.config_domains.scorm import ScormConfigMixin
from app.core.config_domains.kids_documentary import KidsDocumentaryConfigMixin
from app.core.config_domains.kids_trivia import KidsTriviaConfigMixin
from app.core.config_domains.live_quotas import LiveQuotasConfigMixin
from app.core.config_domains.media import MediaConfigMixin
from app.core.config_domains.media_pipeline import MediaPipelineConfigMixin
from app.core.config_domains.media_ssrf import MediaSsrfConfigMixin
from app.core.config_domains.monitoring import MonitoringConfigMixin
from app.core.config_domains.olorin_compat import OlorinCompatConfigMixin
from app.core.config_domains.restored_fields import RestoredFieldsMixin
from app.core.config_domains.payments import PaymentsConfigMixin
from app.core.config_domains.voice import VoiceConfigMixin
from app.core.config_domains.zehani import ZehAniConfigMixin
from app.core.config_domains.zehani_grandparent import ZehAniGrandparentConfigMixin
from app.core.olorin_config import OlorinSettings

# Load environment files in proper hierarchy
try:
    base_platform_env = Path(__file__).resolve().parents[5] / "olorin-infra" / ".env"
    if base_platform_env.exists():
        load_dotenv(base_platform_env, override=False)
except (IndexError, OSError):
    pass

try:
    backend_env = Path(__file__).resolve().parents[2] / ".env"
    if backend_env.exists():
        load_dotenv(backend_env, override=True)
except (IndexError, OSError):
    pass


class Settings(
    RestoredFieldsMixin,
    BackwardCompatPropertiesMixin,
    PaymentsConfigMixin,
    FreemiumConfigMixin,
    BetaCreditsConfigMixin,
    AINLPConfigMixin,
    VoiceConfigMixin,
    AuthExternalConfigMixin,
    DubbingConfigMixin,
    DubbingLatencyConfigMixin,
    MediaConfigMixin,
    MediaSsrfConfigMixin,
    MediaPipelineConfigMixin,
    KidsTriviaConfigMixin,
    KidsDocumentaryConfigMixin,
    MonitoringConfigMixin,
    LiveQuotasConfigMixin,
    HebrewEngagementConfigMixin,
    HebrewBilingualConfigMixin,
    HebrewAdvancedConfigMixin,
    HebrewPhase6ConfigMixin,
    HebrewPhases10To11ConfigMixin,
    ZehAniConfigMixin,
    InteractiveConfigMixin,
    InteractiveMoviesConfigMixin,
    ScormConfigMixin,
    ZehAniGrandparentConfigMixin,
    OlorinCompatConfigMixin,
    BaseSettings,
):
    # App
    APP_NAME: str = "Bayit+ API"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api/v1"

    # Security
    SECRET_KEY: str
    SECRET_KEY_OLD: str = ""
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    CSRF_ENABLED: bool = False

    # Auth Service Integration
    AUTH_SERVICE_URL: str = Field(
        default="https://auth.olorin.ai",
        description="Olorin Auth Service URL for RS256 token verification",
    )
    AUTH_SERVICE_ENABLED: bool = Field(
        default=True,
        description="Enable auth service integration (dual-mode during migration)",
    )

    # Training Portal
    TRAINING_PORTAL_URL: str = Field(
        default="",
        description="Training portal URL for password reset links (e.g. https://training.olorin.ai)",
    )
    TRAINING_SAMPLE_VIDEO_URL: str = Field(
        default="",
        description="URL of sample video to seed for new training orgs (empty = skip)",
    )
    TRAINING_SAMPLE_VIDEO_TITLE: str = Field(
        default="Welcome to Olorin Training",
        description="Title for the sample training video",
    )

    # MongoDB
    MONGODB_URI: str
    MONGODB_DB_NAME: str = "bayit_plus"

    # Redis
    REDIS_URL: str = Field(
        default="",
        description="Redis connection URL. Empty disables Redis with graceful degradation.",
    )

    # Olorin platform (nested)
    olorin: OlorinSettings = Field(
        default_factory=OlorinSettings,
        description="Olorin.ai platform configuration (nested)",
    )

    # Training platform — per-tier video duration limits
    TRAINING_MAX_DURATION_TRIAL_SECONDS: int = Field(
        default=1800,
        ge=0,
        description="Max video duration (seconds) for trial orgs. 0 = unlimited.",
    )
    TRAINING_MAX_DURATION_TEAM_SECONDS: int = Field(
        default=7200,
        ge=0,
        description="Max video duration (seconds) for team-tier orgs. 0 = unlimited.",
    )

    # Comprehension Mode B2B (Phase 3)
    COMPREHENSION_TURN_CREDIT_COST: int = Field(
        default=1,
        ge=0,
        description="Credits deducted per turn for comprehension_mode capability — D-16",
    )
    COMPREHENSION_SHARE_TOKEN_BYTES: int = Field(
        default=24,
        ge=16,
        description=(
            "secrets.token_urlsafe byte count for share tokens — D-09 "
            "minimum 32 chars (24 bytes -> 32 url-safe chars)"
        ),
    )

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
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
        if not v:
            raise ValueError(
                "MONGODB_URI must be configured. Set it to your MongoDB Atlas or server URL."
            )
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

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
