"""
Unified Threshold Configuration
Feature: Training Data Separation & Positive GMV

Single source of truth for all risk classification thresholds.
Eliminates inconsistencies where different modules used different defaults.

Previous inconsistencies fixed:
- enhanced_risk_scorer.py: 0.20
- confusion_matrix_calculator.py: 0.50
- investigation_transaction_mapper.py: 0.30 / 0.50
- comparison_service.py: 0.30
- prediction_storage.py: 0.50
- revenue_calculator.py: 0.50
- startup_report_generator.py: 0.30
- on_demand_startup_report_service.py: 0.30

Constitutional Compliance:
- All values configurable via environment variables
- No hardcoded business logic
- Single source of truth pattern
"""

import os
from typing import Optional

from pydantic import BaseModel, Field

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class ThresholdConfig(BaseModel):
    """Unified threshold configuration for fraud detection."""

    risk_threshold_default: float = Field(
        ge=0.0,
        le=1.0,
        description="Default threshold for binary fraud classification (Fraud vs Not Fraud)",
    )
    llm_fraud_threshold: float = Field(
        ge=0.0,
        le=1.0,
        description="Threshold for LLM-based fraud classification in hybrid scoring",
    )

    class Config:
        """Pydantic config."""

        validate_assignment = True


def load_threshold_config() -> ThresholdConfig:
    """
    Load threshold configuration from environment variables.

    REQUIRES .env file to have RISK_THRESHOLD_DEFAULT and LLM_FRAUD_THRESHOLD set.
    No defaults - fails fast if not configured.

    Returns:
        ThresholdConfig instance with unified threshold values.
    """
    risk_threshold = os.getenv("RISK_THRESHOLD_DEFAULT")
    llm_threshold = os.getenv("LLM_FRAUD_THRESHOLD")

    if risk_threshold is None:
        raise ValueError(
            "RISK_THRESHOLD_DEFAULT must be set in .env file. "
            "Example: RISK_THRESHOLD_DEFAULT=0.40"
        )
    if llm_threshold is None:
        raise ValueError(
            "LLM_FRAUD_THRESHOLD must be set in .env file. "
            "Example: LLM_FRAUD_THRESHOLD=0.80"
        )

    config = ThresholdConfig(
        risk_threshold_default=float(risk_threshold),
        llm_fraud_threshold=float(llm_threshold),
    )

    logger.info(
        f"Threshold config loaded from .env: "
        f"risk_threshold_default={config.risk_threshold_default}, "
        f"llm_fraud_threshold={config.llm_fraud_threshold}"
    )

    return config


_threshold_config: Optional[ThresholdConfig] = None


def get_threshold_config(force_reload: bool = False) -> ThresholdConfig:
    """
    Get threshold configuration singleton.

    Args:
        force_reload: If True, reload config from environment.

    Returns:
        ThresholdConfig instance.
    """
    global _threshold_config
    if _threshold_config is None or force_reload:
        _threshold_config = load_threshold_config()
    return _threshold_config


def clear_threshold_config_cache() -> None:
    """Clear cached threshold config to force reload from environment."""
    global _threshold_config
    _threshold_config = None
    logger.debug("Threshold config cache cleared")


def get_risk_threshold() -> float:
    """
    Get the unified risk threshold for fraud classification.

    This is the primary function all modules should use to get the threshold.
    Replaces scattered os.getenv("RISK_THRESHOLD_DEFAULT", ...) calls.

    Returns:
        Risk threshold value (0.0 - 1.0).
    """
    return get_threshold_config().risk_threshold_default


def get_llm_fraud_threshold() -> float:
    """
    Get the LLM-specific fraud threshold for hybrid scoring.

    Returns:
        LLM fraud threshold value (0.0 - 1.0).
    """
    return get_threshold_config().llm_fraud_threshold


class BlindspotSelectorConfig(BaseModel):
    """Configuration for blindspot-aware entity selection.

    Feature: blindspot-aware-selection
    """

    enabled: bool = Field(default=True, description="Enable blindspot-aware selection")
    fn_weight: float = Field(
        default=3.0, ge=1.0, le=10.0, description="Weight multiplier for high-FN zones"
    )
    gmv_stratification_enabled: bool = Field(
        default=True, description="Enable GMV bin stratification"
    )
    gmv_bin_min_pct: float = Field(
        default=5.0, ge=1.0, le=20.0, description="Min % per GMV bin"
    )
    low_score_boost: float = Field(
        default=2.5, ge=1.0, le=5.0, description="Boost for low-score entities"
    )
    cache_ttl: int = Field(
        default=3600, ge=60, le=86400, description="Cache TTL in seconds"
    )


def load_blindspot_selector_config() -> BlindspotSelectorConfig:
    """Load blindspot selector configuration from environment variables."""
    return BlindspotSelectorConfig(
        enabled=os.getenv("SELECTOR_BLINDSPOT_ENABLED", "true").lower() == "true",
        fn_weight=float(os.getenv("SELECTOR_BLINDSPOT_FN_WEIGHT", "3.0")),
        gmv_stratification_enabled=os.getenv(
            "SELECTOR_GMV_STRATIFICATION_ENABLED", "true"
        ).lower()
        == "true",
        gmv_bin_min_pct=float(os.getenv("SELECTOR_GMV_BIN_MIN_PCT", "5.0")),
        low_score_boost=float(os.getenv("SELECTOR_LOW_SCORE_BOOST", "2.5")),
        cache_ttl=int(os.getenv("SELECTOR_BLINDSPOT_CACHE_TTL", "3600")),
    )


_blindspot_selector_config: Optional[BlindspotSelectorConfig] = None


def get_blindspot_selector_config(
    force_reload: bool = False,
) -> BlindspotSelectorConfig:
    """Get blindspot selector configuration singleton."""
    global _blindspot_selector_config
    if _blindspot_selector_config is None or force_reload:
        _blindspot_selector_config = load_blindspot_selector_config()
        logger.info(
            f"Blindspot selector config: enabled={_blindspot_selector_config.enabled}, "
            f"fn_weight={_blindspot_selector_config.fn_weight}, "
            f"gmv_stratification={_blindspot_selector_config.gmv_stratification_enabled}"
        )
    return _blindspot_selector_config
