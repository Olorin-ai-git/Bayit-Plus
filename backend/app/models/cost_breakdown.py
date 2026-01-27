"""
Cost Breakdown Models for Admin Cost Dashboard

MongoDB documents for tracking platform costs across AI services,
infrastructure, and third-party providers.
"""

from datetime import datetime
from decimal import Decimal
from typing import Optional

from beanie import Document
from bson.decimal128 import Decimal128
from pydantic import BaseModel, Field, field_validator


# ============ EMBEDDED DOCUMENTS ============


class AICostBreakdown(BaseModel):
    """AI service costs breakdown."""

    stt_cost: Decimal = Field(default=Decimal("0"), description="Speech-to-Text costs")
    tts_cost: Decimal = Field(default=Decimal("0"), description="Text-to-Speech costs")
    translation_cost: Decimal = Field(
        default=Decimal("0"), description="Translation service costs"
    )
    llm_cost: Decimal = Field(default=Decimal("0"), description="LLM token costs")
    search_cost: Decimal = Field(
        default=Decimal("0"), description="Search/embedding costs"
    )
    total: Decimal = Field(default=Decimal("0"), description="Total AI costs")

    @field_validator("*", mode="before")
    @classmethod
    def convert_decimal128(cls, v):
        """Convert MongoDB Decimal128 to Python Decimal."""
        if isinstance(v, Decimal128):
            return Decimal(str(v.to_decimal()))
        return v


class InfrastructureCostBreakdown(BaseModel):
    """Infrastructure service costs breakdown."""

    gcp_cost: Decimal = Field(
        default=Decimal("0"), description="Google Cloud Platform costs"
    )
    mongodb_cost: Decimal = Field(
        default=Decimal("0"), description="MongoDB Atlas costs"
    )
    firebase_cost: Decimal = Field(
        default=Decimal("0"), description="Firebase services costs"
    )
    sentry_cost: Decimal = Field(
        default=Decimal("0"), description="Sentry error tracking costs"
    )
    cdn_cost: Decimal = Field(
        default=Decimal("0"), description="CDN and load balancer costs"
    )
    total: Decimal = Field(
        default=Decimal("0"), description="Total infrastructure costs"
    )

    @field_validator("*", mode="before")
    @classmethod
    def convert_decimal128(cls, v):
        """Convert MongoDB Decimal128 to Python Decimal."""
        if isinstance(v, Decimal128):
            return Decimal(str(v.to_decimal()))
        return v


class ThirdPartyCostBreakdown(BaseModel):
    """Third-party API costs breakdown."""

    stripe_fees: Decimal = Field(
        default=Decimal("0"), description="Stripe payment processing fees"
    )
    elevenlabs_cost: Decimal = Field(
        default=Decimal("0"), description="ElevenLabs overage costs"
    )
    tmdb_cost: Decimal = Field(
        default=Decimal("0"), description="TMDB API costs"
    )
    twilio_cost: Decimal = Field(
        default=Decimal("0"), description="Twilio SMS/communications costs"
    )
    sendgrid_cost: Decimal = Field(
        default=Decimal("0"), description="SendGrid email costs"
    )
    other_api_cost: Decimal = Field(
        default=Decimal("0"), description="Other API costs"
    )
    total: Decimal = Field(default=Decimal("0"), description="Total third-party costs")

    @field_validator("*", mode="before")
    @classmethod
    def convert_decimal128(cls, v):
        """Convert MongoDB Decimal128 to Python Decimal."""
        if isinstance(v, Decimal128):
            return Decimal(str(v.to_decimal()))
        return v


class CostTotals(BaseModel):
    """Aggregated cost totals."""

    permanent_cost: Decimal = Field(
        default=Decimal("0"), description="Fixed infrastructure costs"
    )
    transient_cost: Decimal = Field(
        default=Decimal("0"), description="Variable AI and API costs"
    )
    platform_cost: Decimal = Field(
        default=Decimal("0"), description="Total platform costs"
    )

    @field_validator("*", mode="before")
    @classmethod
    def convert_decimal128(cls, v):
        """Convert MongoDB Decimal128 to Python Decimal."""
        if isinstance(v, Decimal128):
            return Decimal(str(v.to_decimal()))
        return v


