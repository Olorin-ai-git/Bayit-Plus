"""
Olorin.ai Platform Configuration

Nested Pydantic configuration models for the Olorin AI overlay platform.
This module provides separation of concerns for Olorin-specific settings.
"""

from typing import List, Optional

from olorin_i18n import I18nConfig
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings


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

    # Live channel dubbing settings
    live_dubbing_enabled: bool = Field(
        default=True,
        description="Enable live channel dubbing feature",
    )
    live_dubbing_default_sync_delay_ms: int = Field(
        default=600,
        ge=0,
        le=3000,
        description="Default video sync delay to match dubbing latency",
    )
    live_dubbing_max_buffer_seconds: int = Field(
        default=5,
        ge=1,
        le=30,
        description="Maximum audio buffer size before dropping frames",
    )
    live_dubbing_fallback_to_subtitles: bool = Field(
        default=True,
        description="Fall back to subtitles if dubbing fails",
    )
    live_dubbing_silence_threshold_db: float = Field(
        default=-40.0,
        ge=-60.0,
        le=-20.0,
        description="Audio level threshold for silence detection (dB)",
    )
    live_dubbing_min_speech_duration_ms: int = Field(
        default=300,
        ge=100,
        le=1000,
        description="Minimum speech duration to trigger processing",
    )

    # WebSocket Security Settings
    require_secure_websocket: bool = Field(
        default=True,
        description="Require wss:// (secure WebSocket) in production. Set to False only for local development.",
    )
    websocket_auth_timeout_seconds: int = Field(
        default=10,
        ge=1,
        le=60,
        description="Timeout for WebSocket authentication message (seconds)",
    )
    websocket_token_freshness_seconds: int = Field(
        default=30,
        ge=1,
        le=300,
        description="Maximum age for auth token timestamp (seconds)",
    )
    websocket_max_connections_per_user_per_minute: int = Field(
        default=1,
        ge=1,
        le=100,
        description="Rate limit: max WebSocket connections per user per minute",
    )
    websocket_max_chunks_per_second: int = Field(
        default=50,
        ge=1,
        le=1000,
        description="Rate limit: max audio chunks per session per second",
    )

    # Redis Configuration for session state management
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for distributed session state. "
        "Format: redis://[user:password@]host[:port][/database]",
    )
    redis_session_ttl_seconds: int = Field(
        default=7200,
        ge=300,
        le=86400,
        description="Time-to-live for session state in Redis (seconds). "
        "Default 7200s = 2 hours. Used for session recovery on reconnect.",
    )
    redis_max_connections: int = Field(
        default=50,
        ge=1,
        le=500,
        description="Maximum connections in Redis connection pool",
    )

    # P0 - Security Configuration
    max_audio_chunk_bytes: int = Field(
        default=65536,
        ge=1024,
        le=1048576,
        description="Maximum audio chunk size in bytes (default 64KB)",
    )
    ws_auth_timeout_seconds: float = Field(
        default=10.0,
        ge=1.0,
        le=60.0,
        description="Timeout for WebSocket authentication message",
    )
    output_queue_maxsize: int = Field(
        default=50,
        ge=5,
        le=500,
        description="Maximum queued output messages before backpressure",
    )
    max_concurrent_pipeline_tasks: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Maximum concurrent translation+TTS pipeline tasks",
    )
    session_idle_timeout_seconds: int = Field(
        default=7200,
        ge=60,
        le=86400,
        description="Auto-stop session after this many seconds idle",
    )
    idle_check_interval_seconds: int = Field(
        default=60,
        ge=10,
        le=600,
        description="How often to check for idle sessions (seconds)",
    )
    max_active_sessions: int = Field(
        default=500,
        ge=1,
        le=10000,
        description="Maximum concurrent B2B dubbing sessions per instance",
    )

    # P1 - Scalability Configuration
    tts_connection_pool_size: int = Field(
        default=10,
        ge=1,
        le=100,
        description="TTS WebSocket connection pool size",
    )
    translation_thread_pool_size: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Dedicated translation thread pool workers",
    )
    pii_detection_enabled: bool = Field(
        default=True,
        description="Enable PII detection and masking before storage",
    )
    session_retention_days: int = Field(
        default=7,
        ge=1,
        le=365,
        description="Session data retention period in days",
    )

    # TTS Stream Configuration
    tts_receive_timeout_seconds: float = Field(
        default=30.0,
        ge=5.0,
        le=120.0,
        description="Timeout for TTS WebSocket receive loop (Security #8)",
    )
    tts_chunk_schedule_1: int = Field(
        default=100,
        ge=50,
        le=500,
        description="First chunk length in TTS schedule (Voice Tech #15)",
    )
    tts_chunk_schedule_2: int = Field(
        default=180,
        ge=100,
        le=500,
        description="Second chunk length in TTS schedule",
    )
    tts_chunk_schedule_3: int = Field(
        default=250,
        ge=100,
        le=500,
        description="Third chunk length in TTS schedule",
    )

    # P2 - Performance Configuration
    max_parallel_translation_chunks: int = Field(
        default=10,
        ge=1,
        le=50,
        description="Maximum parallel translation chunk requests",
    )
    transcript_compression_enabled: bool = Field(
        default=True,
        description="Enable filler word removal from transcripts",
    )
    translation_cache_enabled: bool = Field(
        default=True,
        description="Enable two-tier translation caching",
    )
    audio_quality_check_enabled: bool = Field(
        default=True,
        description="Enable audio quality verification on incoming chunks",
    )
    audio_clipping_threshold: float = Field(
        default=0.01,
        ge=0.0,
        le=1.0,
        description="Fraction of samples at max amplitude before clipping warning",
    )
    audio_silence_threshold: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Fraction of silent samples before silence warning",
    )
    prometheus_metrics_enabled: bool = Field(
        default=True,
        description="Enable Prometheus metrics export for dubbing",
    )

    class Config:
        env_prefix = "DUBBING_"


