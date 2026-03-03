"""Cost provider health endpoint for iOS dashboard."""

from datetime import datetime

from fastapi import APIRouter, Depends, Request

from app.core.logging_config import get_logger
from app.core.rate_limiter import limiter
from app.models.cost_breakdown import CostBreakdown
from app.models.user import User
from app.services.olorin.cost.aggregation import CostAggregationService

from .cost_admin_lock import require_costs_admin_uid
from .cost_service_schemas import (
    CostHealthResponse,
    ProviderHealthResponse,
)

router = APIRouter(prefix="/costs", tags=["admin-costs-ios"])
logger = get_logger(__name__)

_PROVIDER_NAMES = [
    "GCP BigQuery",
    "MongoDB Atlas",
    "OpenAI",
    "ElevenLabs",
    "Stripe",
    "Pinecone",
    "Twilio",
    "Redis Cloud",
    "Fixed Costs",
    "Config Fallback",
]


@router.get("/health")
@limiter.limit("30/hour")
async def get_cost_health(
    request: Request,
    current_user: User = Depends(require_costs_admin_uid),
) -> CostHealthResponse:
    """Provider health status and data freshness."""
    svc = CostAggregationService()
    providers = svc.providers

    results = []
    healthy_count = 0

    for i, provider in enumerate(providers):
        name = _PROVIDER_NAMES[i] if i < len(_PROVIDER_NAMES) else type(provider).__name__
        try:
            is_healthy = await provider.health_check()
        except Exception as exc:
            is_healthy = False
            logger.warning(
                "Provider health check failed",
                extra={"provider": name, "error": str(exc)},
            )

        enabled = not getattr(provider, "_enabled", True) is False
        if is_healthy:
            healthy_count += 1

        results.append(
            ProviderHealthResponse(
                name=name,
                enabled=enabled,
                is_healthy=is_healthy,
                last_success_at=None,
                last_error=None if is_healthy else "Health check failed",
            )
        )

    freshness = await _get_data_freshness()

    return CostHealthResponse(
        providers=results,
        healthy_count=healthy_count,
        total_count=len(results),
        data_freshness_minutes=freshness,
    )


async def _get_data_freshness() -> int | None:
    """Minutes since last cost breakdown was saved."""
    latest = (
        await CostBreakdown.find(
            CostBreakdown.period_type == "hourly"
        )
        .sort("-period_end")
        .limit(1)
        .to_list()
    )
    if not latest:
        return None
    delta = datetime.utcnow() - latest[0].period_end
    return int(delta.total_seconds() / 60)
