"""
Configuration Module for Olorin Services

Provides configurable defaults that can be overridden by consumers.
"""

from pydantic import BaseModel, Field


class ResilienceConfig(BaseModel):
    """Configuration for circuit breaker and resilience patterns."""

    circuit_breaker_failure_threshold: int = Field(
        default=5,
        description="Number of failures before circuit opens",
    )
    circuit_breaker_recovery_timeout_seconds: int = Field(
        default=30,
        description="Seconds before attempting recovery",
    )
    circuit_breaker_half_open_max_calls: int = Field(
        default=3,
        description="Max calls during recovery testing",
    )


class MeteringConfig(BaseModel):
    """Configuration for metering and cost calculations."""

    # Cost per unit rates
    cost_per_audio_second_stt: float = Field(
        default=0.0001,
        description="Cost per second of STT processing",
    )
    cost_per_audio_second_tts: float = Field(
        default=0.0002,
        description="Cost per second of TTS processing",
    )
    cost_per_1k_translation_chars: float = Field(
        default=0.02,
        description="Cost per 1000 characters translated",
    )
    cost_per_1k_embedding_tokens: float = Field(
        default=0.0001,
        description="Cost per 1000 embedding tokens",
    )
    cost_per_1k_tokens_llm: float = Field(
        default=0.015,
        description="Cost per 1000 LLM tokens",
    )


class OlorinServicesConfig(BaseModel):
    """Root configuration for Olorin services."""

    resilience: ResilienceConfig = Field(default_factory=ResilienceConfig)
    metering: MeteringConfig = Field(default_factory=MeteringConfig)


# Global configuration instance - can be replaced by consumers
_config: OlorinServicesConfig = OlorinServicesConfig()


def get_config() -> OlorinServicesConfig:
    """Get the current configuration."""
    return _config


def set_config(config: OlorinServicesConfig) -> None:
    """Set the global configuration."""
    global _config
    _config = config


def configure(
    resilience: ResilienceConfig | None = None,
    metering: MeteringConfig | None = None,
) -> None:
    """Configure Olorin services with custom settings."""
    global _config
    _config = OlorinServicesConfig(
        resilience=resilience or _config.resilience,
        metering=metering or _config.metering,
    )