class SimplifiedHebrewConfig(BaseSettings):
    """Configuration for Ivrit Kalla (simplified Hebrew audio track)."""

    enabled: bool = Field(
        default=False,
        description="Enable simplified Hebrew audio track feature",
    )
    speaking_rate: float = Field(
        default=0.8,
        ge=0.5,
        le=1.0,
        description="Speaking rate for simplified Hebrew TTS (0.7-0.9 = slower pace)",
    )
    voice_id: str = Field(
        default="",
        description="ElevenLabs voice ID for clear Hebrew narration. REQUIRED if enabled.",
    )
    vocabulary_level: str = Field(
        default="alef",
        pattern="^(alef|bet|gimel)$",
        description="Default vocabulary complexity level: 'alef' (basic), 'bet' (intermediate), 'gimel' (advanced)",
    )
    claude_model: str = Field(
        default="claude-3-haiku-20240307",
        description="Claude model used for Hebrew simplification",
    )
    claude_max_tokens: int = Field(
        default=500,
        ge=100,
        le=2000,
        description="Max tokens for Claude simplification response",
    )
    claude_temperature: float = Field(
        default=0.2,
        ge=0.0,
        le=1.0,
        description="Temperature for simplification (low = more consistent)",
    )

    class Config:
        env_prefix = "DUBBING_SIMPLIFIED_HEBREW_"


class SmartSubsConfig(BaseSettings):
    """Configuration for Smart Subs (dual-view subtitles with shoresh highlighting)."""

    enabled: bool = Field(
        default=False,
        description="Enable Smart Subs dual-view subtitle feature",
    )
    shoresh_highlight_color: str = Field(
        default="#FFD700",
        description="Highlight color for Hebrew root letters (gold hex)",
    )
    shoresh_cache_ttl_seconds: int = Field(
        default=86400,
        ge=3600,
        le=604800,
        description="Redis cache TTL for shoresh analysis results (default 24h)",
    )
    shoresh_claude_model: str = Field(
        default="claude-3-haiku-20240307",
        description="Claude model for shoresh fallback analysis",
    )
    shoresh_claude_max_tokens: int = Field(
        default=200,
        ge=50,
        le=500,
        description="Max tokens for Claude shoresh analysis",
    )
    dual_subtitle_display_duration_ms: int = Field(
        default=5000,
        ge=2000,
        le=15000,
        description="Display duration for dual subtitle cues (milliseconds)",
    )
    min_age_for_smart_subs: int = Field(
        default=10,
        ge=0,
        le=18,
        description="Minimum age recommendation for Smart Subs feature",
    )

    class Config:
        env_prefix = "SMART_SUBS_"


