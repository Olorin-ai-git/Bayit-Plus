"""
Training Configuration Loader
Feature: 026-llm-training-pipeline

Loads and validates LLM training configuration from YAML files.
All values are sourced from environment variables via placeholders.
"""

import os
import re
from pathlib import Path
from typing import Any, Dict, Optional

import yaml
from pydantic import BaseModel, Field, field_validator

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ProviderConfig(BaseModel):
    """LLM provider configuration."""

    primary: str = Field(description="Primary LLM provider (claude/openai/google)")
    model_id: str = Field(description="Primary model identifier")
    fallback_provider: str = Field(description="Fallback LLM provider")
    fallback_model_id: str = Field(description="Fallback model identifier")


class BatchProcessingConfig(BaseModel):
    """Batch processing configuration."""

    batch_size: int = Field(ge=1, le=1000, description="Batch size for processing")
    max_concurrent: int = Field(ge=1, le=20, description="Max concurrent requests")
    timeout_seconds: int = Field(ge=10, le=600, description="Request timeout")
    retry_attempts: int = Field(ge=0, le=10, description="Retry attempts on failure")
    retry_delay_seconds: int = Field(ge=1, le=60, description="Delay between retries")


class DataSamplingConfig(BaseModel):
    """Data sampling configuration."""

    fraud_ratio: float = Field(ge=0.0, le=1.0, description="Fraud ratio in sample")
    time_window_days: int = Field(ge=1, le=730, description="Time window for sampling")
    min_sample_size: int = Field(ge=10, description="Minimum sample size")
    max_sample_size: int = Field(ge=100, description="Maximum sample size")
    stratified_by_merchant: bool = Field(description="Stratify by merchant")


class ScoringConfig(BaseModel):
    """Scoring thresholds configuration."""

    fraud_threshold: float = Field(ge=0.0, le=1.0, description="Fraud threshold")
    high_confidence_threshold: float = Field(ge=0.0, le=1.0)
    low_confidence_threshold: float = Field(ge=0.0, le=1.0)
    require_reasoning: bool = Field(description="Require reasoning in output")


class PromptsConfig(BaseModel):
    """Prompt configuration."""

    active_version: str = Field(description="Active prompt version")
    prompts_directory: str = Field(description="Directory containing prompts")
    cache_enabled: bool = Field(description="Enable prompt caching")
    cache_ttl_seconds: int = Field(ge=60, description="Cache TTL in seconds")


class OutputConfig(BaseModel):
    """Output configuration."""

    include_reasoning: bool = Field(description="Include reasoning in output")
    include_confidence: bool = Field(description="Include confidence score")
    include_feature_weights: bool = Field(description="Include feature weights")
    max_reasoning_length: int = Field(ge=100, le=2000, description="Max reasoning len")


class LoggingConfig(BaseModel):
    """Logging configuration."""

    log_prompts: bool = Field(description="Log prompts (debug)")
    log_responses: bool = Field(description="Log LLM responses (debug)")
    log_metrics: bool = Field(description="Log performance metrics")
    metrics_export_enabled: bool = Field(description="Export metrics externally")


class TrainingConfig(BaseModel):
    """Main training configuration."""

    enabled: bool = Field(description="Enable LLM training pipeline")
    reasoning_enabled: bool = Field(description="Enable LLM reasoning mode")
    provider: ProviderConfig
    batch_processing: BatchProcessingConfig
    data_sampling: DataSamplingConfig
    scoring: ScoringConfig
    prompts: PromptsConfig
    output: OutputConfig
    logging: LoggingConfig

    @field_validator("scoring")
    @classmethod
    def validate_thresholds(cls, v: ScoringConfig) -> ScoringConfig:
        """Validate threshold ordering."""
        if v.low_confidence_threshold >= v.high_confidence_threshold:
            raise ValueError("low_confidence must be less than high_confidence")
        return v


def _resolve_env_placeholder(value: str) -> Any:
    """Resolve environment variable placeholder in config value."""
    if not isinstance(value, str):
        return value

    pattern = r"\$\{([^:}]+)(?::([^}]*))?\}"
    match = re.match(pattern, value)

    if not match:
        return value

    env_var = match.group(1)
    default_value = match.group(2)

    env_value = os.getenv(env_var)

    if env_value is not None:
        result = env_value
    elif default_value is not None:
        result = default_value
    else:
        logger.warning(f"Environment variable {env_var} not set and no default")
        return None

    if result.lower() in ("true", "false"):
        return result.lower() == "true"
    try:
        return int(result)
    except ValueError:
        pass
    try:
        return float(result)
    except ValueError:
        pass
    return result


def _resolve_config_dict(config: Dict[str, Any]) -> Dict[str, Any]:
    """Recursively resolve environment placeholders in config dictionary."""
    resolved = {}
    for key, value in config.items():
        if isinstance(value, dict):
            resolved[key] = _resolve_config_dict(value)
        elif isinstance(value, str):
            resolved[key] = _resolve_env_placeholder(value)
        else:
            resolved[key] = value
    return resolved


def load_training_config(config_path: Optional[str] = None) -> TrainingConfig:
    """
    Load and validate training configuration from YAML file.

    Args:
        config_path: Path to config file. Defaults to config/llm_training_config.yaml

    Returns:
        Validated TrainingConfig object

    Raises:
        FileNotFoundError: If config file not found
        ValueError: If configuration validation fails
    """
    if config_path is None:
        config_path = os.getenv(
            "LLM_TRAINING_CONFIG_PATH", "config/llm_training_config.yaml"
        )

    config_file = Path(config_path)
    if not config_file.is_absolute():
        config_file = Path(__file__).parent.parent.parent.parent / config_path

    if not config_file.exists():
        raise FileNotFoundError(f"Training config not found: {config_file}")

    logger.info(f"Loading training config from: {config_file}")

    with open(config_file, "r") as f:
        raw_config = yaml.safe_load(f)

    if "llm_training" not in raw_config:
        raise ValueError("Config must contain 'llm_training' section")

    resolved_config = _resolve_config_dict(raw_config["llm_training"])
    config = TrainingConfig(**resolved_config)

    logger.info(f"Training config loaded: enabled={config.enabled}")
    return config


_training_config: Optional[TrainingConfig] = None


def get_training_config() -> TrainingConfig:
    """Get cached training configuration instance."""
    global _training_config
    if _training_config is None:
        _training_config = load_training_config()
    return _training_config
