"""
Librarian status and configuration endpoints.
"""

import logging
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.admin import require_admin
from app.api.routes.librarian.models import (ActionTypeConfig, AuditLimits,
                                             LibrarianConfigResponse,
                                             LibrarianStatusResponse,
                                             PaginationConfig, ScheduleConfig,
                                             UIConfig)
from app.core.config import settings
from app.models.librarian import AuditReport
from app.models.user import User
from app.services.audit_recovery_service import audit_recovery_service
from app.services.librarian_service import (get_audit_statistics,
                                            get_latest_audit_report)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/admin/librarian/config", response_model=LibrarianConfigResponse)
async def get_librarian_config(current_user: User = Depends(require_admin())):
    """
    Get Librarian configuration from environment variables.
    """
    try:
        action_types = [
            ActionTypeConfig(
                value="add_poster", label="Add Poster", color="success", icon="Image"
            ),
            ActionTypeConfig(
                value="update_metadata",
                label="Update Metadata",
                color="primary",
                icon="FileText",
            ),
            ActionTypeConfig(
                value="recategorize", label="Recategorize", color="warning", icon="Tag"
            ),
            ActionTypeConfig(
                value="fix_url", label="Fix URL", color="secondary", icon="Link"
            ),
            ActionTypeConfig(
                value="clean_title", label="Clean Title", color="info", icon="Type"
            ),
            ActionTypeConfig(
                value="classify", label="Classify", color="primary", icon="FolderTree"
            ),
        ]

        return LibrarianConfigResponse(
            daily_schedule=ScheduleConfig(
                cron=settings.LIBRARIAN_DAILY_AUDIT_CRON,
                time=settings.LIBRARIAN_DAILY_AUDIT_TIME,
                mode=settings.LIBRARIAN_DAILY_AUDIT_MODE,
                cost=settings.LIBRARIAN_DAILY_AUDIT_COST,
                status=settings.LIBRARIAN_DAILY_AUDIT_STATUS,
                description=settings.LIBRARIAN_DAILY_AUDIT_DESCRIPTION,
            ),
            weekly_schedule=ScheduleConfig(
                cron=settings.LIBRARIAN_WEEKLY_AUDIT_CRON,
                time=settings.LIBRARIAN_WEEKLY_AUDIT_TIME,
                mode=settings.LIBRARIAN_WEEKLY_AUDIT_MODE,
                cost=settings.LIBRARIAN_WEEKLY_AUDIT_COST,
                status=settings.LIBRARIAN_WEEKLY_AUDIT_STATUS,
                description=settings.LIBRARIAN_WEEKLY_AUDIT_DESCRIPTION,
            ),
            audit_limits=AuditLimits(
                max_iterations=settings.LIBRARIAN_MAX_ITERATIONS,
                default_budget_usd=settings.LIBRARIAN_DEFAULT_BUDGET_USD,
                min_budget_usd=settings.LIBRARIAN_MIN_BUDGET_USD,
                max_budget_usd=settings.LIBRARIAN_MAX_BUDGET_USD,
                budget_step_usd=settings.LIBRARIAN_BUDGET_STEP_USD,
            ),
            pagination=PaginationConfig(
                reports_limit=settings.LIBRARIAN_REPORTS_LIMIT,
                actions_limit=settings.LIBRARIAN_ACTIONS_LIMIT,
                activity_page_size=settings.LIBRARIAN_ACTIVITY_PAGE_SIZE,
            ),
            ui=UIConfig(
                id_truncate_length=settings.LIBRARIAN_ID_TRUNCATE_LENGTH,
                modal_max_height=settings.LIBRARIAN_MODAL_MAX_HEIGHT,
            ),
            action_types=action_types,
            gcp_project_id=settings.GCP_PROJECT_ID,
        )
    except AttributeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Configuration error: Missing required environment variable - {str(e)}",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load librarian configuration: {str(e)}",
        )


