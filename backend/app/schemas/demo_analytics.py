"""Pydantic schemas for playground analytics endpoints."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.playground_event import ALLOWED_EVENT_NAMES

_UUID_PATTERN = (
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
)


class EventIngestRequest(BaseModel):
    """Body for POST /api/v1/demo/events."""

    event_name: str
    session_id: str = Field(pattern=_UUID_PATTERN)
    track: str = Field(pattern=r"^(training|entertainment)$")
    properties: dict = {}
    timestamp: datetime

    @field_validator("event_name")
    @classmethod
    def validate_event_name(cls, v: str) -> str:
        if v not in ALLOWED_EVENT_NAMES:
            raise ValueError(f"Unknown event: {v}")
        return v


class BeaconIngestRequest(BaseModel):
    """Body for POST /api/v1/demo/events/beacon (sendBeacon fallback)."""

    event_name: str
    session_id: str = Field(pattern=_UUID_PATTERN)
    track: str = Field(pattern=r"^(training|entertainment)$")
    properties: dict = {}
    timestamp: datetime

    @field_validator("event_name")
    @classmethod
    def validate_event_name(cls, v: str) -> str:
        if v not in ALLOWED_EVENT_NAMES:
            raise ValueError(f"Unknown event: {v}")
        return v


class DailyTrendPoint(BaseModel):
    date: str
    sessions: int
    completions: int


class TopCta(BaseModel):
    type: str
    location: str
    count: int


class SummaryResponse(BaseModel):
    """Response for GET /api/v1/demo/events/summary."""

    period: str
    total_sessions: int
    unique_sessions_by_track: dict[str, int]
    events_by_type: dict[str, int]
    stops_completion_rate: dict[str, float]
    daily_trend: list[DailyTrendPoint]
    top_ctas: list[TopCta]


class FunnelStage(BaseModel):
    stage: str
    count: int
    percentage: float


class FunnelResponse(BaseModel):
    """Response for GET /api/v1/demo/events/funnel."""

    period: str
    stages: list[FunnelStage]
