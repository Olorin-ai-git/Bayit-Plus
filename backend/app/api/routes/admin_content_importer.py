"""
Admin Free Content Import Routes
Import public/free content from various sources
"""

from typing import List, Optional

from app.models.admin import AuditAction, Permission
from app.models.user import User
from app.services.content_importer import ContentImporter
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from .admin_content_utils import has_permission, log_audit

router = APIRouter()


class ImportFreeContentRequest(BaseModel):
    """Request model for importing free content."""

    source_type: str
    source_name: str
    import_all: bool = True
    items: Optional[List[str]] = None
    category_id: Optional[str] = None


@router.get("/content/import/sources/{source_type}")
async def get_free_content_sources(
    source_type: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get available free content sources for a given type."""
    try:
        sources = await ContentImporter.get_available_sources(source_type)
        return {
            "source_type": source_type,
            "sources": sources,
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sources: {str(e)}",
        )


@router.post("/content/import/free-content")
async def import_free_content(
    data: ImportFreeContentRequest,
    request: Request,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Import free/test content from public sources.

    Supports:
    - Live TV: Apple BipBop test streams
    - VOD: Public domain movies from archive.org
    - Radio: Soma FM stations, BBC World Service
    - Podcasts: Public podcast feeds
    """
    try:
        imported_count = 0
        requested_count = len(data.items) if data.items else 0

        if data.source_type == "live_tv":
            channels = await ContentImporter.import_live_channels(
                data.source_name, data.import_all, data.items
            )
            imported_count = len(channels)

        elif data.source_type == "vod":
            if not data.category_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="category_id is required for VOD imports",
                )
            content_list = await ContentImporter.import_vod_content(
                data.source_name, data.category_id, data.import_all, data.items
            )
            imported_count = len(content_list)

        elif data.source_type == "radio":
            stations = await ContentImporter.import_radio_stations(
                data.source_name, data.import_all, data.items
            )
            imported_count = len(stations)

        elif data.source_type == "podcasts":
            podcasts = await ContentImporter.import_public_podcasts(
                data.import_all, data.items
            )
            imported_count = len(podcasts)

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown source type: {data.source_type}",
            )

        await log_audit(
            str(current_user.id),
            AuditAction.CONTENT_IMPORTED,
            f"{data.source_type}_import",
            None,
            {
                "source_type": data.source_type,
                "source_name": data.source_name,
                "imported_count": imported_count,
                "import_all": data.import_all,
            },
            request,
        )

        skipped_count = requested_count - imported_count if requested_count > 0 else 0
        message = f"Successfully imported {imported_count} {data.source_type} items"
        if skipped_count > 0:
            message += f" ({skipped_count} already existed)"
        elif imported_count == 0 and requested_count > 0:
            message = (
                f"No new items imported - all {requested_count} items already exist"
            )

        return {
            "message": message,
            "source_type": data.source_type,
            "source_name": data.source_name,
            "imported_count": imported_count,
            "skipped_count": skipped_count,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Import failed: {str(e)}",
        )
