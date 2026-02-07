"""Audit interaction endpoints (interject, reapply)."""
import asyncio
import logging
from datetime import datetime

from beanie import PydanticObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.api.routes.admin import require_admin
from app.api.routes.librarian.models import (
    InterjectMessageRequest,
    InterjectMessageResponse,
    ReapplyFixesRequest,
    ReapplyFixesResponse,
)
from app.models.librarian import AuditReport
from app.models.user import User
from app.services.audit_task_manager import audit_task_manager
from ._helpers import _run_reapply_fixes

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post(
    "/admin/librarian/audits/{audit_id}/interject",
    response_model=InterjectMessageResponse,
)
async def interject_audit_message(
    audit_id: str,
    request: InterjectMessageRequest,
    current_user: User = Depends(require_admin()),
):
    """
    Inject a message into a running audit's conversation with Claude.
    """
    try:
        # Fetch audit details first
        try:
            object_id = PydanticObjectId(audit_id)
            audit = await AuditReport.get(object_id)
        except Exception:
            audit = await AuditReport.find_one({"audit_id": audit_id})

        if not audit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audit not found. It may have been deleted or cleared.",
            )

        # Check if audit is in a terminal state
        if audit.status == "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This audit has already completed. Refresh the page to see results, or start a new audit.",
            )
        elif audit.status == "failed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This audit failed before completion. Start a new audit to try again.",
            )
        elif audit.status == "cancelled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This audit was cancelled. Start a new audit to continue working.",
            )

        # Check if task is actually running
        if not audit_task_manager.is_running(audit_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This audit is no longer running. Please refresh the page to see the latest status.",
            )

        # Validate message
        if not request.message or not request.message.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Please enter a message to send to the AI agent.",
            )

        # Attempt to queue the message
        success = audit_task_manager.queue_message(
            audit_id=audit_id, message=request.message.strip(), source=request.source
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Unable to send message - the audit has finished. Please refresh the page.",
            )

        logger.info(
            f"Admin interjection queued for audit {audit_id}: {request.message[:100]}..."
        )

        return InterjectMessageResponse(
            success=True,
            message="Interjection queued successfully. It will be delivered at the next agent iteration.",
            audit_id=audit_id,
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to interject message for audit {audit_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to interject message: {str(e)}",
        )


@router.post(
    "/admin/librarian/audits/{audit_id}/reapply-fixes",
    response_model=ReapplyFixesResponse,
)
async def reapply_audit_fixes(
    audit_id: str,
    request: ReapplyFixesRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin()),
):
    """
    Reapply fixes from a completed audit without re-scanning.

    This endpoint takes the findings from a previous audit and attempts to
    reapply the fixes using the executor functions directly, without using
    the LLM for decision-making.
    """
    import uuid

    try:
        # Fetch the source audit
        audit = await AuditReport.find_one({"audit_id": audit_id})
        if not audit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audit report not found",
            )

        if audit.status not in ["completed", "partial", "failed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reapply fixes from audit with status: {audit.status}. Only completed, partial, or failed audits are supported.",
            )

        # Create a new audit ID for tracking these fixes
        fix_audit_id = f"fix-{str(uuid.uuid4())[:8]}"

        # Create a new audit record for tracking the fix operation
        fix_audit = AuditReport(
            audit_id=fix_audit_id,
            audit_date=datetime.utcnow(),
            audit_type="reapply_fixes",
            status="in_progress",
            execution_time_seconds=0,
            summary={
                "source_audit_id": audit_id,
                "dry_run": request.dry_run,
                "fix_types": request.fix_types,
            },
        )
        await fix_audit.save()

        # Run fixes in background
        task = asyncio.create_task(
            _run_reapply_fixes(
                source_audit=audit,
                fix_audit_id=fix_audit_id,
                fix_types=request.fix_types,
                dry_run=request.dry_run,
            )
        )
        audit_task_manager.register_task(fix_audit_id, task)

        return ReapplyFixesResponse(
            fix_audit_id=fix_audit_id,
            source_audit_id=audit_id,
            status="started",
            message=f"Reapplying fixes from audit {audit_id[:8]}... ({'DRY RUN' if request.dry_run else 'LIVE MODE'})",
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start reapply fixes for audit {audit_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start reapply fixes: {str(e)}",
        )