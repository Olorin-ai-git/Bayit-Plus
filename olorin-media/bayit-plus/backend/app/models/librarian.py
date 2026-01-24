"""
Librarian AI Agent Database Models
Models for audit reports, actions, and stream validation cache
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from beanie import Document
from pydantic import Field


class AuditReport(Document):
    """
    Comprehensive audit report for a librarian run.
    Stores all findings, fixes, and health metrics.
    """

    audit_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    audit_date: datetime = Field(default_factory=datetime.utcnow)
    audit_type: str  # "daily_incremental", "weekly_full", "manual"
    execution_time_seconds: float = 0.0
    status: str = "in_progress"  # "in_progress", "completed", "failed", "partial"

    # Summary metrics
    summary: Dict[str, Any] = Field(default_factory=dict)
    # {
    #   "total_items": 2000,
    #   "healthy_items": 1847,
    #   "issues_found": 153,
    #   "issues_fixed": 23,
    #   "manual_review_needed": 5
    # }

    # Detailed results by content type
    content_results: Dict[str, Any] = Field(default_factory=dict)
    live_channel_results: Dict[str, Any] = Field(default_factory=dict)
    podcast_results: Dict[str, Any] = Field(default_factory=dict)
    radio_results: Dict[str, Any] = Field(default_factory=dict)

    # Issues found
    broken_streams: List[Dict[str, Any]] = Field(default_factory=list)
    missing_metadata: List[Dict[str, Any]] = Field(default_factory=list)
    misclassifications: List[Dict[str, Any]] = Field(default_factory=list)
    orphaned_items: List[Dict[str, Any]] = Field(default_factory=list)

    # Actions taken
    fixes_applied: List[Dict[str, Any]] = Field(default_factory=list)
    manual_review_needed: List[Dict[str, Any]] = Field(default_factory=list)

    # Database health
    database_health: Dict[str, Any] = Field(default_factory=dict)
    # {
    #   "connection_status": "healthy",
    #   "collections_checked": 10,
    #   "referential_integrity": "passed",
    #   "orphaned_documents": 0,
    #   "index_status": "all_present"
    # }

    # Content maintenance results
    maintenance_results: Dict[str, Any] = Field(default_factory=dict)
    # {
    #   "status": "completed",
    #   "total_updates": 42,
    #   "tasks": {
    #     "podcast_sync": {"episodes_added": 15},
    #     "poster_attachment": {"items_enriched": 10},
    #     "subtitle_addition": {"subtitles_added": 12},
    #     "podcast_translation": {"episodes_queued": 5}
    #   }
    # }

    # AI insights
    ai_insights: List[str] = Field(default_factory=list)

    # Kids content audit results
    kids_audit_results: Optional[Dict[str, Any]] = None
    # {
    #   "total_kids_items": int,
    #   "healthy_items": int,
    #   "age_rating_issues": List,
    #   "category_issues": List,
    #   "inappropriate_flags": List,
    #   "missing_educational_tags": List
    # }

    # Execution logs (for real-time streaming to UI)
    execution_logs: List[Dict[str, Any]] = Field(default_factory=list)
    # Each log entry: {
    #   "id": str,
    #   "timestamp": ISO string,
    #   "level": "info/warn/error/success/debug/trace",
    #   "message": str (concise message),
    #   "source": str,
    #   "itemName": str (optional - content title being processed),
    #   "contentId": str (optional - content ID),
    #   "metadata": dict (optional - structured data like tool_result, tool_input)
    # }

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

    class Settings:
        name = "audit_reports"
        indexes = [
            "audit_date",
            "status",
            "audit_type",
            ("audit_type", "audit_date"),
        ]


class LibrarianAction(Document):
    """
    Individual action taken by the librarian agent.
    Includes rollback capability and audit trail.
    """

    action_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    audit_id: str  # Links to parent AuditReport
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    # Action classification
    action_type: str  # "add_poster", "update_metadata", "recategorize", "fix_url"
    content_id: str  # ID of the content item affected
    content_type: str  # "content", "live_channel", "podcast_episode", "radio"
    issue_type: str  # "missing_poster", "broken_stream", "misclassification", etc.

    # State tracking for rollback
    before_state: Dict[str, Any] = Field(default_factory=dict)
    after_state: Dict[str, Any] = Field(default_factory=dict)

    # Confidence and approval
    confidence_score: Optional[float] = None  # 0.0-1.0 for AI-driven actions
    auto_approved: bool = False  # Whether action was automatically approved
    rollback_available: bool = True  # Whether rollback is possible

    # Rollback tracking
    rolled_back: bool = False
    rollback_timestamp: Optional[datetime] = None
    rollback_reason: Optional[str] = None

    # Metadata
    description: Optional[str] = None  # Human-readable description of the action
    error_message: Optional[str] = None  # If action failed

    class Settings:
        name = "librarian_actions"
        indexes = [
            "audit_id",
            "content_id",
            "timestamp",
            "action_type",
            ("audit_id", "action_type"),
            ("content_id", "timestamp"),
            "rolled_back",
        ]


class StreamValidationCache(Document):
    """
    Cache for stream validation results to avoid redundant checks.
    TTL: 48 hours for valid streams, 4 hours for invalid streams.
    """

    stream_url: str  # Unique identifier
    last_validated: datetime = Field(default_factory=datetime.utcnow)
    is_valid: bool = False

    # Validation details
    status_code: Optional[int] = None  # HTTP status code
    response_time_ms: Optional[int] = None  # Response time in milliseconds
    error_message: Optional[str] = None  # Error details if validation failed

    # Stream details
    stream_type: Optional[str] = None  # "hls", "dash", "audio"
    content_type: Optional[str] = None  # Content-Type header

    # For HLS streams
    manifest_parsed: bool = False  # Whether m3u8 was successfully parsed
    segments_count: Optional[int] = None  # Number of segments found
    first_segment_accessible: Optional[bool] = None  # First .ts segment check

    # TTL management
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow())

    class Settings:
        name = "stream_validation_cache"
        indexes = [
            "stream_url",
            "last_validated",
            ("stream_url", "last_validated"),
            "expires_at",  # For TTL cleanup
            "is_valid",
        ]


class ClassificationVerificationCache(Document):
    """
    Cache for AI classification verification results.
    TTL: 7 days to avoid redundant Claude API calls.
    """

    content_id: str
    category_id: str
    last_verified: datetime = Field(default_factory=datetime.utcnow)

    # Verification results
    fit_score: int = 5  # 1-10 scale
    is_correct: bool = True
    suggested_category_id: Optional[str] = None
    suggested_category_name: Optional[str] = None
    reasoning: Optional[str] = None  # Claude's explanation

    # Content snapshot (for reference)
    content_title: Optional[str] = None
    content_genre: Optional[str] = None
    category_name: Optional[str] = None

    # TTL management
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow())

    class Settings:
        name = "classification_verification_cache"
        indexes = [
            "content_id",
            ("content_id", "category_id"),
            "last_verified",
            "expires_at",  # For TTL cleanup
            "is_correct",
        ]
