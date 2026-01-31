"""Audit reports management endpoints."""
import logging
from typing import List, Optional

from beanie import PydanticObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.routes.admin import require_admin
from app.api.routes.librarian.models import AuditReportResponse
from app.models.librarian import AuditReport, LibrarianAction
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


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