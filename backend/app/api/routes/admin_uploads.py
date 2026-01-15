"""
Admin Upload Routes
Handle file uploads for content management (images, videos, etc.)
Includes queue management, monitored folders, and real-time WebSocket updates.
"""

from typing import Optional, List
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status, Depends, Request, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
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
from app.core.storage import storage
from app.services.upload_service import upload_service
from app.services.folder_monitor_service import folder_monitor_service

router = APIRouter()
logger = logging.getLogger(__name__)


# ============ HELPER FUNCTIONS ============

def job_to_response(job: UploadJob) -> UploadJobResponse:
    """Convert UploadJob to UploadJobResponse with current_stage"""
    response = UploadJobResponse.from_orm(job)
    response.current_stage = job.get_current_stage()
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
    Resume a paused upload queue.
    Call this after fixing credential issues.
    """
    try:
        if not upload_service._queue_paused:
            return {
                "success": True,
                "message": "Queue is not paused"
            }
        
        await upload_service.resume_queue()
        
        return {
            "success": True,
            "message": "Upload queue resumed successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to resume queue: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resume queue: {str(e)}"
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
