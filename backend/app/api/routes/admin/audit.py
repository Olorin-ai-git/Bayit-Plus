"""
Admin Audit Logs
Endpoints for viewing and exporting audit logs
"""

from datetime import datetime
from typing import Optional

from app.models.admin import AuditAction, AuditLog, Permission
from app.models.user import User
from fastapi import APIRouter, Depends, Query

from .auth import has_permission

router = APIRouter()


# ============ AUDIT LOGS ENDPOINTS ============


@router.get("/logs")
async def get_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    user_id: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, le=200),
    current_user: User = Depends(has_permission(Permission.SYSTEM_LOGS)),
):
    """Get audit logs with filtering."""
    query = AuditLog.find()

    if action:
        query = query.find(AuditLog.action == AuditAction(action))
    if resource_type:
        query = query.find(AuditLog.resource_type == resource_type)
    if user_id:
        query = query.find(AuditLog.user_id == user_id)
    if start_date:
        query = query.find(AuditLog.created_at >= start_date)
    if end_date:
        query = query.find(AuditLog.created_at <= end_date)

    total = await query.count()
    skip = (page - 1) * page_size
    logs = await query.sort(-AuditLog.created_at).skip(skip).limit(page_size).to_list()

    return {
        "items": [
            {
                "id": str(log.id),
                "user_id": log.user_id,
                "action": log.action.value,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/logs/export")
async def export_audit_logs(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    current_user: User = Depends(has_permission(Permission.SYSTEM_LOGS)),
):
    """Export audit logs as JSON."""
    query = AuditLog.find()

    if start_date:
        query = query.find(AuditLog.created_at >= start_date)
    if end_date:
        query = query.find(AuditLog.created_at <= end_date)

    logs = await query.sort(-AuditLog.created_at).to_list()

    return {
        "logs": [
            {
                "id": str(log.id),
                "user_id": log.user_id,
                "action": log.action.value,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "details": log.details,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        "exported_at": datetime.utcnow().isoformat(),
        "exported_by": str(current_user.id),
        "total_records": len(logs),
    }
