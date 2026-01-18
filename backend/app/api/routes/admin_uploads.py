"""
Admin Upload Routes
Handle file uploads for content management (images, videos, etc.)
Includes queue management, monitored folders, and real-time WebSocket updates.
"""

from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status, Depends, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from datetime import datetime
import json
import asyncio
import logging

from app.models.user import User
from app.models.admin import Permission, AuditAction
from app.models.upload import (
    ContentType,
    UploadJob,
    UploadJobCreate,
    UploadJobResponse,
    UploadQueueResponse,
    MonitoredFolderCreate,
    MonitoredFolderUpdate,
    MonitoredFolderResponse,
)
from app.core.security import get_current_active_user, decode_token
from app.core.config import settings
from app.core.storage import storage
from app.services.upload_service import upload_service
from app.services.folder_monitor_service import folder_monitor_service

router = APIRouter()
logger = logging.getLogger(__name__)


# ============ HELPER FUNCTIONS ============

def job_to_response(job: UploadJob) -> UploadJobResponse:
    """Convert UploadJob to UploadJobResponse with current_stage and stages"""
    response = UploadJobResponse.from_orm(job)
    response.current_stage = job.get_current_stage()
    response.stages = job.stages or {}
    return response


# ============ RBAC DEPENDENCIES ============

def has_permission(required_permission: Permission):
    """Dependency to check if user has required permission."""
    async def permission_checker(current_user: User = Depends(get_current_active_user)):
        role = current_user.role
        if role not in ["super_admin", "admin"]:
            if required_permission.value not in current_user.custom_permissions:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Permission denied: {required_permission.value} required"
                )
        return current_user
    return permission_checker


# ============ RESPONSE MODELS ============

class UploadResponse(BaseModel):
    url: str
    filename: str
    size: int


class ValidateUrlResponse(BaseModel):
    valid: bool
    message: str


class PresignedUrlResponse(BaseModel):
    upload_url: str
    fields: dict
    key: str


# ============ UPLOAD ENDPOINTS ============

@router.post("/uploads/image")
async def upload_image(
    file: UploadFile = File(...),
    image_type: str = Query(default="general", pattern="^(thumbnails|backdrops|logos|covers|general)$"),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Upload an image file.

    Supported image types: thumbnails, backdrops, logos, covers, general
    Max file size: 5MB
    Supported formats: JPEG, PNG, WebP, GIF
    """
    try:
        # Get file size before upload
        file_content = await file.read()
        file_size = len(file_content)
        await file.seek(0)  # Reset position

        # Upload via storage provider
        url = await storage.upload_image(file, image_type)

        return UploadResponse(
            url=url,
            filename=file.filename or "uploaded_file",
            size=file_size
        )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}"
        )


@router.post("/uploads/validate-url")
async def validate_stream_url(
    url: str = Query(...),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Validate that a stream URL is accessible.

    Checks if the URL returns a successful response (< 400 status code).
    Useful for validating HLS, DASH, or audio stream URLs before saving.
    """
    try:
        is_valid = await storage.validate_url(url)

        return ValidateUrlResponse(
            valid=is_valid,
            message="URL is accessible and valid" if is_valid else "URL is not accessible or invalid"
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}"
        )


