"""
Librarian audit endpoints.

Handles audit triggering, reports, actions, and audit control.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import (APIRouter, BackgroundTasks, Depends, Header,
                     HTTPException, status)

from app.api.routes.admin import require_admin
from app.api.routes.librarian.models import (ActionResponse,
                                             AuditReportResponse,
                                             InterjectMessageRequest,
                                             InterjectMessageResponse,
                                             ReapplyFixesRequest,
                                             ReapplyFixesResponse,
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
            audit_date=datetime.now(timezone.utc),
            audit_type=request.audit_type if not request.use_ai_agent else "ai_agent",
            status="in_progress",
            execution_time_seconds=0,
            metadata={
                "dry_run": request.dry_run,
                "use_ai_agent": request.use_ai_agent
                or request.audit_type == "ai_agent",
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
                    detail=f"Invalid audit_type. Must be one of: {', '.join(valid_types + ['ai_agent'])}",
                )

            task = asyncio.create_task(
                run_audit_with_tracking(
                    audit_id=audit_id,
                    audit_func=run_daily_audit,
                    audit_type=request.audit_type,
                    dry_run=request.dry_run,
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


async def _try_reapply_from_recent_audit(dry_run: bool = False) -> Optional[dict]:
    """
    Try to reapply fixes from the most recent audit that has tracked data.

    This runs WITHOUT the LLM - it directly calls executor functions for items
    that failed in previous audits and are marked as reapply_eligible.

    Returns dict with results or None if no eligible items found.
    """
    from app.services.ai_agent.issue_tracker import get_reapply_items
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_fix_missing_metadata,
        execute_fix_missing_poster,
    )
    from app.services.ai_agent.executors.metadata.titles import execute_clean_title

    try:
        # Find most recent audit with tracked data
        recent_audits = await AuditReport.find(
            {"status": {"$in": ["completed", "partial", "failed"]}}
        ).sort([("audit_date", -1)]).limit(5).to_list()

        source_audit = None
        tracked_items = []

        for audit in recent_audits:
            items = await get_reapply_items(str(audit.id))
            if items:
                source_audit = audit
                tracked_items = items
                break

        if not tracked_items:
            logger.info("No items found for reapply from recent audits")
            return None

        logger.info(
            f"Found {len(tracked_items)} items to reapply from audit {source_audit.id}"
        )

        # Apply fixes directly without LLM
        results = {"source_audit_id": str(source_audit.id), "fixes_applied": 0, "fixes_failed": 0, "details": []}

        for item in tracked_items:
            tool_name = item.get("tool_name")
            content_id = item.get("content_id")
            tool_input = item.get("tool_input", {"content_id": content_id})

            if dry_run:
                results["details"].append({"tool": tool_name, "content_id": content_id, "status": "skipped_dry_run"})
                continue

            try:
                if tool_name == "fix_missing_metadata":
                    result = await execute_fix_missing_metadata(content_id=content_id)
                elif tool_name == "fix_missing_poster":
                    result = await execute_fix_missing_poster(content_id=content_id)
                elif tool_name == "clean_title":
                    result = await execute_clean_title(content_id=content_id)
                else:
                    result = {"success": False, "error": f"Unknown tool: {tool_name}"}

                if result.get("success"):
                    results["fixes_applied"] += 1
                    results["details"].append({"tool": tool_name, "content_id": content_id, "status": "success"})
                else:
                    results["fixes_failed"] += 1
                    results["details"].append({"tool": tool_name, "content_id": content_id, "status": "failed", "error": result.get("error")})

            except Exception as e:
                results["fixes_failed"] += 1
                results["details"].append({"tool": tool_name, "content_id": content_id, "status": "error", "error": str(e)})

        logger.info(f"Reapply completed: {results['fixes_applied']} applied, {results['fixes_failed']} failed")
        return results

    except Exception as e:
        logger.error(f"Error in reapply from recent audit: {e}")
        return None


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
            audit_date=datetime.now(timezone.utc),
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
                "force_updates": request.force_updates,
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
                    force_updates=request.force_updates,
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
            audit_date=datetime.now(timezone.utc),
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


async def _run_reapply_fixes(
    source_audit: AuditReport,
    fix_audit_id: str,
    fix_types: List[str],
    dry_run: bool,
):
    """Background task to reapply fixes from an audit."""
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_fix_missing_metadata,
        execute_fix_missing_poster,
        execute_flag_for_manual_review,
    )
    from app.services.ai_agent.executors.metadata.titles import execute_clean_title
    from app.services.ai_agent.executors.series.classification import (
        execute_fix_misclassified_series,
    )
    from app.services.ai_agent.executors.subtitles import (
        execute_check_subtitle_quota,
        execute_download_external_subtitle,
    )
    from app.services.ai_agent.issue_tracker import get_reapply_items

    start_time = datetime.now(timezone.utc)
    all_stats = {}

    try:
        # First, try to get tracked issues from the original audit
        # This uses data stored by the issue_tracker during the original audit
        tracked_items = await get_reapply_items(str(source_audit.id))

        # Also check the audit's stored issue fields
        audit_issues = _extract_issues_from_audit_report(source_audit)

        # If we have tracked data from the original audit, use it
        used_tracked_data = False
        if tracked_items or any(audit_issues.values()):
            logger.info(
                f"Found tracked data from audit {source_audit.audit_id}: "
                f"{len(tracked_items)} tracked items, "
                f"{sum(len(v) for v in audit_issues.values())} from audit fields"
            )
            issues = _merge_issue_sources(tracked_items, audit_issues)
            used_tracked_data = True
        else:
            # Fallback: Scan database for items that currently have issues
            # This is less ideal but works for audits that didn't track issues
            logger.info(
                f"No tracked data in audit {source_audit.audit_id}, "
                f"falling back to database scan"
            )
            issues = await _extract_issues_from_database(limit_per_type=200)

        # Get or create the fix audit record
        fix_audit = await AuditReport.find_one({"audit_id": fix_audit_id})
        if not fix_audit:
            return

        # Apply fixes based on requested types
        if "titles" in fix_types:
            stats = await _apply_title_fixes(
                fix_audit_id, issues.get("dirty_titles", []), dry_run
            )
            all_stats["dirty_titles"] = stats
            await _log_fix_progress(fix_audit, "titles", stats)

        if "metadata" in fix_types:
            stats = await _apply_metadata_fixes(
                fix_audit_id, issues.get("missing_metadata", []), dry_run
            )
            all_stats["missing_metadata"] = stats
            await _log_fix_progress(fix_audit, "metadata", stats)

        if "posters" in fix_types:
            stats = await _apply_poster_fixes(
                fix_audit_id, issues.get("missing_posters", []), dry_run
            )
            all_stats["missing_posters"] = stats
            await _log_fix_progress(fix_audit, "posters", stats)

        if "subtitles" in fix_types:
            stats = await _apply_subtitle_fixes(
                fix_audit_id, issues.get("missing_subtitles", []), dry_run
            )
            all_stats["missing_subtitles"] = stats
            await _log_fix_progress(fix_audit, "subtitles", stats)

        if "misclassifications" in fix_types:
            stats = await _apply_misclassification_fixes(
                fix_audit_id, issues.get("misclassifications", []), dry_run
            )
            all_stats["misclassifications"] = stats
            await _log_fix_progress(fix_audit, "misclassifications", stats)

        if "broken_streams" in fix_types:
            stats = await _apply_broken_stream_fixes(
                fix_audit_id, issues.get("broken_streams", []), dry_run
            )
            all_stats["broken_streams"] = stats
            await _log_fix_progress(fix_audit, "broken_streams", stats)

        # Calculate totals
        total_attempted = sum(s.get("attempted", 0) for s in all_stats.values())
        total_success = sum(s.get("success", 0) for s in all_stats.values())
        total_failed = sum(s.get("failed", 0) for s in all_stats.values())

        # Update fix audit with results
        fix_audit.status = "completed"
        fix_audit.execution_time_seconds = (
            datetime.now(timezone.utc) - start_time
        ).total_seconds()
        fix_audit.summary = {
            "source_audit_id": source_audit.audit_id,
            "dry_run": dry_run,
            "fix_types": fix_types,
            "total_attempted": total_attempted,
            "total_success": total_success,
            "total_failed": total_failed,
            "stats_by_type": all_stats,
            "used_tracked_data": used_tracked_data,
            "note": (
                "Used tracked issues from original audit"
                if used_tracked_data
                else "Fell back to database scan (original audit had no tracked data)"
            ),
        }
        fix_audit.completed_at = datetime.now(timezone.utc)
        await fix_audit.save()

        logger.info(
            f"Reapply fixes completed for {fix_audit_id}: {total_success}/{total_attempted} successful"
        )

    except Exception as e:
        logger.error(f"Error in reapply fixes task {fix_audit_id}: {e}")
        fix_audit = await AuditReport.find_one({"audit_id": fix_audit_id})
        if fix_audit:
            fix_audit.status = "failed"
            fix_audit.summary["error"] = str(e)
            fix_audit.completed_at = datetime.now(timezone.utc)
            await fix_audit.save()


def _extract_issues_from_audit_report(audit: AuditReport) -> dict:
    """Extract tracked issues from an audit report's stored fields."""
    issues = {
        "dirty_titles": [],
        "missing_metadata": [],
        "missing_posters": [],
        "missing_subtitles": [],
        "misclassifications": [],
        "broken_streams": [],
    }

    # Get issues from the audit's tracked fields
    # These are populated by the issue_tracker during the audit

    # missing_metadata field contains both missing metadata and dirty titles
    for item in audit.missing_metadata or []:
        content_id = item.get("content_id")
        if not content_id:
            continue

        issue_type = item.get("issue_type", "missing_metadata")
        target_list = issues.get(issue_type) or issues["missing_metadata"]

        # Check if this was already fixed
        was_fixed = any(
            fix.get("content_id") == content_id
            for fix in (audit.fixes_applied or [])
        )
        if not was_fixed:
            target_list.append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
                "issue_type": issue_type,
            })

    # broken_streams
    for item in audit.broken_streams or []:
        content_id = item.get("content_id")
        if content_id:
            issues["broken_streams"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
                "error": item.get("error", "Stream validation failed"),
            })

    # misclassifications
    for item in audit.misclassifications or []:
        content_id = item.get("content_id")
        if content_id:
            issues["misclassifications"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
            })

    # manual_review_needed contains failed fixes that can be retried
    for item in audit.manual_review_needed or []:
        if not item.get("reapply_eligible", False):
            continue

        content_id = item.get("content_id")
        tool_name = item.get("tool_name", "")

        if not content_id:
            continue

        # Map tool name to issue category
        if "poster" in tool_name:
            issues["missing_posters"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
            })
        elif "metadata" in tool_name:
            issues["missing_metadata"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
            })
        elif "title" in tool_name or "clean" in tool_name:
            issues["dirty_titles"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
            })
        elif "subtitle" in tool_name:
            issues["missing_subtitles"].append({
                "id": content_id,
                "title": item.get("title", "Unknown"),
                "language": item.get("tool_input", {}).get("language", "en"),
            })

    return issues


