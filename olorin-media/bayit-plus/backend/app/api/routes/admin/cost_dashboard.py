"""Cost Admin Dashboard API endpoints."""

from decimal import Decimal

from fastapi import APIRouter, Depends, Query, Request
from app.core.rate_limiter import limiter
from app.core.logging_config import get_logger
from app.models.user import User

from .cost_auth import (
    aggregate_cost_range,
    hash_user_id,
    require_cost_read_permission,
    require_per_user_cost_access,
    require_top_spenders_permission,
)
from .cost_schemas import (
    CostBreakdownResponse,
    CostComparisonResponse,
    CostOverviewResponse,
    CostQueryParams,
    FinancialStatementResponse,
    TimelineDataPoint,
    TopSpendersResponse,
    TopSpenderResponse,
)

router = APIRouter(prefix="/admin/costs", tags=["admin-costs"])
logger = get_logger(__name__)


@router.get("/overview")
@limiter.limit("60/hour")
async def get_cost_overview(
    request: Request,
    current_user: User = Depends(require_cost_read_permission),
) -> CostOverviewResponse:
    """Get current P&L summary and key metrics."""
    # TODO: Query latest CostBreakdown from database
    # TODO: Format response with current period data
    return CostOverviewResponse(
        period_start=None,
        period_end=None,
        revenue=Decimal("0"),
        total_costs=Decimal("0"),
        profit_loss=Decimal("0"),
        profit_margin=0.0,
        cost_per_minute=Decimal("0"),
        last_updated=None,
    )


@router.get("/timeline")
@limiter.limit("30/hour")
async def get_cost_timeline(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> list[TimelineDataPoint]:
    """Get cost trends over time period."""
    # TODO: Query CostBreakdown collection for date range
    # TODO: Aggregate to daily/monthly based on range
    # TODO: Return time-series data for charts
    return []


@router.get("/breakdown")
@limiter.limit("30/hour")
async def get_cost_breakdown(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> CostBreakdownResponse:
    """Get detailed cost breakdown by category."""
    # TODO: Query aggregated costs by category
    # TODO: Return permanent vs transient breakdown
    return CostBreakdownResponse(
        ai_costs={},
        infrastructure_costs={},
        thirdparty_costs={},
        total_permanent=Decimal("0"),
        total_transient=Decimal("0"),
        total_platform=Decimal("0"),
    )


@router.get("/balance-sheet")
@limiter.limit("20/hour")
async def get_balance_sheet(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> FinancialStatementResponse:
    """Get P&L statement (balance sheet)."""
    # TODO: Query revenue and costs for period
    # TODO: Format as financial statement with line items
    return FinancialStatementResponse(
        period="monthly",
        items=[],
        net_profit_loss=Decimal("0"),
        profit_margin=0.0,
    )


@router.get("/per-minute")
@limiter.limit("20/hour")
async def get_cost_per_minute(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> dict:
    """Get cost per minute metrics."""
    # TODO: Calculate total cost / total usage minutes
    # TODO: Return metrics for different time periods
    return {
        "period": "monthly",
        "cost_per_minute": Decimal("0"),
        "total_cost": Decimal("0"),
        "total_minutes": 0.0,
    }


@router.get("/users/top-spenders")
@limiter.limit("3/hour")
async def get_top_spenders(
    request: Request,
    period: str = Query("monthly", pattern="^(weekly|monthly|quarterly|yearly)$"),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_top_spenders_permission),
) -> TopSpendersResponse:
    """
    Get top spenders ranking (PII redacted).

    Only accessible to SUPER_ADMIN.
    User IDs are hashed, amounts are rounded to ranges.
    """
    # TODO: Query top N users by total_cost from UserCostBreakdown
    # TODO: Redact PII (hash IDs, aggregate costs to ranges)
    # TODO: Calculate % of total platform spend
    return TopSpendersResponse(
        period=period,
        total_platform_cost=Decimal("0"),
        spenders=[],
    )


@router.get("/comparison")
@limiter.limit("15/hour")
async def get_cost_comparison(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> CostComparisonResponse:
    """Compare permanent vs transient costs."""
    # TODO: Query aggregated permanent and transient costs
    # TODO: Calculate percentages and breakdown
    return CostComparisonResponse(
        permanent_costs=Decimal("0"),
        transient_costs=Decimal("0"),
        total_costs=Decimal("0"),
        permanent_percentage=0.0,
        transient_percentage=0.0,
    )


@router.get("/users/{user_id}/breakdown")
@limiter.limit("10/hour")
async def get_user_cost_breakdown(
    user_id: str,
    request: Request,
    params: CostQueryParams = Depends(),
    auth: tuple = Depends(require_per_user_cost_access),
) -> dict:
    """Get per-user cost breakdown."""
    current_user, _ = auth

    # TODO: Query UserCostBreakdown for specific user and period
    # TODO: Return user-specific cost metrics and usage
    return {
        "user_id": user_id,
        "period": "monthly",
        "ai_costs": {},
        "total_cost": Decimal("0"),
        "subscription_tier": None,
    }
