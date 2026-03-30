"""
Olorin.ai B2B Content Source API

CRUD endpoints for managing connected content libraries.
Partners register YouTube channels, playlists, RSS feeds, etc.
and new videos are auto-ingested through the orchestrated pipeline.
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.olorin.dependencies import (
    get_current_partner,
    verify_capability,
)
from app.core.logging_config import get_logger
from app.models.b2b_content_source import B2BContentSource, SOURCE_TYPES
from app.models.integration_partner import IntegrationPartner

logger = get_logger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response models
# ---------------------------------------------------------------------------

class CreateSourceRequest(BaseModel):
    """Register a new content source."""

    source_type: str = Field(
        ..., description="youtube_channel | playlist | rss | manual",
    )
    source_url: str = Field(..., description="Source URL")
    name: str = Field(..., description="Human-readable name")
    auto_process: bool = Field(default=True)
    capabilities: List[str] = Field(
        default=["characters", "subtitles"],
    )
    sync_interval_hours: int = Field(default=24, ge=1, le=168)


class SourceResponse(BaseModel):
    """Single source details."""

    id: str
    partner_id: str
    source_type: str
    source_url: str
    name: str
    auto_process: bool
    capabilities: List[str]
    sync_interval_hours: int
    last_synced_at: Optional[str] = None
    content_count: int
    status: str
    error_detail: Optional[str] = None
    created_at: str
    updated_at: str


class SourceListResponse(BaseModel):
    """List of sources."""

    sources: List[SourceResponse]
    total: int


class SyncResponse(BaseModel):
    """Response after triggering a sync."""

    source_id: str
    status: str
    message: str


def _source_to_response(src: B2BContentSource) -> SourceResponse:
    return SourceResponse(
        id=str(src.id),
        partner_id=src.partner_id,
        source_type=src.source_type,
        source_url=src.source_url,
        name=src.name,
        auto_process=src.auto_process,
        capabilities=src.capabilities,
        sync_interval_hours=src.sync_interval_hours,
        last_synced_at=(
            src.last_synced_at.isoformat() if src.last_synced_at else None
        ),
        content_count=len(src.content_ids),
        status=src.status,
        error_detail=src.error_detail,
        created_at=src.created_at.isoformat(),
        updated_at=src.updated_at.isoformat(),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "",
    response_model=SourceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a content source",
)
async def create_source(
    request: CreateSourceRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> SourceResponse:
    """Connect a YouTube channel, playlist, or RSS feed for auto-ingestion."""
    await verify_capability(partner, "video_ingest")

    if request.source_type not in SOURCE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Invalid source_type: {request.source_type}. "
                f"Must be one of: {', '.join(SOURCE_TYPES)}"
            ),
        )

    source = B2BContentSource(
        partner_id=partner.partner_id,
        source_type=request.source_type,
        source_url=request.source_url,
        name=request.name,
        auto_process=request.auto_process,
        capabilities=request.capabilities,
        sync_interval_hours=request.sync_interval_hours,
    )
    await source.insert()

    logger.info(
        "Content source created",
        extra={
            "partner_id": partner.partner_id,
            "source_type": request.source_type,
            "source_id": str(source.id),
        },
    )
    return _source_to_response(source)


@router.get(
    "",
    response_model=SourceListResponse,
    summary="List connected sources",
)
async def list_sources(
    partner: IntegrationPartner = Depends(get_current_partner),
) -> SourceListResponse:
    """List all content sources for this partner."""
    await verify_capability(partner, "video_ingest")

    sources = await B2BContentSource.find(
        B2BContentSource.partner_id == partner.partner_id,
    ).to_list()

    return SourceListResponse(
        sources=[_source_to_response(s) for s in sources],
        total=len(sources),
    )


@router.get(
    "/{source_id}",
    response_model=SourceResponse,
    summary="Get source details",
)
async def get_source(
    source_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> SourceResponse:
    """Get details for a specific content source."""
    await verify_capability(partner, "video_ingest")

    source = await B2BContentSource.get(source_id)
    if not source or source.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )
    return _source_to_response(source)


@router.delete(
    "/{source_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Disconnect a source",
)
async def delete_source(
    source_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> None:
    """Remove a connected content source. Existing content is not deleted."""
    await verify_capability(partner, "video_ingest")

    source = await B2BContentSource.get(source_id)
    if not source or source.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )

    await source.delete()
    logger.info(
        "Content source deleted",
        extra={
            "partner_id": partner.partner_id,
            "source_id": source_id,
        },
    )


@router.post(
    "/{source_id}/sync",
    response_model=SyncResponse,
    summary="Trigger manual sync",
)
async def trigger_sync(
    source_id: str,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> SyncResponse:
    """Manually trigger a sync for a content source."""
    await verify_capability(partner, "video_ingest")

    source = await B2BContentSource.get(source_id)
    if not source or source.partner_id != partner.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )

    if source.status == "paused":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Source is paused. Resume before syncing.",
        )

    from app.services.olorin.source_sync import sync_source

    new_count = await sync_source(source, partner)

    source.last_synced_at = datetime.now(timezone.utc)
    source.updated_at = datetime.now(timezone.utc)
    source.status = "active"
    source.error_detail = None
    await source.save()

    return SyncResponse(
        source_id=str(source.id),
        status="completed",
        message=f"Synced {new_count} new video(s)",
    )
