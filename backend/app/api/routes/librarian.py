"""
Librarian API Routes
Admin endpoints for managing the Librarian AI Agent
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Request, Header
from pydantic import BaseModel
from beanie import PydanticObjectId

from app.models.user import User
from app.models.librarian import AuditReport, LibrarianAction
from app.models.content import Content
from app.api.routes.admin import require_admin
from app.services.librarian_service import (
    run_daily_audit,
    get_latest_audit_report,
    get_audit_statistics
)
from app.services.ai_agent_service import run_ai_agent_audit
from app.services.auto_fixer import rollback_action
from app.services.audit_task_manager import audit_task_manager
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


# ============ AUDIT TASK WRAPPER ============

async def run_audit_with_tracking(
    audit_id: str,
    audit_func,
    **kwargs
):
    """
    Wrapper to run an audit function and track it with the task manager.
    Handles cancellation and cleanup properly.
    """
    try:
        logger.info(f"Starting tracked audit {audit_id}")
        await audit_func(**kwargs, audit_id=audit_id)
        logger.info(f"Completed tracked audit {audit_id}")
    except asyncio.CancelledError:
        logger.info(f"Audit {audit_id} was cancelled")
        # Update the audit status to cancelled
        try:
            try:
                object_id = PydanticObjectId(audit_id)
                audit = await AuditReport.get(object_id)
            except:
                audit = await AuditReport.find_one({"audit_id": audit_id})
            
            if audit:
                audit.status = "cancelled"
                await audit.save()
        except Exception as e:
            logger.error(f"Failed to update cancelled audit status: {e}")
        raise
    except Exception as e:
        logger.error(f"Error in tracked audit {audit_id}: {e}", exc_info=True)
        raise
    finally:
        audit_task_manager.unregister_task(audit_id)


# ============ REQUEST/RESPONSE MODELS ============

class TriggerAuditRequest(BaseModel):
    audit_type: str = "daily_incremental"  # "daily_incremental", "weekly_full", "manual", "ai_agent"
    dry_run: bool = False
    use_ai_agent: bool = False  # Use autonomous AI agent instead of rule-based workflow
    max_iterations: int = 50  # Max tool uses for AI agent (only used if use_ai_agent=True)
    budget_limit_usd: float = 1.0  # Max Claude API cost for AI agent (only used if use_ai_agent=True)
    last_24_hours_only: bool = False  # Only scan content added/modified in last 24 hours
    cyb_titles_only: bool = False  # Only scan and extract CYB titles
    tmdb_posters_only: bool = False  # Only add/update TMDB posters and metadata
    opensubtitles_enabled: bool = False  # Enable OpenSubtitles API for subtitle retrieval


class TriggerAuditResponse(BaseModel):
    audit_id: str
    status: str
    message: str


class AuditReportResponse(BaseModel):
    audit_id: str
    audit_date: datetime
    audit_type: str
    execution_time_seconds: float
    status: str
    summary: dict
    issues_count: int
    fixes_count: int


class ActionResponse(BaseModel):
    action_id: str
    audit_id: str
    timestamp: datetime
    action_type: str
    content_id: str
    content_type: str
    issue_type: str
    description: Optional[str]
    before_state: dict
    after_state: dict
    confidence_score: Optional[float]
    auto_approved: bool
    rolled_back: bool
    content_title: Optional[str]  # Fetched from Content model for display


class LibrarianStatusResponse(BaseModel):
    last_audit_date: Optional[datetime]
    last_audit_status: Optional[str]
    total_audits_last_30_days: int
    avg_execution_time: float
    total_issues_fixed: int
    system_health: str


class ScheduleConfig(BaseModel):
    cron: str
    time: str
    mode: str
    cost: str
    status: str
    description: str


class AuditLimits(BaseModel):
    max_iterations: int
    default_budget_usd: float
    min_budget_usd: float
    max_budget_usd: float
    budget_step_usd: float


class PaginationConfig(BaseModel):
    reports_limit: int
    actions_limit: int
    activity_page_size: int


class UIConfig(BaseModel):
    id_truncate_length: int
    modal_max_height: int


class ActionTypeConfig(BaseModel):
    value: str
    label: str
    color: str
    icon: str


class LibrarianConfigResponse(BaseModel):
    daily_schedule: ScheduleConfig
    weekly_schedule: ScheduleConfig
    audit_limits: AuditLimits
    pagination: PaginationConfig
    ui: UIConfig
    action_types: List[ActionTypeConfig]
    gcp_project_id: str


# ============ API ENDPOINTS ============

@router.get("/admin/librarian/config", response_model=LibrarianConfigResponse)
async def get_librarian_config(
    current_user: User = Depends(require_admin())
):
    """
    Get Librarian configuration from environment variables.

    This endpoint returns all configuration needed by the frontend to render
    the Librarian UI without hardcoded values. If any required environment
    variable is missing, this will fail fast with a clear error message.

    Raises:
        HTTPException: 500 if configuration is incomplete
    """
    try:
        # Define action types with their UI properties
        action_types = [
            ActionTypeConfig(
                value="add_poster",
                label="Add Poster",
                color="success",
                icon="Image"
            ),
            ActionTypeConfig(
                value="update_metadata",
                label="Update Metadata",
                color="primary",
                icon="FileText"
            ),
            ActionTypeConfig(
                value="recategorize",
                label="Recategorize",
                color="warning",
                icon="Tag"
            ),
            ActionTypeConfig(
                value="fix_url",
                label="Fix URL",
                color="secondary",
                icon="Link"
            ),
            ActionTypeConfig(
                value="clean_title",
                label="Clean Title",
                color="info",
                icon="Type"
            )
        ]

        return LibrarianConfigResponse(
            daily_schedule=ScheduleConfig(
                cron=settings.LIBRARIAN_DAILY_AUDIT_CRON,
                time=settings.LIBRARIAN_DAILY_AUDIT_TIME,
                mode=settings.LIBRARIAN_DAILY_AUDIT_MODE,
                cost=settings.LIBRARIAN_DAILY_AUDIT_COST,
                status=settings.LIBRARIAN_DAILY_AUDIT_STATUS,
                description=settings.LIBRARIAN_DAILY_AUDIT_DESCRIPTION
            ),
            weekly_schedule=ScheduleConfig(
                cron=settings.LIBRARIAN_WEEKLY_AUDIT_CRON,
                time=settings.LIBRARIAN_WEEKLY_AUDIT_TIME,
                mode=settings.LIBRARIAN_WEEKLY_AUDIT_MODE,
                cost=settings.LIBRARIAN_WEEKLY_AUDIT_COST,
                status=settings.LIBRARIAN_WEEKLY_AUDIT_STATUS,
                description=settings.LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION
            ),
            audit_limits=AuditLimits(
                max_iterations=settings.LIBRARIAN_MAX_ITERATIONS,
                default_budget_usd=settings.LIBRARIAN_DEFAULT_BUDGET_USD,
                min_budget_usd=settings.LIBRARIAN_MIN_BUDGET_USD,
                max_budget_usd=settings.LIBRARIAN_MAX_BUDGET_USD,
                budget_step_usd=settings.LIBRARIAN_BUDGET_STEP_USD
            ),
            pagination=PaginationConfig(
                reports_limit=settings.LIBRARIAN_REPORTS_LIMIT,
                actions_limit=settings.LIBRARIAN_ACTIONS_LIMIT,
                activity_page_size=settings.LIBRARIAN_ACTIVITY_PAGE_SIZE
            ),
            ui=UIConfig(
                id_truncate_length=settings.LIBRARIAN_ID_TRUNCATE_LENGTH,
                modal_max_height=settings.LIBRARIAN_MODAL_MAX_HEIGHT
            ),
            action_types=action_types,
            gcp_project_id=settings.GCP_PROJECT_ID
        )
    except AttributeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration error: Missing required environment variable - {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load librarian configuration: {str(e)}"
        )


@router.post("/internal/librarian/scheduled-audit", response_model=TriggerAuditResponse)
async def trigger_scheduled_audit(
    request: TriggerAuditRequest,
    background_tasks: BackgroundTasks,
    user_agent: Optional[str] = Header(None)
):
    """
    Internal endpoint for Cloud Scheduler to trigger audits.
    Does not require admin authentication - validates request is from Cloud Scheduler instead.

    This endpoint should NOT be exposed publicly and should only be called by Cloud Scheduler.
    """
    # Verify request is from Google Cloud Scheduler
    if not user_agent or "Google-Cloud-Scheduler" not in user_agent:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint can only be called by Google Cloud Scheduler"
        )

    try:
        # Determine which mode to use
        if request.use_ai_agent or request.audit_type == "ai_agent":
            # AI Agent mode - Claude makes autonomous decisions
            background_tasks.add_task(
                run_ai_agent_audit,
                audit_type="ai_agent",
                dry_run=request.dry_run,
                max_iterations=request.max_iterations,
                budget_limit_usd=request.budget_limit_usd
            )

            return TriggerAuditResponse(
                audit_id="running",
                status="started",
                message=f"🤖 AI Agent audit started (autonomous mode, {'DRY RUN' if request.dry_run else 'LIVE'}). Claude will decide what to check and fix. Check back soon for results."
            )
        else:
            # Rule-based mode - Pre-programmed workflow
            valid_types = ["daily_incremental", "weekly_full", "manual"]
            if request.audit_type not in valid_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid audit_type. Must be one of: {', '.join(valid_types + ['ai_agent'])}"
                )

            background_tasks.add_task(
                run_daily_audit,
                audit_type=request.audit_type,
                dry_run=request.dry_run
            )

            return TriggerAuditResponse(
                audit_id="running",
                status="started",
                message=f"Librarian audit started ({request.audit_type}, rule-based mode). Check back soon for results."
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger audit: {str(e)}"
        )


@router.post("/admin/librarian/run-audit", response_model=TriggerAuditResponse)
async def trigger_librarian_audit(
    request: TriggerAuditRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin()),
    accept_language: Optional[str] = Header(None, alias="Accept-Language")
):
    """
    Trigger a librarian audit.

    Two modes available:
    1. Rule-based (default): Pre-programmed workflow with AI-assisted analysis
    2. AI Agent (use_ai_agent=True): Fully autonomous AI agent using Claude's tool use

    Parameters:
    - audit_type: "daily_incremental", "weekly_full", "manual", or "ai_agent"
    - dry_run: If true, only report issues without fixing
    - use_ai_agent: Use autonomous AI agent mode (Claude makes decisions)
    - max_iterations: Max tool uses for AI agent (default 50)
    - budget_limit_usd: Max Claude API cost for AI agent (default $1.00)

    Returns: audit_id and status

    Note: Runs in background to avoid timeout
    """
    try:
        # Extract language code from Accept-Language header (e.g., "en-US" -> "en")
        language = "en"
        if accept_language:
            language = accept_language.split(",")[0].split("-")[0].lower()
            # Ensure it's a supported language
            if language not in ["en", "es", "he"]:
                language = "en"

        # Create audit report immediately to get an ID
        audit = AuditReport(
            audit_date=datetime.utcnow(),
            audit_type=request.audit_type if not request.use_ai_agent else "ai_agent",
            status="in_progress",
            execution_time_seconds=0,
            metadata={
                "dry_run": request.dry_run,
                "use_ai_agent": request.use_ai_agent or request.audit_type == "ai_agent",
                "language": language,
                "last_24_hours_only": request.last_24_hours_only,
                "cyb_titles_only": request.cyb_titles_only,
                "tmdb_posters_only": request.tmdb_posters_only,
                "opensubtitles_enabled": request.opensubtitles_enabled
            }
        )
        await audit.save()
        # Use the audit_id field (UUID), not the MongoDB _id
        audit_id = audit.audit_id

        # Determine which mode to use
        if request.use_ai_agent or request.audit_type == "ai_agent":
            # AI Agent mode - Claude makes autonomous decisions
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
                    cyb_titles_only=request.cyb_titles_only,
                    tmdb_posters_only=request.tmdb_posters_only,
                    opensubtitles_enabled=request.opensubtitles_enabled
                )
            )
            audit_task_manager.register_task(audit_id, task)

            return TriggerAuditResponse(
                audit_id=audit_id,
                status="started",
                message=f"🤖 AI Agent audit started (autonomous mode, {'DRY RUN' if request.dry_run else 'LIVE'}). Claude will decide what to check and fix. Check back soon for results."
            )
        else:
            # Rule-based mode - Pre-programmed workflow
            valid_types = ["daily_incremental", "weekly_full", "manual"]
            if request.audit_type not in valid_types:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid audit_type. Must be one of: {', '.join(valid_types + ['ai_agent'])}"
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
                    opensubtitles_enabled=request.opensubtitles_enabled
                )
            )
            audit_task_manager.register_task(audit_id, task)

            return TriggerAuditResponse(
                audit_id=audit_id,
                status="started",
                message=f"Librarian audit started ({request.audit_type}, rule-based mode). Check back soon for results."
            )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to trigger audit: {str(e)}"
        )


@router.get("/admin/librarian/reports", response_model=List[AuditReportResponse])
async def get_audit_reports(
    limit: int = 10,
    audit_type: Optional[str] = None,
    current_user: User = Depends(require_admin())
):
    """
    Get recent audit reports.

    Parameters:
    - limit: Maximum number of reports to return (default 10)
    - audit_type: Filter by audit type (optional)
    """
    try:
        query = {}
        if audit_type:
            query["audit_type"] = audit_type

        reports = await AuditReport.find(query).sort([("audit_date", -1)]).limit(limit).to_list()

        # Count actual actions per audit (since summaries may be incomplete for partial audits)
        audit_ids = [r.audit_id for r in reports]
        action_counts = {}

        # Get action counts for all audits in one query
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
                # Use actual action count instead of incomplete summary
                issues_count=action_counts.get(report.audit_id, 0),
                fixes_count=action_counts.get(report.audit_id, 0)
            )
            for report in reports
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch reports: {str(e)}"
        )


@router.get("/admin/librarian/reports/{audit_id}")
async def get_audit_report_detail(
    audit_id: str,
    current_user: User = Depends(require_admin())
):
    """Get detailed audit report by ID"""
    try:
        report = await AuditReport.find_one({"audit_id": audit_id})

        if not report:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audit report not found"
            )

        # Convert to dict for full response
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
            "execution_logs": report.execution_logs,  # Real-time execution logs
            "created_at": report.created_at,
            "completed_at": report.completed_at,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch report: {str(e)}"
        )


@router.delete("/admin/librarian/reports")
async def clear_audit_reports(
    current_user: User = Depends(require_admin())
):
    """Clear all audit reports from the database"""
    try:
        # Delete all audit reports
        result = await AuditReport.find_all().delete()
        
        deleted_count = result.deleted_count if hasattr(result, 'deleted_count') else 0

        return {
            "deleted_count": deleted_count,
            "message": f"Successfully cleared {deleted_count} audit report(s)"
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear audit reports: {str(e)}"
        )


@router.get("/admin/librarian/actions", response_model=List[ActionResponse])
async def get_librarian_actions(
    audit_id: Optional[str] = None,
    action_type: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(require_admin())
):
    """
    Get librarian actions/fixes.

    Parameters:
    - audit_id: Filter by audit ID (optional)
    - action_type: Filter by action type (optional)
    - limit: Maximum number of actions to return (default 50)
    """
    try:
        query = {}
        if audit_id:
            query["audit_id"] = audit_id
        if action_type:
            query["action_type"] = action_type

        actions = await LibrarianAction.find(query).sort([("timestamp", -1)]).limit(limit).to_list()

        # Fetch content titles for all actions
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
                content_title=content_title_map.get(action.content_id)
            )
            for action in actions
        ]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch actions: {str(e)}"
        )


@router.post("/admin/librarian/actions/{action_id}/rollback")
async def rollback_librarian_action(
    action_id: str,
    current_user: User = Depends(require_admin())
):
    """Rollback a specific librarian action"""
    try:
        result = await rollback_action(action_id)

        if result.success:
            return {
                "success": True,
                "message": "Action rolled back successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.error_message or "Rollback failed"
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rollback action: {str(e)}"
        )


@router.post("/admin/librarian/audits/{audit_id}/pause")
async def pause_audit(
    audit_id: str,
    current_user: User = Depends(require_admin())
):
    """Pause a running audit"""
    try:
        # Try to find by _id first (MongoDB ObjectId)
        try:
            object_id = PydanticObjectId(audit_id)
            audit = await AuditReport.get(object_id)
        except:
            # If not a valid ObjectId, search by audit_id field
            audit = await AuditReport.find_one({"audit_id": audit_id})
        
        if not audit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audit not found"
            )
        
        if audit.status not in ["in_progress", "running"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot pause audit with status: {audit.status}"
            )
        
        # Pause the running task
        success = await audit_task_manager.pause_task(audit_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Running audit task not found"
            )
        
        # Update database status
        audit.status = "paused"
        await audit.save()
        
        return {"status": "paused", "message": "Audit paused successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to pause audit: {str(e)}"
        )


@router.post("/admin/librarian/audits/{audit_id}/resume")
async def resume_audit(
    audit_id: str,
    current_user: User = Depends(require_admin())
):
    """Resume a paused audit"""
    try:
        # Try to find by _id first (MongoDB ObjectId)
        try:
            object_id = PydanticObjectId(audit_id)
            audit = await AuditReport.get(object_id)
        except:
            # If not a valid ObjectId, search by audit_id field
            audit = await AuditReport.find_one({"audit_id": audit_id})
        
        if not audit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audit not found"
            )
        
        if audit.status != "paused":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot resume audit with status: {audit.status}"
            )
        
        # Resume the running task
        success = await audit_task_manager.resume_task(audit_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Paused audit task not found"
            )
        
        # Update database status
        audit.status = "in_progress"
        await audit.save()
        
        return {"status": "resumed", "message": "Audit resumed successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resume audit: {str(e)}"
        )


@router.post("/admin/librarian/audits/{audit_id}/cancel")
async def cancel_audit(
    audit_id: str,
    current_user: User = Depends(require_admin())
):
    """Cancel a running or paused audit"""
    try:
        # Try to find by _id first (MongoDB ObjectId)
        try:
            object_id = PydanticObjectId(audit_id)
            audit = await AuditReport.get(object_id)
        except:
            # If not a valid ObjectId, search by audit_id field
            audit = await AuditReport.find_one({"audit_id": audit_id})
        
        if not audit:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Audit not found"
            )
        
        if audit.status in ["completed", "failed", "cancelled"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot cancel audit with status: {audit.status}"
            )
        
        # Cancel the running task
        success = await audit_task_manager.cancel_task(audit_id)
        if not success:
            # Task not found in manager, just update database
            pass
        
        # Update database status
        audit.status = "cancelled"
        await audit.save()
        
        return {"status": "cancelled", "message": "Audit cancelled successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel audit: {str(e)}"
        )


@router.get("/admin/librarian/status", response_model=LibrarianStatusResponse)
async def get_librarian_status(
    current_user: User = Depends(require_admin())
):
    """
    Get current librarian status.

    Returns:
    - Last audit information
    - Statistics for last 30 days
    - System health
    """
    try:
        # Get latest report
        latest_report = await get_latest_audit_report()

        # Get statistics
        stats = await get_audit_statistics(days=30)

        # Determine system health based on real data, not incomplete summaries
        # Calculate health from recent audit activity and fix rate
        if stats["total_audits"] > 0:
            # Use fix success rate as primary health indicator
            fix_rate = stats["fix_success_rate"]

            # Also consider if audits are completing successfully
            completed_audits = await AuditReport.find({
                "audit_date": {"$gte": datetime.utcnow() - timedelta(days=7)},
                "status": "completed"
            }).count()
            partial_audits = await AuditReport.find({
                "audit_date": {"$gte": datetime.utcnow() - timedelta(days=7)},
                "status": "partial"
            }).count()

            # Health scoring:
            # - High fix rate (>80%) = excellent potential
            # - Completing audits successfully = better health
            # - Having partial audits is okay if we're still fixing issues

            total_recent = completed_audits + partial_audits
            completion_rate = (completed_audits / total_recent * 100) if total_recent > 0 else 0

            # Combined health score weighted toward actual fixes
            health_score = (fix_rate * 0.7) + (completion_rate * 0.3)

            if health_score >= 80:
                system_health = "excellent"
            elif health_score >= 60:
                system_health = "good"
            elif health_score >= 40:
                system_health = "fair"
            elif stats["total_issues_fixed"] > 0:
                # If we're fixing issues, we're at least "fair"
                system_health = "fair"
            else:
                system_health = "poor"
        else:
            system_health = "unknown"

        return LibrarianStatusResponse(
            last_audit_date=latest_report.audit_date if latest_report else None,
            last_audit_status=latest_report.status if latest_report else None,
            total_audits_last_30_days=stats["total_audits"],
            avg_execution_time=stats["avg_execution_time"],
            total_issues_fixed=stats["total_issues_fixed"],
            system_health=system_health
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch status: {str(e)}"
        )


# ============ VOICE COMMAND ENDPOINT ============

class VoiceCommandRequest(BaseModel):
    command: str
    language: str = "en"


class VoiceCommandResponse(BaseModel):
    message: str
    spoken_response: str
    audit_id: Optional[str] = None
    status: str
    action_taken: Optional[str] = None


@router.post("/voice-command", response_model=VoiceCommandResponse)
async def execute_voice_command(
    request: VoiceCommandRequest,
    background_tasks: BackgroundTasks,
    current_admin: User = Depends(require_admin)
):
    """
    Execute a voice command for the Librarian AI Agent.
    The admin can speak natural language commands and the librarian
    will interpret and execute them using its toolset.
    """
    try:
        import anthropic
        from app.services.ai_agent_service import TOOLS, execute_tool
        from app.models.librarian import AuditReport
        import json
        
        command = request.command.strip()
        language = request.language.lower()
        
        # Create a temporary audit report for this voice command
        audit_report = AuditReport(
            audit_type="voice_command",
            dry_run=False,
            status="in_progress",
            summary={},
            issues_count=0,
            fixes_count=0,
            execution_logs=[],
            execution_time_seconds=0.0
        )
        await audit_report.insert()
        
        # Log the voice command
        audit_report.execution_logs.append({
            "timestamp": datetime.utcnow().isoformat(),
            "level": "info",
            "message": f"Voice command received: {command}",
            "source": "Voice Interface"
        })
        
        # Initialize Anthropic client
        claude_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        
        # Build system prompt
        system_prompt = f"""You are an AI Librarian assistant for Bayit+, an Israeli streaming platform.
