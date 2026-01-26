"""
Library Integrity Data Models

Data classes for verification results, checkpoints, and statistics.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional


@dataclass
class GCSVerificationResult:
    """Result of GCS file verification."""

    exists: bool
    accessible: bool = False
    status_code: Optional[int] = None
    size_matches: bool = False
    expected_size: Optional[int] = None
    actual_size: Optional[int] = None
    error: Optional[str] = None


@dataclass
class MetadataVerificationResult:
    """Result of metadata completeness check."""

    complete: bool
    missing_fields: List[str] = field(default_factory=list)
    stale: bool = False
    last_updated: Optional[datetime] = None


@dataclass
class RehydrationResult:
    """Result of TMDB metadata rehydration."""

    success: bool
    fields_updated: List[str] = field(default_factory=list)
    error: Optional[str] = None


@dataclass
class VerificationResult:
    """Complete verification result for a single content item."""

    content_id: str
    title: str
    stream_url: str

    # Metadata check
    metadata_complete: bool
    missing_metadata_fields: List[str] = field(default_factory=list)

    # Hash verification
    hash_verified: bool = False
    hash_matches: bool = False
    expected_hash: Optional[str] = None
    recalculated_hash: Optional[str] = None

    # GCS verification
    gcs_exists: bool = False
    gcs_accessible: bool = False
    gcs_status_code: Optional[int] = None
    gcs_size_matches: bool = False

    # Streaming verification
    streaming_tested: bool = False
    streaming_works: bool = False
    streaming_response_time: Optional[float] = None

    # Rehydration
    metadata_rehydrated: bool = False
    rehydration_fields: List[str] = field(default_factory=list)

    # Overall status
    has_critical_issues: bool = False
    has_warnings: bool = False
    issues: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)

    # Execution metadata
    verification_time: float = 0.0
    error: Optional[str] = None


@dataclass
class CheckpointData:
    """Checkpoint state for resumption."""

    last_id: Optional[str] = None
    processed_count: int = 0
    verified_count: int = 0
    issues_count: int = 0
    critical_count: int = 0
    start_time: str = ""
    checkpoint_time: str = ""
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VerificationStats:
    """Overall verification statistics."""

    total_scanned: int = 0
    total_verified: int = 0
    total_issues: int = 0
    critical_issues: int = 0
    hash_mismatches: int = 0
    gcs_missing: int = 0
    gcs_inaccessible: int = 0
    streaming_failures: int = 0
    metadata_incomplete: int = 0
    metadata_rehydrated: int = 0
    results: List[VerificationResult] = field(default_factory=list)
    start_time: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    end_time: Optional[datetime] = None

    @property
    def duration_seconds(self) -> float:
        """Calculate total duration in seconds."""
        end = self.end_time or datetime.now(timezone.utc)
        return (end - self.start_time).total_seconds()