def _merge_issue_sources(tracked_items: list, audit_issues: dict) -> dict:
    """Merge tracked items from issue_tracker with audit report fields."""
    issues = {
        "dirty_titles": [],
        "missing_metadata": [],
        "missing_posters": [],
        "missing_subtitles": [],
        "misclassifications": [],
        "broken_streams": [],
    }

    seen_ids = set()

    # First, add items from tracked_items (from issue_tracker)
    for item in tracked_items:
        content_id = item.get("content_id")
        if content_id in seen_ids:
            continue
        seen_ids.add(content_id)

        tool_name = item.get("tool_name", "")
        issue_type = item.get("issue_type", "")

        # Determine category from tool name or issue type
        if "poster" in tool_name or issue_type == "missing_poster":
            issues["missing_posters"].append(item)
        elif "metadata" in tool_name or issue_type == "missing_metadata":
            issues["missing_metadata"].append(item)
        elif "title" in tool_name or "clean" in tool_name or issue_type == "dirty_title":
            issues["dirty_titles"].append(item)
        elif "subtitle" in tool_name or issue_type == "missing_subtitle":
            issues["missing_subtitles"].append(item)
        elif "classif" in tool_name or issue_type == "misclassification":
            issues["misclassifications"].append(item)
        elif "stream" in tool_name or issue_type == "broken_stream":
            issues["broken_streams"].append(item)
        else:
            # Default to missing_metadata
            issues["missing_metadata"].append(item)

    # Then, add items from audit report fields (avoiding duplicates)
    for category, items in audit_issues.items():
        for item in items:
            content_id = item.get("id") or item.get("content_id")
            if content_id and content_id not in seen_ids:
                seen_ids.add(content_id)
                issues[category].append(item)

    return issues


