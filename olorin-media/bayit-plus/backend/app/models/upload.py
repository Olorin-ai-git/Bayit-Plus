"""
Upload Management Models
Models for tracking file uploads, queue management, and monitored folders.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from beanie import Document, Indexed
from pydantic import BaseModel, Field
from pymongo import ASCENDING, IndexModel


class ContentType(str, Enum):
    """Type of content being uploaded"""

    MOVIE = "movie"
    SERIES = "series"
    AUDIOBOOK = "audiobook"
    PODCAST = "podcast"
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
    file_hash: Optional[str] = None  # SHA256 hash for duplicate detection

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
    stages: Dict[str, Any] = Field(
        default_factory=dict
    )  # Track individual processing stages
    stage_timings: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict
    )  # Track timing for each stage

    def get_current_stage(self) -> Optional[str]:
        """Get human-readable current processing stage"""
        if self.status == UploadStatus.QUEUED:
            return "Queued"
        elif self.status == UploadStatus.CANCELLED:
            return "Cancelled"
        elif self.status == UploadStatus.FAILED:
            return "Failed"
        elif self.status == UploadStatus.COMPLETED:
            # Check if enrichment stages are still running
            if self.stages.get("imdb_lookup") == "in_progress":
                return "Fetching IMDB info..."
            elif self.stages.get("subtitle_extraction") == "in_progress":
                return "Extracting subtitles..."
            return "Completed"

        # For processing/uploading status, check which stage is in progress
        if self.stages.get("hash_calculation") == "in_progress":
            return "Calculating hash..."
        elif (
            self.stages.get("hash_calculation") == "completed"
            and self.stages.get("metadata_extraction") != "completed"
        ):
            if self.stages.get("metadata_extraction") == "in_progress":
                return "Extracting metadata..."
            return "Verifying duplicate..."
        elif (
            self.stages.get("metadata_extraction") == "completed"
            and self.stages.get("gcs_upload") != "completed"
        ):
            if self.stages.get("gcs_upload") == "in_progress":
                return "Uploading to cloud..."
            return "Preparing upload..."
        elif (
            self.stages.get("gcs_upload") == "completed"
            and self.stages.get("database_insert") != "completed"
        ):
            if self.stages.get("database_insert") == "in_progress":
                return "Saving to database..."
            return "Finalizing..."
        elif self.stages.get("database_insert") == "completed":
            # Critical stages done, check enrichment
            if self.stages.get("imdb_lookup") == "in_progress":
                return "Fetching IMDB info..."
            elif self.stages.get("subtitle_extraction") == "in_progress":
                return "Extracting subtitles..."
            return "Completed"

        # Default based on status
        if self.status == UploadStatus.UPLOADING:
            return "Uploading..."
        elif self.status == UploadStatus.PROCESSING:
            return "Processing..."

        return None

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
    exclude_patterns: List[str] = Field(
        default_factory=list
    )  # e.g., ["*.tmp", "*.part"]

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


class BrowserUploadSession(Document):
    """
    Track browser upload sessions with chunk-level detail for resumability.
    Allows uploads to be paused and resumed without losing progress.
    """

    # Session identification
    upload_id: Indexed(str, unique=True)

    # File information
    filename: str
    file_size: int
    content_type: ContentType
    user_id: str

    # Chunk tracking
    total_chunks: int
    chunks_received: List[int] = Field(
        default_factory=list
    )  # Indices of received chunks
    bytes_received: int = 0

    # Status tracking
    status: str = "initialized"  # initialized, uploading, completed, timeout, failed

    # Timing
    started_at: datetime = Field(default_factory=datetime.utcnow)
    last_activity: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    # Upload job reference (once enqueued)
    job_id: Optional[str] = None

    # Error tracking
    error_message: Optional[str] = None

    class Settings:
        name = "browser_upload_sessions"
        indexes = [
            "upload_id",
            "status",
            "user_id",
            "started_at",
        ]


class DryRunReason(str, Enum):
    """Reason why a file would or wouldn't be uploaded in dry run"""

    NEW_FILE = "new_file"
    DUPLICATE_HASH = "duplicate_hash"
    DUPLICATE_FILENAME = "duplicate_filename"
    DUPLICATE_IN_QUEUE = "duplicate_in_queue"
    VALIDATION_FAILED = "validation_failed"


