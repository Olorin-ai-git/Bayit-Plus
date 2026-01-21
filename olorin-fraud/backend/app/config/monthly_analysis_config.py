"""
Monthly Analysis Configuration

Configuration for monthly sequential startup analysis mode.
Allows running 24h analysis windows day-by-day for a full month.

Feature: monthly-sequential-analysis
"""

import calendar
import os
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, validator

from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class MonthlyAnalysisConfig(BaseModel):
    """Configuration for monthly sequential analysis mode."""

    enabled: bool = Field(
        default=False,
        description="Master switch to enable monthly analysis mode",
    )
    year: int = Field(
        description="Target year for analysis",
        ge=2020,
        le=2030,
    )
    month: int = Field(
        description="Target month (1-12)",
        ge=1,
        le=12,
    )
    resume_from_day: int = Field(
        default=1,
        description="Day to resume from (for interruption recovery)",
        ge=1,
        le=31,
    )

    @validator("resume_from_day")
    def validate_resume_day(cls, v, values):
        """Ensure resume_from_day is valid for the given month."""
        year = values.get("year")
        month = values.get("month")
        if year and month:
            _, last_day = calendar.monthrange(year, month)
            if v > last_day:
                raise ValueError(
                    f"resume_from_day ({v}) exceeds days in month "
                    f"({last_day} for {year}-{month:02d})"
                )
        return v

    def get_days_in_month(self) -> int:
        """Return the number of days in the configured month."""
        _, last_day = calendar.monthrange(self.year, self.month)
        return last_day

    def get_month_name(self) -> str:
        """Return the full month name."""
        return calendar.month_name[self.month]

    class Config:
        """Pydantic config."""

        validate_assignment = True


def load_monthly_analysis_config() -> MonthlyAnalysisConfig:
    """
    Load monthly analysis configuration from environment variables.

    Returns:
        MonthlyAnalysisConfig instance with values from environment or defaults.
    """
    enabled = os.getenv("MONTHLY_ANALYSIS_ENABLED", "false").lower() == "true"
    current_date = datetime.now()

    config = MonthlyAnalysisConfig(
        enabled=enabled,
        year=int(os.getenv("MONTHLY_ANALYSIS_YEAR", str(current_date.year))),
        month=int(os.getenv("MONTHLY_ANALYSIS_MONTH", str(current_date.month))),
        resume_from_day=int(os.getenv("MONTHLY_ANALYSIS_RESUME_FROM_DAY", "1")),
    )

    if enabled:
        logger.info(
            f"📅 Monthly analysis config loaded: "
            f"{config.get_month_name()} {config.year}, "
            f"resume_from_day={config.resume_from_day}, "
            f"days_in_month={config.get_days_in_month()}"
        )
    else:
        logger.debug("Monthly analysis mode is disabled")

    return config


_config_instance: Optional[MonthlyAnalysisConfig] = None


def get_monthly_analysis_config(force_reload: bool = False) -> MonthlyAnalysisConfig:
    """
    Get monthly analysis configuration singleton.

    Args:
        force_reload: If True, reload config from environment.

    Returns:
        MonthlyAnalysisConfig instance.
    """
    global _config_instance
    if _config_instance is None or force_reload:
        _config_instance = load_monthly_analysis_config()
    return _config_instance
