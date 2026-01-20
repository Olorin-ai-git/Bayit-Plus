"""
Upload integrity management endpoints.

Handles detection and cleanup of orphaned files, records, and stuck jobs.
"""

import logging
from typing import Optional

from app.api.routes.admin_uploads.dependencies import has_permission
from app.api.routes.admin_uploads.models import CleanupResponse, IntegrityStatusResponse
from app.models.admin import Permission
from app.models.user import User
from app.services.upload_service.integrity import upload_integrity_service
from fastapi import APIRouter, Depends, HTTPException, Query, status

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/uploads/integrity/status")
async def get_integrity_status(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
) -> IntegrityStatusResponse:
    """
    Get the current integrity status of upload data.

    Returns counts of:
    - Orphaned GCS files (uploaded but no DB record)
    - Orphaned Content records (DB record but no GCS file)
    - Stuck upload jobs (processing too long)
    - Stale hash locks (expired locks cleaned up)
    """
    try:
        integrity_status = await upload_integrity_service.get_integrity_status()

        return IntegrityStatusResponse(
            orphaned_gcs_files=integrity_status.orphaned_gcs_files,
            orphaned_content_records=integrity_status.orphaned_content_records,
            stuck_upload_jobs=integrity_status.stuck_upload_jobs,
            stale_hash_locks=integrity_status.stale_hash_locks,
            last_checked=integrity_status.last_checked,
            issues_found=integrity_status.issues_found,
        )

    except Exception as e:
        logger.error(f"Failed to get integrity status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get integrity status: {str(e)}",
        )


@router.post("/uploads/integrity/cleanup")
async def run_integrity_cleanup(
    dry_run: bool = Query(
        default=True, description="If true, only report what would be done"
    ),
    limit: int = Query(
        default=100, le=500, description="Maximum items to clean per category"
    ),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
) -> CleanupResponse:
    """
    Run a full cleanup of all integrity issues.

    This operation:
    - Deletes orphaned GCS files (uploaded but no DB record)
    - Deletes orphaned Content records (DB record but no GCS file)
    - Recovers stuck upload jobs (marks as failed and requeues)

    Args:
        dry_run: If True, only report what would be done without making changes
        limit: Maximum number of items to clean per category

    Returns:
        Detailed results of the cleanup operation
    """
    try:
        logger.info(
            f"Starting integrity cleanup (dry_run={dry_run}, limit={limit}) "
            f"by user {current_user.email}"
        )

        result = await upload_integrity_service.run_full_cleanup(
            dry_run=dry_run, limit=limit
        )

        return CleanupResponse(
            dry_run=result["dry_run"],
            started_at=result["started_at"],
            completed_at=result.get("completed_at"),
            gcs_cleanup=result.get("gcs_cleanup"),
            content_cleanup=result.get("content_cleanup"),
            job_recovery=result.get("job_recovery"),
            overall_success=result["overall_success"],
        )

    except Exception as e:
        logger.error(f"Failed to run integrity cleanup: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to run cleanup: {str(e)}",
        )


@router.get("/uploads/integrity/orphaned-files")
async def list_orphaned_gcs_files(
    prefix: Optional[str] = Query(
        default=None, description="GCS path prefix to filter"
    ),
    limit: int = Query(default=50, le=200),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    List GCS files that have no corresponding Content record.

    These are files that were uploaded to GCS but the database insert
    failed, leaving orphaned files taking up storage.
    """
    try:
        orphans = await upload_integrity_service.find_orphaned_gcs_files(
            prefix=prefix, limit=limit
        )

        return {
            "count": len(orphans),
            "orphaned_files": [
                {
                    "gcs_path": o.gcs_path,
                    "public_url": o.public_url,
                }
                for o in orphans
            ],
        }

    except Exception as e:
        logger.error(f"Failed to list orphaned files: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list orphaned files: {str(e)}",
        )


@router.get("/uploads/integrity/orphaned-records")
async def list_orphaned_content_records(
    limit: int = Query(default=50, le=200),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    List Content records whose GCS files no longer exist.

    These are database records where the corresponding video file
    was deleted from GCS, leaving broken content entries.
    """
    try:
        orphans = await upload_integrity_service.find_orphaned_content_records(
            limit=limit
        )

        return {
            "count": len(orphans),
            "orphaned_records": [
                {
                    "content_id": o.content_id,
                    "title": o.title,
                    "stream_url": o.stream_url,
                    "file_hash": o.file_hash,
                    "created_at": o.created_at.isoformat() if o.created_at else None,
                }
                for o in orphans
            ],
        }

    except Exception as e:
        logger.error(f"Failed to list orphaned records: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list orphaned records: {str(e)}",
        )


@router.get("/uploads/integrity/stuck-jobs")
async def list_stuck_upload_jobs(
    threshold_minutes: int = Query(default=30, ge=5, le=1440),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    List upload jobs that appear to be stuck in processing state.

    Jobs are considered stuck if they've been in PROCESSING or UPLOADING
    status for longer than the threshold.
    """
    try:
        stuck_jobs = await upload_integrity_service.find_stuck_upload_jobs(
            threshold_minutes=threshold_minutes
        )

        return {
            "count": len(stuck_jobs),
            "threshold_minutes": threshold_minutes,
            "stuck_jobs": [
                {
                    "job_id": j.job_id,
                    "filename": j.filename,
                    "status": j.status,
                    "started_at": j.started_at.isoformat(),
                    "stuck_minutes": j.stuck_minutes,
                    "current_stage": j.current_stage,
                }
                for j in stuck_jobs
            ],
        }

    except Exception as e:
        logger.error(f"Failed to list stuck jobs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list stuck jobs: {str(e)}",
        )


@router.post("/uploads/integrity/recover-stuck-jobs")
async def recover_stuck_upload_jobs(
    dry_run: bool = Query(default=True),
    threshold_minutes: int = Query(default=30, ge=5, le=1440),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Recover stuck upload jobs by marking them as failed and requeuing.

    This is useful when server crashes leave jobs stuck in processing state.
    """
    try:
        logger.info(
            f"Recovering stuck jobs (dry_run={dry_run}, threshold={threshold_minutes}min) "
            f"by user {current_user.email}"
        )

        result = await upload_integrity_service.recover_stuck_jobs(
            dry_run=dry_run, threshold_minutes=threshold_minutes
        )

        return {
            "dry_run": result.dry_run,
            "success": result.success,
            "jobs_found": result.jobs_found,
            "jobs_recovered": result.jobs_recovered,
            "jobs_failed": result.jobs_failed,
            "errors": result.errors,
            "details": result.details,
        }

    except Exception as e:
        logger.error(f"Failed to recover stuck jobs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recover stuck jobs: {str(e)}",
        )
