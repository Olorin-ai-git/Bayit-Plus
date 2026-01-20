"""
Olorin.ai Platform Configuration

Nested Pydantic configuration models for the Olorin AI overlay platform.
This module provides separation of concerns for Olorin-specific settings.
"""

from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from olorin_i18n import I18nConfig


class PartnerAPIConfig(BaseSettings):
    """Partner API authentication and rate limiting configuration."""

    api_key_salt: str = Field(
        default="",
        description="Salt for API key hashing (bcrypt). REQUIRED in production.",
    )
    default_rate_limit_rpm: int = Field(
        default=60,
        ge=1,
        le=10000,
        description="Default rate limit for partner API calls (requests per minute)",
    )
    webhook_timeout_seconds: float = Field(
        default=10.0,
        ge=1.0,
        le=60.0,
        description="Timeout for partner webhook deliveries",
    )

    @field_validator("api_key_salt")
    @classmethod
    def validate_api_key_salt(cls, v: str) -> str:
        """Validate API key salt is set for production use."""
        if not v:
            # Return empty string for optional configuration
            # Production validation happens in config_validation.py
            return v
        if len(v) < 32:
            raise ValueError(
                "PARTNER_API_KEY_SALT must be at least 32 characters. "
                'Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"'
            )
        return v

    class Config:
        env_prefix = "PARTNER_"


class PineconeConfig(BaseSettings):
    """Pinecone vector database configuration for semantic search."""

    api_key: str = Field(
        default="",
        description="Pinecone API key. REQUIRED if semantic_search_enabled=true.",
    )
    environment: str = Field(
        default="us-east-1-aws",
        description="Pinecone environment/region",
    )
    index_name: str = Field(
        default="olorin-content",
        description="Pinecone index name for content embeddings",
    )

    class Config:
        env_prefix = "PINECONE_"


class EmbeddingConfig(BaseSettings):
    """Embedding model configuration for semantic search."""

    model: str = Field(
        default="text-embedding-3-small",
        description="OpenAI embedding model name",
    )
    dimensions: int = Field(
        default=1536,
        ge=256,
        le=3072,
        description="Embedding vector dimensions",
    )

    class Config:
        env_prefix = "EMBEDDING_"


class DubbingConfig(BaseSettings):
    """Realtime dubbing configuration (Hebrew→English/Spanish)."""

    max_concurrent_sessions: int = Field(
        default=100,
        ge=1,
        le=1000,
        description="Maximum concurrent dubbing sessions per instance",
    )
    session_timeout_minutes: int = Field(
        default=120,
        ge=1,
        le=480,
        description="Session timeout (minutes of inactivity before auto-close)",
    )
    target_latency_ms: int = Field(
        default=2000,
        ge=500,
        le=10000,
        description="Target end-to-end latency (Audio→STT→Translation→TTS)",
    )
    stt_provider: str = Field(
        default="elevenlabs",
        description="STT provider for dubbing: 'elevenlabs' (default)",
    )

    class Config:
        env_prefix = "DUBBING_"


class RecapConfig(BaseSettings):
    """Recap agent configuration for live broadcast summaries."""

    max_context_tokens: int = Field(
        default=8000,
        ge=1000,
        le=100000,
        description="Maximum transcript tokens to include in recap context",
    )
    window_default_minutes: int = Field(
        default=15,
        ge=1,
        le=120,
        description="Default time window for recap generation (minutes)",
    )
    summary_max_tokens: int = Field(
        default=300,
        ge=50,
        le=1000,
        description="Maximum tokens for generated summary",
    )
    max_transcript_segments: int = Field(
        default=5000,
        ge=100,
        le=50000,
        description="Maximum transcript segments per session before FIFO trimming",
    )
    max_recaps_per_session: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Maximum recaps per session before FIFO trimming",
    )

    class Config:
        env_prefix = "RECAP_"


