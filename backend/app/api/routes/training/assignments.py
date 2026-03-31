"""Training platform content assignment routes."""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
)
from app.models.training_assignment import TrainingAssignment
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assignments", tags=["training-assignments"])


class CreateAssignmentRequest(BaseModel):
    content_id: str
    assigned_to: List[str] | str = Field(
        ..., description="User IDs list or 'all'"
    )
    required: bool = False
    due_date: Optional[datetime] = None
    tags: List[str] = Field(default_factory=list)


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_assignment(
    body: CreateAssignmentRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Assign content to employees."""
    existing = await TrainingAssignment.find_one({
        "partner_id": admin.partner_id,
        "content_id": body.content_id,
    })
    if existing:
        existing.assigned_to = body.assigned_to
        existing.required = body.required
        existing.due_date = body.due_date
        existing.tags = body.tags
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
        created_by=str(admin.id),
    )
    await assignment.insert()
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
    return {
        "id": str(a.id),
        "content_id": a.content_id,
        "assigned_to": a.assigned_to,
        "required": a.required,
        "due_date": a.due_date.isoformat() if a.due_date else None,
        "tags": a.tags,
        "created_by": a.created_by,
        "created_at": a.created_at.isoformat(),
    }
