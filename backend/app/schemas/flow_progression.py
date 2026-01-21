"""
Flow Progression Schemas

Pydantic schemas for daily/monthly flow progression derived from investigation state.
"""

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class StatusCounts(BaseModel):
    """Counts bucketed by investigation status."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    by_status: Dict[str, int] = Field(
        description="Counts by status (e.g., IN_PROGRESS, COMPLETED, ERROR, CANCELLED)"
    )


class DailyFlowProgression(BaseModel):
    """Daily flow progression snapshot."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    date: str = Field(description="UTC date (YYYY-MM-DD) for this daily snapshot")
    total: int = Field(description="Total investigations created on this date")
    status_counts: StatusCounts


class MonthlyDayProgression(BaseModel):
    """Per-day progression within a month."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    date: str = Field(description="UTC date (YYYY-MM-DD) for this day bucket")
    total: int = Field(description="Total investigations created on this date")
    status_counts: StatusCounts


class MonthlyFlowProgression(BaseModel):
    """Month-to-date flow progression snapshot."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    year: int = Field(description="Year in UTC")
    month: int = Field(description="Month number (1-12) in UTC")
    total: int = Field(description="Total investigations created in the month-to-date window")
    status_counts: StatusCounts
    by_day: List[MonthlyDayProgression] = Field(
        description="Per-day buckets for the month-to-date window, ordered by date ascending"
    )


class FlowProgressionResponse(BaseModel):
    """Combined flow progression response."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    as_of: datetime = Field(description="UTC timestamp when this snapshot was computed")
    daily: Optional[DailyFlowProgression] = Field(
        default=None,
        description="Daily progression for the requested date, or None if no data exists",
    )
    monthly: Optional[MonthlyFlowProgression] = Field(
        default=None,
        description="Monthly progression for the requested month, or None if no data exists",
    )


