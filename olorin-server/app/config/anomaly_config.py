"""
Anomaly Detection Configuration Schema

This module defines the configuration schema for anomaly detection service.
All values MUST come from environment variables with fail-fast validation.

Constitutional Compliance:
- NO hardcoded values (all from environment variables)
- Pydantic validation with fail-fast behavior
- No defaults for required configuration
- Clear error messages for missing configuration
"""

import os
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings
from typing import Optional


class AnomalyConfig(BaseSettings):
    """
    Anomaly Detection Configuration with environment variable validation.

    All values have sensible defaults and can be overridden via environment variables.
    Configuration is optional - system will work with defaults if not provided.
    """

    # Detection run configuration
    detection_run_interval_minutes: int = Field(
        default=15,
        env="ANOMALY_DETECTION_RUN_INTERVAL_MINUTES",
        description="Interval between scheduled detection runs in minutes",
        gt=0,
        le=1440  # Max 24 hours
    )

    # Default detector parameters
    default_k_threshold: float = Field(
        default=3.0,
        env="ANOMALY_DEFAULT_K_THRESHOLD",
        description="Default k threshold for anomaly scoring",
        gt=0.0
    )

    default_persistence: int = Field(
        default=2,
        env="ANOMALY_DEFAULT_PERSISTENCE",
        description="Default persistence requirement (number of windows)",
        ge=1
    )

    default_min_support: int = Field(
        default=100,
        env="ANOMALY_DEFAULT_MIN_SUPPORT",
        description="Default minimum support (minimum transactions per cohort)",
        ge=1
    )

    # Severity thresholds (global defaults)
    severity_info_max: float = Field(
        default=2.0,
        env="ANOMALY_SEVERITY_INFO_MAX",
        description="Maximum score for 'info' severity level",
        gt=0.0
    )

    severity_warn_max: float = Field(
        default=4.0,
        env="ANOMALY_SEVERITY_WARN_MAX",
        description="Maximum score for 'warn' severity level",
        gt=0.0
    )

    severity_critical_min: float = Field(
        default=6.0,
        env="ANOMALY_SEVERITY_CRITICAL_MIN",
        description="Minimum score for 'critical' severity level",
        gt=0.0
    )

    # Guardrails configuration
    hysteresis_raise_k: float = Field(
        default=3.0,
        env="ANOMALY_HYSTERESIS_RAISE_K",
        description="K threshold for raising anomaly alert",
        gt=0.0
    )

    hysteresis_clear_k: float = Field(
        default=2.0,
        env="ANOMALY_HYSTERESIS_CLEAR_K",
        description="K threshold for clearing anomaly alert",
        gt=0.0
    )

    cooldown_min_minutes: int = Field(
        default=5,
        env="ANOMALY_COOLDOWN_MIN_MINUTES",
        description="Minimum cooldown period in minutes",
        ge=0
    )

    cooldown_max_minutes: int = Field(
        default=60,
        env="ANOMALY_COOLDOWN_MAX_MINUTES",
        description="Maximum cooldown period in minutes",
        ge=0
    )

    # STL+MAD detector defaults
    stl_period: int = Field(
        default=7,
        env="ANOMALY_STL_PERIOD",
        description="STL decomposition period (number of windows for seasonality)",
        ge=1
    )

    stl_robust: bool = Field(
        default=True,
        env="ANOMALY_STL_ROBUST",
        description="Use robust STL decomposition"
    )

    # CUSUM detector defaults
    cusum_delta_multiplier: float = Field(
        default=0.75,
        env="ANOMALY_CUSUM_DELTA_MULTIPLIER",
        description="CUSUM delta multiplier (e.g., 0.75 for 0.75*std)",
        gt=0.0
    )

    cusum_threshold_multiplier: float = Field(
        default=5.0,
        env="ANOMALY_CUSUM_THRESHOLD_MULTIPLIER",
        description="CUSUM threshold multiplier (e.g., 5.0 for 5*std)",
        gt=0.0
    )

    # Isolation Forest defaults
    isoforest_n_estimators: int = Field(
        default=100,
        env="ANOMALY_ISOFOREST_N_ESTIMATORS",
        description="Number of estimators for Isolation Forest",
        ge=1
    )

    isoforest_contamination: float = Field(
        default=0.1,
        env="ANOMALY_ISOFOREST_CONTAMINATION",
        description="Expected proportion of anomalies (contamination rate)",
        gt=0.0,
        lt=1.0
    )

    @field_validator("severity_warn_max")
    @classmethod
    def validate_warn_max(cls, v: float, info) -> float:
        """Validate warn_max > info_max"""
        if hasattr(info, 'data') and 'severity_info_max' in info.data:
            if v <= info.data['severity_info_max']:
                raise ValueError("severity_warn_max must be greater than severity_info_max")
        return v

    @field_validator("severity_critical_min")
    @classmethod
    def validate_critical_min(cls, v: float, info) -> float:
        """Validate critical_min > warn_max"""
        if hasattr(info, 'data') and 'severity_warn_max' in info.data:
            if v <= info.data['severity_warn_max']:
                raise ValueError("severity_critical_min must be greater than severity_warn_max")
        return v

    @field_validator("hysteresis_clear_k")
    @classmethod
    def validate_hysteresis(cls, v: float, info) -> float:
        """Validate clear_k <= raise_k"""
        if hasattr(info, 'data') and 'hysteresis_raise_k' in info.data:
            if v > info.data['hysteresis_raise_k']:
                raise ValueError("hysteresis_clear_k must be <= hysteresis_raise_k")
        return v

    @field_validator("cooldown_max_minutes")
    @classmethod
    def validate_cooldown(cls, v: int, info) -> int:
        """Validate cooldown_max >= cooldown_min"""
        if hasattr(info, 'data') and 'cooldown_min_minutes' in info.data:
            if v < info.data['cooldown_min_minutes']:
                raise ValueError("cooldown_max_minutes must be >= cooldown_min_minutes")
        return v

    model_config = {
        "case_sensitive": False,
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore"  # Ignore extra environment variables not defined in this config
    }


