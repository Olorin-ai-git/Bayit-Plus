"""Training platform BYOC (Bring Your Own Content) import endpoints."""

import logging
from typing import Literal

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.b2b_content_source import B2BContentSource
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.api.routes.training.dependencies import require_training_admin
from app.services.olorin.source_sync import sync_source

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/byoc", tags=["training-byoc"])


class BYOCImportRequest(BaseModel):
    """Request body for importing a content source."""

    source_type: Literal["youtube_channel", "playlist", "rss"] = Field(
        ..., description="Type of content source"
    )
    url: str = Field(..., min_length=1, description="Source URL")
    name: str = Field(
        ..., min_length=1, max_length=200, description="Source name"
    )


@router.post("/import", status_code=status.HTTP_202_ACCEPTED)
async def import_source(
    body: BYOCImportRequest,
    background_tasks: BackgroundTasks,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Import a content source and queue sync (admin only)."""
    partner = await IntegrationPartner.find_one(
        {"partner_id": admin.partner_id}
    )
    if not partner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found",
        )

    source = B2BContentSource(
        partner_id=admin.partner_id,
        source_type=body.source_type,
        source_url=body.url,
        name=body.name,
        capabilities=["characters", "subtitles"],
        auto_process=True,
    )
    await source.insert()

    background_tasks.add_task(sync_source, source, partner)

    logger.info(
        "BYOC import queued: %s", str(source.id),
        extra={"partner_id": admin.partner_id},
    )
    return {"batch_id": str(source.id), "status": "queued"}


@router.get("/import/{batch_id}")
async def get_batch_status(
    batch_id: str,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Get import batch status (admin only)."""
    source = await B2BContentSource.get(batch_id)
    if not source or source.partner_id != admin.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Batch not found",
        )

    batch_status = "complete" if source.content_ids else "processing"
    return {
        "batch_id": str(source.id),
        "source_type": source.source_type,
        "name": source.name,
        "content_count": len(source.content_ids),
        "status": batch_status,
    }


@router.get("/imports")
async def list_imports(
    admin: TrainingUser = Depends(require_training_admin),
):
    """List all import batches for the organization (admin only)."""
    sources = await B2BContentSource.find(
        {"partner_id": admin.partner_id}
    ).sort("-created_at").to_list()

    return [
        {
            "batch_id": str(s.id),
            "source_type": s.source_type,
            "name": s.name,
            "content_count": len(s.content_ids),
            "status": "complete" if s.content_ids else "processing",
            "created_at": s.created_at.isoformat(),
        }
        for s in sources
    ]