class LiveNikudConfig(BaseSettings):
    """Configuration for real-time nikud (vocalization marks) on live Hebrew subtitles."""

    enabled: bool = Field(
        default=False,
        description="Enable live nikud subtitle feature",
    )
    claude_model: str = Field(
        default="claude-3-haiku-20240307",
        description="Claude model used for nikud vocalization",
    )
    claude_max_tokens: int = Field(
        default=500,
        ge=100,
        le=2000,
        description="Max tokens for Claude nikud response",
    )
    cache_ttl_seconds: int = Field(
        default=86400,
        ge=3600,
        le=604800,
        description="Redis cache TTL for nikud results (default 24h)",
    )
    display_duration_ms: int = Field(
        default=5000,
        ge=2000,
        le=15000,
        description="Display duration for nikud subtitle cues (milliseconds)",
    )

    class Config:
        env_prefix = "LIVE_NIKUD_"


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


class LiveTriviaConfig(BaseSettings):
    """Live trivia configuration for real-time broadcast trivia generation."""

    enabled: bool = Field(
        default=False,
        description="Enable live trivia feature",
    )
    ner_provider: str = Field(
        default="hybrid",
        pattern="^(spacy|hybrid)$",
        description="NER provider: 'spacy' or 'hybrid' (spacy + Claude)",
    )
    search_provider: str = Field(
        default="wikipedia",
        pattern="^(wikipedia|duckduckgo|google)$",
        description="Search provider for trivia facts",
    )
    min_topic_mentions: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Minimum topic mentions before triggering fact generation",
    )
    fact_cache_ttl_seconds: int = Field(
        default=3600,
        ge=300,
        le=86400,
        description="Cache TTL for trivia facts (1 hour default)",
    )
    topic_cooldown_minutes: int = Field(
        default=15,
        ge=1,
        le=60,
        description="Cooldown period before repeating topics for same user",
    )
    mention_ttl_seconds: int = Field(
        default=1800,
        ge=300,
        le=7200,
        description="TTL for topic mention tracking in Redis (default 30 minutes)",
    )
    min_interval_seconds: int = Field(
        default=30,
        ge=10,
        le=120,
        description="Minimum interval between facts (high frequency setting)",
    )
    max_facts_per_session: int = Field(
        default=50,
        ge=10,
        le=200,
        description="Maximum facts per user session",
    )
    requires_subscription: List[str] = Field(
        default_factory=lambda: ["premium", "family", "beta"],
        description="Subscription tiers with access to live trivia",
    )
    max_daily_cost_usd: float = Field(
        default=30.0,
        ge=0.0,
        le=1000.0,
        description="Alert threshold for daily API costs",
    )

    # Web Search Configuration
    wikipedia_api_url: str = Field(
        default="https://en.wikipedia.org/api/rest_v1/page/summary",
        description="Wikipedia REST API URL for fact search",
    )
    duckduckgo_api_url: str = Field(
        default="https://api.duckduckgo.com/",
        description="DuckDuckGo API URL for fallback search",
    )
    search_timeout_seconds: int = Field(
        default=5,
        ge=1,
        le=30,
        description="Timeout for web search requests",
    )
    summary_truncate_length: int = Field(
        default=1500,
        ge=500,
        le=5000,
        description="Maximum length for Wikipedia summaries",
    )

    # Claude AI Configuration
    claude_model: str = Field(
        default="claude-3-haiku-20240307",
        description="Claude model for topic validation and fact extraction",
    )
    claude_max_tokens_short: int = Field(
        default=200,
        ge=50,
        le=1000,
        description="Max tokens for short Claude responses (topic validation)",
    )
    claude_max_tokens_long: int = Field(
        default=1000,
        ge=200,
        le=4000,
        description="Max tokens for long Claude responses (fact extraction)",
    )
    claude_temperature_validation: float = Field(
        default=0.0,
        ge=0.0,
        le=1.0,
        description="Claude temperature for topic validation (0.0 = deterministic)",
    )
    claude_temperature_facts: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Claude temperature for fact extraction (0.3 = some creativity)",
    )

    # Topic Detection Configuration
    spacy_confidence_baseline: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Baseline confidence score for spaCy entity detection",
    )
    tracked_topic_default_confidence: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Default confidence score for tracked topics in database",
    )
    mention_cleanup_threshold: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Cleanup old topic mentions after this many entries",
    )

    # Fact Generation Defaults
    fact_display_duration: int = Field(
        default=12,
        ge=5,
        le=60,
        description="Default display duration for facts (seconds)",
    )
    fact_default_priority: int = Field(
        default=7,
        ge=1,
        le=10,
        description="Default priority for generated facts",
    )
    fact_default_relevance: float = Field(
        default=0.8,
        ge=0.0,
        le=1.0,
        description="Default relevance score for generated facts",
    )

    class Config:
        env_prefix = "LIVE_TRIVIA_"


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


