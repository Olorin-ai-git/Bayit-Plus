"""Training platform team management routes."""

import logging
from datetime import datetime, timezone
from typing import Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.api.routes.training.dependencies import require_training_admin
from app.models.training_user import TrainingUser

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/team", tags=["training-team"])


class UpdateMemberRequest(BaseModel):
    role: Optional[str] = None
    department: Optional[str] = None
    display_name: Optional[str] = None


@router.get("")
async def list_team(
    admin: TrainingUser = Depends(require_training_admin),
    department: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
):
    """List organization's employees with optional filters."""
    query: dict = {"partner_id": admin.partner_id}
    if department:
        query["department"] = department
    if status_filter:
        query["status"] = status_filter

    members = await TrainingUser.find(query).sort("display_name").to_list()

    departments = list({
        m.department for m in members if m.department
    })

    return {
        "members": [_member_response(m) for m in members],
        "total": len(members),
        "departments": sorted(departments),
    }


@router.put("/{user_id}")
async def update_member(
    user_id: str,
    body: UpdateMemberRequest,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Update an employee's role, department, or display name."""
    member = await TrainingUser.get(PydanticObjectId(user_id))
    if not member or member.partner_id != admin.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    if str(member.id) == str(admin.id) and body.role == "viewer":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot demote yourself",
        )

    if body.role is not None:
        member.role = body.role  # type: ignore[assignment]
    if body.department is not None:
        member.department = body.department
    if body.display_name is not None:
        member.display_name = body.display_name

    member.updated_at = datetime.now(timezone.utc)
    await member.save()
    return _member_response(member)


@router.delete("/{user_id}")
async def deactivate_member(
    user_id: str,
    admin: TrainingUser = Depends(require_training_admin),
):
    """Deactivate an employee (soft delete)."""
    member = await TrainingUser.get(PydanticObjectId(user_id))
    if not member or member.partner_id != admin.partner_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found",
        )

    if str(member.id) == str(admin.id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate yourself",
        )

    member.status = "deactivated"
    member.updated_at = datetime.now(timezone.utc)
    await member.save()
    return {"deactivated": True, "user_id": user_id}


def _member_response(m: TrainingUser) -> dict:
    return {
        "id": str(m.id),
        "email": m.email,
        "role": m.role,
        "display_name": m.display_name,
        "department": m.department,
        "status": m.status,
        "invited_at": m.invited_at.isoformat() if m.invited_at else None,
        "activated_at": (
            m.activated_at.isoformat() if m.activated_at else None
        ),
        "last_login_at": (
            m.last_login_at.isoformat() if m.last_login_at else None
        ),
    }
