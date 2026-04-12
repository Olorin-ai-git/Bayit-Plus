"""Training SCORM export API endpoints."""

import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import require_training_admin
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.integration_partner import IntegrationPartner
from app.models.scorm_export import ScormExport
from app.models.training_user import TrainingUser
from app.services.olorin.scorm_export.export_service import (
    run_export_pipeline,
)
from app.services.olorin.scorm_export.token_service import (
    generate_export_token,
)

logger = get_logger(__name__)

router = APIRouter(prefix="/exports", tags=["training-exports"])


class CreateExportRequest(BaseModel):
    """Request to create a SCORM export job."""

    content_id: str
    completion_rule: str = Field(default="video_plus_quiz")
    video_threshold_pct: int = Field(default=80, ge=1, le=100)
    quiz_pass_pct: int = Field(default=70, ge=1, le=100)
    included_characters: Optional[List[str]] = None
    video_source: str = Field(default="stream")
    token_cap: int = Field(default=500, ge=0)
    token_expiry_days: Optional[int] = Field(default=None, ge=1)


class ExportResponse(BaseModel):
    """SCORM export job response."""

    id: str
    content_id: str
    status: str
    progress_pct: int
    error: Optional[str] = None
    completion_rule: str
    tier_at_export: str
    characters_included: int
    qa_pairs_generated: int
    character_status: List[dict]
    package_url: Optional[str] = None
    package_size_bytes: Optional[int] = None
    token_used: Optional[int] = None
    token_cap: Optional[int] = None
    created_at: str
    completed_at: Optional[str] = None


class TokenUsageResponse(BaseModel):
    """Token usage stats."""

    export_id: str
    token_used: int
    token_cap: int
    token_expires_at: Optional[str] = None
    usage_pct: float


def _to_response(export: ScormExport) -> ExportResponse:
    """Convert ScormExport document to API response."""
    return ExportResponse(
        id=str(export.id),
        content_id=export.content_id,
        status=export.status,
        progress_pct=export.progress_pct,
        error=export.error,
        completion_rule=export.completion_rule,
        tier_at_export=export.tier_at_export,
        characters_included=export.characters_included,
        qa_pairs_generated=export.qa_pairs_generated,
        character_status=[
            cs.model_dump() for cs in export.character_status
        ],
        package_url=export.package_url,
        package_size_bytes=export.package_size_bytes,
        token_used=export.token_used,
        token_cap=export.token_cap,
        created_at=export.created_at.isoformat(),
        completed_at=(
            export.completed_at.isoformat()
            if export.completed_at
            else None
        ),
    )


async def _get_partner_tier(partner_id: str) -> str:
    """Get the billing tier for a partner."""
    partner = await IntegrationPartner.find_one(
        IntegrationPartner.partner_id == partner_id
    )
    if not partner:
        return "team"
    tier = partner.billing_tier
    if tier == "training":
        config = partner.training_config or {}
        return config.get("tier", "team")
    return tier


SCORM_ALLOWED_TIERS = {"enterprise"}


@router.post("", response_model=ExportResponse)
async def create_export(
    req: CreateExportRequest,
    user: TrainingUser = Depends(require_training_admin),
):
    """Create a new SCORM export job."""
    tier = await _get_partner_tier(user.partner_id)
    if tier not in SCORM_ALLOWED_TIERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="SCORM export requires Enterprise tier",
        )
    expiry_days = req.token_expiry_days or settings.SCORM_TOKEN_EXPIRY_DAYS
    token_expires = datetime.now(timezone.utc) + timedelta(
        days=expiry_days
    )

    export = ScormExport(
        partner_id=user.partner_id,
        content_id=req.content_id,
        created_by=str(user.id),
        export_token=generate_export_token(),
        completion_rule=req.completion_rule,
        video_threshold_pct=req.video_threshold_pct,
        quiz_pass_pct=req.quiz_pass_pct,
        included_characters=req.included_characters,
        video_source=req.video_source,
        token_cap=req.token_cap,
        token_expires_at=token_expires,
        tier_at_export=tier,
    )
    await export.insert()

    asyncio.create_task(run_export_pipeline(export))

    logger.info(
        "SCORM export job created",
        extra={
            "export_id": str(export.id),
            "partner_id": user.partner_id,
            "tier": tier,
        },
    )
    return _to_response(export)


@router.get("", response_model=List[ExportResponse])
async def list_exports(
    user: TrainingUser = Depends(require_training_admin),
):
    """List all SCORM exports for the partner."""
    exports = (
        await ScormExport.find(
            ScormExport.partner_id == user.partner_id
        )
        .sort(-ScormExport.created_at)
        .to_list()
    )
    return [_to_response(e) for e in exports]


@router.get("/{export_id}", response_model=ExportResponse)
async def get_export(
    export_id: str,
    user: TrainingUser = Depends(require_training_admin),
):
    """Get SCORM export status and details."""
    export = await ScormExport.get(export_id)
    if not export or export.partner_id != user.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export not found",
        )
    return _to_response(export)


@router.post(
    "/{export_id}/regenerate-token",
    response_model=ExportResponse,
)
async def regenerate_token(
    export_id: str,
    user: TrainingUser = Depends(require_training_admin),
):
    """Regenerate the export token (invalidates the old one)."""
    export = await ScormExport.get(export_id)
    if not export or export.partner_id != user.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export not found",
        )
    export.export_token = generate_export_token()
    export.token_used = 0
    expiry_days = settings.SCORM_TOKEN_EXPIRY_DAYS
    export.token_expires_at = datetime.now(timezone.utc) + timedelta(
        days=expiry_days
    )
    await export.save()
    return _to_response(export)


@router.get(
    "/{export_id}/token-usage",
    response_model=TokenUsageResponse,
)
async def get_token_usage(
    export_id: str,
    user: TrainingUser = Depends(require_training_admin),
):
    """Get token usage stats for an export."""
    export = await ScormExport.get(export_id)
    if not export or export.partner_id != user.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export not found",
        )
    usage_pct = (
        (export.token_used / export.token_cap * 100)
        if export.token_cap > 0
        else 0
    )
    return TokenUsageResponse(
        export_id=str(export.id),
        token_used=export.token_used,
        token_cap=export.token_cap,
        token_expires_at=(
            export.token_expires_at.isoformat()
            if export.token_expires_at
            else None
        ),
        usage_pct=round(usage_pct, 1),
    )