class InfrastructureConfig(BaseSettings):
    """Infrastructure cost configuration (fallback when APIs unavailable)."""

    gcp_monthly: float = Field(
        default=2000.0,
        ge=0.0,
        description="Monthly GCP cost estimate (fallback)",
    )
    mongodb_monthly: float = Field(
        default=500.0,
        ge=0.0,
        description="Monthly MongoDB Atlas cost estimate (fallback)",
    )
    firebase_monthly: float = Field(
        default=300.0,
        ge=0.0,
        description="Monthly Firebase services cost",
    )
    sentry_monthly: float = Field(
        default=100.0,
        ge=0.0,
        description="Monthly Sentry error tracking cost",
    )
    cdn_monthly: float = Field(
        default=200.0,
        ge=0.0,
        description="Monthly CDN and load balancer cost",
    )

    class Config:
        env_prefix = "INFRA_"


class ThirdPartyCostConfig(BaseSettings):
    """Third-party API cost configuration."""

    stripe_transaction_fee_pct: float = Field(
        default=2.9,
        ge=0.0,
        le=100.0,
        description="Stripe transaction fee percentage",
    )
    stripe_transaction_fee_fixed: float = Field(
        default=0.30,
        ge=0.0,
        description="Stripe fixed transaction fee in USD",
    )
    elevenlabs_overage_per_1k_chars: float = Field(
        default=0.05,
        ge=0.0,
        description="ElevenLabs overage cost per 1000 characters",
    )
    tmdb_cost_per_request: float = Field(
        default=0.0,
        ge=0.0,
        description="TMDB API cost per request (usually free tier)",
    )
    twilio_sms_cost: float = Field(
        default=0.0075,
        ge=0.0,
        description="Twilio SMS cost per message",
    )
    sendgrid_monthly: float = Field(
        default=0.0,
        ge=0.0,
        description="SendGrid monthly email service cost",
    )

    class Config:
        env_prefix = "THIRDPARTY_"


class CostAggregationConfig(BaseSettings):
    """Cost aggregation job configuration."""

    interval_minutes: int = Field(
        default=60,
        ge=1,
        le=1440,
        description="Cost aggregation interval in minutes (hourly = 60)",
    )
    hot_data_retention_days: int = Field(
        default=90,
        ge=1,
        le=365,
        description="Days to retain hourly data in hot storage (MongoDB)",
    )
    warm_data_retention_days: int = Field(
        default=365,
        ge=1,
        le=1825,
        description="Days to retain data in warm storage before archival",
    )
    archive_to_gcs_enabled: bool = Field(
        default=True,
        description="Enable archival of old data to GCS",
    )
    gcs_bucket_name: str = Field(
        default="bayit-cost-archives",
        description="GCS bucket for cost data archives",
    )
    cache_ttl_seconds: int = Field(
        default=300,
        ge=60,
        le=3600,
        description="Cost dashboard query cache TTL in seconds",
    )

    class Config:
        env_prefix = "COST_"


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
        description="MongoDB connection URL for Olorin database. If not set, uses main MONGODB_URI.",
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


