"""Audit control endpoints (pause, resume, cancel)."""
import logging

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.admin import require_admin
from app.models.librarian import AuditReport
from app.models.user import User
from app.services.audit_task_manager import audit_task_manager

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/admin/librarian/audits/{audit_id}/pause")
async def pause_audit(audit_id: str, current_user: User = Depends(require_admin())):
    """Pause a running audit."""
    try:
        try:
            object_id = PydanticObjectId(audit_id)
            audit = await AuditReport.get(object_id)
        except Exception:
            audit = await AuditReport.find_one({"audit_id": audit_id})

        if not audit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Audit not found"
            )

        if audit.status not in ["in_progress", "running"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot pause audit with status: {audit.status}",
            )

        success = await audit_task_manager.pause_task(audit_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Running audit task not found",
            )

        audit.status = "paused"
        await audit.save()

        return {"status": "paused", "message": "Audit paused successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pause audit: {str(e)}",
        )


@router.post("/admin/librarian/audits/{audit_id}/resume")
async def resume_audit(audit_id: str, current_user: User = Depends(require_admin())):
    """Resume a paused audit."""
    try:
        try:
            object_id = PydanticObjectId(audit_id)
            audit = await AuditReport.get(object_id)
        except Exception:
            audit = await AuditReport.find_one({"audit_id": audit_id})

        if not audit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Audit not found"
            )

        if audit.status != "paused":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot resume audit with status: {audit.status}",
            )

        success = await audit_task_manager.resume_task(audit_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Paused audit task not found",
            )

        audit.status = "in_progress"
        await audit.save()

        return {"status": "resumed", "message": "Audit resumed successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resume audit: {str(e)}",
        )


@router.post("/admin/librarian/audits/{audit_id}/cancel")
async def cancel_audit(audit_id: str, current_user: User = Depends(require_admin())):
    """Cancel a running or paused audit."""
    try:
        try:
            object_id = PydanticObjectId(audit_id)
            audit = await AuditReport.get(object_id)
        except Exception:
            audit = await AuditReport.find_one({"audit_id": audit_id})

        if not audit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Audit not found"
            )

        if audit.status in ["completed", "failed", "cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel audit with status: {audit.status}",
            )

        await audit_task_manager.cancel_task(audit_id)

        audit.status = "cancelled"
        await audit.save()

        return {"status": "cancelled", "message": "Audit cancelled successfully"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel audit: {str(e)}",
        )


@router.post(
