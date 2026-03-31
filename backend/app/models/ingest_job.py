"""
B2B Ingest Job Model

Tracks per-capability status for orchestrated video ingestion.
"""

from datetime import datetime, timezone
from typing import Dict, Optional

from beanie import Document
from pydantic import Field


def derive_overall_status(capabilities: Dict[str, str]) -> str:
    """Derive overall status from per-capability statuses."""
    if not capabilities:
        return "pending"
    statuses = set(capabilities.values())
    if statuses == {"completed"}:
        return "completed"
    if "processing" in statuses:
        return "processing"
    if "pending" in statuses:
        return "processing"
    if statuses == {"failed"}:
        return "failed"
    return "partial"


class IngestJob(Document):
    """Tracks an orchestrated B2B ingest pipeline run."""

    job_id: str = Field(..., description="Unique job identifier")
    partner_id: str = Field(..., description="Owning partner")
    content_id: str = Field(..., description="Target content document")
    video_url: str = Field(..., description="Source video URL")
    direct: bool = Field(
        default=False,
        description="Skip TMDB lookup; use transcript-only extraction (training content)",
    )
    capabilities: Dict[str, str] = Field(
        default_factory=dict,
        description="Per-capability status: pending|processing|completed|failed",
    )
    error_detail: Optional[str] = Field(
        default=None, description="Top-level error if pipeline itself failed",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
    )

    class Settings:
        name = "ingest_jobs"
        indexes = [
            "job_id",
            "partner_id",
        ]

    @property
    def overall_status(self) -> str:
        return derive_overall_status(self.capabilities)

    async def update_capability(
        self, capability: str, status: str,
    ) -> None:
        """Update a single capability status and persist."""
        self.capabilities[capability] = status
        self.updated_at = datetime.now(timezone.utc)
        await self.save()
