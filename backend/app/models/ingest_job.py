"""
B2B Ingest Job Model

Tracks per-capability status for orchestrated video ingestion.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional

from beanie import Document
from pydantic import Field, model_validator

from app.models.pipeline_stage import StageExecution, StageName, StageStatus


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
    stages: List[StageExecution] = Field(
        default_factory=list,
        description="Ordered pipeline stage executions for resumable processing",
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

    @model_validator(mode="before")
    @classmethod
    def _coerce_null_stages(cls, values):
        """Coerce stages=null from legacy or partial documents to an empty list.

        A missing `stages` key triggers `default_factory=list`, but an explicit
        `null` in the stored document would raise ValidationError. Coerce here
        so old documents load cleanly.
        """
        if isinstance(values, dict) and values.get("stages") is None and "stages" in values:
            values["stages"] = []
        return values

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

    def get_or_create_stage(self, name: StageName) -> StageExecution:
        """Return existing stage with this name, or create and append a new one."""
        for stage in self.stages:
            if stage.name == name:
                return stage
        stage = StageExecution(name=name)
        self.stages.append(stage)
        return stage

    def get_stage(self, name: StageName) -> Optional[StageExecution]:
        """Return the existing stage with this name, or None if not present."""
        for stage in self.stages:
            if stage.name == name:
                return stage
        return None

    def first_failed_stage(self) -> Optional[StageExecution]:
        """Return the earliest-declared stage that is currently FAILED.

        Uses StageName declaration order (not lexicographic) so resume-from-failure
        picks up at the logically earliest failed step.
        """
        by_name = {s.name: s for s in self.stages}
        for name in StageName:
            stage = by_name.get(name)
            if stage is not None and stage.status == StageStatus.FAILED:
                return stage
        return None
