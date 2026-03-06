"""Request and response schemas for cost dashboard API."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import Annotated, List, Optional

from pydantic import BaseModel, Field, PlainSerializer, field_validator

# Serialize Decimal as float in JSON responses (iOS expects numbers, not strings)
JsonDecimal = Annotated[Decimal, PlainSerializer(lambda v: float(v), return_type=float)]


class CostScope(str, Enum):
    """Cost data scope."""

    SYSTEM_WIDE = "system_wide"
    PER_USER = "per_user"


class CostQueryParams(BaseModel):
    """Common cost query parameters with validation."""

    start_date: datetime = Field(
        default_factory=lambda: datetime.now(UTC) - timedelta(days=30),
        description="Start date for cost query",
    )
    end_date: datetime = Field(
        default_factory=lambda: datetime.now(UTC),
        description="End date for cost query",
    )
    user_id: Optional[str] = Field(
        None,
        min_length=1,
        max_length=255,
        pattern=r"^[a-zA-Z0-9_\-]+$",
        description="User ID (alphanumeric/dash/underscore only)",
    )
    scope: CostScope = Field(
        default=CostScope.SYSTEM_WIDE,
        description="Cost data scope",
    )
    page: int = Field(default=1, ge=1, description="Page number for pagination")
    page_size: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Items per page (max 100 to prevent exfiltration)",
    )

    @field_validator("end_date")
    @classmethod
    def validate_date_range(cls, v, info):
        """Validate date range doesn't exceed 365 days."""
        start = info.data.get("start_date")
        if start is not None:
            max_range = timedelta(days=365)
            actual_range = v - start
            if actual_range > max_range:
                raise ValueError(
                    f"Date range cannot exceed 365 days. Got {actual_range.days} days"
                )
            if actual_range.total_seconds() < 0:
                raise ValueError("end_date must be after start_date")
        return v

    @field_validator("start_date")
    @classmethod
    def validate_start_date(cls, v):
        """Validate start date is not too old (max 2 years)."""
        cutoff = datetime.now(UTC) - timedelta(days=730)
        if v.replace(tzinfo=None) < cutoff.replace(tzinfo=None):
            raise ValueError(
                "Cannot access costs older than 2 years. Please contact support."
            )
        return v


class CostOverviewResponse(BaseModel):
    """Current P&L summary."""

    period_start: datetime
    period_end: datetime
    revenue: JsonDecimal
    total_costs: JsonDecimal
    profit_loss: JsonDecimal
    profit_margin: float
    cost_per_minute: JsonDecimal
    last_updated: datetime


class TimelineDataPoint(BaseModel):
    """Single data point in timeline."""

    date: datetime
    revenue: JsonDecimal
    total_cost: JsonDecimal
    profit_loss: JsonDecimal
    ai_cost: JsonDecimal
    infrastructure_cost: JsonDecimal


class CostBreakdownResponse(BaseModel):
    """Cost breakdown by category."""

    ai_costs: dict
    infrastructure_costs: dict
    thirdparty_costs: dict
    total_permanent: JsonDecimal
    total_transient: JsonDecimal
    total_platform: JsonDecimal


class BalanceSheetItem(BaseModel):
    """P&L statement line item."""

    label: str
    amount: JsonDecimal
    category: str  # revenue, ai_costs, infrastructure, third_party, total


class FinancialStatementResponse(BaseModel):
    """Complete P&L statement."""

    period: str  # monthly, yearly, ytd
    items: List[BalanceSheetItem]
    net_profit_loss: JsonDecimal
    profit_margin: float


class TopSpenderResponse(BaseModel):
    """Top spender entry (PII redacted)."""

    rank: int
    user_id_hash: str  # Hashed ID, not actual
    total_cost_range: str  # "20-50 USD" not exact
    spend_percentage: float  # % of platform spend
    subscription_tier: Optional[str]


class TopSpendersResponse(BaseModel):
    """Top spenders ranking."""

    period: str
    total_platform_cost: JsonDecimal
    spenders: List[TopSpenderResponse]


class CostComparisonResponse(BaseModel):
    """Permanent vs transient cost comparison."""

    permanent_costs: JsonDecimal
    transient_costs: JsonDecimal
    total_costs: JsonDecimal
    permanent_percentage: float
    transient_percentage: float
