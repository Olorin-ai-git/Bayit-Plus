"""
Olorin.ai Platform Configuration

Nested Pydantic configuration models for the Olorin AI overlay platform.
This module provides separation of concerns for Olorin-specific settings.
"""

from typing import Optional

from olorin_i18n import I18nConfig
from pydantic import AliasChoices, Field, field_validator
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
        validation_alias=AliasChoices("OLORIN_PINECONE_API_KEY", "PINECONE_API_KEY"),
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
    live_dubbing_tts_safety_timeout_seconds: float = Field(
        default=2.0,
        ge=1.0,
        le=30.0,
        description="Safety timeout for per-transcript TTS receive in live dubbing. "
        "ElevenLabs may not send isFinal for short segments, causing 20s hang.",
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

    # Continuous Flow Architecture Settings
    # Enables 10-second initial buffer with zero interruptions after
    continuous_flow_enabled: bool = Field(
        default=True,
        description="Enable continuous flow architecture (10s buffer, zero interruptions)",
    )
    initial_buffer_seconds: int = Field(
        default=10,
        ge=3,
        le=30,
        description="Initial buffer to fill before playback starts (seconds)",
    )
    min_buffer_seconds: int = Field(
        default=5,
        ge=2,
        le=15,
        description="Minimum buffer before entering warning state (seconds)",
    )
    healthy_buffer_seconds: int = Field(
        default=8,
        ge=5,
        le=20,
        description="Buffer threshold for healthy state (seconds)",
    )
    critical_buffer_seconds: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Buffer threshold for critical state (seconds)",
    )
    sync_tolerance_ms: int = Field(
        default=50,
        ge=10,
        le=200,
        description="Maximum allowed sync drift before correction (ms)",
    )

    # Quality settings for continuous flow
    prefer_claude_translation: bool = Field(
        default=True,
        description="Use Claude for translation when buffer is healthy (higher quality)",
    )
    enable_speaker_boost: bool = Field(
        default=True,
        description="Enable TTS speaker boost when buffer is healthy (better clarity)",
    )
    tts_stability_healthy: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="TTS stability setting when buffer is healthy (higher = consistent)",
    )
    tts_stability_warning: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="TTS stability setting when buffer is in warning state",
    )
    tts_stability_critical: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="TTS stability setting when buffer is critical (faster generation)",
    )

    # Sync status rate limiting (prevent client flooding)
    sync_status_max_per_second: float = Field(
        default=2.0,
        ge=0.5,
        le=10.0,
        description="Maximum sync_status messages per second per session",
    )
    max_video_timestamp_ms: int = Field(
        default=86400000,
        ge=3600000,
        le=604800000,
        description="Maximum valid video timestamp (24h default, up to 7 days)",
    )

    # Audio format for duration calculation (ElevenLabs output)
    tts_output_sample_rate: int = Field(
        default=44100,
        ge=16000,
        le=48000,
        description="TTS output sample rate in Hz (ElevenLabs default is 44.1kHz)",
    )
    tts_output_bytes_per_sample: int = Field(
        default=2,
        ge=1,
        le=4,
        description="Bytes per sample in TTS output (16-bit = 2 bytes)",
    )

    class Config:
        env_prefix = "DUBBING_"


