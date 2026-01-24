"""
Librarian audit endpoints.

Handles audit triggering, reports, actions, and audit control.
"""

import asyncio
import logging
from datetime import datetime
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import (APIRouter, BackgroundTasks, Depends, Header,
                     HTTPException, status)

from app.api.routes.admin import require_admin
from app.api.routes.librarian.models import (ActionResponse,
                                             AuditReportResponse,
                                             InterjectMessageRequest,
                                             InterjectMessageResponse,
                                             TriggerAuditRequest,
                                             TriggerAuditResponse)
from app.api.routes.librarian.utils import run_audit_with_tracking
from app.models.content import Content
from app.models.librarian import AuditReport, LibrarianAction
from app.models.user import User
from app.services.ai_agent_service import run_ai_agent_audit
from app.services.audit_task_manager import audit_task_manager
from app.services.auto_fixer import rollback_action
from app.services.librarian_service import run_daily_audit

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/internal/librarian/scheduled-audit", response_model=TriggerAuditResponse)
async def trigger_scheduled_audit(
    request: TriggerAuditRequest,
    background_tasks: BackgroundTasks,
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
        if request.use_ai_agent or request.audit_type == "ai_agent":
            background_tasks.add_task(
                run_ai_agent_audit,
                audit_type="ai_agent",
                dry_run=request.dry_run,
                max_iterations=request.max_iterations,
                budget_limit_usd=request.budget_limit_usd,
            )

            return TriggerAuditResponse(
                audit_id="running",
                status="started",
                message=f"🤖 AI Agent audit started (autonomous mode, {'DRY RUN' if request.dry_run else 'LIVE'}). Claude will decide what to check and fix. Check back soon for results.",
            )
        else:
            valid_types = ["daily_incremental", "weekly_full", "manual"]
            if request.audit_type not in valid_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid audit_type. Must be one of: {', '.join(valid_types + ['ai_agent'])}",
                )

            background_tasks.add_task(
                run_daily_audit, audit_type=request.audit_type, dry_run=request.dry_run
            )

            return TriggerAuditResponse(
                audit_id="running",
                status="started",
                message=f"Librarian audit started ({request.audit_type}, rule-based mode). Check back soon for results.",
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger audit: {str(e)}",
        )


