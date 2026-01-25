"""
Browser-based chunked upload endpoints.

Supports resumable uploads for large files via chunked upload protocol.
"""

import json
import logging
import math
from datetime import datetime, timedelta
from pathlib import Path
from uuid import uuid4

from fastapi import (APIRouter, Depends, File, HTTPException, Query,
                     UploadFile, status)

from app.api.routes.admin_uploads.dependencies import has_permission
from app.core.config import settings
from app.core.exceptions import DuplicateUploadQueueError
from app.models.admin import Permission
from app.models.upload import (BrowserUploadSession, ContentType,
                               UploadJobResponse)
from app.models.user import User
from app.services.upload_service import upload_service

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/uploads/browser-upload/init")
async def init_browser_upload(
    filename: str = Query(...),
    file_size: int = Query(...),
    content_type: ContentType = Query(...),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Initialize a browser upload session.
    Returns an upload_id to use for chunked uploads.
    """
    try:
        # Validate file type
        allowed_extensions = {".mp4", ".mkv", ".avi", ".mov", ".webm", ".m4v", ".wmv"}
        file_ext = Path(filename).suffix.lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type: {file_ext}. Allowed: {', '.join(allowed_extensions)}",
            )

        # Check file size (max 10GB)
        if file_size > 10 * 1024 * 1024 * 1024:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File too large. Maximum size is 10GB.",
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

        with open(upload_dir / "metadata.json", "w") as f:
            json.dump(metadata, f)

        # Create database session record for resumability
        session = BrowserUploadSession(
            upload_id=upload_id,
            filename=filename,
            file_size=file_size,
            content_type=content_type,
            user_id=str(current_user.id),
            total_chunks=math.ceil(file_size / (5 * 1024 * 1024)),  # 5MB chunks
        )
        await session.insert()

        logger.info(
            f"Browser upload initialized: {upload_id} for {filename} ({file_size} bytes)"
        )

        return {
            "upload_id": upload_id,
            "filename": filename,
            "file_size": file_size,
            "chunk_size": 5 * 1024 * 1024,  # 5MB chunks recommended
            "status": "initialized",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to init browser upload: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to initialize upload: {str(e)}",
        )


@router.post("/uploads/browser-upload/{upload_id}/chunk")
async def upload_chunk(
    upload_id: str,
    chunk_index: int = Query(...),
    chunk: UploadFile = File(...),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Upload a single chunk of a file."""
    try:
        upload_dir = Path(settings.UPLOAD_DIR) / upload_id
        metadata_path = upload_dir / "metadata.json"

        if not metadata_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Upload session not found: {upload_id}",
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
        session = await BrowserUploadSession.find_one(
            BrowserUploadSession.upload_id == upload_id
        )
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found in database",
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
            "status": "uploading",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to upload chunk: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload chunk: {str(e)}",
        )


