"""Training platform organization settings and branding endpoints."""

import logging
from types import SimpleNamespace
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.api.routes.training.dependencies import (
    require_training_admin,
    _parse_trial_config,
)
from app.api.routes.training.tier_gates import resolve_partner_tier
from app.services.training.trial_service import (
    check_trial_permits,
    decrement_trial_cap,
)

logger = logging.getLogger(__name__)

_TRIAL_FEATURE = "branding_uploads"

router = APIRouter(prefix="/auth", tags=["training-settings"])


class UpdateSettingsRequest(BaseModel):
    """Request body for updating organization settings."""

    org_name: Optional[str] = Field(
        default=None, min_length=2, max_length=100
    )
    logo_url: Optional[str] = Field(default=None)
    accent_color: Optional[str] = Field(
        default=None, pattern=r"^#[0-9A-Fa-f]{6}$"
    )


@router.put("/me")
async def update_settings(
    body: UpdateSettingsRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Update organization branding and settings (admin only)."""
    partner = await IntegrationPartner.find_one(
        {"partner_id": admin.partner_id}
    )
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    tc = partner.training_config or {}

    is_branding_change = (
        body.logo_url is not None or body.accent_color is not None
    )
    trial_cfg = _parse_trial_config(partner)

    if is_branding_change:
        if trial_cfg is not None and trial_cfg.state in {"active", "grace"}:
            wrapper = SimpleNamespace(
                training_config=SimpleNamespace(trial_config=trial_cfg),
            )
            await check_trial_permits(wrapper, _TRIAL_FEATURE)
        else:
            tier = await resolve_partner_tier(admin.partner_id)
            if tier not in {"organization", "enterprise"}:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Custom branding requires Organization tier",
                )

    if body.org_name is not None:
        tc["org_display_name"] = body.org_name
    if body.logo_url is not None:
        tc["logo_url"] = body.logo_url
    if body.accent_color is not None:
        tc["accent_color"] = body.accent_color

    partner.training_config = tc
    await partner.save()

    # Decrement trial cap after successful branding save
    if is_branding_change and trial_cfg is not None and trial_cfg.state == "active":
        ok = await decrement_trial_cap(partner.id, _TRIAL_FEATURE)
        if not ok:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Trial preview cap reached for {_TRIAL_FEATURE}. Upgrade.",
            )

    logger.info(
        "Training settings updated: %s", admin.partner_id,
    )
    return {"saved": True}
