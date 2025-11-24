"""
TimeRange Model

Time range filter model for investigation data collection.
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from datetime import datetime
from typing import Optional


class TimeRange(BaseModel):
    """
    Time range filter for investigation data collection.

    Constitutional Compliance:
    - Uses ISO 8601 datetime format for interoperability
    - Validation ensures end_time > start_time
    - No hardcoded date values
    """
    start_time: datetime = Field(
        ...,
        description="Investigation start time in ISO 8601 format",
        json_schema_extra={
            "example": "2025-01-01T00:00:00Z"
        }
    )
    end_time: datetime = Field(
        ...,
        description="Investigation end time in ISO 8601 format",
        json_schema_extra={
            "example": "2025-01-02T00:00:00Z"
        }
    )
    window_days: Optional[int] = Field(
        default=14,
        ge=1,
        le=365,
        description="Investigation window duration in days (e.g., 14 for a 14-day window)"
    )

    @field_validator("end_time")
    @classmethod
    def validate_end_after_start(cls, v: datetime, info) -> datetime:
        """
        Validate that end_time is after start_time and not later than max lookback.

        Constitutional Compliance:
        - Fail-fast validation at request time
        - No tolerance for invalid date ranges
        - Enforces max lookback period from environment configuration
        """
        if "start_time" in info.data and v <= info.data["start_time"]:
            raise ValueError("end_time must be after start_time")
        
        # Cap end_time at max_lookback_months before current date
        import os
        from datetime import timedelta
        max_lookback_months = int(os.getenv('ANALYTICS_MAX_LOOKBACK_MONTHS', '6'))
        max_lookback_days = max_lookback_months * 30
        max_allowed_end = datetime.utcnow() - timedelta(days=max_lookback_days)
        
        if v > max_allowed_end:
            raise ValueError(f"end_time cannot be later than {max_lookback_months} months before current date ({max_allowed_end.date()})")
        
        return v

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_not_future(cls, v: datetime) -> datetime:
        """
        Validate that timestamps are not in the future.

        Constitutional Compliance:
        - Prevents invalid future investigation time ranges
        - Uses runtime datetime comparison (not hardcoded)
        """
        if v > datetime.utcnow():
            raise ValueError("Timestamp cannot be in the future")
        return v

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "start_time": "2025-01-01T00:00:00Z",
                "end_time": "2025-01-02T00:00:00Z"
            }
        }
    )
