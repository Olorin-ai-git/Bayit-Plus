"""
Upload queue management endpoints.

Handles enqueueing files, queue status, and job management.
"""

import asyncio
import logging
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.routes.admin_uploads.dependencies import (has_permission,
                                                       job_to_response)
from app.models.admin import Permission
from app.models.upload import (ContentType, UploadJob, UploadJobResponse,
                               UploadQueueResponse, UploadStatus)
from app.models.user import User
from app.services.upload_service import upload_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/uploads/enqueue")
async def enqueue_upload(
    source_path: str,
    content_type: ContentType,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Enqueue a file for upload to GCS and content database.

    Args:
        source_path: Absolute path to the file on the server
        content_type: Type of content (movie, podcast, etc.)
    """
    try:
        job = await upload_service.enqueue_upload(
            source_path=source_path,
            content_type=content_type,
            user_id=str(current_user.id),
        )

        return UploadJobResponse.from_orm(job)

    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        logger.error(f"Failed to enqueue upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enqueue upload: {str(e)}",
        )


@router.post("/uploads/enqueue-multiple")
async def enqueue_multiple_uploads(
    file_paths: List[str],
    content_type: ContentType,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Enqueue multiple files for upload.

    Args:
        file_paths: List of absolute paths to files on the server
        content_type: Type of content for all files
    """
    try:
        jobs = await upload_service.enqueue_multiple(
            file_paths=file_paths,
            content_type=content_type,
            user_id=str(current_user.id),
        )

        return {"enqueued": len(jobs), "jobs": [job_to_response(j) for j in jobs]}

    except Exception as e:
        logger.error(f"Failed to enqueue multiple uploads: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enqueue uploads: {str(e)}",
        )


@router.get("/uploads/queue")
async def get_upload_queue(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
) -> UploadQueueResponse:
    """
    Get current upload queue status including:
    - Queue statistics
    - Active job
    - Queued jobs
    - Recently completed jobs
    - Queue pause status
    """
    try:
        stats = await upload_service.get_queue_stats()
        active_job = await upload_service.get_active_job()
        queue = await upload_service.get_queue()
        recent = await upload_service.get_recent_completed(10)

        response = UploadQueueResponse(
            stats=stats,
            active_job=job_to_response(active_job) if active_job else None,
            queue=[job_to_response(j) for j in queue],
            recent_completed=[job_to_response(j) for j in recent],
        )

        # Add queue pause info
        response_dict = response.model_dump(mode="json")
        response_dict["queue_paused"] = upload_service._queue_paused
        response_dict["pause_reason"] = upload_service._pause_reason

        return response_dict

    except Exception as e:
        logger.error(f"Failed to get queue: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get queue: {str(e)}",
        )


@router.post("/uploads/queue/resume")
async def resume_upload_queue(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Manually start/resume the upload queue processor.
    Can be used to:
    - Resume a paused queue after fixing credential issues
    - Manually trigger queue processing (since auto-processing is disabled)
    """
    try:
        if upload_service._queue_paused:
            # If paused, use the resume method which resets pause flags
            await upload_service.resume_queue()
            message = "Upload queue resumed successfully"
        else:
            # If not paused, manually trigger queue processing
            asyncio.create_task(upload_service.process_queue())
            message = "Upload queue processing started manually"

        return {"success": True, "message": message}

    except Exception as e:
        logger.error(f"Failed to start/resume queue: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start/resume queue: {str(e)}",
        )


@router.post("/uploads/queue/clear")
async def clear_upload_queue(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Clear the upload queue by cancelling all queued and processing jobs.
    Completed, failed, and already cancelled jobs are not affected.
    """
    try:
        result = await upload_service.clear_queue()

        return result

    except Exception as e:
        logger.error(f"Failed to clear queue: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear queue: {str(e)}",
        )


@router.post("/uploads/queue/clear-completed")
async def clear_completed_jobs(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Clear completed, failed, and cancelled jobs from the queue history.
    Does not affect queued or processing jobs.
    """
    try:
        from beanie.operators import In

        # Delete all completed/failed/cancelled jobs
        result = await UploadJob.find(
            In(
                UploadJob.status,
                [
                    UploadStatus.COMPLETED,
                    UploadStatus.FAILED,
                    UploadStatus.CANCELLED,
                ],
            )
        ).delete()

        deleted_count = result.deleted_count if result else 0
        logger.info(f"Cleared {deleted_count} completed jobs from queue history")

        return {
            "success": True,
            "deleted_count": deleted_count,
            "message": f"Cleared {deleted_count} completed jobs",
        }

    except Exception as e:
        logger.error(f"Failed to clear completed jobs: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear completed jobs: {str(e)}",
        )


@router.get("/uploads/history")
async def get_upload_history(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Get upload history with pagination."""
    try:
        from beanie.operators import In

        jobs = (
            await UploadJob.find(
                In(
                    UploadJob.status,
                    [
                        UploadStatus.COMPLETED,
                        UploadStatus.FAILED,
                        UploadStatus.CANCELLED,
                    ],
                )
            )
            .sort("-completed_at")
            .skip(offset)
            .limit(limit)
            .to_list()
        )

        total = await UploadJob.find(
            In(
                UploadJob.status,
                [UploadStatus.COMPLETED, UploadStatus.FAILED, UploadStatus.CANCELLED],
            )
        ).count()

        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "jobs": [UploadJobResponse.from_orm(j) for j in jobs],
        }

    except Exception as e:
        logger.error(f"Failed to get history: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get history: {str(e)}",
        )


@router.get("/uploads/job/{job_id}")
async def get_upload_job(
    job_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Get details of a specific upload job."""
    try:
        job = await upload_service.get_job(job_id)

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail=f"Job not found: {job_id}"
            )

        return UploadJobResponse.from_orm(job)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job: {str(e)}",
        )


@router.delete("/uploads/job/{job_id}")
async def cancel_upload_job(
    job_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Cancel an upload job."""
    try:
        success = await upload_service.cancel_job(job_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found or already completed: {job_id}",
            )

        return {"status": "cancelled", "job_id": job_id}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel job: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel job: {str(e)}",
        )