class ChannelChatConfig(BaseSettings):
    """Channel live chat configuration for real-time public chat on live channels."""

    max_messages_per_minute: int = Field(
        default=10,
        ge=1,
        le=60,
        description="Maximum messages per minute per user per channel",
    )
    max_message_length: int = Field(
        default=500,
        ge=1,
        le=2000,
        description="Maximum character length for chat messages",
    )
    history_limit: int = Field(
        default=50,
        ge=10,
        le=200,
        description="Number of recent messages to load for late joiners",
    )
    translation_timeout_seconds: float = Field(
        default=5.0,
        ge=1.0,
        le=30.0,
        description="Timeout for on-demand translation requests",
    )
    idle_timeout_minutes: int = Field(
        default=30,
        ge=5,
        le=120,
        description="WebSocket idle timeout before auto-disconnect",
    )
    message_retention_days: int = Field(
        default=90,
        ge=1,
        le=365,
        description="TTL for chat messages in days",
    )
    translation_enabled: bool = Field(
        default=True,
        description="Enable chat translation for Beta 500 users",
    )
    max_global_connections: int = Field(
        default=10000,
        ge=100,
        le=100000,
        description="Maximum total WebSocket connections server-wide",
    )
    max_connections_per_ip: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Maximum WebSocket connections per IP address",
    )
    max_connections_per_user: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum WebSocket connections per authenticated user",
    )
    heartbeat_interval_seconds: int = Field(
        default=30,
        ge=10,
        le=120,
        description="Server-side ping interval for WebSocket heartbeat",
    )
    heartbeat_timeout_seconds: int = Field(
        default=90,
        ge=30,
        le=300,
        description="Timeout for pong response before disconnecting stale client",
    )
    auto_dismiss_seconds: int = Field(
        default=22,
        ge=5,
        le=60,
        description="Auto-dismiss timeout for chat UI overlays",
    )

    class Config:
        env_prefix = "CHANNEL_CHAT_"


class CatchUpConfig(BaseSettings):
    """AI catch-up summary configuration for live channel recap (Beta 500)."""

    enabled: bool = Field(
        default=True,
        description="Enable catch-up summary feature globally",
    )
    auto_trigger_minutes: int = Field(
        default=5,
        ge=1,
        le=30,
        description="Minutes a channel must be live before auto-prompting catch-up",
    )
    default_window_minutes: int = Field(
        default=15,
        ge=1,
        le=30,
        description="Default transcript window for catch-up summary",
    )
    cache_ttl_seconds: int = Field(
        default=180,
        ge=30,
        le=600,
        description="Cache TTL for generated summaries",
    )
    max_summary_tokens: int = Field(
        default=300,
        ge=100,
        le=1000,
        description="Maximum tokens for generated catch-up summary",
    )
    window_quantization_seconds: int = Field(
        default=60,
        ge=10,
        le=300,
        description="Quantization interval for cache key alignment",
    )
    transcript_buffer_max_minutes: int = Field(
        default=15,
        ge=5,
        le=60,
        description="Maximum rolling transcript buffer per channel",
    )
    auto_dismiss_seconds: int = Field(
        default=22,
        ge=5,
        le=60,
        description="Auto-dismiss timeout for catch-up overlay",
    )

    class Config:
        env_prefix = "CATCHUP_"


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
    infrastructure: InfrastructureConfig = Field(
        default_factory=InfrastructureConfig,
        description="Infrastructure cost configuration",
    )
    thirdparty: ThirdPartyCostConfig = Field(
        default_factory=ThirdPartyCostConfig,
        description="Third-party API cost configuration",
    )
    cost_aggregation: CostAggregationConfig = Field(
        default_factory=CostAggregationConfig,
        description="Cost aggregation job configuration",
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
    live_trivia: LiveTriviaConfig = Field(
        default_factory=LiveTriviaConfig,
        description="Live trivia configuration for real-time broadcast trivia",
    )
    simplified_hebrew: SimplifiedHebrewConfig = Field(
        default_factory=SimplifiedHebrewConfig,
        description="Ivrit Kalla simplified Hebrew audio track configuration",
    )
    smart_subs: SmartSubsConfig = Field(
        default_factory=SmartSubsConfig,
        description="Smart Subs dual-view subtitle with shoresh highlighting",
    )
    live_nikud: LiveNikudConfig = Field(
        default_factory=LiveNikudConfig,
        description="Live nikud (vocalization marks) for real-time Hebrew subtitles",
    )
    channel_chat: ChannelChatConfig = Field(
        default_factory=ChannelChatConfig,
        description="Channel live chat with auto-translation for Beta 500",
    )
    catchup: CatchUpConfig = Field(
        default_factory=CatchUpConfig,
        description="AI catch-up summary for live channels (Beta 500)",
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
