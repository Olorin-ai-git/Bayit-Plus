"""
Admin Upload Routes
Handle file uploads for content management (images, videos, etc.)
"""

from typing import Optional
from fastapi import APIRouter, UploadFile, File, Query, HTTPException, status, Depends, Request
from pydantic import BaseModel

from app.models.user import User
from app.models.admin import Permission, AuditAction
from app.core.security import get_current_active_user
from app.core.storage import storage

router = APIRouter()


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
