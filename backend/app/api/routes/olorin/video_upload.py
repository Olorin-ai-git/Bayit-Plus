"""
Olorin.ai Video Upload API

B2B endpoint for direct video file upload to GCS.
Partners upload files here, then pass the returned URL to POST /videos/ingest.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.api.routes.olorin.dependencies import (
    get_current_partner,
    verify_capability,
)
from app.api.routes.olorin.errors import OlorinErrors, get_error_message
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.integration_partner import IntegrationPartner
from app.services.olorin.storage_service import storage_service

logger = get_logger(__name__)

router = APIRouter()

_ALLOWED_CONTENT_TYPES = frozenset({
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/x-matroska",
    "video/mpeg",
    "video/ogg",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/mp4",
})

_EXT_MAP = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-msvideo": "avi",
    "video/x-matroska": "mkv",
    "video/mpeg": "mpeg",
    "video/ogg": "ogv",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/ogg": "ogg",
    "audio/mp4": "m4a",
}


class UploadResponse(BaseModel):
    """Response after successful file upload."""

    url: str = Field(description="GCS URL to use with POST /videos/ingest")
    file_id: str = Field(description="Unique file identifier")
    size_bytes: int = Field(description="Uploaded file size in bytes")
    content_type: str = Field(description="Detected MIME type")


@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload a video file for processing",
    status_code=status.HTTP_201_CREATED,
)
async def upload_video(
    file: UploadFile,
    partner: IntegrationPartner = Depends(get_current_partner),
) -> UploadResponse:
    """Upload a video file directly. Returns a URL for use with /videos/ingest."""
    await verify_capability(partner, "video_ingest")

    content_type = (file.content_type or "").lower()
    if content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail=get_error_message(
                OlorinErrors.UPLOAD_INVALID_CONTENT_TYPE,
            ),
        )

    max_bytes = settings.olorin.b2b_max_upload_mb * 1024 * 1024
    data = await file.read()
    if len(data) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=get_error_message(
                OlorinErrors.UPLOAD_FILE_TOO_LARGE,
            ),
        )

    file_id = uuid.uuid4().hex
    ext = _EXT_MAP.get(content_type, "bin")
    prefix = settings.olorin.b2b_upload_bucket_prefix
    remote_path = f"{prefix}/{partner.partner_id}/{file_id}.{ext}"

    try:
        url = await storage_service.upload_bytes(
            data, remote_path, content_type,
        )
    except Exception:
        logger.exception(
            "Video upload to storage failed",
            extra={
                "partner_id": partner.partner_id,
                "file_id": file_id,
                "size": len(data),
            },
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=get_error_message(OlorinErrors.UPLOAD_FAILED),
        )

    logger.info(
        "B2B video uploaded",
        extra={
            "partner_id": partner.partner_id,
            "file_id": file_id,
            "size_bytes": len(data),
            "content_type": content_type,
        },
    )

    return UploadResponse(
        url=url,
        file_id=file_id,
        size_bytes=len(data),
        content_type=content_type,
    )
