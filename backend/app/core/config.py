import os
import ssl
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlsplit

from dotenv import load_dotenv
from pydantic import Field, field_validator, model_validator
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
from app.core.config_domains.source_connector import SourceConnectorConfigMixin
from app.core.config_domains.training_credits import TrainingCreditsConfigMixin
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
from app.core.config_domains.provider_costs import ProviderCostsConfigMixin
from app.core.config_domains.voice import VoiceConfigMixin
from app.core.config_domains.zehani import ZehAniConfigMixin
from app.core.config_domains.zehani_grandparent import ZehAniGrandparentConfigMixin
from app.core.olorin_config import OlorinSettings

HTTP_FIELD_NAME_CHARACTERS = frozenset(
    "!#$%&'*+-.^_`|~0123456789" "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
)
PROTECTED_PROVIDER_HEADER_NAMES = frozenset(
    {
        "api-key",
        "anthropic-beta",
        "anthropic-version",
        "authorization",
        "connection",
        "content-length",
        "content-type",
        "cookie",
        "host",
        "keep-alive",
        "openai-organization",
        "openai-project",
        "proxy-authenticate",
        "proxy-authorization",
        "set-cookie",
        "te",
        "trailer",
        "transfer-encoding",
        "upgrade",
        "x-api-key",
        "x-erebor-request-id",
        "x-erebor-task-class",
        "x-goog-api-key",
    }
)


def validate_provider_correlation_header_name(header_name: str) -> str:
    """Reject invalid or protected outbound provider correlation headers."""
    if not header_name or any(
        character not in HTTP_FIELD_NAME_CHARACTERS for character in header_name
    ):
        raise ValueError("Correlation ID header must be a valid HTTP field name")
    if header_name.casefold() in PROTECTED_PROVIDER_HEADER_NAMES:
        raise ValueError(
            "Correlation ID header conflicts with a protected provider header"
        )
    return header_name


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
    ProviderCostsConfigMixin,
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
    SourceConnectorConfigMixin,
    TrainingCreditsConfigMixin,
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

    MAX_REQUEST_BODY_BYTES: int = Field(
        default=1_048_576,
        description="Global max request body size in bytes. File upload routes are exempt.",
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

    # === Ask Olorin shared memory corpus (Phase 0 + Phase 1) ===
    KNOWLEDGE_PINECONE_TOP_K_ORG: int = 40
    KNOWLEDGE_PINECONE_TOP_K_TEAM: int = 20
    KNOWLEDGE_CANONICAL_BOOST: float = 1.4
    KNOWLEDGE_DOC_BOOST: float = 1.2
    KNOWLEDGE_STALE_BOOST: float = 0.8
    KNOWLEDGE_CANONICAL_CONFIDENCE_THRESHOLD: float = 0.85
    KNOWLEDGE_MAX_SOURCES_DEFAULT: int = 5
    KNOWLEDGE_HISTORY_USER_LIMIT: int = 30
    KNOWLEDGE_HISTORY_USER_WINDOW_DAYS: int = 90

    # === Ask Olorin multi-format ingestion (Phase 2) ===
    KNOWLEDGE_DOC_PER_FILE_MB_ORG: int = 25
    KNOWLEDGE_DOC_PER_FILE_MB_ENTERPRISE: int = 100
    KNOWLEDGE_DOC_TOTAL_MB_ORG: int = 1024
    KNOWLEDGE_DOC_TOTAL_MB_ENTERPRISE: int = 10240
    KNOWLEDGE_DOC_URL_HOURLY_ORG: int = 10
    KNOWLEDGE_DOC_URL_HOURLY_ENTERPRISE: int = 50
    KNOWLEDGE_DOC_CHUNK_TOKENS: int = 512
    KNOWLEDGE_DOC_CHUNK_OVERLAP: int = 50

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

    @model_validator(mode="after")
    def validate_twogates_routing(self) -> "Settings":
        """Require a complete, safe CONNECT configuration before opt-in."""
        validate_provider_correlation_header_name(self.CORRELATION_ID_HEADER)
        proxy_url = self.TWOGATES_PROXY_URL.get_secret_value().strip()
        proxy_credential = self.TWOGATES_PROXY_CREDENTIAL.get_secret_value().strip()
        ca_cert_pem = self.TWOGATES_CA_CERT_PEM.get_secret_value().strip()
        connection_values = (
            proxy_url,
            proxy_credential,
            ca_cert_pem,
            self.TWOGATES_TASK_CLASS,
        )
        configured = [bool(value) for value in connection_values]

        if any(configured) and not all(configured):
            raise ValueError(
                "TwoGates routing settings must be configured as an all-or-none group"
            )
        if self.TWOGATES_ROUTING_ENABLED and not all(configured):
            raise ValueError(
                "TwoGates routing cannot be enabled without its complete connection settings"
            )
        if all(configured):
            parsed = urlsplit(proxy_url)
            if parsed.scheme != "https" or not parsed.hostname or parsed.port is None:
                raise ValueError("TwoGates proxy URL must be an HTTPS origin with a port")
            if (
                parsed.username
                or parsed.password
                or parsed.path not in ("", "/")
                or parsed.query
                or parsed.fragment
            ):
                raise ValueError(
                    "TwoGates proxy URL must be a credential-free HTTPS origin"
                )

            token_parts = proxy_credential.split("_", 2)
            if (
                len(token_parts) != 3
                or token_parts[0] != "tg"
                or not token_parts[1]
                or not token_parts[2]
                or any(
                    ord(character) < 33 or ord(character) > 126
                    for character in proxy_credential
                )
            ):
                raise ValueError("TwoGates proxy credential must be an agent token")

            if (
                "-----BEGIN CERTIFICATE-----" not in ca_cert_pem
                or "-----END CERTIFICATE-----" not in ca_cert_pem
            ):
                raise ValueError("TwoGates CA certificate must be PEM encoded")
            try:
                context = ssl.create_default_context()
                context.load_verify_locations(cadata=ca_cert_pem)
            except ssl.SSLError as exc:
                raise ValueError(
                    "TwoGates CA certificate must be a valid PEM bundle"
                ) from exc

        if self.TWOGATES_MAX_KEEPALIVE_CONNECTIONS > self.TWOGATES_MAX_CONNECTIONS:
            raise ValueError(
                "TwoGates keepalive connection limit cannot exceed its total connection limit"
            )
        return self

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "allow"


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
