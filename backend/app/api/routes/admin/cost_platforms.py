"""Cost platforms endpoint for iOS dashboard."""

from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Request

from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.models.cost_breakdown import CostBreakdown
from app.models.user import User

from .cost_admin_lock import require_costs_admin_uid
from .cost_service_schemas import (
    PlatformCostResponse,
    PlatformEnum,
    PlatformTopService,
    PlatformsCostListResponse,
)

router = APIRouter(prefix="/costs", tags=["admin-costs-ios"])
logger = get_logger(__name__)


@router.get("/platforms")
@limiter.limit("60/hour")
async def get_cost_platforms(
    request: Request,
    current_user: User = Depends(require_costs_admin_uid),
) -> PlatformsCostListResponse:
    """Costs grouped by platform with totals and top services."""
    now = datetime.utcnow()
    month_start = now.replace(day=1, hour=0, minute=0, second=0)
    prev_start = (month_start - timedelta(days=1)).replace(day=1)

    current_docs = await CostBreakdown.find(
        CostBreakdown.period_type == "hourly",
        CostBreakdown.period_start >= month_start,
    ).to_list()

    prev_docs = await CostBreakdown.find(
        CostBreakdown.period_type == "hourly",
        CostBreakdown.period_start >= prev_start,
        CostBreakdown.period_start < month_start,
    ).to_list()

    current_by_plat = _group_by_platform(current_docs)
    prev_by_plat = _group_by_platform(prev_docs)

    grand_total = Decimal("0")
    platforms = []

    for plat in PlatformEnum:
        curr_services = current_by_plat.get(plat, {})
        prev_total = sum(
            prev_by_plat.get(plat, {}).values(), Decimal("0")
        )
        curr_total = sum(curr_services.values(), Decimal("0"))
        grand_total += curr_total

        top = sorted(
            curr_services.items(), key=lambda x: x[1], reverse=True
        )[:3]
        top_services = [
            PlatformTopService(service_name=n, cost=c)
            for n, c in top
        ]

        trend = _calc_trend(curr_total, prev_total)

        platforms.append(
            PlatformCostResponse(
                platform=plat,
                total_cost=curr_total,
                service_count=len(curr_services),
                top_services=top_services,
                trend_pct=trend,
            )
        )

    platforms.sort(key=lambda p: p.total_cost, reverse=True)

    return PlatformsCostListResponse(
        platforms=platforms,
        total_cost=grand_total,
    )


def _group_by_platform(
    docs: list[CostBreakdown],
) -> dict[PlatformEnum, dict[str, Decimal]]:
    """Group costs by platform."""
    result: dict[PlatformEnum, dict[str, Decimal]] = {}

    for doc in docs:
        plat = PlatformEnum.SHARED
        services = result.setdefault(plat, {})

        infra = doc.infrastructure_costs
        if infra:
            services["GCP"] = services.get(
                "GCP", Decimal("0")
            ) + infra.gcp_cost
            services["MongoDB Atlas"] = services.get(
                "MongoDB Atlas", Decimal("0")
            ) + infra.mongodb_cost

        ai = doc.ai_costs
        if ai:
            bp = result.setdefault(PlatformEnum.BAYIT_PLUS, {})
            bp["ElevenLabs"] = bp.get(
                "ElevenLabs", Decimal("0")
            ) + ai.tts_cost
            services["OpenAI"] = services.get(
                "OpenAI", Decimal("0")
            ) + ai.llm_cost

    return result


def _calc_trend(current: Decimal, previous: Decimal) -> float:
    """Calculate percentage change."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(float((current - previous) / previous * 100), 1)
