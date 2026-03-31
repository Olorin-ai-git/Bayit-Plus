"""
Pydantic request/response schemas for B2B Content Source API.

Extracted from b2b_sources.py to comply with 200-line file limit.
"""

from typing import List, Optional

from pydantic import BaseModel, Field

from app.models.b2b_content_source import B2BContentSource, SOURCE_TYPES


class CreateSourceRequest(BaseModel):
    """Register a new content source."""

    source_type: str = Field(
        ..., description="youtube_channel | playlist | rss | manual | plex | iptv",
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


# Keep SOURCE_TYPES re-exported for any downstream importers
__all__ = [
    "CreateSourceRequest",
    "SourceResponse",
    "SourceListResponse",
    "SyncResponse",
    "SOURCE_TYPES",
]


def source_to_response(src: B2BContentSource) -> SourceResponse:
    """Convert a B2BContentSource document to a SourceResponse."""
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
