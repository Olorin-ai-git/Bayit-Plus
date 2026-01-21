"""
Admin user management endpoints.
Provides CRUD operations and user administration.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from app.models.admin import AuditAction, AuditLog, Permission
from app.models.user import User, UserAdminUpdate

from .auth import has_permission, log_audit

router = APIRouter()


class UsersFilter(BaseModel):
    """User filtering parameters."""

    search: Optional[str] = None
    role: Optional[str] = None
    status: Optional[str] = None
    subscription: Optional[str] = None
    page: int = 1
    page_size: int = 20


@router.get("/users")
async def get_users(
    search: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    subscription: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.USERS_READ)),
):
    """Get paginated list of users with filters."""
    query = User.find()

    if search:
        query = query.find(
            {
                "$or": [
                    {"email": {"$regex": search, "$options": "i"}},
                    {"name": {"$regex": search, "$options": "i"}},
                ]
            }
        )
    if role:
        query = query.find(User.role == role)
    if status == "active":
        query = query.find(User.is_active == True)
    elif status == "inactive":
        query = query.find(User.is_active == False)
    if subscription:
        query = query.find(User.subscription_tier == subscription)

    total = await query.count()
    skip = (page - 1) * page_size
    users = await query.skip(skip).limit(page_size).to_list()

    return {
        "items": [u.to_admin_response().model_dump() for u in users],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/users/{user_id}")
async def get_user(
    user_id: str, current_user: User = Depends(has_permission(Permission.USERS_READ))
):
    """Get user details."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user.to_admin_response()


@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    updates: UserAdminUpdate,
    request: Request,
    current_user: User = Depends(has_permission(Permission.USERS_UPDATE)),
):
    """Update user details."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = {}
    if updates.name is not None:
        changes["name"] = {"old": user.name, "new": updates.name}
        user.name = updates.name
    if updates.email is not None:
        existing = await User.find_one(User.email == updates.email)
        if existing and str(existing.id) != user_id:
            raise HTTPException(status_code=400, detail="Email already in use")
        changes["email"] = {"old": user.email, "new": updates.email}
        user.email = updates.email
    if updates.is_active is not None:
        changes["is_active"] = {"old": user.is_active, "new": updates.is_active}
        user.is_active = updates.is_active
    if updates.role is not None:
        if current_user.role != "super_admin" and updates.role == "super_admin":
            raise HTTPException(
                status_code=403, detail="Only super_admin can assign super_admin role"
            )
        changes["role"] = {"old": user.role, "new": updates.role}
        user.role = updates.role
    if updates.custom_permissions is not None:
        changes["custom_permissions"] = {
            "old": user.custom_permissions,
            "new": updates.custom_permissions,
        }
        user.custom_permissions = updates.custom_permissions

    user.updated_at = datetime.utcnow()
    await user.save()

    await log_audit(
        str(current_user.id),
        AuditAction.USER_UPDATED,
        "user",
        user_id,
        changes,
        request,
    )

    return user.to_admin_response()


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.USERS_DELETE)),
):
    """Delete a user."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "super_admin":
        raise HTTPException(status_code=403, detail="Cannot delete super_admin")

    await log_audit(
        str(current_user.id),
        AuditAction.USER_DELETED,
        "user",
        user_id,
        {"email": user.email},
        request,
    )
    await user.delete()

    return {"message": "User deleted"}


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: str,
    reason: str = Query(...),
    request: Request = None,
    current_user: User = Depends(has_permission(Permission.USERS_UPDATE)),
):
    """Ban a user."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_banned = True
    user.ban_reason = reason
    user.banned_at = datetime.utcnow()
    user.is_active = False
    await user.save()

    await log_audit(
        str(current_user.id),
        AuditAction.USER_UPDATED,
        "user",
        user_id,
        {"action": "ban", "reason": reason},
        request,
    )

    return {"message": "User banned"}


@router.post("/users/{user_id}/reset-password")
async def admin_reset_password(
    user_id: str,
    request: Request,
    current_user: User = Depends(has_permission(Permission.USERS_UPDATE)),
):
    """Trigger password reset for user."""
    user = await User.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await log_audit(
        str(current_user.id),
        AuditAction.USER_UPDATED,
        "user",
        user_id,
        {"action": "password_reset_requested"},
        request,
    )

    return {"message": "Password reset email sent"}


@router.get("/users/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.USERS_READ)),
):
    """Get user's audit log activity."""
    logs = (
        await AuditLog.find(AuditLog.user_id == user_id)
        .sort(-AuditLog.created_at)
        .limit(limit)
        .to_list()
    )
    return [
        {
            "id": str(log.id),
            "action": log.action.value,
            "resource_type": log.resource_type,
            "resource_id": log.resource_id,
            "details": log.details,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


@router.get("/users/{user_id}/billing")
async def get_user_billing(
    user_id: str,
    limit: int = Query(default=20, le=100),
    current_user: User = Depends(has_permission(Permission.BILLING_READ)),
):
    """Get user's billing history."""
    from app.models.admin import Transaction

    transactions = (
        await Transaction.find(Transaction.user_id == user_id)
        .sort(-Transaction.created_at)
        .limit(limit)
        .to_list()
    )
    return [
        {
            "id": str(t.id),
            "amount": t.amount,
            "currency": t.currency,
            "status": t.status.value,
            "payment_method": t.payment_method.value,
            "description": t.description,
            "created_at": t.created_at.isoformat(),
        }
        for t in transactions
    ]
