"""
Data Boundary Validator
Feature: Training/Detection Data Separation

Validates temporal boundaries between training data and detection/evaluation data
to prevent data leakage and ensure model metrics reflect real-world performance.

Training data MUST NOT overlap with detection/evaluation data.

Uses relative windows based on revenue_config:
- Investigation window: 24-12 months ago (SAFE for detection)
- Training Period 1: >24 months ago (before investigation)
- Training Period 2: 12-6 months ago (GMV window, confirmed outcomes)
"""

import os
from dataclasses import dataclass
from datetime import date, datetime
from dateutil.relativedelta import relativedelta
from typing import Optional, Tuple

from pydantic import BaseModel, Field

from app.config.revenue_config import get_revenue_config
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DataBoundaryConfig(BaseModel):
    """Configuration for data boundary validation using relative windows."""

    investigation_start: date = Field(
        description="Start date of investigation window (earliest safe detection date)"
    )
    investigation_end: date = Field(
        description="End date of investigation window"
    )
    gmv_window_start: date = Field(
        description="Start of GMV window (used for training, NOT detection)"
    )
    gmv_window_end: date = Field(
        description="End of GMV window (used for training, NOT detection)"
    )
    enforce_boundary_check: bool = Field(
        default=True,
        description="Whether to enforce boundary checks (fail-fast mode)"
    )


@dataclass
class BoundaryValidationResult:
    """Result of boundary validation."""

    is_valid: bool
    message: str
    investigation_start: Optional[date] = None
    investigation_end: Optional[date] = None
    gap_days: Optional[int] = None


class DataBoundaryViolationError(Exception):
    """Raised when data boundary validation fails."""

    pass


def load_boundary_config() -> DataBoundaryConfig:
    """
    Load data boundary configuration from revenue_config (relative windows).

    Returns:
        DataBoundaryConfig instance with validated values.
    """
    revenue_config = get_revenue_config()
    now = datetime.utcnow()

    # Investigation window (where we detect/investigate fraud)
    inv_start = now - relativedelta(months=revenue_config.investigation_window_start_months)
    inv_end = now - relativedelta(months=revenue_config.investigation_window_end_months)

    # GMV window (used for training, NOT detection)
    gmv_start = now - relativedelta(months=revenue_config.saved_fraud_gmv_start_months)
    gmv_end = now - relativedelta(months=revenue_config.saved_fraud_gmv_end_months)

    enforce_check = os.getenv("ENFORCE_DATA_BOUNDARY_CHECK", "true").lower() == "true"

    config = DataBoundaryConfig(
        investigation_start=inv_start.date(),
        investigation_end=inv_end.date(),
        gmv_window_start=gmv_start.date(),
        gmv_window_end=gmv_end.date(),
        enforce_boundary_check=enforce_check,
    )

    logger.info(
        f"Data boundary config loaded (relative windows): "
        f"investigation={inv_start.date()} to {inv_end.date()}, "
        f"gmv_window={gmv_start.date()} to {gmv_end.date()}, enforce={enforce_check}"
    )

    return config


_boundary_config: Optional[DataBoundaryConfig] = None


def get_boundary_config(force_reload: bool = False) -> DataBoundaryConfig:
    """Get cached boundary configuration instance."""
    global _boundary_config
    if _boundary_config is None or force_reload:
        _boundary_config = load_boundary_config()
    return _boundary_config


def clear_boundary_config_cache() -> None:
    """Clear cached boundary config to force reload from environment."""
    global _boundary_config
    _boundary_config = None
    logger.debug("Boundary config cache cleared")


def validate_date_range(
    start_date: date,
    end_date: date,
) -> Tuple[bool, str]:
    """
    Validate that a date range is safe for detection/evaluation.

    Safe dates are within the investigation window (24-12 months ago).
    Unsafe dates are in training periods or too recent.

    Args:
        start_date: Start of the date range.
        end_date: End of the date range.

    Returns:
        Tuple of (is_valid, message).

    Raises:
        DataBoundaryViolationError: If enforce mode is enabled and range overlaps.
    """
    config = get_boundary_config()
    inv_start = config.investigation_start
    inv_end = config.investigation_end
    gmv_start = config.gmv_window_start
    gmv_end = config.gmv_window_end

    # Check if date range falls within GMV training window
    if start_date >= gmv_start and start_date <= gmv_end:
        message = (
            f"Date range start {start_date} falls within GMV training window "
            f"({gmv_start} to {gmv_end}). This would cause data leakage."
        )
        if config.enforce_boundary_check:
            raise DataBoundaryViolationError(message)
        logger.warning(message)
        return False, message

    # Check if date range is before investigation window (too old - training period 1)
    if end_date < inv_start:
        message = (
            f"Date range ends {end_date} before investigation window starts "
            f"({inv_start}). This is in historical training period."
        )
        if config.enforce_boundary_check:
            raise DataBoundaryViolationError(message)
        logger.warning(message)
        return False, message

    return True, f"Date range {start_date} to {end_date} is within investigation window."


def validate_entity_date(entity_date: date) -> Tuple[bool, str]:
    """
    Validate that an entity's transaction date is safe for detection.

    Args:
        entity_date: The date of the entity's transactions.

    Returns:
        Tuple of (is_valid, message).

    Raises:
        DataBoundaryViolationError: If enforce mode is enabled and date is invalid.
    """
    config = get_boundary_config()
    inv_start = config.investigation_start
    gmv_start = config.gmv_window_start
    gmv_end = config.gmv_window_end

    # Check if entity date falls within GMV training window
    if gmv_start <= entity_date <= gmv_end:
        message = (
            f"Entity date {entity_date} falls within GMV training window "
            f"({gmv_start} to {gmv_end}). This would cause data leakage."
        )
        if config.enforce_boundary_check:
            raise DataBoundaryViolationError(message)
        logger.warning(message)
        return False, message

    # Check if entity date is before investigation window
    if entity_date < inv_start:
        message = (
            f"Entity date {entity_date} is before investigation window "
            f"(starts {inv_start}). This is in historical training period."
        )
        if config.enforce_boundary_check:
            raise DataBoundaryViolationError(message)
        logger.warning(message)
        return False, message

    return True, f"Entity date {entity_date} is within safe detection window."


def validate_configuration_boundaries() -> BoundaryValidationResult:
    """
    Validate the current configuration boundaries at startup.

    This should be called during application initialization to fail-fast
    if boundaries are misconfigured.

    Returns:
        BoundaryValidationResult with validation outcome.
    """
    config = get_boundary_config()

    # Verify investigation window doesn't overlap with GMV window
    # (they can touch on the same day - that's the boundary)
    if config.investigation_end > config.gmv_window_start:
        return BoundaryValidationResult(
            is_valid=False,
            message=(
                f"Configuration error: investigation_end ({config.investigation_end}) "
                f"overlaps with gmv_window_start ({config.gmv_window_start})"
            ),
            investigation_start=config.investigation_start,
            investigation_end=config.investigation_end,
        )

    gap_days = (config.gmv_window_start - config.investigation_end).days

    return BoundaryValidationResult(
        is_valid=True,
        message=f"Valid configuration: {gap_days} days gap between investigation and GMV window.",
        investigation_start=config.investigation_start,
        investigation_end=config.investigation_end,
        gap_days=gap_days,
    )
