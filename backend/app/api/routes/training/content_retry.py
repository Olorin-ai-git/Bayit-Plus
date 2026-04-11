"""Training platform content pipeline retry routes."""

import logging
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status

from app.api.routes.training.content_utils import load_content_for_partner
from app.api.routes.training.dependencies import require_training_admin
from app.models.content import ProcessingState
from app.models.ingest_job import IngestJob
from app.models.pipeline_stage import StageName
from app.models.training_user import TrainingUser
from app.services.olorin.ingest_orchestrator import (
    resume_pipeline,
    retry_stage,
    retry_subtask,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/content", tags=["training-content"])


@router.post("/{content_id}/retry", status_code=status.HTTP_202_ACCEPTED)
async def retry_content_ingest(
    content_id: str,
    background_tasks: BackgroundTasks,
    stage: Optional[str] = Query(
        default=None,
        description="Retry a specific pipeline stage (e.g. 'voice_cloning'). "
        "When omitted, resumes from the first non-completed stage.",
    ),
    subtask: Optional[str] = Query(
        default=None,
        description="Retry a single subtask within a stage (e.g. one "
        "character's voice clone). Requires stage to also be set.",
    ),
    admin: TrainingUser = Depends(require_training_admin),
):
    """Re-run the AI pipeline on a failed content item.

    Dispatch strategy based on query params:

    - No params: resume the existing job from its first non-completed stage.
    - ``stage=X``: reset stage X and run forward from there.
    - ``stage=X&subtask=Y``: retry a single subtask inside stage X, leaving
      sibling subtasks untouched.
    """
    if subtask and not stage:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="subtask query param requires stage to also be specified",
        )

    content = await load_content_for_partner(content_id, admin.partner_id)

    job = await IngestJob.find_one(
        {"content_id": content_id}, sort=[("created_at", -1)],
    )
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No ingest job found for this content; cannot retry",
        )

    stage_enum: Optional[StageName] = None
    if stage is not None:
        try:
            stage_enum = StageName(stage)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown pipeline stage: {stage!r}",
            )

    # Flip content state back to PROCESSING immediately so the admin UI
    # reflects the retry before the background task completes. The
    # orchestrator's _sync_content_state will settle the final state
    # (READY / FAILED) once the runner returns.
    content.processing_state = ProcessingState.PROCESSING
    await content.save()

    # Reset per-capability statuses so ``job.overall_status`` returns
    # "processing" during the retry run. Without this reset the list
    # endpoint would keep mapping the content's display ``status`` to
    # "failed" (driven by the stale capabilities dict) and the detail
    # page's progress banner would fight with a "failed" badge in the
    # list. Only the scoped retry paths get a selective reset; a full
    # ``resume_pipeline`` run resets all four to match the fresh attempt.
    if stage_enum is None and subtask is None:
        job.capabilities = {cap: "pending" for cap in job.capabilities}
        job.error_detail = None
        await job.save()

    if stage_enum is not None and subtask is not None:
        background_tasks.add_task(retry_subtask, job, stage_enum, subtask)
    elif stage_enum is not None:
        background_tasks.add_task(retry_stage, job, stage_enum)
    else:
        background_tasks.add_task(resume_pipeline, job)

    return {
        "job_id": job.job_id,
        "content_id": content_id,
        "status": "processing",
    }
