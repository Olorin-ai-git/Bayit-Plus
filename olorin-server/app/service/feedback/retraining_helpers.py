"""
Helper Utilities for Retraining Pipeline.

Extracted utilities for job management and status tracking.

Week 11 Phase 4 implementation.
"""

from typing import Dict, Any
from datetime import datetime
from enum import Enum
import hashlib


class RetrainingTrigger(Enum):
    """Reasons for triggering retraining."""
    MANUAL = "manual"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    FEEDBACK_THRESHOLD = "feedback_threshold"
    DRIFT_DETECTED = "drift_detected"
    SCHEDULED = "scheduled"


class RetrainingStatus(Enum):
    """Status of retraining process."""
    IDLE = "idle"
    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


def generate_job_id() -> str:
    """Generate unique job ID."""
    timestamp = datetime.utcnow().isoformat()
    return hashlib.md5(timestamp.encode()).hexdigest()[:16]


def create_retraining_job(
    trigger_reason: RetrainingTrigger,
    model_id: str,
    model_version: str,
    training_samples: int,
    metadata: Dict[str, Any]
) -> Dict[str, Any]:
    """Create a retraining job structure."""
    return {
        "job_id": generate_job_id(),
        "trigger_reason": trigger_reason.value,
        "model_id": model_id,
        "model_version": model_version,
        "training_samples": training_samples,
        "metadata": metadata,
        "queued_at": datetime.utcnow().isoformat(),
        "status": "queued"
    }


def update_job_started(job: Dict[str, Any]) -> None:
    """Update job when training starts."""
    job["status"] = "in_progress"
    job["started_at"] = datetime.utcnow().isoformat()


def update_job_completed(job: Dict[str, Any], training_result: Dict[str, Any]) -> None:
    """Update job when training completes."""
    job["status"] = "completed"
    job["completed_at"] = datetime.utcnow().isoformat()
    job["training_result"] = training_result


def update_job_failed(job: Dict[str, Any], error: str) -> None:
    """Update job when training fails."""
    job["status"] = "failed"
    job["failed_at"] = datetime.utcnow().isoformat()
    job["error"] = error
