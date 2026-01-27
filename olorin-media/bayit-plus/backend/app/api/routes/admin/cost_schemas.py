"""Request and response schemas for cost dashboard API."""

from datetime import datetime, timedelta
from decimal import Decimal
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field, validator


class CostScope(str, Enum):
    """Cost data scope."""

    SYSTEM_WIDE = "system_wide"
    PER_USER = "per_user"


class CostQueryParams(BaseModel):
    """Common cost query parameters with validation."""

    start_date: datetime = Field(
        default_factory=lambda: datetime.utcnow() - timedelta(days=30),
        description="Start date for cost query",
    )
    end_date: datetime = Field(
        default_factory=datetime.utcnow,
        description="End date for cost query",
        le=datetime.utcnow(),
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

    @validator("end_date")
    def validate_date_range(cls, v, values):
        """Validate date range doesn't exceed 365 days."""
        if "start_date" in values:
            max_range = timedelta(days=365)
            actual_range = v - values["start_date"]
            if actual_range > max_range:
                raise ValueError(
                    f"Date range cannot exceed 365 days. Got {actual_range.days} days"
                )
            if actual_range.total_seconds() < 0:
                raise ValueError("end_date must be after start_date")
        return v

    @validator("start_date")
    def validate_start_date(cls, v):
        """Validate start date is not too old (max 2 years)."""
        cutoff = datetime.utcnow() - timedelta(days=730)
        if v < cutoff:
            raise ValueError(
                f"Cannot access costs older than 2 years. Please contact support."
            )
        return v


class CostOverviewResponse(BaseModel):
    """Current P&L summary."""

    period_start: datetime
    period_end: datetime
    revenue: Decimal
    total_costs: Decimal
    profit_loss: Decimal
    profit_margin: float
    cost_per_minute: Decimal
    last_updated: datetime


class TimelineDataPoint(BaseModel):
    """Single data point in timeline."""

    date: datetime
    revenue: Decimal
    total_cost: Decimal
    profit_loss: Decimal
    ai_cost: Decimal
    infrastructure_cost: Decimal


class CostBreakdownResponse(BaseModel):
    """Cost breakdown by category."""

    ai_costs: dict
    infrastructure_costs: dict
    thirdparty_costs: dict
    total_permanent: Decimal
    total_transient: Decimal
    total_platform: Decimal


class BalanceSheetItem(BaseModel):
    """P&L statement line item."""

    label: str
    amount: Decimal
    category: str  # revenue, ai_costs, infrastructure, third_party, total


class FinancialStatementResponse(BaseModel):
    """Complete P&L statement."""

    period: str  # monthly, yearly, ytd
    items: List[BalanceSheetItem]
    net_profit_loss: Decimal
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
    total_platform_cost: Decimal
    spenders: List[TopSpenderResponse]


class CostComparisonResponse(BaseModel):
    """Permanent vs transient cost comparison."""

    permanent_costs: Decimal
    transient_costs: Decimal
    total_costs: Decimal
    permanent_percentage: float
    transient_percentage: float