class RevenueBreakdown(BaseModel):
    """Revenue breakdown."""

    subscription_revenue: Decimal = Field(
        default=Decimal("0"), description="Subscription revenue"
    )
    onetime_revenue: Decimal = Field(
        default=Decimal("0"), description="One-time purchase revenue"
    )
    refunds: Decimal = Field(
        default=Decimal("0"), description="Refunded amounts (negative revenue)"
    )
    net_revenue: Decimal = Field(
        default=Decimal("0"), description="Net revenue after refunds"
    )

    @field_validator("*", mode="before")
    @classmethod
    def convert_decimal128(cls, v):
        """Convert MongoDB Decimal128 to Python Decimal."""
        if isinstance(v, Decimal128):
            return Decimal(str(v.to_decimal()))
        return v


class CostMetrics(BaseModel):
    """Computed cost metrics."""

    profit_loss: Decimal = Field(
        default=Decimal("0"),
        description="Net revenue minus total costs (positive = profit)",
    )
    profit_margin: Decimal = Field(
        default=Decimal("0"),
        description="Profit margin percentage",
    )
    cost_per_minute: Decimal = Field(
        default=Decimal("0"),
        description="Average platform cost per minute of usage",
    )

    @field_validator("*", mode="before")
    @classmethod
    def convert_decimal128(cls, v):
        """Convert MongoDB Decimal128 to Python Decimal."""
        if isinstance(v, Decimal128):
            return Decimal(str(v.to_decimal()))
        return v


# ============ SYSTEM-WIDE COST BREAKDOWN DOCUMENT ============


class CostBreakdown(Document):
    """
    System-wide aggregated cost data for a specific time period.

    Updated hourly by background aggregation job.
    Tracks all platform costs across AI services, infrastructure, and third-party.
    """

    # ===== TEMPORAL IDENTIFIERS =====
    period_type: str = Field(
        ...,
        pattern="^(hourly|daily|monthly)$",
        description="Time period granularity",
    )
    period_start: datetime = Field(..., description="Start of period (UTC)")
    period_end: datetime = Field(..., description="End of period (UTC)")

    # Precomputed temporal fields for efficient filtering
    year: int = Field(..., ge=2020, le=2100, description="Year for period")
    month: int = Field(default=0, ge=0, le=12, description="Month (1-12, 0 if N/A)")
    day_of_month: Optional[int] = Field(
        default=None, ge=1, le=31, description="Day of month for daily/hourly"
    )
    hour_of_day: Optional[int] = Field(
        default=None, ge=0, le=23, description="Hour of day for hourly only"
    )
    iso_week: Optional[int] = Field(
        default=None, ge=1, le=53, description="ISO week number"
    )
    fiscal_quarter: int = Field(default=1, ge=1, le=4, description="Fiscal quarter")

    # ===== COST BREAKDOWN =====
    ai_costs: AICostBreakdown = Field(default_factory=AICostBreakdown)
    infrastructure_costs: InfrastructureCostBreakdown = Field(
        default_factory=InfrastructureCostBreakdown
    )
    thirdparty_costs: ThirdPartyCostBreakdown = Field(
        default_factory=ThirdPartyCostBreakdown
    )

    # ===== COMPUTED TOTALS =====
    totals: CostTotals = Field(default_factory=CostTotals)

    # ===== REVENUE =====
    revenue: RevenueBreakdown = Field(default_factory=RevenueBreakdown)

    # ===== COMPUTED METRICS =====
    metrics: CostMetrics = Field(default_factory=CostMetrics)

    # ===== METADATA =====
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    aggregation_source: str = Field(
        default="scheduled_job",
        description="Source of aggregation: scheduled_job, backfill, manual",
    )
    is_finalized: bool = Field(
        default=False,
        description="True when period is complete and verified",
    )
    checksum: Optional[str] = Field(
        default=None,
        description="SHA256 checksum for data integrity verification",
    )
    source_record_count: int = Field(
        default=0,
        description="Number of source records aggregated for audit trail",
    )

    class Settings:
        name = "cost_breakdowns"
        indexes = [
            # Primary query indexes
            [("period_type", 1), ("period_start", -1)],  # Dashboard overview
            [("period_type", 1), ("year", 1), ("month", 1), ("period_start", -1)],  # Timeline
            [("is_finalized", 1), ("period_type", 1), ("period_start", -1)],  # Finalized only
            [
                ("period_type", 1),
                ("year", 1),
                ("fiscal_quarter", 1),
            ],  # Fiscal reporting
            # Unique constraint - no duplicate periods
            [("period_type", 1), ("period_start", 1)],
        ]

    def compute_checksum(self) -> str:
        """Compute SHA256 checksum for integrity verification."""
        import hashlib
        import json

        data = {
            "period_type": self.period_type,
            "period_start": self.period_start.isoformat(),
            "period_end": self.period_end.isoformat(),
            "ai_total": str(self.ai_costs.total),
            "infra_total": str(self.infrastructure_costs.total),
            "revenue_net": str(self.revenue.net_revenue),
        }
        return hashlib.sha256(json.dumps(data, sort_keys=True).encode()).hexdigest()[:16]


