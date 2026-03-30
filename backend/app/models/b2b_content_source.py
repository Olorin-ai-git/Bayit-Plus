"""
B2B Content Source Model

Tracks connected content libraries for automatic ingestion.
"""

from datetime import datetime, timezone
from typing import List, Optional

from beanie import Document
from pydantic import Field


SOURCE_TYPES = ("youtube_channel", "playlist", "rss", "manual")


class B2BContentSource(Document):
    """A partner's connected content source for auto-ingestion."""

    partner_id: str = Field(..., description="Owning partner")
    source_type: str = Field(
        ..., description="youtube_channel | playlist | rss | manual",
    )
    source_url: str = Field(..., description="Source URL")
    name: str = Field(..., description="Human-readable source name")
    auto_process: bool = Field(
        default=True,
        description="Auto-submit new videos to ingest pipeline",
    )
    capabilities: List[str] = Field(
        default_factory=lambda: ["characters", "subtitles"],
        description="Capabilities to run on new videos",
    )
    sync_interval_hours: int = Field(
        default=24, ge=1, le=168,
        description="Hours between auto-syncs",
    )
    last_synced_at: Optional[datetime] = Field(
        default=None, description="Last successful sync time",
    )
    content_ids: List[str] = Field(
        default_factory=list,
        description="Content IDs ingested from this source",
    )
    status: str = Field(
        default="active",
        description="active | paused | error",
    )
    error_detail: Optional[str] = Field(
        default=None, description="Last error message if status=error",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    class Settings:
        name = "b2b_content_sources"
        indexes = [
            "partner_id",
            "source_type",
        ]
