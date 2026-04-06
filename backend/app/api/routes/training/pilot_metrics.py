"""Pilot metrics endpoint for training portal export (D-06).

GET /api/v1/training/pilot-metrics returns aggregated pilot session
and turn data as JSON. Protected by teacher/admin auth (T-04-04).
"""
import dataclasses

from fastapi import APIRouter, Depends, Query

from app.api.routes.training.dependencies import (
    require_training_teacher_or_admin,
)
from app.models.training_user import TrainingUser
from app.services.olorin.comprehension.pilot_metrics import (
    compute_pilot_metrics,
)

router = APIRouter(tags=["pilot-metrics"])

DEFAULT_COHORT = "pilot_org"


@router.get(
    "/pilot-metrics",
    summary="Get pilot metrics for training-portal export button",
)
async def get_pilot_metrics(
    user: TrainingUser = Depends(require_training_teacher_or_admin),
    cohort_id: str = Query(default=DEFAULT_COHORT, description="Pilot cohort filter"),
) -> dict:
    """Return pilot metrics as JSON for the training-portal export button.

    Protected by require_training_teacher_or_admin (D-06, T-04-04).
    Defaults cohort_id to pilot_org; training-portal calls without params.
    """
    result = await compute_pilot_metrics(cohort_id=cohort_id)
    return dataclasses.asdict(result)
