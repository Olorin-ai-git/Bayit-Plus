"""Olorin.ai B2B Content Source API — CRUD for connected content libraries."""

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.olorin.b2b_source_schemas import (
    CreateSourceRequest,
    SourceListResponse,
    SourceResponse,
    SyncResponse,
    source_to_response,
)
from app.api.routes.olorin.dependencies import (
    get_current_partner,
    verify_capability,
)
from app.core.logging_config import get_logger
from app.models.b2b_content_source import B2BContentSource, SOURCE_TYPES
from app.models.integration_partner import IntegrationPartner

logger = get_logger(__name__)

router = APIRouter()


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
    """Connect a YouTube channel, playlist, RSS feed, Plex server, or IPTV playlist for auto-ingestion."""
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
    return source_to_response(source)


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
        sources=[source_to_response(s) for s in sources],
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
    return source_to_response(source)


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

    try:
        new_count = await sync_source(source, partner)
    except Exception as exc:
        logger.exception(
            "Source sync failed",
            extra={"source_id": source_id},
        )
        source.status = "error"
        source.error_detail = str(exc)[:500]
        source.updated_at = datetime.now(timezone.utc)
        await source.save()
        return SyncResponse(
            source_id=str(source.id),
            status="error",
            message=f"Sync failed: {str(exc)[:200]}",
        )

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