class SubtitleConfig(BaseSettings):
    """Live subtitle translation configuration (Premium feature)."""

    # Quota cache configuration
    quota_cache_ttl_seconds: float = Field(
        default=30.0,
        ge=1.0,
        le=300.0,
        description="Time-to-live for quota check cache (seconds)",
    )
    quota_cache_max_size: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Maximum quota cache entries (LRU eviction)",
    )

    # WebSocket heartbeat and timeout configuration
    heartbeat_interval_seconds: float = Field(
        default=30.0,
        ge=5.0,
        le=120.0,
        description="Interval between WebSocket heartbeat pings (seconds)",
    )
    quota_update_interval_seconds: float = Field(
        default=10.0,
        ge=1.0,
        le=60.0,
        description="Interval between quota session updates (seconds)",
    )
    connection_timeout_seconds: float = Field(
        default=60.0,
        ge=10.0,
        le=300.0,
        description="Timeout for stale connections (no activity)",
    )

    # Subtitle text configuration
    max_subtitle_length: int = Field(
        default=80,
        ge=40,
        le=200,
        description="Maximum characters per subtitle line",
    )
    preferred_subtitle_length: int = Field(
        default=60,
        ge=30,
        le=100,
        description="Preferred characters per subtitle line",
    )

    # Audio configuration
    audio_sample_rate: int = Field(
        default=16000,
        description="Audio sample rate in Hz for STT (ElevenLabs Scribe requires 16kHz)",
    )

    # Translation AI model configuration
    translation_model: str = Field(
        default="gpt-4o-mini",
        description="AI model for subtitle translation",
    )
    translation_temperature: float = Field(
        default=0.3,
        ge=0.0,
        le=2.0,
        description="AI model temperature for translation consistency",
    )
    translation_timeout_seconds: float = Field(
        default=0.100,
        ge=0.01,
        le=10.0,
        description="Timeout for translation API requests (seconds)",
    )

    # STT WebSocket configuration (ElevenLabs)
    stt_max_reconnect_attempts: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum STT WebSocket reconnection attempts",
    )
    stt_initial_reconnect_delay_seconds: float = Field(
        default=1.0,
        ge=0.1,
        le=10.0,
        description="Initial delay before reconnection attempt (seconds)",
    )
    stt_max_reconnect_delay_seconds: float = Field(
        default=30.0,
        ge=1.0,
        le=300.0,
        description="Maximum delay between reconnection attempts (seconds)",
    )
    stt_reconnect_backoff_multiplier: float = Field(
        default=2.0,
        ge=1.1,
        le=5.0,
        description="Exponential backoff multiplier for reconnection delays",
    )
    stt_ping_interval_seconds: int = Field(
        default=20,
        ge=5,
        le=120,
        description="STT WebSocket ping interval (seconds)",
    )
    stt_ping_timeout_seconds: int = Field(
        default=30,
        ge=10,
        le=180,
        description="STT WebSocket ping timeout (seconds)",
    )
    stt_close_timeout_seconds: int = Field(
        default=10,
        ge=1,
        le=60,
        description="STT WebSocket graceful close timeout (seconds)",
    )

    # STT Voice Activity Detection (VAD) tuning
    stt_vad_silence_threshold_secs: float = Field(
        default=2.0,
        ge=0.1,
        le=5.0,
        description="VAD silence duration before committing transcript (seconds)",
    )
    stt_vad_threshold: float = Field(
        default=0.5,
        ge=0.1,
        le=1.0,
        description="VAD energy threshold for speech detection (0.0-1.0)",
    )
    stt_forced_commit_interval_seconds: float = Field(
        default=5.0,
        ge=1.0,
        le=30.0,
        description="Force transcript commit after this duration (seconds)",
    )
    stt_max_chunks_before_commit: int = Field(
        default=150,
        ge=10,
        le=1000,
        description="Force transcript commit after this many audio chunks",
    )

    # Voice assistant STT VAD tuning (separate from subtitle VAD)
    # Voice commands need longer silence threshold since users pause to think
    voice_assistant_vad_silence_threshold_secs: float = Field(
        default=3.5,
        ge=0.5,
        le=8.0,
        description="VAD silence duration for voice assistant before committing (seconds). "
        "Longer than subtitle VAD to avoid cutting users off mid-thought.",
    )
    voice_assistant_vad_threshold: float = Field(
        default=0.4,
        ge=0.1,
        le=1.0,
        description="VAD energy threshold for voice assistant speech detection (0.0-1.0). "
        "Slightly lower than subtitle VAD for better sensitivity in conversational speech.",
    )

    # Deduplication configuration
    dedup_min_pattern_length: int = Field(
        default=10,
        ge=5,
        le=50,
        description="Minimum pattern length for transcript deduplication",
    )

    class Config:
        env_prefix = "SUBTITLE_"


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


class SocialWebSocketConfig(BaseSettings):
    """WebSocket security configuration for social features (party, chess, DM)."""

    auth_timeout_seconds: int = Field(
        default=10,
        ge=1,
        le=60,
        description="Timeout for WebSocket auth message (seconds)",
    )
    max_connections_per_user: int = Field(
        default=5,
        ge=1,
        le=20,
        description="Maximum concurrent WebSocket connections per user",
    )
    max_message_size_bytes: int = Field(
        default=8192,
        ge=512,
        le=65536,
        description="Maximum inbound message size in bytes",
    )
    party_messages_per_minute: int = Field(
        default=30,
        ge=1,
        le=120,
        description="Rate limit: party messages per connection per minute",
    )
    chess_moves_per_minute: int = Field(
        default=60,
        ge=1,
        le=120,
        description="Rate limit: chess messages per connection per minute",
    )
    dm_messages_per_minute: int = Field(
        default=30,
        ge=1,
        le=120,
        description="Rate limit: DM messages per connection per minute",
    )
    dm_max_message_length: int = Field(
        default=2000,
        ge=1,
        le=10000,
        description="Maximum character length for a direct message",
    )
    friends_requests_per_minute: int = Field(
        default=10,
        ge=1,
        le=60,
        description="Rate limit: friend requests per user per minute",
    )
    friends_search_per_minute: int = Field(
        default=15,
        ge=1,
        le=60,
        description="Rate limit: friend search requests per user per minute",
    )
    max_pending_friend_requests: int = Field(
        default=50,
        ge=1,
        le=200,
        description="Maximum outbound pending friend requests per user",
    )
    rate_limit_warning_threshold: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Number of rate limit warnings before closing connection",
    )

    class Config:
        env_prefix = "SOCIAL_WS_"


