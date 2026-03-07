"""Cost platforms endpoint for iOS dashboard."""

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Request

from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.models.cost_breakdown import CostBreakdown
from app.models.user import User

from .cost_auth import require_cost_read_permission
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
    current_user: User = Depends(require_cost_read_permission),
) -> PlatformsCostListResponse:
    """Costs grouped by platform with totals and top services."""
    now = datetime.now(UTC)
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
        shared = result.setdefault(PlatformEnum.SHARED, {})

        infra = doc.infrastructure_costs
        if infra:
            shared["GCP"] = shared.get(
                "GCP", Decimal("0")
            ) + infra.gcp_cost
            shared["MongoDB Atlas"] = shared.get(
                "MongoDB Atlas", Decimal("0")
            ) + infra.mongodb_cost
            shared["Firebase"] = shared.get(
                "Firebase", Decimal("0")
            ) + infra.firebase_cost

        ai = doc.ai_costs
        if ai:
            bp = result.setdefault(PlatformEnum.BAYIT_PLUS, {})
            bp["ElevenLabs"] = bp.get(
                "ElevenLabs", Decimal("0")
            ) + ai.tts_cost
            shared["OpenAI"] = shared.get(
                "OpenAI", Decimal("0")
            ) + ai.llm_cost

        tp = doc.thirdparty_costs
        if tp:
            bp = result.setdefault(PlatformEnum.BAYIT_PLUS, {})
            bp["Twilio"] = bp.get(
                "Twilio", Decimal("0")
            ) + tp.twilio_cost
            shared["Stripe"] = shared.get(
                "Stripe", Decimal("0")
            ) + tp.stripe_fees

    # Add fixed costs from config, properly assigned per platform
    from app.core.fixed_costs_config import FixedCostsConfig, Platform

    _PLATFORM_MAP = {
        Platform.SHARED: PlatformEnum.SHARED,
        Platform.BAYIT_PLUS: PlatformEnum.BAYIT_PLUS,
        Platform.OLORIN_FRAUD: PlatformEnum.OLORIN_FRAUD,
        Platform.CVPLUS: PlatformEnum.CVPLUS,
        Platform.STATION_AI: PlatformEnum.STATION_AI,
    }

    fixed_cfg = FixedCostsConfig()
    for entry in fixed_cfg.entries:
        plat_enum = _PLATFORM_MAP.get(entry.platform, PlatformEnum.SHARED)
        plat_services = result.setdefault(plat_enum, {})
        plat_services[entry.service_name] = plat_services.get(
            entry.service_name, Decimal("0")
        ) + entry.monthly_cost

    return result


def _calc_trend(current: Decimal, previous: Decimal) -> float:
    """Calculate percentage change."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(float((current - previous) / previous * 100), 1)
