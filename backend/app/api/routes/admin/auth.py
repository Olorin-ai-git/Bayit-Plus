"""
Admin RBAC (Role-Based Access Control) utilities.
Provides authentication and permission checking for admin endpoints.
"""

from typing import Optional

from app.core.security import get_current_active_user
from app.models.admin import ROLE_PERMISSIONS, AuditAction, AuditLog, Permission, Role
from app.models.user import User
from fastapi import Depends, HTTPException, Request, status


def has_permission(required_permission: Permission):
    """Dependency to check if user has required permission."""

    async def permission_checker(current_user: User = Depends(get_current_active_user)):
        role = (
            Role(current_user.role)
            if current_user.role in [r.value for r in Role]
            else Role.USER
        )
        role_permissions = ROLE_PERMISSIONS.get(role, [])
        all_permissions = list(role_permissions) + [
            Permission(p)
            for p in current_user.custom_permissions
            if p in [pe.value for pe in Permission]
        ]

        if required_permission not in all_permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {required_permission.value} required",
            )
        return current_user

    return permission_checker


def require_admin():
    """Dependency to require any admin role."""

    async def admin_checker(current_user: User = Depends(get_current_active_user)):
        if not current_user.is_admin_user():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required"
            )
        return current_user

    return admin_checker


async def log_audit(
    user_id: str,
    action: AuditAction,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: dict = None,
    request: Request = None,
):
    """Create an audit log entry."""
    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=request.client.host if request else None,
        user_agent=request.headers.get("user-agent") if request else None,
    )
    await log.insert()
