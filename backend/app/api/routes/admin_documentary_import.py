"""Admin routes for public domain documentary content imports."""

import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.routes.admin_content_utils import (AuditAction, Permission,
                                                has_permission, log_audit)
from app.models.user import User
from app.schemas.documentary_import import (
    CuratedImportRequest,
    ImportResult,
    ImportStats,
    SourceSearchRequest,
    SourceSearchResult,
    SpecificImportRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/documentaries/import/curated", response_model=ImportResult)
async def import_curated_documentaries(
    data: CuratedImportRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Import curated public domain documentary content."""
    from app.services.public_domain_doc_importer.importer_service import (
        PublicDomainDocImporter,
    )

    importer = PublicDomainDocImporter()
    try:
        result = await importer.import_curated(
            source=data.source,
            dry_run=data.dry_run,
        )

        if not data.dry_run and result.get("imported_count", 0) > 0:
            await log_audit(
                user_id=str(current_user.id),
                action=AuditAction.DOCUMENTARY_IMPORTED,
                resource_type="documentary",
                details={
                    "operation": "curated_import",
                    "source": data.source or "all",
                    "imported": result.get("imported_count", 0),
                    "skipped": result.get("skipped_count", 0),
                },
                request=request,
            )

        return result

    except Exception as exc:
        logger.error(
            "Curated documentary import failed",
            extra={"source": data.source, "error": str(exc)},
        )
        raise HTTPException(
            status_code=502,
            detail="Documentary import failed due to upstream error",
        )
    finally:
        await importer.close()


@router.post("/documentaries/import/specific", response_model=ImportResult)
async def import_specific_documentaries(
    data: SpecificImportRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Import specific documentary items by source ID."""
    from app.services.public_domain_doc_importer.importer_service import (
        PublicDomainDocImporter,
    )

    importer = PublicDomainDocImporter()
    try:
        result = await importer.import_specific(
            source=data.source,
            source_ids=data.source_ids,
        )

        if result.get("imported_count", 0) > 0:
            await log_audit(
                user_id=str(current_user.id),
                action=AuditAction.DOCUMENTARY_IMPORTED,
                resource_type="documentary",
                details={
                    "operation": "specific_import",
                    "source": data.source,
                    "source_ids": data.source_ids,
                    "imported": result.get("imported_count", 0),
                },
                request=request,
            )

        return result

    except Exception as exc:
        logger.error(
            "Specific documentary import failed",
            extra={"source": data.source, "error": str(exc)},
        )
        raise HTTPException(
            status_code=502,
            detail="Documentary import failed due to upstream error",
        )
    finally:
        await importer.close()


@router.post(
    "/documentaries/search",
    response_model=List[SourceSearchResult],
)
async def search_documentary_source(
    data: SourceSearchRequest,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Search a public domain source for documentary content (preview only)."""
    from app.services.public_domain_doc_importer.importer_service import (
        PublicDomainDocImporter,
    )

    importer = PublicDomainDocImporter()
    try:
        results = await importer.search_source(
            source=data.source,
            query=data.query,
            page=data.page,
            page_size=data.page_size,
        )
        return results

    except Exception as exc:
        logger.error(
            "Documentary source search failed",
            extra={"source": data.source, "query": data.query, "error": str(exc)},
        )
        raise HTTPException(
            status_code=502,
            detail="Source search failed due to upstream error",
        )
    finally:
        await importer.close()


@router.get("/documentaries/stats", response_model=List[ImportStats])
async def get_documentary_import_stats(
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get import statistics by source."""
    from app.services.public_domain_doc_importer.sync_tracker import (
        get_sync_state,
    )

    stats = []
    for source in ("nasa", "dvids", "nara"):
        state = await get_sync_state(source)
        if state:
            stats.append(
                ImportStats(
                    source=source,
                    total_imported=state.items_synced_total,
                    last_sync_at=state.last_sync_at,
                    last_item_date=state.last_item_date,
                )
            )
        else:
            stats.append(ImportStats(source=source))

    return stats
