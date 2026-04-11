"""Superadmin cost & credit control panel routes.

GET  /training/config/credits         — public (no auth) — display prices only
GET  /training/superadmin/config      — superadmin only
PUT  /training/superadmin/config      — superadmin only
GET  /training/superadmin/costs       — superadmin only — monthly cost summary
GET  /training/superadmin/costs/runs  — superadmin only — paginated run list
"""

import calendar
import logging
import re
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.api.routes.training.dependencies import require_superadmin
from app.models.pipeline_cost import PipelineCost
from app.models.platform_config import (
    FeatureCost,
    FormatCost,
    PlatformConfig,
    SubscriptionPlan,
)
from app.models.training_user import TrainingUser

router = APIRouter(prefix="/superadmin", tags=["training-superadmin"])
public_router = APIRouter(prefix="/config", tags=["training-config"])

logger = logging.getLogger(__name__)
_STRIPE_PRICE_ID_RE = re.compile(r"^price_[a-zA-Z0-9]+$")


# ── Public endpoint ────────────────────────────────────────────────────────────


class PublicCreditsResponse(BaseModel):
    format_costs: List[FormatCost]
    feature_costs: List[FeatureCost]
    subscription_plans: List[dict]  # display prices only — no Stripe IDs


@public_router.get("/credits", response_model=PublicCreditsResponse)
async def get_public_credits_config() -> PublicCreditsResponse:
    """Return format/feature costs and plan display prices — no Stripe IDs."""
    cfg = await PlatformConfig.get_singleton()
    plans_display = [
        {
            "id": p.id,
            "name": p.name,
            "price_monthly": p.price_monthly,
            "price_annual": p.price_annual,
        }
        for p in cfg.subscription_plans
    ]
    return PublicCreditsResponse(
        format_costs=cfg.format_costs,
        feature_costs=cfg.feature_costs,
        subscription_plans=plans_display,
    )


# ── Superadmin config ──────────────────────────────────────────────────────────


@router.get("/config")
async def get_platform_config(
    _: TrainingUser = Depends(require_superadmin),
) -> PlatformConfig:
    return await PlatformConfig.get_singleton()


class UpdateConfigRequest(BaseModel):
    tier_limits: Optional[Dict[str, int]] = None
    format_costs: Optional[List[FormatCost]] = None
    feature_costs: Optional[List[FeatureCost]] = None
    subscription_plans: Optional[List[SubscriptionPlan]] = None


@router.put("/config")
async def update_platform_config(
    body: UpdateConfigRequest,
    _: TrainingUser = Depends(require_superadmin),
) -> PlatformConfig:
    cfg = await PlatformConfig.get_singleton()

    if body.tier_limits is not None:
        for k, v in body.tier_limits.items():
            if v < 0:
                raise HTTPException(422, f"tier_limits.{k} must be non-negative")
        cfg.tier_limits = body.tier_limits

    if body.format_costs is not None:
        for fc in body.format_costs:
            if fc.estimated_credit_cost < 0 or fc.per_employee_credit_cost < 0:
                raise HTTPException(422, f"format_costs.{fc.id}: credit costs must be non-negative")
        cfg.format_costs = body.format_costs

    if body.feature_costs is not None:
        for fc in body.feature_costs:
            if fc.credits < 0:
                raise HTTPException(422, f"feature_costs.{fc.id}: credits must be non-negative")
        cfg.feature_costs = body.feature_costs

    if body.subscription_plans is not None:
        for plan in body.subscription_plans:
            if plan.price_monthly <= 0 or plan.price_annual <= 0:
                raise HTTPException(422, f"subscription_plans.{plan.id}: prices must be positive")
            # Empty string is allowed — superadmin can save a plan before Stripe IDs are configured
            if plan.stripe_price_id_monthly and not _STRIPE_PRICE_ID_RE.match(plan.stripe_price_id_monthly):
                raise HTTPException(422, f"Invalid Stripe Price ID: {plan.stripe_price_id_monthly}")
            if plan.stripe_price_id_annual and not _STRIPE_PRICE_ID_RE.match(plan.stripe_price_id_annual):
                raise HTTPException(422, f"Invalid Stripe Price ID: {plan.stripe_price_id_annual}")
        cfg.subscription_plans = body.subscription_plans

    cfg.updated_at = datetime.now(timezone.utc)
    await cfg.save()
    logger.info("platform_config_updated", extra={"updated_fields": list(body.model_fields_set)})
    return cfg


# ── Superadmin costs ───────────────────────────────────────────────────────────


def _month_bounds(period: Optional[str]):
    """Parse YYYY-MM period string; return (year, month, start, end) UTC datetimes."""
    if period:
        try:
            year, month = int(period[:4]), int(period[5:7])
            datetime(year, month, 1, tzinfo=timezone.utc)  # raises ValueError if invalid
        except (ValueError, IndexError):
            raise HTTPException(status_code=422, detail="period must be in YYYY-MM format (e.g. '2025-04')")
    else:
        today = date.today()
        year, month = today.year, today.month
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    last_day = calendar.monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
    return year, month, start, end


@router.get("/costs")
async def get_costs_summary(
    period: Optional[str] = None,
    org_id: Optional[str] = None,
    _: TrainingUser = Depends(require_superadmin),
) -> Dict[str, Any]:
    """Monthly cost summary — totals and per-provider breakdown."""
    year, month, start, end = _month_bounds(period)
    query: Dict[str, Any] = {"started_at": {"$gte": start, "$lte": end}}
    if org_id:
        query["org_id"] = org_id

    runs = await PipelineCost.find(query).to_list()
    total = sum(r.total for r in runs)
    count = len(runs)
    return {
        "period": f"{year}-{month:02d}",
        "total": round(float(total), 4),
        "run_count": count,
        "avg_per_video": round(float(total) / count, 4) if count else 0,
        "providers": {
            "elevenlabs": round(float(sum(r.steps.elevenlabs for r in runs)), 4),
            "claude": round(float(sum(r.steps.claude for r in runs)), 4),
            "openai": round(float(sum(r.steps.openai for r in runs)), 4),
        },
    }


@router.get("/costs/runs")
async def get_cost_runs(
    period: Optional[str] = None,
    org_id: Optional[str] = None,
    page: int = 1,
    limit: int = 25,
    _: TrainingUser = Depends(require_superadmin),
) -> Dict[str, Any]:
    """Paginated list of pipeline cost runs, sorted by highest cost first."""
    year, month, start, end = _month_bounds(period)
    query: Dict[str, Any] = {"started_at": {"$gte": start, "$lte": end}}
    if org_id:
        query["org_id"] = org_id

    skip = (page - 1) * limit
    runs = (
        await PipelineCost.find(query)
        .sort("-total")
        .skip(skip)
        .limit(limit)
        .to_list()
    )
    total_count = await PipelineCost.find(query).count()
    return {
        "runs": [r.model_dump() for r in runs],
        "total": total_count,
        "page": page,
        "limit": limit,
    }