@router.post("/uploads/presigned-url")
async def get_presigned_url(
    filename: str = Query(...),
    content_type: str = Query(default="application/octet-stream"),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Get a presigned URL for direct browser upload (S3 only).

    This endpoint returns a presigned POST URL that allows direct
    browser uploads to S3 without routing through the server.

    Supported for S3 storage only. Will return error if using local storage.
    """
    try:
        presigned_data = storage.get_presigned_url(filename, content_type)

        return PresignedUrlResponse(
            upload_url=presigned_data["url"],
            fields=presigned_data["fields"],
            key=presigned_data["key"]
        )

    except NotImplementedError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Presigned URLs not supported with local storage. Use /uploads/image instead."
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned URL: {str(e)}"
        )


# ============ HEALTH CHECK ============

@router.get("/uploads/health")
async def uploads_health(
    current_user: User = Depends(get_current_active_user)
):
    """Check upload service status"""
    return {
        "status": "healthy",
        "storage_type": "s3" if hasattr(storage, "s3_client") else "local",
        "message": "Upload service is ready"
    }


# ============ UPLOAD QUEUE MANAGEMENT ============

@router.post("/uploads/browser-upload/init")
async def init_browser_upload(
    filename: str = Query(...),
    file_size: int = Query(...),
    content_type: ContentType = Query(...),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Initialize a browser upload session.
    Returns an upload_id to use for chunked uploads.
    """
    from pathlib import Path
    from uuid import uuid4
    
    try:
        # Validate file type
        allowed_extensions = {'.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v', '.wmv'}
        file_ext = Path(filename).suffix.lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type: {file_ext}. Allowed: {', '.join(allowed_extensions)}"
            )
        
        # Check file size (max 10GB)
        if file_size > 10 * 1024 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File too large. Maximum size is 10GB."
            )
        
        # Create upload session
        upload_id = str(uuid4())
        upload_dir = Path(settings.UPLOAD_DIR) / upload_id
        upload_dir.mkdir(parents=True, exist_ok=True)

        # Store upload metadata
        metadata = {
            "upload_id": upload_id,
            "filename": filename,
            "file_size": file_size,
            "content_type": content_type.value,
            "user_id": str(current_user.id),
            "chunks_received": 0,
            "bytes_received": 0,
            "status": "initialized",
            "started_at": datetime.utcnow().isoformat(),
            "last_activity": datetime.utcnow().isoformat(),
        }
        
        import json
        import math
        with open(upload_dir / "metadata.json", "w") as f:
            json.dump(metadata, f)

        # Create database session record for resumability
        from app.models.upload import BrowserUploadSession
        session = BrowserUploadSession(
            upload_id=upload_id,
            filename=filename,
            file_size=file_size,
            content_type=content_type,
            user_id=str(current_user.id),
            total_chunks=math.ceil(file_size / (5 * 1024 * 1024)),  # 5MB chunks
        )
        await session.insert()

        logger.info(f"Browser upload initialized: {upload_id} for {filename} ({file_size} bytes)")
        
        return {
            "upload_id": upload_id,
            "filename": filename,
            "file_size": file_size,
            "chunk_size": 5 * 1024 * 1024,  # 5MB chunks recommended
            "status": "initialized"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to init browser upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize upload: {str(e)}"
        )


@router.post("/uploads/browser-upload/{upload_id}/chunk")
async def upload_chunk(
    upload_id: str,
    chunk_index: int = Query(...),
    chunk: UploadFile = File(...),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Upload a single chunk of a file.
    """
    from pathlib import Path
    import json
    
    try:
        upload_dir = Path(settings.UPLOAD_DIR) / upload_id
        metadata_path = upload_dir / "metadata.json"
        
        if not metadata_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Upload session not found: {upload_id}"
            )
        
        # Read metadata
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        # Save chunk
        chunk_path = upload_dir / f"chunk_{chunk_index:06d}"
        chunk_data = await chunk.read()
        
        with open(chunk_path, "wb") as f:
            f.write(chunk_data)
        
        # Update metadata
        metadata["chunks_received"] += 1
        metadata["bytes_received"] += len(chunk_data)
        metadata["status"] = "uploading"
        metadata["last_activity"] = datetime.utcnow().isoformat()

        with open(metadata_path, "w") as f:
            json.dump(metadata, f)

        # Update database session for resumability
        from app.models.upload import BrowserUploadSession
        session = await BrowserUploadSession.find_one(
            BrowserUploadSession.upload_id == upload_id
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found in database"
            )

        if chunk_index not in session.chunks_received:
            session.chunks_received.append(chunk_index)
        session.bytes_received = metadata["bytes_received"]
        session.last_activity = datetime.utcnow()
        session.status = "uploading"
        await session.save()

        progress = (metadata["bytes_received"] / metadata["file_size"]) * 100
        
        return {
            "upload_id": upload_id,
            "chunk_index": chunk_index,
            "bytes_received": metadata["bytes_received"],
            "total_size": metadata["file_size"],
            "progress": round(progress, 1),
            "status": "uploading"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload chunk: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload chunk: {str(e)}"
        )


@router.post("/uploads/browser-upload/{upload_id}/complete")
async def complete_browser_upload(
    upload_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Complete the upload by assembling chunks and enqueueing for processing.
    """
    from pathlib import Path
    import json
    
    try:
        upload_dir = Path(settings.UPLOAD_DIR) / upload_id
        metadata_path = upload_dir / "metadata.json"
        
        if not metadata_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Upload session not found: {upload_id}"
            )
        
        # Read metadata
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        # Assemble chunks into final file
        final_path = upload_dir / metadata["filename"]
        chunk_files = sorted(upload_dir.glob("chunk_*"))
        
        with open(final_path, "wb") as outfile:
            for chunk_path in chunk_files:
                with open(chunk_path, "rb") as chunk_file:
                    outfile.write(chunk_file.read())
                # Clean up chunk file
                chunk_path.unlink()
        
        logger.info(f"Browser upload assembled: {final_path} ({final_path.stat().st_size} bytes)")
        
        # Enqueue for processing
        job = await upload_service.enqueue_upload(
            source_path=str(final_path),
            content_type=ContentType(metadata["content_type"]),
            user_id=metadata["user_id"]
        )
        
        # Update metadata
        metadata["status"] = "completed"
        metadata["job_id"] = job.job_id
        with open(metadata_path, "w") as f:
            json.dump(metadata, f)

        # Update database session
        from app.models.upload import BrowserUploadSession
        session = await BrowserUploadSession.find_one(
            BrowserUploadSession.upload_id == upload_id
        )
        if session:
            session.status = "completed"
            session.completed_at = datetime.utcnow()
            session.job_id = job.job_id
            await session.save()

        return UploadJobResponse.from_orm(job)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to complete browser upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete upload: {str(e)}"
        )