class DryRunDuplicateInfo(BaseModel):
    """Information about existing duplicate content"""

    content_id: str
    title: str
    stream_url: str
    created_at: datetime


class DryRunFileInfo(BaseModel):
    """File information from dry run"""

    hash: Optional[str] = None
    size: int
    filename: str


class DryRunResult(BaseModel):
    """Result of dry run for a single file"""

    would_upload: bool
    reason: DryRunReason
    file_info: DryRunFileInfo
    duplicate_info: Optional[DryRunDuplicateInfo] = None
    validation_errors: List[str] = Field(default_factory=list)
    estimated_stages: List[str] = Field(default_factory=list)


class DryRunResponse(BaseModel):
    """Response for dry run operation"""

    results: List[DryRunResult]
    summary: Dict[str, int]


class UrlValidationResponse(BaseModel):
    """Response for URL validation"""

    valid: bool
    accessible: bool
    file_size: Optional[int] = None
    content_type: Optional[str] = None
    filename: Optional[str] = None
    error: Optional[str] = None


class UrlUploadRequest(BaseModel):
    """Request to upload from URL"""

    url: List[str] = Field(..., description="URLs to download and upload")
    content_type: ContentType
    headers: Dict[str, str] = Field(default_factory=dict)
    timeout: int = Field(default=300, description="Download timeout in seconds")


class UrlUploadJob(BaseModel):
    """Status of URL upload job"""

    job_id: str
    url: str
    status: str  # downloading, downloaded, queued, processing, completed, failed
    download_progress: float = 0.0
    error: Optional[str] = None


class UrlUploadResponse(BaseModel):
    """Response for URL upload request"""

    success: bool
    count: int
    jobs: List[UrlUploadJob]
    error: Optional[str] = None


class UploadHashLock(Document):
    """
    Distributed lock for preventing duplicate uploads during processing.
    Uses MongoDB TTL index for automatic cleanup of stale locks.
    """

    file_hash: str  # SHA256 hash of the file
    job_id: str  # ID of the job holding the lock
    acquired_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime  # TTL index will auto-delete expired locks

    class Settings:
        name = "upload_hash_locks"
        indexes = [
            IndexModel([("file_hash", ASCENDING)], unique=True),
            IndexModel([("expires_at", ASCENDING)], expireAfterSeconds=0),
            "job_id",
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
    current_stage: Optional[str] = None  # Human-readable current processing stage
    stages: Dict[str, Any] = {}  # Detailed stage status for progress indicator

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
    content_type: Optional[ContentType] = None
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

    @classmethod
    def from_orm(cls, obj):
        """Custom from_orm to handle ObjectId conversion"""
        data = {
            "id": str(obj.id),
            "path": obj.path,
            "name": obj.name,
            "enabled": obj.enabled,
            "content_type": obj.content_type,
            "auto_upload": obj.auto_upload,
            "recursive": obj.recursive,
            "file_patterns": obj.file_patterns,
            "exclude_patterns": obj.exclude_patterns,
            "scan_interval": obj.scan_interval,
            "last_scanned": obj.last_scanned,
            "files_found": obj.files_found,
            "files_uploaded": obj.files_uploaded,
            "last_error": obj.last_error,
            "created_at": obj.created_at,
            "updated_at": obj.updated_at,
        }
        return cls(**data)

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
    skipped: int = 0  # Duplicates and informational skips
    total_size_bytes: int = 0
    uploaded_bytes: int = 0


class UploadQueueResponse(BaseModel):
    """Response model for queue status"""

    stats: QueueStats
    active_job: Optional[UploadJobResponse] = None
    queue: List[UploadJobResponse] = []
    recent_completed: List[UploadJobResponse] = []
