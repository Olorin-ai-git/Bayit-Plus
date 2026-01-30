"""Cost Admin Dashboard API endpoints."""

from decimal import Decimal
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query, Request
from app.core.rate_limiter import limiter
from app.core.logging_config import get_logger
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.models.user import User
from app.services.beta.cost_estimator import cost_estimator

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


@router.get("/beta/overview")
@limiter.limit("60/hour")
async def get_beta_cost_overview(
    request: Request,
    current_user: User = Depends(require_cost_read_permission),
) -> dict:
    """
    Get Beta 500 program cost overview and metrics.

    Shows:
    - Total Beta credits distributed
    - Total credits consumed
    - Real USD costs incurred
    - Cost by feature (dubbing, translation, podcasts)
    - Top consuming features
    """
    try:
        # Calculate total credits distributed
        all_credits = await BetaCredit.find_all().to_list()
        total_distributed = sum(c.current_balance + c.lifetime_usage for c in all_credits)
        total_consumed = sum(c.lifetime_usage for c in all_credits)
        total_remaining = sum(c.current_balance for c in all_credits)

        # Calculate real USD costs (100 credits = $1)
        total_usd_consumed = total_consumed / 100.0

        # Get transaction breakdown by feature
        last_30_days = datetime.utcnow() - timedelta(days=30)
        recent_transactions = await BetaCreditTransaction.find(
            BetaCreditTransaction.created_at >= last_30_days
        ).to_list()

        # Aggregate by feature
        feature_costs = {}
        for tx in recent_transactions:
            if tx.transaction_type == "deduction" and tx.metadata:
                feature = tx.metadata.get("feature", "unknown")
                if feature not in feature_costs:
                    feature_costs[feature] = 0
                feature_costs[feature] += abs(tx.amount)

        # Sort by highest cost
        top_features = sorted(
            feature_costs.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]

        return {
            "total_credits_distributed": total_distributed,
            "total_credits_consumed": total_consumed,
            "total_credits_remaining": total_remaining,
            "total_usd_consumed": round(total_usd_consumed, 2),
            "utilization_rate": round((total_consumed / total_distributed * 100) if total_distributed > 0 else 0, 2),
            "last_30_days": {
                "credits_consumed": sum(feature_costs.values()),
                "usd_consumed": round(sum(feature_costs.values()) / 100.0, 2),
                "top_features": [
                    {"feature": feature, "credits": credits, "usd": round(credits / 100.0, 2)}
                    for feature, credits in top_features
                ],
            },
            "cost_rates": {
                "live_dubbing_per_minute": "~25 credits ($0.25)",
                "live_translation_per_minute": "~2 credits ($0.02)",
                "podcast_per_minute": "~30 credits ($0.30)",
            },
        }

    except Exception as e:
        logger.error(f"Error fetching Beta cost overview: {e}")
        return {
            "error": "Failed to fetch Beta cost overview",
            "total_credits_distributed": 0,
            "total_credits_consumed": 0,
            "total_usd_consumed": 0.0,
        }


@router.get("/beta/estimates")
@limiter.limit("60/hour")
async def get_beta_cost_estimates(
    request: Request,
    current_user: User = Depends(require_cost_read_permission),
) -> dict:
    """
    Get Beta cost estimation examples for different operations.

    Helps admins understand real costs of Beta features.
    """
    return {
        "provider_rates": {
            "google_stt_per_minute": "$0.006",
            "whisper_per_minute": "$0.006",
            "elevenlabs_stt_per_minute": "$0.01",
            "elevenlabs_tts_per_char": "$0.0003",
            "claude_translation_per_1m_tokens": "$15.00",
            "google_translate_per_1m_chars": "$20.00",
        },
        "examples": {
            "1_min_live_dubbing": cost_estimator.estimate_live_dubbing_cost(1.0).__dict__,
            "30_min_podcast": cost_estimator.estimate_podcast_translation_cost(30.0).__dict__,
            "1_hour_podcast": cost_estimator.estimate_podcast_translation_cost(60.0).__dict__,
            "2_hour_stream_dubbing": cost_estimator.estimate_live_dubbing_cost(120.0).__dict__,
            "1_hour_translation_subtitles": cost_estimator.estimate_live_translation_cost(60.0).__dict__,
        },
        "warnings": {
            "1_hour_podcast": "~1,800 credits ($18) - can consume significant user balance",
            "2_hour_stream": "~3,000 credits ($30) - may exhaust user credits in one session",
            "long_content_warning": "Users with 5,000 credit allocation can only process ~2-3 hours of content",
        },
    }


@router.get("/beta/users/top-consumers")
@limiter.limit("10/hour")
async def get_beta_top_consumers(
    request: Request,
    period_days: int = Query(30, ge=1, le=365),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(require_top_spenders_permission),
) -> dict:
    """
    Get top Beta credit consumers (privacy-protected).

    Returns anonymized data about highest consuming users.
    """
    try:
        # Get all beta credits sorted by lifetime usage
        all_credits = await BetaCredit.find_all().sort("-lifetime_usage").limit(limit).to_list()

        top_consumers = []
        for idx, credit in enumerate(all_credits, 1):
            # Hash user ID for privacy
            hashed_id = hash_user_id(credit.user_id)

            top_consumers.append({
                "rank": idx,
                "user_id_hash": hashed_id,
                "total_credits_consumed": credit.lifetime_usage,
                "total_usd_consumed": round(credit.lifetime_usage / 100.0, 2),
                "current_balance": credit.current_balance,
                "utilization_rate": round(
                    (credit.lifetime_usage / (credit.lifetime_usage + credit.current_balance) * 100)
                    if (credit.lifetime_usage + credit.current_balance) > 0 else 0,
                    2
                ),
            })

        return {
            "period_days": period_days,
            "total_consumers": len(top_consumers),
            "top_consumers": top_consumers,
        }

    except Exception as e:
        logger.error(f"Error fetching Beta top consumers: {e}")
        return {
            "error": "Failed to fetch Beta top consumers",
            "top_consumers": [],
        }