class ChannelChatConfig(BaseSettings):
    """Channel live chat configuration for WebSocket chat on live TV channels."""

    heartbeat_interval_seconds: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Interval between heartbeat pings to clients (seconds)",
    )
    heartbeat_timeout_seconds: int = Field(
        default=90,
        ge=15,
        le=300,
        description="Timeout before disconnecting unresponsive client (seconds)",
    )
    history_limit: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Maximum recent messages returned on join",
    )
    max_messages_per_minute: int = Field(
        default=10,
        ge=1,
        le=60,
        description="Rate limit: maximum messages per user per minute",
    )
    max_global_connections: int = Field(
        default=5000,
        ge=100,
        le=100000,
        description="Maximum total WebSocket connections across all channels",
    )
    max_connections_per_ip: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Maximum WebSocket connections per IP address",
    )
    max_connections_per_user: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Maximum WebSocket connections per user",
    )
    translation_enabled: bool = Field(
        default=True,
        description="Enable on-demand message translation for beta users",
    )
    profanity_filter_enabled: bool = Field(
        default=True,
        description="Enable multi-language profanity filtering on chat messages",
    )

    class Config:
        env_prefix = "CHANNEL_CHAT_"


class TranscriptEventBusConfig(BaseSettings):
    """Transcript event bus configuration for real-time transcript distribution."""

    default_queue_size: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Default queue size for transcript bus subscribers",
    )
    cleanup_interval_seconds: int = Field(
        default=60,
        ge=10,
        le=600,
        description="Interval for dead subscriber cleanup (seconds)",
    )
    replay_buffer_size: int = Field(
        default=20,
        ge=0,
        le=100,
        description="Number of recent events to keep for late joiner replay",
    )
    max_total_events: int = Field(
        default=10000,
        ge=1000,
        le=100000,
        description="Memory circuit breaker: max buffered events across all channels",
    )

    class Config:
        env_prefix = "TRANSCRIPT_BUS_"


class HighlightsConfig(BaseSettings):
    """Highlights service configuration for live moment detection."""

    enabled: bool = Field(
        default=True,
        description="Enable highlights detection service",
    )
    min_confidence: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold for highlight detection",
    )
    window_size: int = Field(
        default=10,
        ge=3,
        le=50,
        description="Sliding window size (number of transcripts) for analysis",
    )
    max_per_hour: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Maximum highlights per hour per channel",
    )
    queue_size: int = Field(
        default=200,
        ge=50,
        le=1000,
        description="Queue size for highlights consumer",
    )
    emotional_keywords: list[str] = Field(
        default=["!", "?!", "wow", "amazing", "incredible", "unbelievable"],
        description="Keywords indicating emotional intensity",
    )
    entity_density_threshold: int = Field(
        default=3,
        ge=2,
        le=10,
        description="Minimum named entities in window for entity highlight",
    )

    class Config:
        env_prefix = "HIGHLIGHTS_"


class SearchIndexConfig(BaseSettings):
    """Search index service configuration for live transcript indexing."""

    enabled: bool = Field(
        default=True,
        description="Enable search index service",
    )
    batch_size: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Number of transcripts to batch before indexing",
    )
    flush_interval_seconds: float = Field(
        default=5.0,
        ge=1.0,
        le=60.0,
        description="Maximum time between index flushes (seconds)",
    )
    ttl_hours: int = Field(
        default=24,
        ge=1,
        le=168,
        description="Time-to-live for indexed transcripts (hours)",
    )
    queue_size: int = Field(
        default=500,
        ge=100,
        le=2000,
        description="Queue size for search index consumer",
    )

    class Config:
        env_prefix = "SEARCH_INDEX_"


