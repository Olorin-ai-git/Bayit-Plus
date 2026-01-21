"""
Response models for admin uploads endpoints.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class UploadResponse(BaseModel):
    """Response for successful file upload."""

    url: str
    filename: str
    size: int


class ValidateUrlResponse(BaseModel):
    """Response for URL validation."""

    valid: bool
    message: str


class PresignedUrlResponse(BaseModel):
    """Response for presigned URL generation."""

    upload_url: str
    fields: dict
    key: str


class IntegrityStatusResponse(BaseModel):
    """Response model for integrity status."""

    orphaned_gcs_files: int
    orphaned_content_records: int
    stuck_upload_jobs: int
    stale_hash_locks: int
    last_checked: Optional[datetime]
    issues_found: bool


class CleanupResponse(BaseModel):
    """Response model for cleanup operations."""

    dry_run: bool
    started_at: str
    completed_at: Optional[str]
    gcs_cleanup: Optional[dict]
    content_cleanup: Optional[dict]
    job_recovery: Optional[dict]
    overall_success: bool
