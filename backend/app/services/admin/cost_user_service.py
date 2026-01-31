"""
Cost Dashboard User Service

Handles user-specific cost queries: top spenders, per-user breakdown.
Split from cost_dashboard_service to maintain <200 line limit.
"""

from decimal import Decimal

from app.core.logging_config import get_logger
from app.models.cost_breakdown import UserCostBreakdown

from app.api.routes.admin.cost_auth import aggregate_cost_range, hash_user_id
from app.api.routes.admin.cost_schemas import (
    CostQueryParams,
    TopSpenderResponse,
    TopSpendersResponse,
)

logger = get_logger(__name__)


async def get_top_spenders(
    period: str, limit: int
) -> TopSpendersResponse:
    """Top N users by total_cost from UserCostBreakdown (PII redacted)."""
    user_docs = await UserCostBreakdown.find(
        UserCostBreakdown.period_type == period,
    ).sort("-total_cost").limit(limit).to_list()

    plat_total = sum((d.total_cost for d in user_docs), Decimal("0"))

    spenders = []
    for rank, doc in enumerate(user_docs, 1):
        pct = (
            float(doc.total_cost / plat_total * 100)
            if plat_total
            else 0.0
        )
        spenders.append(
            TopSpenderResponse(
                rank=rank,
                user_id_hash=hash_user_id(doc.user_id),
                total_cost_range=aggregate_cost_range(float(doc.total_cost)),
                spend_percentage=round(pct, 2),
                subscription_tier=doc.subscription_tier,
            )
        )

    return TopSpendersResponse(
        period=period,
        total_platform_cost=plat_total,
        spenders=spenders,
    )


async def get_user_breakdown(
    user_id: str, params: CostQueryParams
) -> dict:
    """UserCostBreakdown for a specific user."""
    docs = await UserCostBreakdown.find(
        UserCostBreakdown.user_id == user_id,
        UserCostBreakdown.period_type == "daily",
        UserCostBreakdown.period_start >= params.start_date,
        UserCostBreakdown.period_end <= params.end_date,
    ).sort("-period_start").to_list()

    total_cost = sum((d.total_cost for d in docs), Decimal("0"))
    ai_costs = {
        "stt": str(sum((d.ai_costs.stt_cost for d in docs), Decimal("0"))),
        "tts": str(sum((d.ai_costs.tts_cost for d in docs), Decimal("0"))),
        "translation": str(sum((d.ai_costs.translation_cost for d in docs), Decimal("0"))),
        "llm": str(sum((d.ai_costs.llm_cost for d in docs), Decimal("0"))),
        "search": str(sum((d.ai_costs.search_cost for d in docs), Decimal("0"))),
    }

    tier = docs[0].subscription_tier if docs else None

    return {
        "user_id": user_id,
        "period": "custom",
        "ai_costs": ai_costs,
        "total_cost": total_cost,
        "subscription_tier": tier,
    }
