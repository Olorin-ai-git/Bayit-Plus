"""AI Usage Analytics admin endpoints."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query, Request

from app.api.dependencies.ai_access import get_credit_service
from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.models.user import User
from app.services.admin import ai_usage_service as service
from app.services.beta.credit_service import BetaCreditService

from .ai_usage_schemas import (
    AIFeatureRatesResponse,
    AIUsageByFeatureTimelineResponse,
    AIUsageOverviewResponse,
    AIUsageTopUsersResponse,
)
from .cost_auth import require_cost_read_permission, require_top_spenders_permission

router = APIRouter(prefix="/ai-usage", tags=["admin-ai-usage"])
logger = get_logger(__name__)


@router.get("/overview")
@limiter.limit("60/hour")
async def get_usage_overview(
    request: Request,
    start_date: datetime = Query(
        default_factory=lambda: datetime.utcnow() - timedelta(days=30),
    ),
    end_date: datetime = Query(
        default_factory=datetime.utcnow,
    ),
    current_user: User = Depends(require_cost_read_permission),
    credit_service: BetaCreditService = Depends(get_credit_service),
) -> AIUsageOverviewResponse:
    """Aggregated AI feature usage per feature for a date range."""
    return await service.get_usage_overview(
        start_date, end_date, credit_service,
    )


@router.get("/feature/{feature}/timeline")
@limiter.limit("60/hour")
async def get_feature_timeline(
    feature: str,
    request: Request,
    start_date: datetime = Query(
        default_factory=lambda: datetime.utcnow() - timedelta(days=30),
    ),
    end_date: datetime = Query(
        default_factory=datetime.utcnow,
    ),
    current_user: User = Depends(require_cost_read_permission),
) -> AIUsageByFeatureTimelineResponse:
    """Daily credit consumption timeline for a single feature."""
    return await service.get_feature_timeline(feature, start_date, end_date)


@router.get("/top-users")
@limiter.limit("30/hour")
async def get_top_users(
    request: Request,
    start_date: datetime = Query(
        default_factory=lambda: datetime.utcnow() - timedelta(days=30),
    ),
    end_date: datetime = Query(
        default_factory=datetime.utcnow,
    ),
    limit: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_top_spenders_permission),
) -> AIUsageTopUsersResponse:
    """Top Beta-500 users by credit consumption (hashed IDs)."""
    return await service.get_top_users(start_date, end_date, limit)


@router.get("/rates")
@limiter.limit("60/hour")
async def get_feature_rates(
    request: Request,
    current_user: User = Depends(require_cost_read_permission),
    credit_service: BetaCreditService = Depends(get_credit_service),
) -> AIFeatureRatesResponse:
    """Current configured credit rates for all AI features."""
    return await service.get_feature_rates(credit_service)
