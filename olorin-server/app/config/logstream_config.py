"""
Log Streaming Configuration Schema

This module defines the configuration schema for live merged log streaming feature.
All values MUST come from environment variables with fail-fast validation.

Constitutional Compliance:
- NO hardcoded values (all from environment variables)
- Pydantic validation with fail-fast behavior
- No defaults for required configuration
- Clear error messages for missing configuration
"""

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from typing import Literal


class LogProviderConfig(BaseSettings):
    """Configuration for log providers (frontend and backend)"""

    # Frontend log provider (local dev mode)
    frontend_log_endpoint: str = Field(
        ...,
        validation_alias="LOGSTREAM_FRONTEND_ENDPOINT",
        description="Endpoint for frontend log ingestion in local dev mode"
    )

    # Backend log provider (local dev mode)
    backend_log_endpoint: str = Field(
        ...,
        validation_alias="LOGSTREAM_BACKEND_ENDPOINT",
        description="Endpoint for backend log storage/retrieval"
    )

    # Provider timeout
    provider_timeout_ms: int = Field(
        ...,
        validation_alias="LOGSTREAM_PROVIDER_TIMEOUT_MS",
        description="Timeout for log provider requests in milliseconds",
        gt=0,
        le=60000  # Max 60 seconds
    )

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


class SSEConfig(BaseSettings):
    """Configuration for Server-Sent Events streaming"""

    # Heartbeat interval
    heartbeat_interval_seconds: int = Field(
        ...,
        validation_alias="LOGSTREAM_SSE_HEARTBEAT_INTERVAL_SECONDS",
        description="SSE heartbeat interval to keep connections alive",
        gt=0,
        le=60
    )

    # Connection timeout
    connection_timeout_seconds: int = Field(
        ...,
        validation_alias="LOGSTREAM_SSE_CONNECTION_TIMEOUT_SECONDS",
        description="SSE connection timeout before auto-disconnect",
        gt=0,
        le=3600  # Max 1 hour
    )

    # Retry interval
    retry_interval_ms: int = Field(
        ...,
        validation_alias="LOGSTREAM_SSE_RETRY_INTERVAL_MS",
        description="Client retry interval on connection failure",
        gt=0,
        le=30000  # Max 30 seconds
    )

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


class AggregatorConfig(BaseSettings):
    """Configuration for log aggregation and merging"""

    # Clock skew tolerance
    clock_skew_tolerance_seconds: int = Field(
        ...,
        validation_alias="LOGSTREAM_CLOCK_SKEW_TOLERANCE_SECONDS",
        description="Clock skew tolerance window for merging logs from different sources",
        gt=0,
        le=60
    )

    # Buffer size
    max_buffer_size: int = Field(
        ...,
        validation_alias="LOGSTREAM_MAX_BUFFER_SIZE",
        description="Maximum buffer size for logs before backpressure",
        gt=0,
        le=100000
    )

    # Deduplication window
    deduplication_window_seconds: int = Field(
        ...,
        validation_alias="LOGSTREAM_DEDUPLICATION_WINDOW_SECONDS",
        description="Time window for deduplication of log entries",
        gt=0,
        le=300  # Max 5 minutes
    )

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


class PIIRedactionConfig(BaseSettings):
    """Configuration for PII redaction rules"""

    # Enable PII redaction
    enable_pii_redaction: bool = Field(
        ...,
        validation_alias="LOGSTREAM_ENABLE_PII_REDACTION",
        description="Enable server-side PII redaction before streaming"
    )

    # Redaction patterns (pipe-separated regex patterns)
    pii_patterns: str = Field(
        ...,
        validation_alias="LOGSTREAM_PII_PATTERNS",
        description="Pipe-separated regex patterns for PII detection (e.g., email|ssn|creditcard)"
    )

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }

    @field_validator("pii_patterns")
    @classmethod
    def validate_patterns(cls, v: str) -> str:
        """Validate that patterns string is not empty when redaction is enabled"""
        if not v or not v.strip():
            raise ValueError("PII patterns cannot be empty when PII redaction is enabled")
        return v


class RateLimitConfig(BaseSettings):
    """Configuration for rate limiting log stream endpoints"""

    # Requests per minute per user
    requests_per_minute_per_user: int = Field(
        ...,
        validation_alias="LOGSTREAM_RATE_LIMIT_USER_RPM",
        description="Maximum requests per minute per authenticated user",
        gt=0,
        le=1000
    )

    # Requests per minute per investigation
    requests_per_minute_per_investigation: int = Field(
        ...,
        validation_alias="LOGSTREAM_RATE_LIMIT_INVESTIGATION_RPM",
        description="Maximum requests per minute per investigation_id",
        gt=0,
        le=500
    )

    # Concurrent connections per user
    max_concurrent_connections_per_user: int = Field(
        ...,
        validation_alias="LOGSTREAM_RATE_LIMIT_CONCURRENT_CONNECTIONS",
        description="Maximum concurrent SSE connections per user",
        gt=0,
        le=50
    )

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


class PollingConfig(BaseSettings):
    """Configuration for polling fallback mechanism"""

    # Polling interval
    default_polling_interval_ms: int = Field(
        ...,
        validation_alias="LOGSTREAM_POLLING_INTERVAL_MS",
        description="Default polling interval when SSE is unavailable",
        gt=0,
        le=30000  # Max 30 seconds
    )

    # Cursor validity
    cursor_validity_seconds: int = Field(
        ...,
        validation_alias="LOGSTREAM_CURSOR_VALIDITY_SECONDS",
        description="How long cursor tokens remain valid for pagination",
        gt=0,
        le=3600  # Max 1 hour
    )

    # ETag cache TTL
    etag_cache_ttl_seconds: int = Field(
        ...,
        validation_alias="LOGSTREAM_ETAG_CACHE_TTL_SECONDS",
        description="Time-to-live for ETag cache entries",
        gt=0,
        le=300  # Max 5 minutes
    )

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }


class LogStreamConfig(BaseSettings):
    """
    Complete log streaming configuration with environment variable validation.

    All values MUST be provided via environment variables.
    Missing required values will cause startup failure.
    """

    # Sub-configurations
    provider: LogProviderConfig = Field(default_factory=LogProviderConfig)
    sse: SSEConfig = Field(default_factory=SSEConfig)
    aggregator: AggregatorConfig = Field(default_factory=AggregatorConfig)
    pii_redaction: PIIRedactionConfig = Field(default_factory=PIIRedactionConfig)
    rate_limit: RateLimitConfig = Field(default_factory=RateLimitConfig)
    polling: PollingConfig = Field(default_factory=PollingConfig)

    # Global log stream settings
    enable_log_stream: bool = Field(
        ...,
        validation_alias="LOGSTREAM_ENABLE",
        description="Master switch to enable/disable log streaming feature"
    )

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"
    }
