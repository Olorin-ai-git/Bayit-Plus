"""Training platform onboarding routes."""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import require_training_admin
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/onboarding", tags=["training-onboarding"])


class SurveyRequest(BaseModel):
    company_size: str = Field(
        ..., pattern=r"^(1-10|11-50|51-200|201-1000|1000\+)$"
    )
    role: str = Field(
        ...,
        pattern=r"^(l_and_d|hr|manager|executive|educator|other)$",
    )
    use_case: str = Field(
        ...,
        pattern=(
            r"^(employee_training|compliance|onboarding|"
            r"customer_education|academic|other)$"
        ),
    )


@router.post("/survey")
async def submit_survey(
    body: SurveyRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Store onboarding survey responses on the org's training config."""
    partner = await IntegrationPartner.find_one(
        {"partner_id": admin.partner_id}
    )
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    tc = partner.training_config or {}
    tc["onboarding_survey"] = {
        "company_size": body.company_size,
        "role": body.role,
        "use_case": body.use_case,
    }
    partner.training_config = tc
    await partner.save()

    logger.info("Onboarding survey saved for %s", admin.partner_id)
    return {"saved": True}
