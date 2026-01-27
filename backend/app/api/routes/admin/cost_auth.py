"""Authorization and security utilities for cost dashboard endpoints."""

import hashlib
import logging
from typing import Optional

from fastapi import Depends, HTTPException, Request
from app.core.logging_config import get_logger
from app.models.admin import Permission, Role, AuditLog, AuditAction
from app.models.user import User

logger = get_logger(__name__)


async def require_cost_read_permission(
    user: User = Depends(),
) -> User:
    """
    Require BILLING_READ permission to access cost data.

    Raises:
        HTTPException: If user lacks permission
    """
    # Check if user has billing:read permission
    required_perms = {Permission.BILLING_READ, Permission.ANALYTICS_READ}
    user_perms = set(user.custom_permissions or [])

    # SUPER_ADMIN has all permissions
    if user.role == Role.SUPER_ADMIN:
        return user

    # BILLING_ADMIN has billing permissions
    if user.role == Role.BILLING_ADMIN:
        return user

    # Check custom permissions for ADMIN role
    if user.role == Role.ADMIN:
        if Permission.BILLING_READ in user_perms:
            return user

    logger.warning(
        "UNAUTHORIZED_ACCESS_ATTEMPT",
        extra={
            "user_id": user.id,
            "resource": "cost_data",
            "reason": "insufficient_permission",
        },
    )

    raise HTTPException(
        status_code=403,
        detail="Insufficient permissions to access cost data",
    )


async def require_per_user_cost_access(
    user_id: str,
    request: Request,
    current_user: User = Depends(require_cost_read_permission),
) -> tuple[User, str]:
    """
    Authorize per-user cost data access.

    Validates:
    - User has billing:read permission (checked in require_cost_read_permission)
    - User owns the data OR is super_admin OR is billing_admin for same tenant

    Raises:
        HTTPException: If user not authorized for this user_id
    """
    # SUPER_ADMIN can view all users
    if current_user.role == Role.SUPER_ADMIN:
        await _log_cost_access(
            current_user.id,
            "per_user_breakdown",
            f"user_id:{user_id}",
            {"authorized_by": "super_admin"},
            request,
        )
        return current_user, user_id

    # Can only view own costs
    if current_user.id == user_id:
        await _log_cost_access(
            current_user.id,
            "per_user_breakdown",
            f"user_id:{user_id}",
            {"authorized_by": "user_ownership"},
            request,
        )
        return current_user, user_id

    # BILLING_ADMIN can view users in assigned tenants
    if current_user.role == Role.BILLING_ADMIN:
        # TODO: Check if user_id belongs to current_user's assigned tenants
        # For now, deny access to other users
        pass

    # Log unauthorized attempt
    await _log_cost_access_denied(
        current_user.id,
        f"user_id:{user_id}",
        "unauthorized_user_scope",
        request,
    )

    raise HTTPException(
        status_code=403,
        detail=f"Not authorized to view costs for user {user_id}",
    )


async def require_top_spenders_permission(
    current_user: User = Depends(require_cost_read_permission),
) -> User:
    """
    Require SUPER_ADMIN for top spenders endpoint.

    Top spenders data is sensitive and only available to super admins.
    """
    if current_user.role != Role.SUPER_ADMIN:
        logger.warning(
            "TOP_SPENDERS_UNAUTHORIZED_ACCESS",
            extra={"user_id": current_user.id, "role": current_user.role},
        )
        raise HTTPException(
            status_code=403,
            detail="Only super admins can view top spenders data",
        )

    return current_user


def hash_user_id(user_id: str) -> str:
    """Hash user ID for privacy (shows in top spenders list)."""
    return hashlib.sha256(user_id.encode()).hexdigest()[:16]


def aggregate_cost_range(amount: float) -> str:
    """Convert exact cost to range for privacy."""
    ranges = [
        (0, 10, "0-10 USD"),
        (10, 20, "10-20 USD"),
        (20, 50, "20-50 USD"),
        (50, 100, "50-100 USD"),
        (100, 500, "100-500 USD"),
        (500, float("inf"), "500+ USD"),
    ]
    for min_val, max_val, label in ranges:
        if min_val <= amount < max_val:
            return label
    return "500+ USD"


async def _log_cost_access(
    user_id: str,
    action: str,
    scope: str,
    details: dict,
    request: Request,
) -> None:
    """Log authorized cost data access."""
    log_entry = AuditLog(
        user_id=user_id,
        action=AuditAction.BILLING_READ,
        resource_type="cost_data",
        resource_id=scope,
        details={
            "action": action,
            "scope": scope,
            **details,
        },
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    await log_entry.insert()

    logger.info(
        "COST_DATA_ACCESSED",
        extra={
            "user_id": user_id,
            "action": action,
            "scope": scope,
            "ip": request.client.host if request.client else None,
        },
    )


async def _log_cost_access_denied(
    user_id: str,
    requested_scope: str,
    reason: str,
    request: Request,
) -> None:
    """Log unauthorized cost data access attempt."""
    logger.warning(
        "COST_ACCESS_DENIED",
        extra={
            "user_id": user_id,
            "requested_scope": requested_scope,
            "reason": reason,
            "ip": request.client.host if request.client else None,
        },
    )
