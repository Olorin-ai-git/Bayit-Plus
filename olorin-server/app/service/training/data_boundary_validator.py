"""
Data Boundary Validator
Feature: Training/Detection Data Separation

Validates temporal boundaries between training data and detection/evaluation data
to prevent data leakage and ensure model metrics reflect real-world performance.

Training data MUST NOT overlap with detection/evaluation data.
"""

import os
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Optional, Tuple

from pydantic import BaseModel, Field, field_validator

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class DataBoundaryConfig(BaseModel):
    """Configuration for data boundary validation."""

    training_observation_end_date: date = Field(
        description="End date of training observation period (latest label date)"
    )
    detection_window_start: date = Field(
        description="Start date of detection/evaluation window"
    )
    enforce_boundary_check: bool = Field(
        default=True,
        description="Whether to enforce boundary checks (fail-fast mode)"
    )
    min_gap_days: int = Field(
        default=1,
        ge=0,
        description="Minimum gap in days between training and detection periods"
    )

    @field_validator("detection_window_start")
    @classmethod
    def validate_detection_after_training(cls, v: date, info) -> date:
        """Ensure detection window starts after training observation ends."""
        training_end = info.data.get("training_observation_end_date")
        if training_end and v <= training_end:
            raise ValueError(
                f"detection_window_start ({v}) must be after "
                f"training_observation_end_date ({training_end})"
            )
        return v


@dataclass
class BoundaryValidationResult:
    """Result of boundary validation."""

    is_valid: bool
    message: str
    training_end: Optional[date] = None
    detection_start: Optional[date] = None
    gap_days: Optional[int] = None


class DataBoundaryViolationError(Exception):
    """Raised when data boundary validation fails."""

    pass


def load_boundary_config() -> DataBoundaryConfig:
    """
    Load data boundary configuration from environment variables.

    Returns:
        DataBoundaryConfig instance with validated values.

    Raises:
        ValueError: If configuration is invalid or boundaries overlap.
    """
    training_end_str = os.getenv("TRAINING_OBSERVATION_END_DATE", "2024-06-30")
    detection_start_str = os.getenv("DETECTION_WINDOW_START", "2024-07-01")
    enforce_check = os.getenv("ENFORCE_DATA_BOUNDARY_CHECK", "true").lower() == "true"
    min_gap = int(os.getenv("DATA_BOUNDARY_MIN_GAP_DAYS", "1"))

    training_end = datetime.strptime(training_end_str, "%Y-%m-%d").date()
    detection_start = datetime.strptime(detection_start_str, "%Y-%m-%d").date()

    config = DataBoundaryConfig(
        training_observation_end_date=training_end,
        detection_window_start=detection_start,
        enforce_boundary_check=enforce_check,
        min_gap_days=min_gap,
    )

    logger.info(
        f"Data boundary config loaded: "
        f"training_end={training_end}, detection_start={detection_start}, "
        f"enforce={enforce_check}, min_gap={min_gap} days"
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


def validate_no_overlap(
    training_end: date,
    detection_start: date,
    min_gap_days: int = 1,
) -> BoundaryValidationResult:
    """
    Validate that training and detection periods do not overlap.

    Args:
        training_end: End date of training observation period.
        detection_start: Start date of detection/evaluation window.
        min_gap_days: Minimum required gap between periods.

    Returns:
        BoundaryValidationResult with validation outcome.
    """
    gap_days = (detection_start - training_end).days

    if gap_days < min_gap_days:
        return BoundaryValidationResult(
            is_valid=False,
            message=(
                f"Data boundary violation: detection_start ({detection_start}) "
                f"is only {gap_days} days after training_end ({training_end}). "
                f"Minimum required gap: {min_gap_days} days."
            ),
            training_end=training_end,
            detection_start=detection_start,
            gap_days=gap_days,
        )

    return BoundaryValidationResult(
        is_valid=True,
        message=f"Valid boundary: {gap_days} days gap between training and detection.",
        training_end=training_end,
        detection_start=detection_start,
        gap_days=gap_days,
    )


def get_safe_detection_start_date() -> date:
    """
    Get the earliest safe date for detection/evaluation.

    Returns:
        Date that is one day after training_observation_end_date.
    """
    config = get_boundary_config()
    return config.training_observation_end_date + timedelta(days=1)


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
    training_end = config.training_observation_end_date

    if entity_date <= training_end:
        message = (
            f"Entity date {entity_date} falls within training period "
            f"(ends {training_end}). This would cause data leakage."
        )
        if config.enforce_boundary_check:
            raise DataBoundaryViolationError(message)
        logger.warning(message)
        return False, message

    return True, f"Entity date {entity_date} is after training period."


def validate_date_range(
    start_date: date,
    end_date: date,
) -> Tuple[bool, str]:
    """
    Validate that a date range is safe for detection/evaluation.

    Args:
        start_date: Start of the date range.
        end_date: End of the date range.

    Returns:
        Tuple of (is_valid, message).

    Raises:
        DataBoundaryViolationError: If enforce mode is enabled and range overlaps.
    """
    config = get_boundary_config()
    training_end = config.training_observation_end_date

    if start_date <= training_end:
        message = (
            f"Date range start {start_date} falls within training period "
            f"(ends {training_end}). This would cause data leakage."
        )
        if config.enforce_boundary_check:
            raise DataBoundaryViolationError(message)
        logger.warning(message)
        return False, message

    return True, f"Date range {start_date} to {end_date} is after training period."


def validate_configuration_boundaries() -> BoundaryValidationResult:
    """
    Validate the current configuration boundaries at startup.

    This should be called during application initialization to fail-fast
    if boundaries are misconfigured.

    Returns:
        BoundaryValidationResult with validation outcome.
    """
    config = get_boundary_config()
    return validate_no_overlap(
        training_end=config.training_observation_end_date,
        detection_start=config.detection_window_start,
        min_gap_days=config.min_gap_days,
    )