class CulturalContextConfig(BaseSettings):
    """Cultural context configuration for Israeli/Jewish reference detection."""

    reference_cache_ttl_hours: int = Field(
        default=24,
        ge=1,
        le=168,
        description="Cache TTL for cultural reference lookups",
    )
    reference_cache_max_entries: int = Field(
        default=10000,
        ge=100,
        le=100000,
        description="Maximum entries in cultural reference cache before LRU eviction",
    )
    detection_min_confidence: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold for reference detection",
    )

    class Config:
        env_prefix = "CULTURAL_"


class MeteringConfig(BaseSettings):
    """Cost configuration for billing calculations."""

    # STT costs (per audio second)
    cost_per_audio_second_stt: float = Field(
        default=0.00004,
        ge=0.0,
        description="Cost per audio second for STT (ElevenLabs ~$0.04/1000 seconds)",
    )

    # TTS costs (per audio second)
    cost_per_audio_second_tts: float = Field(
        default=0.00024,
        ge=0.0,
        description="Cost per audio second for TTS (ElevenLabs ~$0.24/1000 seconds)",
    )

    # Translation costs (per 1000 characters)
    cost_per_1k_translation_chars: float = Field(
        default=0.00002,
        ge=0.0,
        description="Cost per 1000 translation characters (Google ~$20/1M chars)",
    )

    # LLM costs (per 1000 tokens)
    cost_per_1k_tokens_llm: float = Field(
        default=0.003,
        ge=0.0,
        description="Cost per 1000 LLM tokens (Claude Sonnet ~$3/1M input tokens)",
    )

    # Embedding costs (per 1000 tokens)
    cost_per_1k_embedding_tokens: float = Field(
        default=0.00002,
        ge=0.0,
        description="Cost per 1000 embedding tokens (OpenAI ~$0.02/1M tokens)",
    )

    class Config:
        env_prefix = "METERING_"


class ResilienceConfig(BaseSettings):
    """Circuit breaker and retry configuration for external services."""

    # Circuit breaker settings
    circuit_breaker_failure_threshold: int = Field(
        default=5,
        ge=1,
        le=100,
        description="Number of failures before circuit opens",
    )
    circuit_breaker_recovery_timeout_seconds: int = Field(
        default=30,
        ge=5,
        le=300,
        description="Seconds to wait before attempting recovery",
    )
    circuit_breaker_half_open_max_calls: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Max calls in half-open state before deciding",
    )

    # Retry settings
    retry_max_attempts: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum retry attempts",
    )
    retry_initial_delay_seconds: float = Field(
        default=1.0,
        ge=0.1,
        le=30.0,
        description="Initial delay between retries",
    )
    retry_max_delay_seconds: float = Field(
        default=60.0,
        ge=1.0,
        le=300.0,
        description="Maximum delay between retries",
    )
    retry_exponential_base: float = Field(
        default=2.0,
        ge=1.5,
        le=4.0,
        description="Base for exponential backoff",
    )

    class Config:
        env_prefix = "RESILIENCE_"