@router.post("/admin/librarian/run-audit", response_model=TriggerAuditResponse)
async def trigger_librarian_audit(
    request: TriggerAuditRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin()),
    accept_language: Optional[str] = Header(None, alias="Accept-Language"),
):
    """
    Trigger a librarian audit.

    Two modes available:
    1. Rule-based (default): Pre-programmed workflow with AI-assisted analysis
    2. AI Agent (use_ai_agent=True): Fully autonomous AI agent using Claude's tool use
    """
    try:
        language = "en"
        if accept_language:
            language = accept_language.split(",")[0].split("-")[0].lower()
            if language not in ["en", "es", "he"]:
                language = "en"

        audit = AuditReport(
            audit_date=datetime.utcnow(),
            audit_type=request.audit_type if not request.use_ai_agent else "ai_agent",
            status="in_progress",
            execution_time_seconds=0,
            metadata={
                "dry_run": request.dry_run,
                "use_ai_agent": request.use_ai_agent
                or request.audit_type == "ai_agent",
                "language": language,
                "last_24_hours_only": request.last_24_hours_only,
                "validate_integrity": request.validate_integrity,
                "cyb_titles_only": request.cyb_titles_only,
                "tmdb_posters_only": request.tmdb_posters_only,
                "opensubtitles_enabled": request.opensubtitles_enabled,
                "classify_only": request.classify_only,
                "remove_duplicates": request.remove_duplicates,
            },
        )
        await audit.save()
        audit_id = audit.audit_id

        if request.use_ai_agent or request.audit_type == "ai_agent":
            task = asyncio.create_task(
                run_audit_with_tracking(
                    audit_id=audit_id,
                    audit_func=run_ai_agent_audit,
                    audit_type="ai_agent",
                    dry_run=request.dry_run,
                    max_iterations=request.max_iterations,
                    budget_limit_usd=request.budget_limit_usd,
                    language=language,
                    last_24_hours_only=request.last_24_hours_only,
                    validate_integrity=request.validate_integrity,
                    cyb_titles_only=request.cyb_titles_only,
                    tmdb_posters_only=request.tmdb_posters_only,
                    opensubtitles_enabled=request.opensubtitles_enabled,
                    classify_only=request.classify_only,
                    remove_duplicates=request.remove_duplicates,
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
                    detail=f"Invalid audit_type. Must be one of: {', '.join(valid_types + ['ai_agent'])}",
                )

            task = asyncio.create_task(
                run_audit_with_tracking(
                    audit_id=audit_id,
                    audit_func=run_daily_audit,
                    audit_type=request.audit_type,
                    dry_run=request.dry_run,
                    language=language,
                    last_24_hours_only=request.last_24_hours_only,
                    cyb_titles_only=request.cyb_titles_only,
                    tmdb_posters_only=request.tmdb_posters_only,
                    opensubtitles_enabled=request.opensubtitles_enabled,
                )
            )
            audit_task_manager.register_task(audit_id, task)

            return TriggerAuditResponse(
                audit_id=audit_id,
                status="started",
                message=f"Librarian audit started ({request.audit_type}, rule-based mode). Check back soon for results.",
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger audit: {str(e)}",
        )


@router.get("/admin/librarian/reports", response_model=List[AuditReportResponse])
async def get_audit_reports(
    limit: int = 10,
    audit_type: Optional[str] = None,
    current_user: User = Depends(require_admin()),
):
    """Get recent audit reports."""
    try:
        query = {}
        if audit_type:
            query["audit_type"] = audit_type

        reports = (
            await AuditReport.find(query)
            .sort([("audit_date", -1)])
            .limit(limit)
            .to_list()
        )

        audit_ids = [r.audit_id for r in reports]
        action_counts = {}

        for audit_id in audit_ids:
            count = await LibrarianAction.find({"audit_id": audit_id}).count()
            action_counts[audit_id] = count

        return [
            AuditReportResponse(
                audit_id=report.audit_id,
                audit_date=report.audit_date,
                audit_type=report.audit_type,
                execution_time_seconds=report.execution_time_seconds,
                status=report.status,
                summary=report.summary,
                content_results=report.content_results,
                issues_count=action_counts.get(report.audit_id, 0),
                fixes_count=action_counts.get(report.audit_id, 0),
            )
            for report in reports
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reports: {str(e)}",
        )


@router.get("/admin/librarian/reports/{audit_id}")
async def get_audit_report_detail(
    audit_id: str, current_user: User = Depends(require_admin())
):
    """Get detailed audit report by ID."""
    try:
        report = await AuditReport.find_one({"audit_id": audit_id})

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Audit report not found"
            )

        return {
            "audit_id": report.audit_id,
            "audit_date": report.audit_date,
            "audit_type": report.audit_type,
            "execution_time_seconds": report.execution_time_seconds,
            "status": report.status,
            "summary": report.summary,
            "content_results": report.content_results,
            "live_channel_results": report.live_channel_results,
            "podcast_results": report.podcast_results,
            "radio_results": report.radio_results,
            "broken_streams": report.broken_streams,
            "missing_metadata": report.missing_metadata,
            "misclassifications": report.misclassifications,
            "orphaned_items": report.orphaned_items,
            "fixes_applied": report.fixes_applied,
            "manual_review_needed": report.manual_review_needed,
            "database_health": report.database_health,
            "ai_insights": report.ai_insights,
            "execution_logs": report.execution_logs,
            "created_at": report.created_at,
            "completed_at": report.completed_at,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch report: {str(e)}",
        )


@router.delete("/admin/librarian/reports")
async def clear_audit_reports(current_user: User = Depends(require_admin())):
    """Clear all audit reports from the database."""
    try:
        result = await AuditReport.find_all().delete()
        deleted_count = result.deleted_count if hasattr(result, "deleted_count") else 0

        return {
            "deleted_count": deleted_count,
            "message": f"Successfully cleared {deleted_count} audit report(s)",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear audit reports: {str(e)}",
        )


@router.get("/admin/librarian/actions", response_model=List[ActionResponse])
async def get_librarian_actions(
    audit_id: Optional[str] = None,
    action_type: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(require_admin()),
):
    """Get librarian actions/fixes."""
    try:
        query = {}
        if audit_id:
            query["audit_id"] = audit_id
        if action_type:
            query["action_type"] = action_type

        actions = (
            await LibrarianAction.find(query)
            .sort([("timestamp", -1)])
            .limit(limit)
            .to_list()
        )

        content_ids = [action.content_id for action in actions]
        contents = await Content.find({"_id": {"$in": content_ids}}).to_list()
        content_title_map = {str(content.id): content.title for content in contents}

        return [
            ActionResponse(
                action_id=action.action_id,
                audit_id=action.audit_id,
                timestamp=action.timestamp,
                action_type=action.action_type,
                content_id=action.content_id,
                content_type=action.content_type,
                issue_type=action.issue_type,
                description=action.description,
                before_state=action.before_state or {},
                after_state=action.after_state or {},
                confidence_score=action.confidence_score,
                auto_approved=action.auto_approved,
                rolled_back=action.rolled_back,
                content_title=content_title_map.get(action.content_id),
            )
            for action in actions
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch actions: {str(e)}",
        )


@router.post("/admin/librarian/actions/{action_id}/rollback")
async def rollback_librarian_action(
    action_id: str, current_user: User = Depends(require_admin())
):
    """Rollback a specific librarian action."""
    try:
        result = await rollback_action(action_id)

        if result.success:
            return {"success": True, "message": "Action rolled back successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error_message or "Rollback failed",
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rollback action: {str(e)}",
        )


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