@router.get("/uploads/browser-upload/{upload_id}/status")
async def get_browser_upload_status(
    upload_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Get the status of an upload session.
    """
    from pathlib import Path
    import json
    
    try:
        upload_dir = Path(settings.UPLOAD_DIR) / upload_id
        metadata_path = upload_dir / "metadata.json"
        
        if not metadata_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Upload session not found: {upload_id}"
            )
        
        with open(metadata_path, "r") as f:
            metadata = json.load(f)
        
        progress = (metadata["bytes_received"] / metadata["file_size"]) * 100 if metadata["file_size"] > 0 else 0
        
        return {
            "upload_id": upload_id,
            "filename": metadata["filename"],
            "bytes_received": metadata["bytes_received"],
            "total_size": metadata["file_size"],
            "progress": round(progress, 1),
            "status": metadata["status"],
            "job_id": metadata.get("job_id")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get upload status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get upload status: {str(e)}"
        )


@router.get("/uploads/browser-upload/{upload_id}/resume-info")
async def get_resume_info(
    upload_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Get resume information for a paused/failed upload.
    Returns which chunks are already received and which are missing.
    Allows clients to resume uploads without re-uploading completed chunks.
    """
    from app.models.upload import BrowserUploadSession
    from datetime import timedelta

    try:
        session = await BrowserUploadSession.find_one(
            BrowserUploadSession.upload_id == upload_id
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Upload session not found: {upload_id}"
            )

        # Check if session is resumable
        if session.status not in ["initialized", "uploading", "timeout", "failed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Session not resumable (status: {session.status})"
            )

        # Check if session expired (> 48 hours old)
        if datetime.utcnow() - session.started_at > timedelta(hours=48):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Session expired (>48 hours old)"
            )

        # Calculate missing chunks
        missing_chunks = [
            i for i in range(session.total_chunks)
            if i not in session.chunks_received
        ]

        return {
            "upload_id": upload_id,
            "filename": session.filename,
            "total_chunks": session.total_chunks,
            "chunks_received": sorted(session.chunks_received),
            "missing_chunks": missing_chunks,
            "bytes_received": session.bytes_received,
            "total_size": session.file_size,
            "progress": (session.bytes_received / session.file_size) * 100 if session.file_size > 0 else 0,
            "status": session.status,
            "can_resume": True,
            "started_at": session.started_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get resume info: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get resume info: {str(e)}"
        )


