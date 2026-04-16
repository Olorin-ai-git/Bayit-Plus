"""Superadmin trial extension endpoint (Task 18).

POST /superadmin/training/trials/{partner_id}/extend
Extends a partner's trial by N days (capped by PlatformConfig).
"""

import logging
from datetime import timedelta

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.integration_partner import IntegrationPartner
from app.models.platform_config import PlatformConfig
from app.models.training_user import TrainingUser
from app.api.routes.training.dependencies import (
    _parse_trial_config,
    require_superadmin,
)

logger = logging.getLogger(__name__)

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(
    prefix="/superadmin/training/trials",
    tags=["training-superadmin"],
)


class ExtendTrialRequest(BaseModel):
    """Request body for extending a trial."""

    days: int = Field(gt=0, le=30, description="Days to extend (max 30)")


@router.post("/{partner_id}/extend")
async def extend_trial(
    partner_id: str,
    req: ExtendTrialRequest,
    superadmin: TrainingUser = Depends(require_superadmin),
):
    """Extend a partner's trial by N days.

    Cumulative extensions are capped at
    ``PlatformConfig.trial_defaults.extension_max_days``.
    Updates both Stripe trial_end and the persisted expires_at.
    """
    partner = await IntegrationPartner.find_one(
        {"partner_id": partner_id}
    )
    if partner is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Partner not found",
        )

    tc = _parse_trial_config(partner)
    if tc is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Partner has no trial_config",
        )

    pc = await PlatformConfig.get_singleton()
    max_days = pc.trial_defaults.extension_max_days
    if tc.extension_days_total + req.days > max_days:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extension would exceed {max_days}-day cap",
        )

    new_expires = tc.expires_at + timedelta(days=req.days)
    new_total = tc.extension_days_total + req.days

    stripe.Subscription.modify(
        tc.stripe_subscription_id,
        trial_end=int(new_expires.timestamp()),
    )

    await IntegrationPartner.get_pymongo_collection().update_one(
        {"_id": partner.id},
        {"$set": {
            "training_config.trial_config.expires_at": new_expires,
            "training_config.trial_config.extension_days_total": new_total,
        }},
    )

    logger.info(
        "Trial extended: partner=%s days=%d total=%d by=%s",
        partner_id,
        req.days,
        new_total,
        superadmin.email,
    )
    return {
        "expires_at": new_expires.isoformat(),
        "extension_days_total": new_total,
    }