async def _extract_issues_from_database(limit_per_type: int = 100) -> dict:
    """Scan database for items that currently have issues (not relying on old audit logs)."""
    import re

    issues = {
        "dirty_titles": [],
        "missing_metadata": [],
        "missing_posters": [],
        "missing_subtitles": [],
        "misclassifications": [],
        "broken_streams": [],
    }

    # Patterns that indicate dirty titles (file markers, group tags, etc.)
    dirty_patterns = [
        r'\[.*?\]',  # [WEB-DL], [1080p], etc.
        r'\(.*?\)',  # (2023), (PROPER), etc. at end
        r'\.mkv$|\.mp4$|\.avi$|\.mov$',  # File extensions
        r'S\d+E\d+',  # Episode markers like S01E01
        r'x264|x265|HEVC|BluRay|WEBRip|HDRip',  # Encoding info
        r'YIFY|RARBG|YTS|EZTV',  # Release groups
    ]
    dirty_regex = re.compile('|'.join(dirty_patterns), re.IGNORECASE)

    # Query for items with issues
    try:
        # Find items with dirty titles (titles containing file markers)
        all_content = await Content.find(
            {"published": True}
        ).limit(1000).to_list()

        for item in all_content:
            content_id = str(item.id)
            title = item.title or ""

            # Check for dirty title
            if dirty_regex.search(title) and len(issues["dirty_titles"]) < limit_per_type:
                issues["dirty_titles"].append({
                    "id": content_id,
                    "title": title,
                })

            # Check for missing poster
            if not item.poster_url and len(issues["missing_posters"]) < limit_per_type:
                issues["missing_posters"].append({
                    "id": content_id,
                    "title": title,
                })

            # Check for missing metadata (description)
            if not item.description and len(issues["missing_metadata"]) < limit_per_type:
                issues["missing_metadata"].append({
                    "id": content_id,
                    "title": title,
                })

            # Check for missing subtitles (items with video but no subtitle tracks)
            if item.content_type in ["movie", "episode"] and len(issues["missing_subtitles"]) < limit_per_type:
                subtitle_languages = item.available_subtitle_languages or []
                if not subtitle_languages:
                    issues["missing_subtitles"].append({
                        "id": content_id,
                        "title": title,
                        "language": "en",  # Default to English
                    })

    except Exception as e:
        logger.error(f"Error scanning database for issues: {e}")

    logger.info(
        f"Scanned database for current issues: "
        f"dirty_titles={len(issues['dirty_titles'])}, "
        f"missing_metadata={len(issues['missing_metadata'])}, "
        f"missing_posters={len(issues['missing_posters'])}, "
        f"missing_subtitles={len(issues['missing_subtitles'])}, "
        f"misclassifications={len(issues['misclassifications'])}, "
        f"broken_streams={len(issues['broken_streams'])}"
    )

    return issues