@router.post("/uploads/browser-upload/{upload_id}/complete")
async def complete_browser_upload(
    upload_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Complete the upload by assembling chunks and enqueueing for processing."""
    try:
        upload_dir = Path(settings.UPLOAD_DIR) / upload_id
        metadata_path = upload_dir / "metadata.json"

        if not metadata_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Upload session not found: {upload_id}",
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

        logger.info(
            f"Browser upload assembled: {final_path} ({final_path.stat().st_size} bytes)"
        )

        # Enqueue for processing
        try:
            job = await upload_service.enqueue_upload(
                source_path=str(final_path),
                content_type=ContentType(metadata["content_type"]),
                user_id=metadata["user_id"],
            )
        except DuplicateUploadQueueError as e:
            # File already queued - return 409 Conflict with user-friendly message
            logger.warning(
                f"Duplicate upload attempt for {metadata['filename']}: {e.existing_job_id}"
            )
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": f"This file is already in the upload queue",
                    "filename": e.filename,
                    "existing_job_id": e.existing_job_id,
                    "action": "Please wait for the existing upload to complete or cancel it first",
                },
            )

        # Update metadata
        metadata["status"] = "completed"
        metadata["job_id"] = job.job_id
        with open(metadata_path, "w") as f:
            json.dump(metadata, f)

        # Update database session
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
            detail=f"Failed to complete upload: {str(e)}",
        )


@router.get("/uploads/browser-upload/{upload_id}/status")
async def get_browser_upload_status(
    upload_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """Get the status of an upload session."""
    try:
        upload_dir = Path(settings.UPLOAD_DIR) / upload_id
        metadata_path = upload_dir / "metadata.json"

        if not metadata_path.exists():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Upload session not found: {upload_id}",
            )

        with open(metadata_path, "r") as f:
            metadata = json.load(f)

        progress = (
            (metadata["bytes_received"] / metadata["file_size"]) * 100
            if metadata["file_size"] > 0
            else 0
        )

        return {
            "upload_id": upload_id,
            "filename": metadata["filename"],
            "bytes_received": metadata["bytes_received"],
            "total_size": metadata["file_size"],
            "progress": round(progress, 1),
            "status": metadata["status"],
            "job_id": metadata.get("job_id"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get upload status: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get upload status: {str(e)}",
        )


@router.get("/uploads/browser-upload/{upload_id}/resume-info")
async def get_resume_info(
    upload_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Get resume information for a paused/failed upload.
    Returns which chunks are already received and which are missing.
    """
    try:
        session = await BrowserUploadSession.find_one(
            BrowserUploadSession.upload_id == upload_id
        )

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Upload session not found: {upload_id}",
            )

        # Check if session is resumable
        if session.status not in ["initialized", "uploading", "timeout", "failed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Session not resumable (status: {session.status})",
            )

        # Check if session expired (> 48 hours old)
        if datetime.utcnow() - session.started_at > timedelta(hours=48):
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Session expired (>48 hours old)",
            )

        # Calculate missing chunks
        missing_chunks = [
            i for i in range(session.total_chunks) if i not in session.chunks_received
        ]

        return {
            "upload_id": upload_id,
            "filename": session.filename,
            "total_chunks": session.total_chunks,
            "chunks_received": sorted(session.chunks_received),
            "missing_chunks": missing_chunks,
            "bytes_received": session.bytes_received,
            "total_size": session.file_size,
            "progress": (
                (session.bytes_received / session.file_size) * 100
                if session.file_size > 0
                else 0
            ),
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
            detail=f"Failed to get resume info: {str(e)}",
        )


@router.get("/uploads/browser-upload/active")
async def get_active_browser_sessions(
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
):
    """
    Get all active browser upload sessions for the current user.
    Returns sessions that are in progress and can be resumed.
    """
    try:
        from beanie.operators import In

        # Find all non-completed sessions for this user (within 48 hours)
        cutoff_time = datetime.utcnow() - timedelta(hours=48)

        sessions = (
            await BrowserUploadSession.find(
                BrowserUploadSession.user_id == str(current_user.id),
                In(BrowserUploadSession.status, ["initialized", "uploading"]),
                BrowserUploadSession.started_at >= cutoff_time,
            )
            .sort("-started_at")
            .to_list()
        )

        result = []
        for session in sessions:
            # Calculate missing chunks
            missing_chunks = [
                i
                for i in range(session.total_chunks)
                if i not in session.chunks_received
            ]

            progress = (
                (session.bytes_received / session.file_size) * 100
                if session.file_size > 0
                else 0
            )

            result.append(
                {
                    "upload_id": session.upload_id,
                    "filename": session.filename,
                    "file_size": session.file_size,
                    "content_type": (
                        session.content_type.value
                        if hasattr(session.content_type, "value")
                        else session.content_type
                    ),
                    "total_chunks": session.total_chunks,
                    "chunks_received": len(session.chunks_received),
                    "missing_chunks": missing_chunks,
                    "bytes_received": session.bytes_received,
                    "progress": round(progress, 1),
                    "status": session.status,
                    "started_at": session.started_at.isoformat(),
                    "last_activity": session.last_activity.isoformat(),
                    "job_id": session.job_id,
                }
            )

        return {
            "sessions": result,
            "count": len(result),
        }

    except Exception as e:
        logger.error(f"Failed to get active sessions: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get active sessions: {str(e)}",
        )
