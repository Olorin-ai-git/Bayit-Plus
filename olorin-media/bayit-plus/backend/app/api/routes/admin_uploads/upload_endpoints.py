"""
Basic upload endpoints for images, URL validation, and presigned URLs.
"""

import logging

from fastapi import (APIRouter, Depends, File, HTTPException, Query,
                     UploadFile, status)

from app.api.routes.admin_uploads.dependencies import has_permission
from app.api.routes.admin_uploads.models import (PresignedUrlResponse,
                                                 UploadResponse,
                                                 ValidateUrlResponse)
from app.core.security import get_current_active_user
from app.core.storage import storage
from app.models.admin import Permission
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/uploads/image")
async def upload_image(
    file: UploadFile = File(...),
    image_type: str = Query(
        default="general", pattern="^(thumbnails|backdrops|logos|covers|general)$"
    ),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
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
            url=url, filename=file.filename or "uploaded_file", size=file_size
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )


@router.post("/uploads/validate-url")
async def validate_stream_url(
    url: str = Query(...),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
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
            message=(
                "URL is accessible and valid"
                if is_valid
                else "URL is not accessible or invalid"
            ),
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Validation failed: {str(e)}",
        )


@router.post("/uploads/presigned-url")
async def get_presigned_url(
    filename: str = Query(...),
    content_type: str = Query(default="application/octet-stream"),
    current_user: User = Depends(has_permission(Permission.CONTENT_CREATE)),
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
            key=presigned_data["key"],
        )

    except NotImplementedError:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Presigned URLs not supported with local storage. Use /uploads/image instead.",
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned URL: {str(e)}",
        )


@router.get("/uploads/health")
async def uploads_health(current_user: User = Depends(get_current_active_user)):
    """Check upload service status."""
    return {
        "status": "healthy",
        "storage_type": "s3" if hasattr(storage, "s3_client") else "local",
        "message": "Upload service is ready",
    }