@router.get("/uploads/browser-upload/active")
async def get_active_browser_sessions(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Get all active browser upload sessions for the current user.
    Returns sessions that are in progress and can be resumed.
    Used by frontend to reconnect to active uploads on page load.
    """
    from app.models.upload import BrowserUploadSession
    from datetime import timedelta

    try:
        from beanie.operators import In

        # Find all non-completed sessions for this user (within 48 hours)
        cutoff_time = datetime.utcnow() - timedelta(hours=48)

        sessions = await BrowserUploadSession.find(
            BrowserUploadSession.user_id == str(current_user.id),
            In(BrowserUploadSession.status, ["initialized", "uploading"]),
            BrowserUploadSession.started_at >= cutoff_time,
        ).sort("-started_at").to_list()

        result = []
        for session in sessions:
            # Calculate missing chunks
            missing_chunks = [
                i for i in range(session.total_chunks)
                if i not in session.chunks_received
            ]

            progress = (session.bytes_received / session.file_size) * 100 if session.file_size > 0 else 0

            result.append({
                "upload_id": session.upload_id,
                "filename": session.filename,
                "file_size": session.file_size,
                "content_type": session.content_type.value if hasattr(session.content_type, 'value') else session.content_type,
                "total_chunks": session.total_chunks,
                "chunks_received": len(session.chunks_received),
                "missing_chunks": missing_chunks,
                "bytes_received": session.bytes_received,
                "progress": round(progress, 1),
                "status": session.status,
                "started_at": session.started_at.isoformat(),
                "last_activity": session.last_activity.isoformat(),
                "job_id": session.job_id,
            })

        return {
            "sessions": result,
            "count": len(result),
        }

    except Exception as e:
        logger.error(f"Failed to get active sessions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active sessions: {str(e)}"
        )


@router.post("/uploads/enqueue")
async def enqueue_upload(
    source_path: str,
    content_type: ContentType,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
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
            user_id=str(current_user.id)
        )
        
        return UploadJobResponse.from_orm(job)
        
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to enqueue upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enqueue upload: {str(e)}"
        )


@router.post("/uploads/enqueue-multiple")
async def enqueue_multiple_uploads(
    file_paths: List[str],
    content_type: ContentType,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
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
            user_id=str(current_user.id)
        )
        
        return {
            "enqueued": len(jobs),
            "jobs": [job_to_response(j) for j in jobs]
        }
        
    except Exception as e:
        logger.error(f"Failed to enqueue multiple uploads: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to enqueue uploads: {str(e)}"
        )


@router.get("/uploads/queue")
async def get_upload_queue(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
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
        response_dict = response.model_dump(mode='json')
        response_dict["queue_paused"] = upload_service._queue_paused
        response_dict["pause_reason"] = upload_service._pause_reason
        
        return response_dict
        
    except Exception as e:
        logger.error(f"Failed to get queue: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get queue: {str(e)}"
        )


@router.post("/uploads/queue/resume")
async def resume_upload_queue(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Manually start/resume the upload queue processor.
    Can be used to:
    - Resume a paused queue after fixing credential issues
    - Manually trigger queue processing (since auto-processing is disabled)
    """
    try:
        import asyncio

        if upload_service._queue_paused:
            # If paused, use the resume method which resets pause flags
            await upload_service.resume_queue()
            message = "Upload queue resumed successfully"
        else:
            # If not paused, manually trigger queue processing
            asyncio.create_task(upload_service.process_queue())
            message = "Upload queue processing started manually"

        return {
            "success": True,
            "message": message
        }

    except Exception as e:
        logger.error(f"Failed to start/resume queue: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start/resume queue: {str(e)}"
        )


@router.post("/uploads/queue/clear")
async def clear_upload_queue(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
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
            detail=f"Failed to clear queue: {str(e)}"
        )


@router.post("/uploads/queue/clear-completed")
async def clear_completed_jobs(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Clear completed, failed, and cancelled jobs from the queue history.
    Does not affect queued or processing jobs.
    """
    try:
        from app.models.upload import UploadJob, UploadStatus
        from beanie.operators import In

        # Delete all completed/failed/cancelled jobs
        result = await UploadJob.find(
            In(UploadJob.status, [
                UploadStatus.COMPLETED,
                UploadStatus.FAILED,
                UploadStatus.CANCELLED,
            ])
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
            detail=f"Failed to clear completed jobs: {str(e)}"
        )


@router.get("/uploads/history")
async def get_upload_history(
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Get upload history with pagination"""
    try:
        from app.models.upload import UploadJob, UploadStatus
        from beanie.operators import In
        
        jobs = await UploadJob.find(
            In(UploadJob.status, [
                UploadStatus.COMPLETED,
                UploadStatus.FAILED,
                UploadStatus.CANCELLED
            ])
        ).sort("-completed_at").skip(offset).limit(limit).to_list()
        
        total = await UploadJob.find(
            In(UploadJob.status, [
                UploadStatus.COMPLETED,
                UploadStatus.FAILED,
                UploadStatus.CANCELLED
            ])
        ).count()
        
        return {
            "total": total,
            "limit": limit,
            "offset": offset,
            "jobs": [UploadJobResponse.from_orm(j) for j in jobs]
        }
        
    except Exception as e:
        logger.error(f"Failed to get history: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get history: {str(e)}"
        )


@router.get("/uploads/job/{job_id}")
async def get_upload_job(
    job_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Get details of a specific upload job"""
    try:
        job = await upload_service.get_job(job_id)
        
        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found: {job_id}"
            )
        
        return UploadJobResponse.from_orm(job)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job: {str(e)}"
        )


@router.delete("/uploads/job/{job_id}")
async def cancel_upload_job(
    job_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Cancel an upload job"""
    try:
        success = await upload_service.cancel_job(job_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Job not found or already completed: {job_id}"
            )
        
        return {"status": "cancelled", "job_id": job_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel job: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to cancel job: {str(e)}"
        )


# ============ MONITORED FOLDERS ============

@router.get("/uploads/monitored-folders")
async def get_monitored_folders(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
) -> List[MonitoredFolderResponse]:
    """Get all monitored folders"""
    try:
        folders = await folder_monitor_service.get_all_monitored_folders()
        return [MonitoredFolderResponse.from_orm(f) for f in folders]
        
    except Exception as e:
        logger.error(f"Failed to get monitored folders: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get monitored folders: {str(e)}"
        )


@router.post("/uploads/monitored-folders")
async def add_monitored_folder(
    folder: MonitoredFolderCreate,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Add a new monitored folder"""
    try:
        created = await folder_monitor_service.add_monitored_folder(
            path=folder.path,
            content_type=folder.content_type,
            name=folder.name,
            auto_upload=folder.auto_upload,
            recursive=folder.recursive,
            file_patterns=folder.file_patterns,
            exclude_patterns=folder.exclude_patterns,
            scan_interval=folder.scan_interval,
            user_id=str(current_user.id)
        )
        
        return MonitoredFolderResponse.from_orm(created)
        
    except FileNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to add monitored folder: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add monitored folder: {str(e)}"
        )


@router.put("/uploads/monitored-folders/{folder_id}")
async def update_monitored_folder(
    folder_id: str,
    updates: MonitoredFolderUpdate,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Update a monitored folder"""
    try:
        updated = await folder_monitor_service.update_monitored_folder(
            folder_id=folder_id,
            **updates.dict(exclude_unset=True)
        )
        
        return MonitoredFolderResponse.from_orm(updated)
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to update monitored folder: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update monitored folder: {str(e)}"
        )


@router.delete("/uploads/monitored-folders/{folder_id}")
async def remove_monitored_folder(
    folder_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Remove a monitored folder"""
    try:
        success = await folder_monitor_service.remove_monitored_folder(folder_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Folder not found: {folder_id}"
            )
        
        return {"status": "removed", "folder_id": folder_id}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove monitored folder: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove monitored folder: {str(e)}"
        )


@router.post("/uploads/scan-now")
async def scan_monitored_folders_now(
    folder_id: Optional[str] = None,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """Trigger an immediate scan of monitored folders (background process)"""
    try:
        # Start scan in background to avoid blocking the API
        if folder_id:
            # Scan specific folder in background
            asyncio.create_task(folder_monitor_service.scan_folder_immediately(folder_id))
            logger.info(f"Started background scan for folder: {folder_id}")
            return {
                "success": True,
                "message": "Folder scan started in background",
                "folder_id": folder_id
            }
        else:
            # Scan all folders in background
            asyncio.create_task(folder_monitor_service.scan_and_enqueue())
            logger.info("Started background scan for all monitored folders")
            return {
                "success": True,
                "message": "Scan started in background for all monitored folders",
                "files_found": 0  # Will be counted in background
            }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Failed to start folder scan: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start folder scan: {str(e)}"
        )


@router.post("/uploads/reset-cache")
async def reset_folder_cache(
    folder_id: Optional[str] = None,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE))
):
    """
    Reset the 'known files' cache for monitored folders.
    This is useful when files were previously scanned but need to be rescanned 
    (e.g., after a drive was disconnected and reconnected).
    
    Args:
        folder_id: Optional - clear cache for specific folder. If omitted, clears all.
    """
    try:
        # Get count before clearing
        count_before = folder_monitor_service.get_known_files_count(folder_id)
        
        # Clear the cache
        folder_monitor_service.clear_known_files_cache(folder_id)
        
        if folder_id:
            return {
                "success": True,
                "message": f"Cache cleared for folder {folder_id}",
                "files_cleared": count_before,
                "folder_id": folder_id
            }
        else:
            return {
                "success": True,
                "message": "Cache cleared for all monitored folders",
                "files_cleared": count_before
            }
        
    except Exception as e:
        logger.error(f"Failed to clear folder cache: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear cache: {str(e)}"
        )


# ============ WEBSOCKET ============

# WebSocket connections manager
class UploadWebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        # Note: websocket should already be accepted before calling this
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")
    
    async def broadcast(self, message: dict):
        """Broadcast message to all connected clients"""
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Failed to send message: {e}")
                disconnected.append(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)


ws_manager = UploadWebSocketManager()

# Set the callback for upload service
upload_service.set_websocket_callback(ws_manager.broadcast)


@router.websocket("/uploads/ws")
async def upload_websocket(websocket: WebSocket, token: str = Query(...)):
    """
    WebSocket endpoint for real-time upload progress updates.
    
    Clients receive messages:
    - {"type": "queue_update", "stats": {...}, "active_job": {...}, "queue": [...], "recent_completed": [...]}
    - {"type": "connected", "message": "..."}
    - {"type": "error", "message": "..."}
    
    Clients can send:
    - {"type": "ping"}
    """
    # Authenticate user BEFORE accepting connection
    try:
        payload = decode_token(token)
        if not payload or not payload.get("sub"):
            # Must accept before closing
            await websocket.accept()
            await websocket.close(code=4001, reason="Invalid token")
            return
    except Exception:
        # Must accept before closing
        await websocket.accept()
        await websocket.close(code=4001, reason="Invalid token")
        return
    
    # Accept the WebSocket connection
    await websocket.accept()
    
    # Connect to manager
    await ws_manager.connect(websocket)
    
    try:
        # Send initial connection message
        await websocket.send_json({
            "type": "connected",
            "message": "Connected to upload service"
        })
        
        # Send initial queue state
        stats = await upload_service.get_queue_stats()
        active_job = await upload_service.get_active_job()
        queue = await upload_service.get_queue()
        recent = await upload_service.get_recent_completed(5)
        
        await websocket.send_json({
            "type": "queue_update",
            "stats": stats.model_dump(mode='json'),
            "active_job": job_to_response(active_job).model_dump(mode='json') if active_job else None,
            "queue": [job_to_response(j).model_dump(mode='json') for j in queue],
            "recent_completed": [job_to_response(j).model_dump(mode='json') for j in recent],
        })
        
        # Message loop
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                msg_type = message.get("type")
                
                if msg_type == "ping":
                    await websocket.send_json({
                        "type": "pong",
                        "timestamp": asyncio.get_event_loop().time()
                    })
                
            except json.JSONDecodeError:
                await websocket.send_json({
                    "type": "error",
                    "message": "Invalid JSON"
                })
                
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}", exc_info=True)
        ws_manager.disconnect(websocket)
