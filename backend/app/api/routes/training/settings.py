"""Training platform organization settings and branding endpoints."""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.api.routes.training.dependencies import require_training_admin

logger = logging.getLogger(__name__)

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

    if body.org_name is not None:
        tc["org_display_name"] = body.org_name
    if body.logo_url is not None:
        tc["logo_url"] = body.logo_url
    if body.accent_color is not None:
        tc["accent_color"] = body.accent_color

    partner.training_config = tc
    await partner.save()

    logger.info(
        "Training settings updated: %s", admin.partner_id,
    )
    return {"saved": True}
