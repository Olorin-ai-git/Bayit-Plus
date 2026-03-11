"""Request and response schemas for AI usage analytics API."""

from datetime import datetime
from typing import List

from pydantic import BaseModel, Field


class AIFeatureUsageSummary(BaseModel):
    """Per-feature aggregated usage statistics."""

    feature: str
    total_credits: int
    transaction_count: int
    unique_users: int
    avg_credits_per_use: float
    credit_rate: float


class AIUsageOverviewResponse(BaseModel):
    """Aggregated AI usage overview for a date range."""

    period_start: datetime
    period_end: datetime
    total_credits_consumed: int
    total_transactions: int
    active_credit_users: int
    features: List[AIFeatureUsageSummary]


class AIUsageTimelinePoint(BaseModel):
    """Single data point in a feature usage timeline."""

    date: str
    credits_consumed: int
    transaction_count: int


class AIUsageByFeatureTimelineResponse(BaseModel):
    """Daily credit consumption timeline for a single feature."""

    feature: str
    timeline: List[AIUsageTimelinePoint]


class AIUsageTopUserEntry(BaseModel):
    """Top user entry with hashed ID for privacy."""

    user_id_hash: str
    total_credits: int
    transaction_count: int
    top_features: List[str]


class AIUsageTopUsersResponse(BaseModel):
    """Top users by credit consumption."""

    period_start: datetime
    period_end: datetime
    users: List[AIUsageTopUserEntry]


class AIFeatureRateEntry(BaseModel):
    """Credit rate configuration for a single feature."""

    feature: str
    credit_rate: float


class AIFeatureRatesResponse(BaseModel):
    """Current configured credit rates for all AI features."""

    rates: List[AIFeatureRateEntry]
