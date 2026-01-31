"""Internal scheduler endpoint for automated audits."""
import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Header, HTTPException, status

from app.api.routes.librarian.models import TriggerAuditRequest, TriggerAuditResponse
from app.api.routes.librarian.utils import run_audit_with_tracking
from app.models.librarian import AuditReport
from app.services.ai_agent_service import run_ai_agent_audit
from app.services.audit_task_manager import audit_task_manager
from app.services.librarian_service import run_daily_audit
from ._helpers import _try_reapply_from_recent_audit

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/internal/librarian/scheduled-audit", response_model=TriggerAuditResponse)
async def trigger_scheduled_audit(
    request: TriggerAuditRequest,
    user_agent: Optional[str] = Header(None),
):
    """
    Internal endpoint for Cloud Scheduler to trigger audits.
    Does not require admin authentication - validates request is from Cloud Scheduler.
    """
    if not user_agent or "Google-Cloud-Scheduler" not in user_agent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint can only be called by Google Cloud Scheduler",
        )

    try:
        # First, try to reapply fixes from most recent audit (no LLM needed)
        reapply_result = None
        if request.reapply_first:
            reapply_result = await _try_reapply_from_recent_audit(request.dry_run)
            if reapply_result and reapply_result.get("fixes_applied", 0) > 0:
                logger.info(
                    f"Reapply phase completed: {reapply_result.get('fixes_applied', 0)} fixes applied"
                )

        # Create audit record for the main scan
        audit = AuditReport(
            audit_date=datetime.utcnow(),
            audit_type=request.audit_type if not request.use_ai_agent else "ai_agent",
            status="in_progress",
            execution_time_seconds=0,
            metadata={
                "dry_run": request.dry_run,
                "use_ai_agent": request.use_ai_agent or request.audit_type == "ai_agent",
                "triggered_by": "cloud_scheduler",
                "reapply_result": reapply_result,
            },
        )
        await audit.save()
        audit_id = audit.audit_id

        if request.use_ai_agent or request.audit_type == "ai_agent":
            # Use asyncio.create_task for proper async execution
            task = asyncio.create_task(
                run_audit_with_tracking(
                    audit_id=audit_id,
                    audit_func=run_ai_agent_audit,
                    audit_type="ai_agent",
                    dry_run=request.dry_run,
                    max_iterations=request.max_iterations,
                    budget_limit_usd=request.budget_limit_usd,
                )
            )
            audit_task_manager.register_task(audit_id, task)

            return TriggerAuditResponse(
                audit_id=audit_id,
                status="started",
                message=f"🤖 AI Agent audit started (autonomous mode, {'DRY RUN' if request.dry_run else 'LIVE'}). Claude will decide what to check and fix. Check back soon for results.",
            )
        else:
            valid_types = ["daily_incremental", "weekly_full", "manual"]
            if request.audit_type not in valid_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid audit_type: {request.audit_type}. Must be one of {valid_types}",
                )

            # Use asyncio.create_task for proper async execution
            task = asyncio.create_task(
                run_audit_with_tracking(
                    audit_id=audit_id,
                    audit_func=run_daily_audit,
                    audit_type=request.audit_type,
                    dry_run=request.dry_run,
                    max_fixes=request.max_fixes,
                )
            )
            audit_task_manager.register_task(audit_id, task)

            return TriggerAuditResponse(
                audit_id=audit_id,
                status="started",
                message=f"📋 Daily audit started ({'DRY RUN' if request.dry_run else 'LIVE'}). Check back soon for results.",
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to trigger scheduled audit: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start audit: {str(e)}",
        )