@router.get("/admin/librarian/status", response_model=LibrarianStatusResponse)
async def get_librarian_status(current_user: User = Depends(require_admin())):
    """
    Get current librarian status.
    """
    try:
        latest_report = await get_latest_audit_report()
        stats = await get_audit_statistics(days=30)

        if stats["total_audits"] > 0:
            fix_rate = stats["fix_success_rate"]

            completed_audits = await AuditReport.find(
                {
                    "audit_date": {"$gte": datetime.utcnow() - timedelta(days=7)},
                    "status": "completed",
                }
            ).count()
            partial_audits = await AuditReport.find(
                {
                    "audit_date": {"$gte": datetime.utcnow() - timedelta(days=7)},
                    "status": "partial",
                }
            ).count()

            total_recent = completed_audits + partial_audits
            completion_rate = (
                (completed_audits / total_recent * 100) if total_recent > 0 else 0
            )

            health_score = (fix_rate * 0.7) + (completion_rate * 0.3)

            if health_score >= 80:
                system_health = "excellent"
            elif health_score >= 60:
                system_health = "good"
            elif health_score >= 40:
                system_health = "fair"
            elif stats["total_issues_fixed"] > 0:
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
            system_health=system_health,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch status: {str(e)}",
        )


@router.get("/admin/librarian/integrity-status")
async def get_integrity_status(current_user: User = Depends(require_admin())):
    """
    Get a summary of all data integrity issues.
    """
    try:
        from app.services.upload_service.integrity import \
            upload_integrity_service

        integrity_status = await upload_integrity_service.get_integrity_status()

        return {
            "orphaned_gcs_files": integrity_status.orphaned_gcs_files,
            "orphaned_content_records": integrity_status.orphaned_content_records,
            "stuck_upload_jobs": integrity_status.stuck_upload_jobs,
            "stale_hash_locks": integrity_status.stale_hash_locks,
            "issues_found": integrity_status.issues_found,
            "last_checked": (
                integrity_status.last_checked.isoformat()
                if integrity_status.last_checked
                else None
            ),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get integrity status: {str(e)}",
        )


@router.get("/admin/librarian/audit-health/{audit_id}")
async def check_audit_health(
    audit_id: str, current_user: User = Depends(require_admin())
):
    """
    Check the health of a specific audit.

    Returns detailed health status including:
    - Whether audit is healthy
    - Any issues detected (stuck, no activity, etc.)
    - Last activity timestamp
    - Current status
    - Whether task is actually running
    """
    try:
        health = await audit_recovery_service.check_audit_health(audit_id)
        return health
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check audit health: {str(e)}",
        )


@router.post("/admin/librarian/audit-health/{audit_id}/recover")
async def recover_audit(audit_id: str, current_user: User = Depends(require_admin())):
    """
    Manually recover a stuck audit.

    This will:
    - Mark the audit as failed in the database
    - Add recovery logs to the execution log
    - Cancel the task if it's still running
    - Update the UI to reflect the failure
    """
    try:
        # Check health first
        health = await audit_recovery_service.check_audit_health(audit_id)

        if health["is_healthy"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audit is healthy and does not need recovery",
            )

        # Recover the audit
        result = await audit_recovery_service.recover_stuck_audit(
            audit_id, reason="; ".join(health["issues"])
        )

        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recover audit: {str(e)}",
        )


@router.post("/admin/librarian/scan-stuck-audits")
async def scan_stuck_audits(current_user: User = Depends(require_admin())):
    """
    Manually trigger a scan for stuck audits and recover them.

    This is the same scan that runs automatically every 5 minutes,
    but can be triggered manually for immediate action.

    Returns a list of recovered audits.
    """
    try:
        recoveries = await audit_recovery_service.scan_and_recover_stuck_audits()

        return {
            "scanned": True,
            "recoveries_count": len(recoveries),
            "recoveries": recoveries,
            "message": (
                f"Successfully scanned and recovered {len(recoveries)} stuck audit(s)"
                if recoveries
                else "No stuck audits found"
            ),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to scan for stuck audits: {str(e)}",
        )