# ============ PER-USER COST BREAKDOWN DOCUMENT ============


class UserCostBreakdown(Document):
    """
    Per-user cost tracking for individual users.

    Updated hourly by background aggregation job.
    Tracks usage-based costs attributed to each user.
    """

    # ===== USER & TIME PERIOD =====
    user_id: str = Field(..., description="Reference to User document")
    period_type: str = Field(
        ...,
        pattern="^(hourly|daily|monthly)$",
        description="Time period granularity",
    )
    period_start: datetime = Field(..., description="Start of period (UTC)")
    period_end: datetime = Field(..., description="End of period (UTC)")

    # Precomputed temporal fields
    year: int = Field(..., ge=2020, le=2100)
    month: int = Field(default=0, ge=0, le=12)
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)
    hour_of_day: Optional[int] = Field(default=None, ge=0, le=23)
    iso_week: Optional[int] = Field(default=None, ge=1, le=53)
    fiscal_quarter: int = Field(default=1, ge=1, le=4)

    # ===== USAGE METRICS =====
    subtitle_minutes: float = Field(default=0.0, ge=0, description="Subtitle minutes")
    dubbing_minutes: float = Field(default=0.0, ge=0, description="Dubbing minutes")
    search_queries: int = Field(default=0, ge=0, description="Search queries count")
    llm_requests: int = Field(default=0, ge=0, description="LLM requests count")
    total_usage_minutes: float = Field(
        default=0.0, ge=0, description="Total content usage minutes"
    )

    # ===== COST BREAKDOWN =====
    ai_costs: AICostBreakdown = Field(default_factory=AICostBreakdown)

    # ===== SUBSCRIPTION =====
    subscription_tier: Optional[str] = Field(
        default=None, description="User subscription tier"
    )
    subscription_cost: Decimal = Field(
        default=Decimal("0"), description="Cost of user subscription"
    )

    # ===== TOTALS =====
    total_cost: Decimal = Field(
        default=Decimal("0"), description="Total cost for user this period"
    )
    estimated_quota_value: Decimal = Field(
        default=Decimal("0"),
        description="Estimated remaining quota/subscription value",
    )

    # ===== METADATA =====
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_active: bool = Field(default=True, description="User had activity this period")
    is_finalized: bool = Field(default=False)

    class Settings:
        name = "user_cost_breakdowns"
        indexes = [
            # Per-user timeline (most common query)
            [("user_id", 1), ("period_type", 1), ("period_start", -1)],
            # Top spenders query
            [("period_type", 1), ("period_start", 1), ("total_cost", -1)],
            # Subscription tier analysis
            [("subscription_tier", 1), ("period_type", 1), ("period_start", -1)],
            # Active users (non-zero cost)
            [("period_type", 1), ("period_start", 1)],
            # Unique constraint
            [("user_id", 1), ("period_type", 1), ("period_start", 1)],
        ]

    @field_validator("subscription_cost", "total_cost", "estimated_quota_value", mode="before")
    @classmethod
    def convert_decimal128(cls, v):
        """Convert MongoDB Decimal128 to Python Decimal."""
        if isinstance(v, Decimal128):
            return Decimal(str(v.to_decimal()))
        return v
