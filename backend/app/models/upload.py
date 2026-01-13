"""
Upload Management Models
Models for tracking file uploads, queue management, and monitored folders.
"""

from datetime import datetime
from typing import Optional, Dict, Any, List
from enum import Enum
from beanie import Document, Indexed
from pydantic import BaseModel, Field


class ContentType(str, Enum):
    """Type of content being uploaded"""
    MOVIE = "movie"
    PODCAST = "podcast"
    PODCAST_EPISODE = "podcast_episode"
    IMAGE = "image"
    AUDIO = "audio"
    SUBTITLE = "subtitle"
    OTHER = "other"


class UploadStatus(str, Enum):
    """Status of an upload job"""
    QUEUED = "queued"
    PROCESSING = "processing"
    UPLOADING = "uploading"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class UploadJob(Document):
    """
    Represents a single upload job in the queue.
    Tracks progress, status, and metadata for uploaded content.
    """
    # Job identification
    job_id: Indexed(str, unique=True)  # Unique job identifier
    
    # Content information
    type: ContentType
    source_path: str  # Original file path
    filename: str  # Original filename
    file_size: Optional[int] = None  # Size in bytes
    
    # Upload status
    status: UploadStatus = UploadStatus.QUEUED
    progress: float = 0.0  # 0-100 percentage
    bytes_uploaded: int = 0
    upload_speed: Optional[float] = None  # bytes per second
    eta_seconds: Optional[int] = None  # Estimated time to completion
    
    # Destination
    destination_url: Optional[str] = None  # Final URL after upload
    gcs_path: Optional[str] = None  # Path in Google Cloud Storage
    
    # Content metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Error handling
    error_message: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # User tracking
    created_by: Optional[str] = None  # User ID who initiated upload
    
    # Processing stages
    stages: Dict[str, Any] = Field(default_factory=dict)  # Track individual processing stages
    
    class Settings:
        name = "upload_jobs"
        indexes = [
            "job_id",
            "status",
            "created_at",
            "type",
        ]


class MonitoredFolder(Document):
    """
    Represents a folder that is monitored for new content.
    System automatically scans and uploads new files from monitored folders.
    """
    # Folder identification
    path: str  # Absolute path to folder
    name: Optional[str] = None  # Friendly name for the folder
    
    # Configuration
    enabled: bool = True
    content_type: ContentType
    auto_upload: bool = True  # Automatically upload new files
    recursive: bool = True  # Scan subdirectories
    
    # Filtering
    file_patterns: List[str] = Field(default_factory=list)  # e.g., ["*.mp4", "*.mkv"]
    exclude_patterns: List[str] = Field(default_factory=list)  # e.g., ["*.tmp", "*.part"]
    
    # Scanning status
    last_scanned: Optional[datetime] = None
    scan_interval: int = 3600  # Seconds between scans (default 1 hour)
    files_found: int = 0
    files_uploaded: int = 0
    
    # Error tracking
    last_error: Optional[str] = None
    error_count: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # User tracking
    created_by: Optional[str] = None  # User ID who created this monitor
    
    class Settings:
        name = "monitored_folders"
        indexes = [
            "path",
            "enabled",
            "last_scanned",
        ]


class UploadStats(Document):
    """
    Aggregated statistics for upload operations.
    Used for dashboard and reporting.
    """
    # Time period
    date: datetime = Field(default_factory=datetime.utcnow)
    period: str = "daily"  # daily, weekly, monthly
    
    # Upload statistics
    total_uploads: int = 0
    successful_uploads: int = 0
    failed_uploads: int = 0
    cancelled_uploads: int = 0
    
    # Size statistics
    total_bytes_uploaded: int = 0
    average_file_size: int = 0
    
    # Performance
    average_upload_speed: float = 0.0  # bytes per second
    average_processing_time: float = 0.0  # seconds
    
    # By content type
    uploads_by_type: Dict[str, int] = Field(default_factory=dict)
    
    class Settings:
        name = "upload_stats"
        indexes = [
            "date",
            "period",
        ]


# ============ Request/Response Models ============

class UploadJobCreate(BaseModel):
    """Request model for creating a new upload job"""
    source_path: str
    type: ContentType
    metadata: Optional[Dict[str, Any]] = None


class UploadJobResponse(BaseModel):
    """Response model for upload job"""
    job_id: str
    type: ContentType
    filename: str
    status: UploadStatus
    progress: float
    file_size: Optional[int] = None
    bytes_uploaded: int = 0
    upload_speed: Optional[float] = None
    eta_seconds: Optional[int] = None
    destination_url: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class MonitoredFolderCreate(BaseModel):
    """Request model for creating a monitored folder"""
    path: str
    name: Optional[str] = None
    content_type: ContentType
    auto_upload: bool = True
    recursive: bool = True
    file_patterns: List[str] = []
    exclude_patterns: List[str] = []
    scan_interval: int = 3600


class MonitoredFolderUpdate(BaseModel):
    """Request model for updating a monitored folder"""
    name: Optional[str] = None
    enabled: Optional[bool] = None
    auto_upload: Optional[bool] = None
    recursive: Optional[bool] = None
    file_patterns: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    scan_interval: Optional[int] = None


class MonitoredFolderResponse(BaseModel):
    """Response model for monitored folder"""
    id: str
    path: str
    name: Optional[str] = None
    enabled: bool
    content_type: ContentType
    auto_upload: bool
    recursive: bool
    file_patterns: List[str]
    exclude_patterns: List[str]
    scan_interval: int
    last_scanned: Optional[datetime] = None
    files_found: int
    files_uploaded: int
    last_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class QueueStats(BaseModel):
    """Statistics about the upload queue"""
    total_jobs: int = 0
    queued: int = 0
    processing: int = 0
    completed: int = 0
    failed: int = 0
    cancelled: int = 0
    total_size_bytes: int = 0
    uploaded_bytes: int = 0


class UploadQueueResponse(BaseModel):
    """Response model for queue status"""
    stats: QueueStats
    active_job: Optional[UploadJobResponse] = None
    queue: List[UploadJobResponse] = []
    recent_completed: List[UploadJobResponse] = []
