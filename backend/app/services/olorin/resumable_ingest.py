"""Resumable pipeline runner driving staged ingest with checkpoint persistence.

The runner accepts a dict of stage handlers keyed by StageName and drives
them in declaration order. Each handler receives ``(job, resume_subtask)``
and is expected to:
- Use job.get_or_create_stage(name) to access its StageExecution
- Optionally populate subtasks via add_subtask / start_subtask / complete_subtask
- Not call mark_completed/mark_failed on the stage itself — the runner
  infers completion from subtask state (if subtasks exist) or from
  exception absence (if no subtasks)

When a handler is called with ``resume_subtask=name``, it should process
ONLY that subtask (other subtasks are already in their terminal state).

Persistence: the runner calls ``await job.save()`` before and after each
stage invocation so a crash between stages leaves the latest state in
MongoDB.
"""
import logging
from typing import Awaitable, Callable, Dict, Optional

from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName, StageStatus

logger = logging.getLogger(__name__)

StageHandler = Callable[..., Awaitable[None]]

# Declaration order IS the execution order.
PIPELINE_ORDER = (
    StageName.TRANSCRIPTION,
    StageName.CHARACTER_EXTRACTION,
    StageName.FACE_EXTRACTION,
    StageName.VOICE_CLONING,
    StageName.SUBTITLES,
    StageName.TRIVIA,
    StageName.SEARCH_INDEX,
    StageName.FINALIZATION,
)


class ResumablePipelineRunner:
    def __init__(self, stage_handlers: Dict[StageName, StageHandler]) -> None:
        missing = [name for name in PIPELINE_ORDER if name not in stage_handlers]
        if missing:
            raise ValueError(
                f"missing stage handlers for: {[n.value for n in missing]}"
            )
        self._handlers = stage_handlers

    async def run_all(self, job: IngestJob) -> None:
        """Run the full pipeline. Skip already-completed stages. Stop on failure."""
        await self._run_forward(job, start_index=0)

    async def resume(self, job: IngestJob) -> None:
        """Resume from the first stage that is not COMPLETED.

        Behaviorally identical to run_all; the distinction is semantic.
        """
        await self._run_forward(job, start_index=0)

    async def retry_stage(self, job: IngestJob, name: StageName) -> None:
        """Reset the named stage to PENDING and re-run from there forward."""
        stage = job.get_or_create_stage(name)
        stage.status = StageStatus.PENDING
        stage.error = None
        stage.started_at = None
        stage.completed_at = None

        idx = PIPELINE_ORDER.index(name)
        await self._run_forward(job, start_index=idx)

    async def retry_subtask(
        self, job: IngestJob, stage_name: StageName, subtask: str
    ) -> None:
        """Retry a single subtask within a stage.

        The handler is called with resume_subtask=<name>; it is expected
        to touch only that subtask. On success, if the stage is now fully
        complete, the runner marks the stage COMPLETED and continues
        forward through subsequent stages.
        """
        stage = job.get_or_create_stage(stage_name)
        if subtask not in stage.subtasks:
            raise ValueError(
                f"subtask {subtask!r} not found in stage {stage_name.value!r}"
            )

        # Reset the subtask's failed state
        stage.subtasks[subtask].status = StageStatus.PENDING
        stage.subtasks[subtask].error = None

        try:
            await self._handlers[stage_name](job, resume_subtask=subtask)
        except Exception as exc:
            stage.fail_subtask(subtask, str(exc))
            await job.save()
            logger.exception(
                "subtask retry failed: stage=%s subtask=%s",
                stage_name.value, subtask,
            )
            return

        # Infer stage completion after subtask handler returns
        if stage.all_subtasks_complete() and not stage.has_failed_subtasks():
            stage.mark_completed()
        elif stage.has_failed_subtasks():
            failed_count = sum(
                1 for t in stage.subtasks.values() if t.status == StageStatus.FAILED
            )
            stage.mark_failed(
                f"{failed_count} of {len(stage.subtasks)} subtasks failed"
            )
        await job.save()

        if stage.status == StageStatus.COMPLETED:
            idx = PIPELINE_ORDER.index(stage_name)
            await self._run_forward(job, start_index=idx + 1)

    async def _run_forward(self, job: IngestJob, start_index: int) -> None:
        """Run stages from start_index forward, skipping completed ones."""
        for name in PIPELINE_ORDER[start_index:]:
            stage = job.get_or_create_stage(name)
            if stage.status == StageStatus.COMPLETED:
                continue
            ok = await self._run_stage(job, name)
            if not ok:
                return

    async def _run_stage(self, job: IngestJob, name: StageName) -> bool:
        """Invoke one stage handler and update its status. Returns True on success."""
        stage = job.get_or_create_stage(name)
        stage.mark_running()
        await job.save()

        try:
            await self._handlers[name](job, resume_subtask=None)
        except Exception as exc:
            stage.mark_failed(str(exc))
            await job.save()
            logger.exception("stage %s failed for job %s", name.value, job.job_id)
            return False

        # Infer completion from subtask state (if any) or exception absence
        if stage.subtasks:
            if stage.has_failed_subtasks():
                failed_count = sum(
                    1 for t in stage.subtasks.values() if t.status == StageStatus.FAILED
                )
                stage.mark_failed(
                    f"{failed_count} of {len(stage.subtasks)} subtasks failed"
                )
                await job.save()
                return False
            if stage.all_subtasks_complete():
                stage.mark_completed()
        else:
            stage.mark_completed()

        await job.save()
        return True
