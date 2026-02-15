"""
Admin Interactive Moments API Routes

Admin endpoints for curating interactive moments in VOD content.
"""

import tempfile
import subprocess
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.user import User
from app.models.content import Content
from app.models.vod_interaction import InteractiveMoment
from app.core.security import get_current_user
from app.api.routes.admin.auth import require_admin
from app.core.storage import storage_service
from app.core.logging_config import get_logger

logger = get_logger(__name__)


router = APIRouter(prefix="/admin/interactive-moments", tags=["Admin - Interactive Moments"])


class UpdateMomentsRequest(BaseModel):
    """Request to update interactive moments for content"""
    moments: List[InteractiveMoment] = Field(..., description="List of interactive moments")


class ExtractFrameRequest(BaseModel):
    """Request to extract video frame at timestamp"""
    content_id: str = Field(..., description="Content ID")
    timestamp: float = Field(..., ge=0, description="Timestamp in seconds")


class ExtractFrameResponse(BaseModel):
    """Response with extracted frame URL"""
    gcs_url: str = Field(..., description="GCS URL of extracted frame")


@router.patch("/content/{content_id}/moments")
async def update_interactive_moments(
    content_id: str,
    request: UpdateMomentsRequest,
    current_user: User = Depends(require_admin)
):
    """
    Update interactive moments for content (admin only)

    Args:
        content_id: Content ID
        request: List of interactive moments
        current_user: Admin user

    Returns:
        Update confirmation
    """
    try:
        content = await Content.get(content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )

        content.interactive_moments = request.moments
        content.supports_avatar_interaction = len(request.moments) > 0
        await content.save()

        logger.info(
            "Interactive moments updated",
            extra={
                "content_id": content_id,
                "moments_count": len(request.moments),
                "admin_id": str(current_user.id)
            }
        )

        return {
            "message": "Interactive moments updated successfully",
            "content_id": content_id,
            "moments_count": len(request.moments),
            "supports_avatar_interaction": content.supports_avatar_interaction
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to update interactive moments",
            extra={
                "content_id": content_id,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update interactive moments"
        )


@router.post("/extract-frame", response_model=ExtractFrameResponse)
async def extract_character_frame(
    request: ExtractFrameRequest,
    current_user: User = Depends(require_admin)
):
    """
    Extract video frame at timestamp for character animation (admin only)

    Args:
        request: Content ID and timestamp
        current_user: Admin user

    Returns:
        GCS URL of extracted frame
    """
    try:
        content = await Content.get(request.content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )

        frame_path = await _extract_frame_ffmpeg(
            video_url=content.stream_url,
            timestamp=request.timestamp
        )

        gcs_path = f"interactive-moments/{request.content_id}/frame_{int(request.timestamp)}.jpg"
        gcs_url = await storage_service.upload_file(
            frame_path,
            gcs_path,
            content_type="image/jpeg"
        )

        import os
        os.unlink(frame_path)

        logger.info(
            "Frame extracted for interactive moment",
            extra={
                "content_id": request.content_id,
                "timestamp": request.timestamp,
                "gcs_url": gcs_url,
                "admin_id": str(current_user.id)
            }
        )

        return ExtractFrameResponse(gcs_url=gcs_url)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to extract frame",
            extra={
                "content_id": request.content_id,
                "timestamp": request.timestamp,
                "error": str(e)
            }
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to extract video frame"
        )


@router.get("/content/{content_id}/moments", response_model=List[InteractiveMoment])
async def get_interactive_moments(
    content_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Get interactive moments for content

    Args:
        content_id: Content ID
        current_user: Authenticated user

    Returns:
        List of interactive moments
    """
    try:
        content = await Content.get(content_id)
        if not content:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Content not found"
            )

        return content.interactive_moments

    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            "Failed to get interactive moments",
            extra={"content_id": content_id, "error": str(e)}
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve interactive moments"
        )


async def _extract_frame_ffmpeg(video_url: str, timestamp: float) -> str:
    """
    Extract single frame from video using FFmpeg

    Args:
        video_url: URL of video
        timestamp: Timestamp in seconds

    Returns:
        Path to extracted frame (temporary file)
    """
    with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
        output_path = tmp.name

    cmd = [
        "ffmpeg",
        "-ss", str(timestamp),
        "-i", video_url,
        "-frames:v", "1",
        "-q:v", "2",
        "-y",
        output_path
    ]

    result = subprocess.run(
        cmd,
        capture_output=True,
        text=True,
        timeout=30
    )

    if result.returncode != 0:
        raise Exception(f"FFmpeg frame extraction failed: {result.stderr}")

    return output_path
