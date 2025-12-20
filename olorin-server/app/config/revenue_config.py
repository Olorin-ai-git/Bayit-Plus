"""
Revenue Implication Configuration

Configuration for revenue calculation parameters including time windows,
take rates, and lifetime multipliers.

Feature: 024-revenue-implication-tracking
"""

import os
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, validator

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class RevenueConfig(BaseModel):
    """Configuration for revenue implication calculations."""

    # Time window configuration (in months)
    analyzer_historical_offset_months: int = Field(
        default=12,
        description="How far back to set analyzer reference time (months)",
        ge=12,  # Minimum 12 months for meaningful analysis
    )
    investigation_window_start_months: int = Field(
        default=24,
        description="Investigation window start offset (months ago)",
    )
    investigation_window_end_months: int = Field(
        default=12,
        description="Investigation window end offset (months ago)",
    )
    saved_fraud_gmv_start_months: int = Field(
        default=12,
        description="Saved Fraud GMV calculation window start (months ago)",
    )
    saved_fraud_gmv_end_months: int = Field(
        default=6,
        description="Saved Fraud GMV calculation window end (months ago)",
    )

    # Revenue calculation parameters
    take_rate_percent: Decimal = Field(
        default=Decimal("0.75"),
        description="Take rate percentage for Lost Revenues calculation",
        ge=Decimal("0"),
        le=Decimal("100"),
    )
    lifetime_multiplier: Decimal = Field(
        default=Decimal("1.0"),
        description="Lifetime value multiplier (1, 4, or 6 for 6mo, 2yr, 3yr)",
        ge=Decimal("1"),
        le=Decimal("10"),
    )

    # Confidence thresholds
    high_confidence_min_transactions: int = Field(
        default=100,
        description="Minimum transactions for High confidence",
    )
    medium_confidence_min_transactions: int = Field(
        default=10,
        description="Minimum transactions for Medium confidence",
    )

    @validator("investigation_window_start_months")
    def validate_window_order(cls, v, values):
        """Ensure investigation window start is before end."""
        end = values.get("investigation_window_end_months", 12)
        if v <= end:
            raise ValueError(
                f"investigation_window_start_months ({v}) must be > "
                f"investigation_window_end_months ({end})"
            )
        return v

    @validator("saved_fraud_gmv_start_months")
    def validate_gmv_window_order(cls, v, values):
        """Ensure GMV window start is before end."""
        end = values.get("saved_fraud_gmv_end_months", 6)
        if v <= end:
            raise ValueError(
                f"saved_fraud_gmv_start_months ({v}) must be > "
                f"saved_fraud_gmv_end_months ({end})"
            )
        return v

    class Config:
        """Pydantic config."""
        
        validate_assignment = True


def load_revenue_config() -> RevenueConfig:
    """
    Load revenue configuration from environment variables.

    Returns:
        RevenueConfig instance with values from environment or defaults.
    """
    config = RevenueConfig(
        analyzer_historical_offset_months=int(
            os.getenv("ANALYZER_HISTORICAL_OFFSET_MONTHS", "12")
        ),
        investigation_window_start_months=int(
            os.getenv("INVESTIGATION_WINDOW_START_MONTHS", "24")
        ),
        investigation_window_end_months=int(
            os.getenv("INVESTIGATION_WINDOW_END_MONTHS", "12")
        ),
        saved_fraud_gmv_start_months=int(
            os.getenv("SAVED_FRAUD_GMV_START_MONTHS", "12")
        ),
        saved_fraud_gmv_end_months=int(
            os.getenv("SAVED_FRAUD_GMV_END_MONTHS", "6")
        ),
        take_rate_percent=Decimal(
            os.getenv("REVENUE_TAKE_RATE_PERCENT", "0.75")
        ),
        lifetime_multiplier=Decimal(
            os.getenv("REVENUE_LIFETIME_MULTIPLIER", "1.0")
        ),
        high_confidence_min_transactions=int(
            os.getenv("REVENUE_HIGH_CONFIDENCE_MIN_TX", "100")
        ),
        medium_confidence_min_transactions=int(
            os.getenv("REVENUE_MEDIUM_CONFIDENCE_MIN_TX", "10")
        ),
    )

    logger.info(
        f"📊 Revenue config loaded: "
        f"analyzer_offset={config.analyzer_historical_offset_months}mo, "
        f"inv_window={config.investigation_window_start_months}-"
        f"{config.investigation_window_end_months}mo, "
        f"gmv_window={config.saved_fraud_gmv_start_months}-"
        f"{config.saved_fraud_gmv_end_months}mo, "
        f"take_rate={config.take_rate_percent}%, "
        f"lifetime_mult={config.lifetime_multiplier}x"
    )

    return config


# Singleton instance - reloaded on each access for config changes
_config_instance: Optional[RevenueConfig] = None


def get_revenue_config(force_reload: bool = False) -> RevenueConfig:
    """
    Get revenue configuration singleton.

    Args:
        force_reload: If True, reload config from environment.

    Returns:
        RevenueConfig instance.
    """
    global _config_instance
    if _config_instance is None or force_reload:
        _config_instance = load_revenue_config()
    return _config_instance






