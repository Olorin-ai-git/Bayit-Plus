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

Persistence model (important)
-----------------------------
Beanie 2.0.1 replaces ``job.stages`` in place after every ``save()``
via ``merge_models``. Any Python reference to a nested ``StageExecution``
is orphaned across a save boundary. To avoid silent data loss, the
runner:

1. Never holds a ``StageExecution`` reference across ``job.save()``.
2. Re-acquires the stage via ``job.get_or_create_stage()`` after each
   save, or delegates mutation to ``IngestJob.*`` atomic mutator
   methods that contain the lifetime inside a single method body.
3. Reads stage state BEFORE issuing any save that could orphan the
   reference, captures primitives (status, subtask counts), and acts on
   the primitives afterwards.

Violating this discipline causes the symptoms observed in the 2026-04-10
Task 20 silent-failure incident: DB shows all stages RUNNING with no
completion timestamps, even though handlers have run and mutated the
in-memory copy.
"""
import logging
from typing import Awaitable, Callable, Dict

from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName, StageStatus

logger = logging.getLogger(__name__)

StageHandler = Callable[..., Awaitable[None]]

# Declaration order IS the execution order.
PIPELINE_ORDER = (
    StageName.TRANSCRIPTION,
    StageName.CHARACTER_EXTRACTION,
    StageName.SUBTITLES,
    StageName.FACE_EXTRACTION,
    StageName.VOICE_CLONING,
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
        """Re-run a stage from scratch, then continue forward.

        Status is left as FAILED (not reset to PENDING) so that
        mark_running() inside _run_stage correctly detects a retry and
        increments retry_count. Stale error/timestamps/subtasks are
        cleared so they reflect only the new attempt.
        """
        await job.reset_stage_for_retry(name)
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
        await job.reset_subtask_for_retry(stage_name, subtask)

        try:
            await self._handlers[stage_name](job, resume_subtask=subtask)
        except Exception as exc:
            await job.fail_stage_subtask(stage_name, subtask, str(exc))
            await job.mark_stage_failed(stage_name, str(exc))
            logger.exception(
                "subtask retry failed: stage=%s subtask=%s",
                stage_name.value, subtask,
            )
            return

        # Re-read stage state (the handler may have done its own saves).
        stage = job.get_or_create_stage(stage_name)
        if stage.all_subtasks_complete() and not stage.has_failed_subtasks():
            await job.mark_stage_completed(stage_name)
        elif stage.has_failed_subtasks():
            failed_count = sum(
                1 for t in stage.subtasks.values() if t.status == StageStatus.FAILED
            )
            await job.mark_stage_failed(
                stage_name,
                f"{failed_count} of {len(stage.subtasks)} subtasks failed",
            )

        # Re-acquire after the save above; check status on fresh instance.
        if job.get_or_create_stage(stage_name).status == StageStatus.COMPLETED:
            idx = PIPELINE_ORDER.index(stage_name)
            await self._run_forward(job, start_index=idx + 1)

    async def _run_forward(self, job: IngestJob, start_index: int) -> None:
        """Run stages from start_index forward, skipping completed ones."""
        for name in PIPELINE_ORDER[start_index:]:
            if job.get_or_create_stage(name).status == StageStatus.COMPLETED:
                continue
            ok = await self._run_stage(job, name)
            if not ok:
                return

    async def _run_stage(self, job: IngestJob, name: StageName) -> bool:
        """Invoke one stage handler and update its status. Returns True on success.

        Does NOT hold a ``StageExecution`` reference across any save.
        Uses ``job.mark_stage_*`` atomic mutators instead.
        """
        retry_count = job.get_or_create_stage(name).retry_count
        logger.info(
            "stage %s starting (job=%s retry_count=%d)",
            name.value, job.job_id, retry_count,
        )
        await job.mark_stage_running(name)

        try:
            await self._handlers[name](job, resume_subtask=None)
        except Exception as exc:
            await job.mark_stage_failed(name, str(exc))
            logger.exception("stage %s failed for job %s", name.value, job.job_id)
            return False

        # Re-read stage state after the handler (it may have mutated
        # subtasks via its own atomic saves, which orphaned any earlier
        # reference on this frame).
        stage = job.get_or_create_stage(name)

        if stage.subtasks:
            if stage.has_failed_subtasks():
                failed_count = sum(
                    1 for t in stage.subtasks.values() if t.status == StageStatus.FAILED
                )
                await job.mark_stage_failed(
                    name,
                    f"{failed_count} of {len(stage.subtasks)} subtasks failed",
                )
                return False
            if stage.all_subtasks_complete():
                await job.mark_stage_completed(name)
            else:
                non_terminal = [
                    t_name for t_name, t in stage.subtasks.items()
                    if t.status not in (StageStatus.COMPLETED, StageStatus.FAILED)
                ]
                await job.mark_stage_failed(
                    name,
                    f"handler returned with subtasks in non-terminal state: {non_terminal}",
                )
                return False
        else:
            await job.mark_stage_completed(name)

        final = job.get_or_create_stage(name).status
        if final == StageStatus.COMPLETED:
            logger.info("stage %s completed (job=%s)", name.value, job.job_id)
        return final == StageStatus.COMPLETED