async def _log_fix_progress(audit: AuditReport, fix_type: str, stats: dict):
    """Log fix progress to audit execution_logs."""
    import uuid

    log_entry = {
        "id": str(uuid.uuid4()),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "level": "info",
        "message": f"Applied {fix_type} fixes: {stats.get('success', 0)}/{stats.get('attempted', 0)} successful",
        "metadata": {"fix_type": fix_type, "stats": stats},
    }
    audit.execution_logs.append(log_entry)
    await audit.save()


async def _apply_title_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply dirty title fixes."""
    from app.services.ai_agent.executors.metadata.titles import execute_clean_title

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            result = await execute_clean_title(
                content_id=content_id, audit_id=audit_id, dry_run=dry_run
            )
            if result.get("success"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Title fix failed for {content_id}: {e}")
    return stats


async def _apply_metadata_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply missing metadata fixes."""
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_fix_missing_metadata,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            result = await execute_fix_missing_metadata(
                content_id=content_id,
                reason="Reapply fix from previous audit",
                audit_id=audit_id,
                dry_run=dry_run,
            )
            if result.get("success"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Metadata fix failed for {content_id}: {e}")
    return stats


async def _apply_poster_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply missing poster fixes."""
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_fix_missing_poster,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            result = await execute_fix_missing_poster(
                content_id=content_id,
                reason="Reapply fix from previous audit",
                audit_id=audit_id,
                dry_run=dry_run,
            )
            if result.get("success") or result.get("fixed"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Poster fix failed for {content_id}: {e}")
    return stats


async def _apply_subtitle_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply missing subtitle downloads."""
    from app.services.ai_agent.executors.subtitles import (
        execute_check_subtitle_quota,
        execute_download_external_subtitle,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0, "quota_exhausted": False}

    # Check quota first
    quota_result = await execute_check_subtitle_quota()
    if not quota_result.get("quota_available"):
        stats["quota_exhausted"] = True
        return stats

    remaining_quota = quota_result.get("remaining", 0)

    for item in items:
        if stats["success"] >= remaining_quota:
            stats["quota_exhausted"] = True
            break

        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue

        languages = item.get("missing_languages", ["he", "en"])
        for language in languages:
            if stats["success"] >= remaining_quota:
                break

            stats["attempted"] += 1
            try:
                if dry_run:
                    stats["success"] += 1
                    continue

                result = await execute_download_external_subtitle(
                    content_id=content_id, language=language, audit_id=audit_id
                )
                if result.get("success"):
                    stats["success"] += 1
                else:
                    stats["failed"] += 1
            except Exception as e:
                stats["failed"] += 1
                logger.warning(f"Subtitle fix failed for {content_id}/{language}: {e}")

    return stats


async def _apply_misclassification_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Apply misclassification fixes."""
    from app.services.ai_agent.executors.series.classification import (
        execute_fix_misclassified_series,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            result = await execute_fix_misclassified_series(
                content_id=content_id, audit_id=audit_id, dry_run=dry_run
            )
            if result.get("success") or result.get("fixed"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Misclassification fix failed for {content_id}: {e}")
    return stats


async def _apply_broken_stream_fixes(
    audit_id: str, items: list, dry_run: bool
) -> dict:
    """Flag broken streams for manual review."""
    from app.services.ai_agent.executors.metadata.fixes import (
        execute_flag_for_manual_review,
    )

    stats = {"attempted": 0, "success": 0, "failed": 0}
    for item in items:
        content_id = item.get("id") or item.get("content_id")
        if not content_id:
            continue
        stats["attempted"] += 1
        try:
            if dry_run:
                stats["success"] += 1
                continue

            result = await execute_flag_for_manual_review(
                content_id=content_id,
                audit_id=audit_id,
                reason=f"Broken stream: {item.get('error', 'Stream validation failed')}",
            )
            if result.get("success"):
                stats["success"] += 1
            else:
                stats["failed"] += 1
        except Exception as e:
            stats["failed"] += 1
            logger.warning(f"Broken stream flag failed for {content_id}: {e}")
    return stats


async def _retry_failed_tool_calls(
    audit_id: str, failed_calls: list, dry_run: bool
) -> dict:
    """Retry tool calls that failed in the original audit."""
    from app.services.ai_agent.dispatcher import execute_tool

    stats = {"attempted": 0, "success": 0, "failed": 0, "by_tool": {}}

    for call in failed_calls:
        tool_name = call.get("tool_name", "")
        content_id = call.get("content_id", "")
        tool_input = call.get("tool_input", {})

        if not tool_name or not content_id:
            continue

        stats["attempted"] += 1

        # Track per-tool stats
        if tool_name not in stats["by_tool"]:
            stats["by_tool"][tool_name] = {"attempted": 0, "success": 0, "failed": 0}
        stats["by_tool"][tool_name]["attempted"] += 1

        try:
            if dry_run:
                stats["success"] += 1
                stats["by_tool"][tool_name]["success"] += 1
                continue

            # Re-dispatch the tool call
            result = await execute_tool(
                tool_name=tool_name,
                tool_input=tool_input,
                audit_id=audit_id,
                dry_run=dry_run,
            )

            if result.get("success", False):
                stats["success"] += 1
                stats["by_tool"][tool_name]["success"] += 1
            else:
                stats["failed"] += 1
                stats["by_tool"][tool_name]["failed"] += 1
                logger.warning(
                    f"Retry failed for {tool_name} on {content_id}: {result.get('error', 'Unknown error')}"
                )
        except Exception as e:
            stats["failed"] += 1
            stats["by_tool"][tool_name]["failed"] += 1
            logger.warning(f"Retry exception for {tool_name} on {content_id}: {e}")

    logger.info(
        f"Retried {stats['attempted']} failed tool calls: "
        f"{stats['success']} success, {stats['failed']} failed"
    )
    return stats
