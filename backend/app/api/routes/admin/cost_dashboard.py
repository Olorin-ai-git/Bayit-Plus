"""Cost Admin Dashboard API endpoints."""

from fastapi import APIRouter, Depends, Query, Request
from app.core.rate_limiter import limiter
from app.core.logging_config import get_logger
from app.models.user import User

from .cost_auth import (
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
)

from app.services.admin import cost_dashboard_service as service

router = APIRouter(prefix="/admin/costs", tags=["admin-costs"])
logger = get_logger(__name__)


@router.get("/overview")
@limiter.limit("60/hour")
async def get_cost_overview(
    request: Request,
    current_user: User = Depends(require_cost_read_permission),
) -> CostOverviewResponse:
    """Get current P&L summary and key metrics."""
    return await service.get_overview()


@router.get("/timeline")
@limiter.limit("30/hour")
async def get_cost_timeline(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> list[TimelineDataPoint]:
    """Get cost trends over time period."""
    return await service.get_timeline(params)


@router.get("/breakdown")
@limiter.limit("30/hour")
async def get_cost_breakdown(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> CostBreakdownResponse:
    """Get detailed cost breakdown by category."""
    return await service.get_breakdown(params)


@router.get("/balance-sheet")
@limiter.limit("20/hour")
async def get_balance_sheet(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> FinancialStatementResponse:
    """Get P&L statement (balance sheet)."""
    return await service.get_balance_sheet(params)


@router.get("/per-minute")
@limiter.limit("20/hour")
async def get_cost_per_minute(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> dict:
    """Get cost per minute metrics."""
    return await service.get_cost_per_minute(params)


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
    return await service.get_top_spenders(period, limit)


@router.get("/comparison")
@limiter.limit("15/hour")
async def get_cost_comparison(
    request: Request,
    params: CostQueryParams = Depends(),
    current_user: User = Depends(require_cost_read_permission),
) -> CostComparisonResponse:
    """Compare permanent vs transient costs."""
    return await service.get_comparison(params)


@router.get("/users/{user_id}/breakdown")
@limiter.limit("10/hour")
async def get_user_cost_breakdown(
    user_id: str,
    request: Request,
    params: CostQueryParams = Depends(),
    auth: tuple = Depends(require_per_user_cost_access),
) -> dict:
    """Get per-user cost breakdown."""
    return await service.get_user_breakdown(user_id, params)
