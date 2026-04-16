"""Training platform content assignment routes."""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from beanie import PydanticObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
    _parse_trial_config,
)
from app.api.routes.training.tier_gates import require_tier_or_trial
from app.models.content import Content, ProcessingState
from app.models.training_assignment import TrainingAssignment
from app.models.training_user import TrainingUser
from app.services.training.trial_service import decrement_trial_cap

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assignments", tags=["training-assignments"])

_TRIAL_FEATURE = "assignments"


class CreateAssignmentRequest(BaseModel):
    content_id: str
    assigned_to: List[str] | str = Field(
        ..., description="User IDs list or 'all'"
    )
    required: bool = False
    due_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)
    format_id: Optional[str] = None


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_assignment(
    body: CreateAssignmentRequest,
    admin: TrainingUser = Depends(require_training_admin),
    tier_result: tuple = Depends(
        require_tier_or_trial("organization", trial_feature=_TRIAL_FEATURE),
    ),
):
    """Assign content to employees.

    Rejects assignment to content whose pipeline has not completed — viewers
    cannot consume PROCESSING or FAILED content, so assigning it would create
    a dead-end experience.
    """
    _user, partner = tier_result
    try:
        content_oid = PydanticObjectId(body.content_id)
    except (InvalidId, TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )
    content = await Content.get(content_oid)
    if not content or content.partner_id != admin.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found",
        )
    if content.processing_state == ProcessingState.FAILED:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Content processing failed; retry ingest before "
                "assigning to trainees"
            ),
        )
    if content.processing_state != ProcessingState.READY:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Content is still processing; cannot assign "
                "until processing completes"
            ),
        )

    existing = await TrainingAssignment.find_one({
        "partner_id": admin.partner_id,
        "content_id": body.content_id,
    })
    if existing:
        existing.assigned_to = body.assigned_to
        existing.required = body.required
        existing.due_date = body.due_date
        existing.tags = body.tags
        existing.format_id = body.format_id
        existing.updated_at = datetime.now(timezone.utc)
        await existing.save()
        return _assignment_response(existing)

    assignment = TrainingAssignment(
        partner_id=admin.partner_id,
        content_id=body.content_id,
        assigned_to=body.assigned_to,
        required=body.required,
        due_date=body.due_date,
        tags=body.tags,
        format_id=body.format_id,
        created_by=str(admin.id),
    )
    await assignment.insert()

    # Decrement trial cap only for new assignments (not updates)
    tc = _parse_trial_config(partner)
    if tc is not None and tc.state == "active":
        ok = await decrement_trial_cap(partner.id, _TRIAL_FEATURE)
        if not ok:
            await assignment.delete()
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Trial preview cap reached for {_TRIAL_FEATURE}. Upgrade.",
            )

    return _assignment_response(assignment)


@router.get("")
async def list_assignments(
    user: TrainingUser = Depends(get_current_training_user),
):
    """List assignments. Admins see all, viewers see their own."""
    query: dict = {"partner_id": user.partner_id}
    assignments = await TrainingAssignment.find(query).to_list()

    if user.role == "viewer":
        uid = str(user.id)
        assignments = [
            a for a in assignments
            if a.assigned_to == "all"
            or (isinstance(a.assigned_to, list) and uid in a.assigned_to)
        ]

    return {
        "assignments": [_assignment_response(a) for a in assignments],
    }


@router.get("/me")
async def get_my_assignments(
    user: TrainingUser = Depends(get_current_training_user),
    content_id: Optional[str] = Query(default=None),
):
    """Get assignments for the current viewer, optionally filtered."""
    query: dict = {"partner_id": user.partner_id}
    if content_id:
        query["content_id"] = content_id

    assignments = await TrainingAssignment.find(query).to_list()

    user_id = str(user.id)
    visible = [
        a for a in assignments
        if a.assigned_to == "all"
        or (isinstance(a.assigned_to, list) and user_id in a.assigned_to)
    ]

    return {
        "assignments": [_assignment_response(a) for a in visible],
        "total": len(visible),
    }


@router.delete("/{assignment_id}")
async def delete_assignment(
    assignment_id: str,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Remove an assignment."""
    assignment = await TrainingAssignment.get(
        PydanticObjectId(assignment_id)
    )
    if not assignment or assignment.partner_id != admin.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    await assignment.delete()
    return {"deleted": True, "assignment_id": assignment_id}


def _assignment_response(a: TrainingAssignment) -> dict:
    return {"id": str(a.id), "content_id": a.content_id,
            "assigned_to": a.assigned_to, "required": a.required,
            "due_date": a.due_date.isoformat() if a.due_date else None,
            "tags": a.tags, "format_id": a.format_id,
            "created_by": a.created_by,
            "created_at": a.created_at.isoformat()}