class SearchRankingConfig(BaseSettings):
    """Search pipeline ranking and scoring configuration."""

    # Atlas Search index names
    content_search_index: str = Field(
        default="content_search",
        description="Atlas Search index name for content collection",
    )
    live_channels_search_index: str = Field(
        default="live_channels_search",
        description="Atlas Search index name for live_channels collection",
    )
    podcasts_search_index: str = Field(
        default="podcasts_search",
        description="Atlas Search index name for podcasts collection",
    )
    radio_stations_search_index: str = Field(
        default="radio_stations_search",
        description="Atlas Search index name for radio_stations collection",
    )

    # Feature flags
    atlas_search_enabled: bool = Field(
        default=True,
        description="Enable Atlas Search ($search) instead of $text fallback",
    )
    hybrid_search_enabled: bool = Field(
        default=True,
        description="Enable Pinecone vector search alongside Atlas Search",
    )

    # Reciprocal Rank Fusion parameters
    rrf_k: int = Field(
        default=60, ge=1, le=200,
        description="RRF constant K (standard=60)",
    )
    atlas_weight: float = Field(
        default=1.0, ge=0.0, le=5.0,
        description="Atlas Search weight in RRF fusion",
    )
    pinecone_weight: float = Field(
        default=0.8, ge=0.0, le=5.0,
        description="Pinecone weight in RRF fusion",
    )

    # Scoring weights (must sum to <= 1.0 with relevance_weight)
    title_exact_match_multiplier: float = Field(
        default=3.0, ge=1.0, le=10.0,
        description="Multiplier for exact title matches",
    )
    relevance_weight: float = Field(
        default=0.70, ge=0.0, le=1.0,
        description="Weight for text relevance score",
    )
    popularity_weight: float = Field(
        default=0.10, ge=0.0, le=1.0,
        description="Weight for popularity signal",
    )
    freshness_weight: float = Field(
        default=0.05, ge=0.0, le=1.0,
        description="Weight for content freshness",
    )
    rating_weight: float = Field(
        default=0.10, ge=0.0, le=1.0,
        description="Weight for avg_rating signal",
    )
    featured_boost: float = Field(
        default=0.01, ge=0.0, le=1.0,
        description="Additive boost for featured content",
    )

    # Fuzzy matching thresholds
    fuzzy_edits_short: int = Field(
        default=0, ge=0, le=2,
        description="Max edit distance for queries < 4 chars",
    )
    fuzzy_edits_medium: int = Field(
        default=1, ge=0, le=2,
        description="Max edit distance for queries 4-6 chars",
    )
    fuzzy_edits_long: int = Field(
        default=2, ge=0, le=2,
        description="Max edit distance for queries 7+ chars",
    )

    # Atlas Search field boosts
    title_boost: float = Field(
        default=10.0, ge=1.0, le=50.0,
        description="Boost factor for title field matches",
    )
    phrase_boost: float = Field(
        default=15.0, ge=1.0, le=50.0,
        description="Boost factor for phrase matches on titles",
    )
    description_boost: float = Field(
        default=5.0, ge=1.0, le=20.0,
        description="Boost factor for description field matches",
    )
    cast_boost: float = Field(
        default=3.0, ge=1.0, le=20.0,
        description="Boost factor for cast/director/author matches",
    )

    # Semantic search thresholds
    semantic_min_score: float = Field(
        default=0.7, ge=0.0, le=1.0,
        description="Minimum Pinecone similarity score to include",
    )
    semantic_max_results: int = Field(
        default=50, ge=10, le=200,
        description="Maximum results to fetch from Pinecone",
    )

    # Freshness decay
    freshness_half_life_days: int = Field(
        default=365, ge=30, le=3650,
        description="Half-life in days for freshness exponential decay",
    )
    popularity_normalization_cap: int = Field(
        default=10000, ge=100, le=1000000,
        description="View count cap for log-normalized popularity",
    )

    # Atlas over-fetch factor for re-ranking
    atlas_overfetch_multiplier: int = Field(
        default=3, ge=1, le=10,
        description="Fetch N*limit from Atlas for re-ranking headroom",
    )

    class Config:
        env_prefix = "SEARCH_RANKING_"


class CatchupConfig(BaseSettings):
    """Catchup service configuration for live transcript accumulation."""

    use_transcript_bus: bool = Field(
        default=True,
        description="Use transcript event bus instead of direct STT subscription",
    )
    queue_size: int = Field(
        default=500,
        ge=100,
        le=2000,
        description="Queue size for catchup bus consumer",
    )
    transcript_buffer_max_minutes: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Maximum transcript buffer duration (minutes)",
    )
    min_data_seconds: int = Field(
        default=60,
        ge=10,
        le=600,
        description="Minimum data duration required for catchup generation",
    )

    class Config:
        env_prefix = "CATCHUP_"


