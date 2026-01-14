"""
Librarian API Routes
Admin endpoints for managing the Librarian AI Agent
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Request, Header
from pydantic import BaseModel

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
from app.core.config import settings

router = APIRouter()


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

        # Determine which mode to use
        if request.use_ai_agent or request.audit_type == "ai_agent":
            # AI Agent mode - Claude makes autonomous decisions
            background_tasks.add_task(
                run_ai_agent_audit,
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
                dry_run=request.dry_run,
                language=language,
                last_24_hours_only=request.last_24_hours_only,
                cyb_titles_only=request.cyb_titles_only,
                tmdb_posters_only=request.tmdb_posters_only,
                opensubtitles_enabled=request.opensubtitles_enabled
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
