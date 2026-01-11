"""
Librarian API Routes
Admin endpoints for managing the Librarian AI Agent
"""
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel

from app.models.user import User
from app.models.librarian import AuditReport, LibrarianAction
from app.api.routes.admin import require_admin
from app.services.librarian_service import (
    run_daily_audit,
    get_latest_audit_report,
    get_audit_statistics
)
from app.services.ai_agent_service import run_ai_agent_audit
from app.services.auto_fixer import rollback_action

router = APIRouter()


# ============ REQUEST/RESPONSE MODELS ============

class TriggerAuditRequest(BaseModel):
    audit_type: str = "daily_incremental"  # "daily_incremental", "weekly_full", "manual", "ai_agent"
    dry_run: bool = False
    use_ai_agent: bool = False  # Use autonomous AI agent instead of rule-based workflow
    max_iterations: int = 50  # Max tool uses for AI agent (only used if use_ai_agent=True)
    budget_limit_usd: float = 1.0  # Max Claude API cost for AI agent (only used if use_ai_agent=True)


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
    description: Optional[str]
    auto_approved: bool
    rolled_back: bool


class LibrarianStatusResponse(BaseModel):
    last_audit_date: Optional[datetime]
    last_audit_status: Optional[str]
    total_audits_last_30_days: int
    avg_execution_time: float
    total_issues_fixed: int
    system_health: str


# ============ API ENDPOINTS ============

@router.post("/admin/librarian/run-audit", response_model=TriggerAuditResponse)
async def trigger_librarian_audit(
    request: TriggerAuditRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(require_admin())
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

        return [
            AuditReportResponse(
                audit_id=report.audit_id,
                audit_date=report.audit_date,
                audit_type=report.audit_type,
                execution_time_seconds=report.execution_time_seconds,
                status=report.status,
                summary=report.summary,
                issues_count=len(report.broken_streams) + len(report.missing_metadata) +
                            len(report.misclassifications) + len(report.orphaned_items),
                fixes_count=len(report.fixes_applied)
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

        return [
            ActionResponse(
                action_id=action.action_id,
                audit_id=action.audit_id,
                timestamp=action.timestamp,
                action_type=action.action_type,
                content_id=action.content_id,
                content_type=action.content_type,
                description=action.description,
                auto_approved=action.auto_approved,
                rolled_back=action.rolled_back
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

        # Determine system health
        if latest_report:
            summary = latest_report.summary
            total_items = summary.get("total_items", 0)
            healthy_items = summary.get("healthy_items", 0)
            health_percentage = (healthy_items / total_items * 100) if total_items > 0 else 100

            if health_percentage >= 90:
                system_health = "excellent"
            elif health_percentage >= 70:
                system_health = "good"
            elif health_percentage >= 50:
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
