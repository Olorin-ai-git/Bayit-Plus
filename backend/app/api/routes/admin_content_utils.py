"""
Shared utilities for admin content management routes.
Includes RBAC, logging, and common response models.
"""

from typing import List, Optional
from fastapi import Depends, HTTPException, status, Request
from pydantic import BaseModel

from app.models.user import User
from app.models.admin import Permission, AuditLog, AuditAction
from app.core.security import get_current_active_user


def has_permission(required_permission: Permission):
    """Dependency to check if user has required permission."""
    async def permission_checker(current_user: User = Depends(get_current_active_user)):
        role = current_user.role
        if role not in ["super_admin", "admin"]:
            if required_permission.value not in current_user.custom_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {required_permission.value} required"
                )
        return current_user
    return permission_checker


async def log_audit(
    user_id: str,
    action: AuditAction,
    resource_type: str,
    resource_id: Optional[str] = None,
    details: dict = None,
    request: Request = None,
):
    """Create an audit log entry."""
    # Safely extract IP address (request.client can be None in some contexts)
    ip_address = None
    user_agent = None
    if request:
        if request.client:
            ip_address = request.client.host
        user_agent = request.headers.get("user-agent")

    log = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        details=details or {},
        ip_address=ip_address,
        user_agent=user_agent,
    )
    await log.insert()


class PaginatedResponse(BaseModel):
    """Standard paginated response model."""
    items: List
    total: int
    page: int
    page_size: int
    total_pages: int
