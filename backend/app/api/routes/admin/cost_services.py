"""Cost services endpoint for iOS dashboard."""

from datetime import datetime, timedelta
from decimal import Decimal

from fastapi import APIRouter, Depends, Request

from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.models.cost_breakdown import CostBreakdown
from app.models.user import User

from .cost_admin_lock import require_costs_admin_uid
from .cost_service_schemas import (
    CostCategoryEnum,
    DataSourceEnum,
    PlatformEnum,
    ServiceCostResponse,
    ServicesCostListResponse,
)

router = APIRouter(prefix="/costs", tags=["admin-costs-ios"])
logger = get_logger(__name__)


@router.get("/services")
@limiter.limit("60/hour")
async def get_cost_services(
    request: Request,
    current_user: User = Depends(require_costs_admin_uid),
) -> ServicesCostListResponse:
    """All services with current/previous month cost and trends."""
    now = datetime.utcnow()
    current_start = now.replace(day=1, hour=0, minute=0, second=0)
    prev_start = (current_start - timedelta(days=1)).replace(day=1)

    current_docs = await CostBreakdown.find(
        CostBreakdown.period_type == "hourly",
        CostBreakdown.period_start >= current_start,
    ).to_list()

    prev_docs = await CostBreakdown.find(
        CostBreakdown.period_type == "hourly",
        CostBreakdown.period_start >= prev_start,
        CostBreakdown.period_start < current_start,
    ).to_list()

    current_totals = _sum_service_costs(current_docs)
    prev_totals = _sum_service_costs(prev_docs)

    all_services = set(current_totals.keys()) | set(
        prev_totals.keys()
    )
    grand_current = sum(current_totals.values(), Decimal("0"))
    grand_prev = sum(prev_totals.values(), Decimal("0"))

    services = []
    for svc in sorted(all_services):
        curr = current_totals.get(svc, Decimal("0"))
        prev = prev_totals.get(svc, Decimal("0"))
        trend = _calc_trend(curr, prev)
        pct = (
            float(curr / grand_current * 100) if grand_current else 0
        )
        cat, plat, src = _classify_service(svc)
        services.append(
            ServiceCostResponse(
                service_name=svc,
                category=cat,
                current_month_cost=curr,
                previous_month_cost=prev,
                trend_pct=trend,
                pct_of_total=round(pct, 2),
                platform=plat,
                data_source=src,
            )
        )

    services.sort(key=lambda s: s.current_month_cost, reverse=True)

    return ServicesCostListResponse(
        services=services,
        total_current_month=grand_current,
        total_previous_month=grand_prev,
        service_count=len(services),
    )


def _sum_service_costs(
    docs: list[CostBreakdown],
) -> dict[str, Decimal]:
    """Sum costs by service name across breakdown docs."""
    totals: dict[str, Decimal] = {}
    for doc in docs:
        ai = doc.ai_costs
        totals["OpenAI/LLM"] = totals.get(
            "OpenAI/LLM", Decimal("0")
        ) + (ai.llm_cost if ai else Decimal("0"))
        totals["ElevenLabs/TTS"] = totals.get(
            "ElevenLabs/TTS", Decimal("0")
        ) + (ai.tts_cost if ai else Decimal("0"))

        infra = doc.infrastructure_costs
        if infra:
            totals["GCP"] = totals.get(
                "GCP", Decimal("0")
            ) + infra.gcp_cost
            totals["MongoDB Atlas"] = totals.get(
                "MongoDB Atlas", Decimal("0")
            ) + infra.mongodb_cost
            totals["Firebase"] = totals.get(
                "Firebase", Decimal("0")
            ) + infra.firebase_cost

        tp = doc.thirdparty_costs
        if tp:
            totals["Stripe Fees"] = totals.get(
                "Stripe Fees", Decimal("0")
            ) + tp.stripe_fees
            totals["Twilio"] = totals.get(
                "Twilio", Decimal("0")
            ) + tp.twilio_cost

    return totals


def _calc_trend(current: Decimal, previous: Decimal) -> float:
    """Calculate percentage change."""
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return round(float((current - previous) / previous * 100), 1)


_SERVICE_MAP = {
    "GCP": (CostCategoryEnum.INFRASTRUCTURE, PlatformEnum.SHARED),
    "MongoDB Atlas": (
        CostCategoryEnum.INFRASTRUCTURE,
        PlatformEnum.SHARED,
    ),
    "Firebase": (
        CostCategoryEnum.INFRASTRUCTURE,
        PlatformEnum.SHARED,
    ),
    "OpenAI/LLM": (CostCategoryEnum.AI, PlatformEnum.SHARED),
    "ElevenLabs/TTS": (CostCategoryEnum.AI, PlatformEnum.BAYIT_PLUS),
    "Stripe Fees": (
        CostCategoryEnum.THIRD_PARTY,
        PlatformEnum.SHARED,
    ),
    "Twilio": (
        CostCategoryEnum.THIRD_PARTY,
        PlatformEnum.BAYIT_PLUS,
    ),
}


def _classify_service(
    name: str,
) -> tuple[CostCategoryEnum, PlatformEnum, DataSourceEnum]:
    """Classify a service by category and platform."""
    cat, plat = _SERVICE_MAP.get(
        name,
        (CostCategoryEnum.FIXED, PlatformEnum.SHARED),
    )
    src = DataSourceEnum.API if name in _SERVICE_MAP else DataSourceEnum.CONFIG
    return cat, plat, src
