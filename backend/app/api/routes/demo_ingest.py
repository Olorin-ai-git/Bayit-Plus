"""Demo portal video upload and ingest endpoints."""
import uuid as _uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import (
    APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status,
)
from pydantic import BaseModel, Field, field_validator

from app.core.config import settings
from app.core.logging_config import get_logger
from app.core.security import get_current_user
from app.models.content import Content
from app.models.ingest_job import IngestJob
from app.models.user import User
from app.services import demo_usage_service
from app.services.demo_ingest_service import run_demo_pipeline_and_increment
from app.services.olorin.storage_service import storage_service
from app.services.video_probe_service import probe_duration, truncate_and_upload

logger = get_logger(__name__)

router = APIRouter(prefix="/demo", tags=["demo-ingest"])

_ALLOWED_CONTENT_TYPES = frozenset({
    "video/mp4", "video/webm", "video/quicktime",
    "video/x-matroska", "video/mpeg",
})


class DemoUploadResponse(BaseModel):
    url: str = Field(description="GCS URL for use with POST /demo/ingest")
    file_id: str = Field(description="Unique file identifier")
    size_bytes: int = Field(description="Uploaded file size in bytes")
    content_type: str = Field(description="Detected MIME type")


@router.post(
    "/upload",
    response_model=DemoUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a video file for demo processing",
)
async def demo_upload_video(
    file: UploadFile,
    user: User = Depends(get_current_user),
) -> DemoUploadResponse:
    content_type = file.content_type or ""
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=f"Unsupported file type: {content_type}. Accepted: mp4, webm, mov, mkv.",
        )

    data = await file.read()
    max_bytes = settings.DEMO_VIDEO_MAX_UPLOAD_MB * 1024 * 1024
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds {settings.DEMO_VIDEO_MAX_UPLOAD_MB}MB limit.",
        )

    file_id = _uuid.uuid4().hex
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "mp4"
    remote_path = f"demo/{user.id}/{file_id}.{ext}"

    try:
        url = await storage_service.upload_bytes(data, remote_path, content_type)
    except Exception:
        logger.exception("Demo upload failed", extra={"user_id": str(user.id)})
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Upload failed. Please try again.",
        )

    logger.info(
        "Demo video uploaded",
        extra={"user_id": str(user.id), "file_id": file_id, "size": len(data)},
    )
    return DemoUploadResponse(
        url=url, file_id=file_id, size_bytes=len(data), content_type=content_type,
    )


class DemoIngestRequest(BaseModel):
    video_url: str = Field(..., description="Video URL (YouTube, Vimeo, or direct)")
    title: Optional[str] = Field(None, description="Optional title hint")

    @field_validator("video_url")
    @classmethod
    def validate_url_scheme(cls, v: str) -> str:
        if not v.startswith(("http://", "https://")):
            raise ValueError("Only HTTP and HTTPS URLs are accepted")
        return v


class DemoIngestResponse(BaseModel):
    content_id: str
    job_id: str
    status: str = "processing"
    truncated: bool = False
    processed_duration_seconds: Optional[float] = None


@router.post(
    "/ingest",
    response_model=DemoIngestResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Process a video for demo AI features",
)
async def demo_ingest_video(
    request: DemoIngestRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
) -> DemoIngestResponse:
    user_id = str(user.id)

    allowed = await demo_usage_service.check_limit(user_id, "video_ingest")
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Demo video processing limit reached. Contact us for full access.",
        )

    max_seconds = settings.DEMO_VIDEO_MAX_DURATION_SECONDS
    truncated = False
    video_url = request.video_url

    try:
        duration = await probe_duration(video_url)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not determine video duration. Try a different URL or upload the file directly.",
        )

    if duration > max_seconds:
        try:
            video_url = await truncate_and_upload(video_url, max_seconds, user_id)
            truncated = True
            duration = float(max_seconds)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Video truncation failed. Try a shorter video or upload directly.",
            )

    content = Content(
        title=request.title or "User Video",
        stream_url=video_url,
        stream_type="mp4",
        persona_mode="speaker",
        is_published=False,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
    )
    await content.insert()

    job_id = _uuid.uuid4().hex
    job = IngestJob(
        job_id=job_id,
        partner_id="demo",
        content_id=str(content.id),
        video_url=video_url,
        direct=True,
        capabilities={"characters": "pending"},
    )
    await job.insert()

    background_tasks.add_task(run_demo_pipeline_and_increment, job, user_id)

    logger.info(
        "Demo ingest started",
        extra={
            "user_id": user_id,
            "content_id": str(content.id),
            "job_id": job_id,
            "duration": duration,
            "truncated": truncated,
        },
    )

    return DemoIngestResponse(
        content_id=str(content.id),
        job_id=job_id,
        truncated=truncated,
        processed_duration_seconds=duration,
    )
