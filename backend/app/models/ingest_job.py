"""
B2B Ingest Job Model

Tracks per-capability status for orchestrated video ingestion.

Beanie 2.0.1 nested-mutation advisory
-------------------------------------
After any ``await self.save()`` (or any other Beanie update method) the
``stages`` list is REPLACED in-place by ``merge_models`` with fresh
``StageExecution`` instances reconstructed from MongoDB. Any Python
reference held to a nested stage or subtask across a save is ORPHANED:
mutations on the orphan will NOT be persisted by subsequent saves, and
the next save will clobber any in-flight state with the freshly-merged
list.

This module exposes atomic mutator methods (``mark_stage_running``,
``mark_stage_completed``, ``mark_stage_failed``,
``add_stage_subtask``, ``start_stage_subtask``,
``complete_stage_subtask``, ``fail_stage_subtask``) that keep the
reference lifetime confined to the method body. Callers should NEVER
hold a ``StageExecution`` reference across a ``save()`` — re-acquire via
``get_or_create_stage()`` instead.
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

    # ------------------------------------------------------------------
    # Atomic mutator methods
    #
    # Each method (1) re-acquires the stage from self.stages inside the
    # method body, (2) mutates it, and (3) persists via save(). This
    # avoids the Beanie 2.0.1 orphan-reference bug documented in the
    # module docstring: no StageExecution reference leaves this class.
    # ------------------------------------------------------------------

    async def mark_stage_running(self, name: StageName) -> None:
        stage = self.get_or_create_stage(name)
        stage.mark_running()
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def mark_stage_completed(self, name: StageName) -> None:
        stage = self.get_or_create_stage(name)
        stage.mark_completed()
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def mark_stage_failed(self, name: StageName, error: str) -> None:
        stage = self.get_or_create_stage(name)
        stage.mark_failed(error)
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def add_stage_subtask(self, name: StageName, subtask: str) -> None:
        stage = self.get_or_create_stage(name)
        stage.add_subtask(subtask)
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def start_stage_subtask(self, name: StageName, subtask: str) -> None:
        stage = self.get_or_create_stage(name)
        stage.start_subtask(subtask)
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def complete_stage_subtask(
        self, name: StageName, subtask: str,
    ) -> None:
        stage = self.get_or_create_stage(name)
        stage.complete_subtask(subtask)
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def fail_stage_subtask(
        self, name: StageName, subtask: str, error: str,
    ) -> None:
        stage = self.get_or_create_stage(name)
        stage.fail_subtask(subtask, error)
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def reset_stage_for_retry(self, name: StageName) -> None:
        """Reset a stage so retry_stage can increment retry_count correctly.

        Clears error, timestamps, and subtasks while leaving status FAILED
        so the next ``mark_running`` call inside the runner increments
        ``retry_count``. Persists atomically.
        """
        stage = self.get_or_create_stage(name)
        stage.error = None
        stage.started_at = None
        stage.completed_at = None
        stage.subtasks = {}
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def reset_subtask_for_retry(
        self, name: StageName, subtask: str,
    ) -> None:
        """Reset a single subtask for retry and persist atomically."""
        stage = self.get_or_create_stage(name)
        if subtask not in stage.subtasks:
            raise ValueError(
                f"subtask {subtask!r} not found in stage {name.value!r}"
            )
        stage.subtasks[subtask].status = StageStatus.PENDING
        stage.subtasks[subtask].error = None
        self.updated_at = datetime.now(timezone.utc)
        await self.save()

    async def mark_manual_portrait_subtask(
        self, name: StageName, subtask: str, marker: str,
    ) -> None:
        """Stamp a subtask COMPLETED with an audit-trail ``error`` marker.

        Used by the face-extraction handler when a character's portrait
        was hand-supplied via the manual upload endpoint. Differs from
        ``complete_stage_subtask`` in that ``error`` is preserved (or
        stamped fresh with the supplied marker) so the frontend's
        ``isManuallyResolved()`` helper renders the audit badge.
        """
        stage = self.get_or_create_stage(name)
        stage.add_subtask(subtask)
        task = stage.subtasks[subtask]
        task.status = StageStatus.COMPLETED
        task.completed_at = datetime.now(timezone.utc)
        if task.error is None:
            task.error = marker
        self.updated_at = datetime.now(timezone.utc)
        await self.save()