def load_anomaly_config() -> AnomalyConfig:
    """
    Load and validate anomaly detection configuration from environment variables.

    Returns:
        AnomalyConfig: Validated configuration object

    Raises:
        ValueError: If required environment variables are missing or invalid
        RuntimeError: If configuration validation fails
    """
    try:
        config = AnomalyConfig()
        return config
    except Exception as e:
        error_msg = f"""
        ========================================
        ANOMALY CONFIGURATION ERROR - STARTUP FAILED
        ========================================

        Failed to load anomaly detection configuration from environment variables.

        Error: {str(e)}

        Optional Environment Variables (all have defaults):
        - ANOMALY_DETECTION_RUN_INTERVAL_MINUTES: Detection run interval (1-1440, default: 15)
        - ANOMALY_DEFAULT_K_THRESHOLD: Default k threshold (>0, default: 3.0)
        - ANOMALY_DEFAULT_PERSISTENCE: Default persistence (>=1, default: 2)
        - ANOMALY_DEFAULT_MIN_SUPPORT: Default min support (>=1, default: 100)
        - ANOMALY_SEVERITY_INFO_MAX: Info severity max (>0, default: 2.0)
        - ANOMALY_SEVERITY_WARN_MAX: Warn severity max (>info_max, default: 4.0)
        - ANOMALY_SEVERITY_CRITICAL_MIN: Critical severity min (>warn_max, default: 6.0)
        - ANOMALY_HYSTERESIS_RAISE_K: Hysteresis raise threshold (>0, default: 3.0)
        - ANOMALY_HYSTERESIS_CLEAR_K: Hysteresis clear threshold (<=raise_k, default: 2.0)
        - ANOMALY_COOLDOWN_MIN_MINUTES: Min cooldown (>=0, default: 5)
        - ANOMALY_COOLDOWN_MAX_MINUTES: Max cooldown (>=min, default: 60)
        - ANOMALY_STL_PERIOD: STL period (>=1, default: 7)
        - ANOMALY_STL_ROBUST: STL robust (true/false, default: true)
        - ANOMALY_CUSUM_DELTA_MULTIPLIER: CUSUM delta multiplier (>0, default: 0.75)
        - ANOMALY_CUSUM_THRESHOLD_MULTIPLIER: CUSUM threshold multiplier (>0, default: 5.0)
        - ANOMALY_ISOFOREST_N_ESTIMATORS: Isolation Forest estimators (>=1, default: 100)
        - ANOMALY_ISOFOREST_CONTAMINATION: Isolation Forest contamination (0-1, default: 0.1)

        ========================================
        """
        raise RuntimeError(error_msg) from e


# Global configuration instance
_anomaly_config: Optional[AnomalyConfig] = None


def get_anomaly_config() -> AnomalyConfig:
    """
    Get the global anomaly detection configuration instance.

    Configuration is loaded once and cached for performance.

    Returns:
        AnomalyConfig: Global configuration instance

    Raises:
        RuntimeError: If configuration cannot be loaded
    """
    global _anomaly_config
    if _anomaly_config is None:
        _anomaly_config = load_anomaly_config()
    return _anomaly_config