class LiveTriviaConfig(BaseSettings):
    """Live trivia overlay configuration for topic detection and fact extraction."""

    use_transcript_bus: bool = Field(
        default=True,
        description="Use transcript event bus instead of client-sent transcripts",
    )
    queue_size: int = Field(
        default=50,
        ge=10,
        le=200,
        description="Queue size for trivia bus consumer (can drop if behind)",
    )
    replay_count: int = Field(
        default=5,
        ge=0,
        le=20,
        description="Number of recent transcripts to replay on session start",
    )
    claude_model: str = Field(
        default="claude-sonnet-4-20250514",
        description="Anthropic model for topic validation and fact extraction",
    )
    claude_max_tokens_short: int = Field(
        default=256,
        ge=64,
        le=2048,
        description="Max tokens for short Claude responses (topic validation)",
    )
    claude_max_tokens_long: int = Field(
        default=1024,
        ge=128,
        le=4096,
        description="Max tokens for long Claude responses (fact extraction)",
    )
    claude_temperature_validation: float = Field(
        default=0.1,
        ge=0.0,
        le=1.0,
        description="Temperature for topic validation (low = deterministic)",
    )
    claude_temperature_facts: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Temperature for fact extraction (higher = creative)",
    )
    spacy_confidence_baseline: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
        description="Minimum spaCy NER confidence baseline for topic detection",
    )
    wikipedia_api_url: str = Field(
        default="https://en.wikipedia.org/api/rest_v1/page/summary",
        description="Wikipedia REST API base URL for topic summaries",
    )
    duckduckgo_api_url: str = Field(
        default="https://api.duckduckgo.com",
        description="DuckDuckGo Instant Answer API base URL",
    )
    search_timeout_seconds: float = Field(
        default=5.0,
        ge=1.0,
        le=30.0,
        description="HTTP timeout for web search requests",
    )
    summary_truncate_length: int = Field(
        default=500,
        ge=100,
        le=2000,
        description="Max character length for topic summaries",
    )
    fact_display_duration: int = Field(
        default=10,
        ge=3,
        le=60,
        description="Default display duration for trivia facts (seconds)",
    )
    fact_default_priority: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Default priority for extracted facts (1=lowest, 10=highest)",
    )
    fact_default_relevance: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Default relevance score for extracted facts",
    )
    min_topic_mentions: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Minimum mentions required before triggering trivia for a topic",
    )
    min_interval_seconds: int = Field(
        default=30,
        ge=5,
        le=300,
        description="Minimum seconds between trivia facts in a session",
    )
    max_facts_per_session: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Maximum trivia facts per session",
    )
    tracked_topic_default_confidence: float = Field(
        default=0.6,
        ge=0.0,
        le=1.0,
        description="Default confidence threshold for tracked topics",
    )
    fact_cache_ttl_seconds: int = Field(
        default=3600,
        ge=60,
        le=86400,
        description="TTL for cached trivia facts in Redis (seconds)",
    )
    topic_cooldown_minutes: int = Field(
        default=5,
        ge=1,
        le=60,
        description="Cooldown minutes before same topic can trigger again",
    )
    mention_ttl_seconds: int = Field(
        default=300,
        ge=30,
        le=1800,
        description="TTL for topic mention tracking in Redis (seconds)",
    )

    class Config:
        env_prefix = "LIVE_TRIVIA_"


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
    subtitle: SubtitleConfig = Field(
        default_factory=SubtitleConfig,
        description="Live subtitle translation configuration",
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
    social_ws: SocialWebSocketConfig = Field(
        default_factory=SocialWebSocketConfig,
        description="Social WebSocket security configuration (party, chess, DM)",
    )
    channel_chat: ChannelChatConfig = Field(
        default_factory=ChannelChatConfig,
        description="Channel live chat WebSocket configuration",
    )
    live_trivia: LiveTriviaConfig = Field(
        default_factory=LiveTriviaConfig,
        description="Live trivia overlay configuration for topic detection and facts",
    )
    transcript_bus: TranscriptEventBusConfig = Field(
        default_factory=TranscriptEventBusConfig,
        description="Transcript event bus for real-time transcript distribution",
    )
    highlights: HighlightsConfig = Field(
        default_factory=HighlightsConfig,
        description="Highlights service for live moment detection",
    )
    search_index: SearchIndexConfig = Field(
        default_factory=SearchIndexConfig,
        description="Search index service for live transcript search",
    )
    search_ranking: SearchRankingConfig = Field(
        default_factory=SearchRankingConfig,
        description="Search pipeline ranking and scoring configuration",
    )
    catchup: CatchupConfig = Field(
        default_factory=CatchupConfig,
        description="Catchup service for transcript accumulation",
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
