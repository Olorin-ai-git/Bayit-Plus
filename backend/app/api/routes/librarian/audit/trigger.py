"""Admin audit triggering endpoint."""
import asyncio
import logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status

from app.api.routes.admin import require_admin
from app.api.routes.librarian.models import TriggerAuditRequest, TriggerAuditResponse
from app.api.routes.librarian.utils import run_audit_with_tracking
from app.models.librarian import AuditReport
from app.models.user import User
from app.services.ai_agent_service import run_ai_agent_audit
from app.services.audit_task_manager import audit_task_manager
from app.services.librarian_service import run_daily_audit

router = APIRouter()
logger = logging.getLogger(__name__)


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