You are receiving voice commands from an admin who wants to manage the content library.

Your task:
1. Understand the admin's voice command
2. Execute the appropriate tool(s) to fulfill the request
3. Provide a clear, concise response in {language.upper()} language
4. If the command is ambiguous, ask for clarification

Available tools: {', '.join([tool['name'] for tool in TOOLS])}

Important:
- You can execute multiple tools if needed to complete the task
- Always provide a spoken response that the admin will hear
- Be concise and clear in your responses
- If you can't do something, explain why

Mode: LIVE - You can make real changes to the content library."""

        # Call Claude with the command
        messages = [{"role": "user", "content": command}]
        
        response = claude_client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=4096,
            system=system_prompt,
            messages=messages,
            tools=TOOLS
        )
        
        # Process the response
        action_taken = None
        tool_results = []
        
        # Handle tool use
        while response.stop_reason == "tool_use":
            tool_use_blocks = [block for block in response.content if block.type == "tool_use"]
            
            for tool_use in tool_use_blocks:
                tool_name = tool_use.name
                tool_input = tool_use.input
                
                # Log tool execution
                audit_report.execution_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "level": "info",
                    "message": f"Executing tool: {tool_name}",
                    "source": "AI Agent",
                    "metadata": {"input": tool_input}
                })
                
                # Execute the tool
                result = await execute_tool(
                    tool_name=tool_name,
                    tool_input=tool_input,
                    audit_id=str(audit_report.id),
                    dry_run=False
                )
                
                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": tool_use.id,
                    "content": json.dumps(result)
                })
                
                action_taken = f"{tool_name}: {json.dumps(tool_input)}"
                
                # Log result
                audit_report.execution_logs.append({
                    "timestamp": datetime.utcnow().isoformat(),
                    "level": "success" if result.get("success") else "error",
                    "message": f"Tool {tool_name} completed",
                    "source": "AI Agent",
                    "metadata": {"result": result}
                })
            
            # Continue the conversation with tool results
            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})
            
            response = claude_client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                system=system_prompt,
                messages=messages,
                tools=TOOLS
            )
            tool_results = []
        
        # Extract the final text response
        text_blocks = [block for block in response.content if hasattr(block, 'text')]
        final_message = text_blocks[0].text if text_blocks else "Command executed successfully."
        
        # Create spoken response (simplified for TTS)
        spoken_response = final_message[:500]  # Limit for TTS
        
        # Update audit report
        audit_report.status = "completed"
        audit_report.execution_time_seconds = (datetime.utcnow() - audit_report.audit_date).total_seconds()
        await audit_report.save()
        
        return VoiceCommandResponse(
            message=final_message,
            spoken_response=spoken_response,
            audit_id=str(audit_report.id),
            status="success",
            action_taken=action_taken
        )
        
    except Exception as e:
        # Log error
        if 'audit_report' in locals():
            audit_report.execution_logs.append({
                "timestamp": datetime.utcnow().isoformat(),
                "level": "error",
                "message": f"Voice command failed: {str(e)}",
                "source": "Voice Interface"
            })
            audit_report.status = "failed"
            await audit_report.save()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Voice command execution failed: {str(e)}"
        )
