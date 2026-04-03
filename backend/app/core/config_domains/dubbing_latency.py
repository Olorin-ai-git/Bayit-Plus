"""Domain config: Speech providers, latency profiles, synced streams, and CORS."""
import json
import os

from pydantic import Field


class DubbingLatencyConfigMixin:
    """Speech providers, latency estimation, synced streams, and CORS origins."""

    # Speech-to-Text Provider Selection
    SPEECH_TO_TEXT_PROVIDER: str = "elevenlabs"

    # Live Translation Provider Selection (for translating transcribed text)
    LIVE_TRANSLATION_PROVIDER: str = "google"

    # API Domain (REQUIRED for WebSocket URL construction in synced streams)
    API_DOMAIN: str = Field(
        default="localhost:8000",
        description="API domain for WebSocket URL construction (no protocol prefix)"
    )

    # Live Stream Base URL (REQUIRED for synced stream URL generation)
    LIVE_STREAM_BASE_URL: str = Field(
        default="https://stream.bayitplus.com/live",
        description="Base URL for live HLS streams (used in synced stream fallback)"
    )

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
    BACKEND_CORS_ORIGINS: list[str] | str = ""  # Required, no hardcoded defaults

    @property
    def parsed_cors_origins(self) -> list[str]:
        """Parse CORS origins from string or list."""
        if not self.BACKEND_CORS_ORIGINS:
            is_prod = os.getenv("ENVIRONMENT", "").lower() in (
                "production", "prod",
            )
            if not is_prod:
                return [
                    "http://localhost:3006",
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
            try:
                return json.loads(self.BACKEND_CORS_ORIGINS)
            except json.JSONDecodeError:
                return [
                    origin.strip()
                    for origin in self.BACKEND_CORS_ORIGINS.split(",")
                    if origin.strip()
                ]
        return self.BACKEND_CORS_ORIGINS