class DatabaseConfig(BaseSettings):
    """Olorin database configuration for separate MongoDB instance."""

    mongodb_url: Optional[str] = Field(
        default=None,
        description="MongoDB connection URL for Olorin database. If not set, uses main MONGODB_URL.",
    )
    mongodb_db_name: str = Field(
        default="olorin_platform",
        description="MongoDB database name for Olorin data",
    )
    use_separate_database: bool = Field(
        default=False,
        description="Enable separate database for Olorin (Phase 2 feature)",
    )

    @field_validator("mongodb_url")
    @classmethod
    def validate_mongodb_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate MongoDB URL if provided."""
        import os

        if v and v.startswith("mongodb://localhost"):
            # Allow localhost in development, reject in production
            environment = os.getenv("ENVIRONMENT", "development")
            if environment == "production":
                raise ValueError(
                    "OLORIN_MONGODB_URL should not use localhost in production. "
                    "Use a proper MongoDB Atlas or server URL."
                )
        return v

    class Config:
        env_prefix = "OLORIN_"


class OlorinSettings(BaseSettings):
    """
    Olorin.ai Platform Configuration.

    AI overlay platform providing capabilities to third-party content providers:
    - Realtime Dubbing (Hebrew→English/Spanish)
    - Semantic Search (vector-based content search)
    - Cultural Context (Israeli/Jewish reference detection)
    - Recap Agent (live broadcast summaries)
    """

    # Feature flags (all disabled by default for gradual rollout)
    # Using Field alias to support both environment variables and constructor args
    dubbing_enabled: bool = Field(
        default=False,
        description="Enable realtime dubbing capability",
        alias="OLORIN_DUBBING_ENABLED",
    )
    semantic_search_enabled: bool = Field(
        default=False,
        description="Enable semantic search capability",
        alias="OLORIN_SEMANTIC_SEARCH_ENABLED",
    )
    cultural_context_enabled: bool = Field(
        default=False,
        description="Enable cultural context capability",
        alias="OLORIN_CULTURAL_CONTEXT_ENABLED",
    )
    recap_enabled: bool = Field(
        default=False,
        description="Enable recap agent capability",
        alias="OLORIN_RECAP_ENABLED",
    )

    # Content Configuration
    default_content_language: str = Field(
        default="he",
        description="Default language code for content (used when content language field is not available)",
        alias="OLORIN_DEFAULT_CONTENT_LANGUAGE",
    )

    # API Version Configuration
    api_version: str = Field(
        default="v1",
        description="API version prefix for Olorin routes",
    )

    # Nested configurations
    partner: PartnerAPIConfig = Field(
        default_factory=PartnerAPIConfig,
        description="Partner API authentication and rate limiting",
    )
    pinecone: PineconeConfig = Field(
        default_factory=PineconeConfig,
        description="Pinecone vector database configuration",
    )
    embedding: EmbeddingConfig = Field(
        default_factory=EmbeddingConfig,
        description="Embedding model configuration",
    )
    dubbing: DubbingConfig = Field(
        default_factory=DubbingConfig,
        description="Realtime dubbing configuration",
    )
    recap: RecapConfig = Field(
        default_factory=RecapConfig,
        description="Recap agent configuration",
    )
    cultural: CulturalContextConfig = Field(
        default_factory=CulturalContextConfig,
        description="Cultural context configuration",
    )
    metering: MeteringConfig = Field(
        default_factory=MeteringConfig,
        description="Cost and metering configuration",
    )
    resilience: ResilienceConfig = Field(
        default_factory=ResilienceConfig,
        description="Circuit breaker and retry configuration",
    )
    database: DatabaseConfig = Field(
        default_factory=DatabaseConfig,
        description="Olorin database configuration",
    )
    i18n: I18nConfig = Field(
        default_factory=I18nConfig,
        description="Internationalization configuration for multilingual support",
    )

    class Config:
        # No env_prefix needed - feature flags use alias for env vars
        # Nested configs (partner, pinecone, etc.) have their own env_prefix
        case_sensitive = True
        # Allow population by field name for constructor (dubbing_enabled)
        # AND by alias for environment variables (OLORIN_DUBBING_ENABLED)
        populate_by_name = True

    def validate_enabled_features(self) -> list[str]:
        """
        Validate that enabled features have required dependencies.

        Returns:
            List of validation error messages (empty if all valid)
        """
        errors: list[str] = []

        # Semantic search requires Pinecone and embedding configuration
        if self.semantic_search_enabled:
            if not self.pinecone.api_key:
                errors.append(
                    "OLORIN_SEMANTIC_SEARCH_ENABLED=true requires PINECONE_API_KEY to be set"
                )
            if not self.embedding.model:
                errors.append(
                    "OLORIN_SEMANTIC_SEARCH_ENABLED=true requires EMBEDDING_MODEL to be set"
                )

        # Partner API requires salt
        if (
            self.dubbing_enabled
            or self.semantic_search_enabled
            or self.cultural_context_enabled
            or self.recap_enabled
        ):
            if not self.partner.api_key_salt:
                errors.append(
                    "Olorin features require PARTNER_API_KEY_SALT to be set. "
                    'Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"'
                )

        return errors
