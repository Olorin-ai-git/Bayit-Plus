"""
Retraining Models
Feature: 026-llm-training-pipeline

Dataclasses for retraining triggers, regression tests, and model snapshots.
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, Optional


class RetrainReason(Enum):
    """Reasons for triggering retraining."""

    DRIFT_DETECTED = "drift_detected"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    SCHEDULED = "scheduled"
    MANUAL = "manual"


@dataclass
class RetrainEvent:
    """Event that triggers retraining."""

    event_id: str
    reason: RetrainReason
    triggered_at: datetime
    details: Dict[str, Any] = field(default_factory=dict)
    cooldown_expires: Optional[datetime] = None
    is_processed: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "event_id": self.event_id,
            "reason": self.reason.value,
            "triggered_at": self.triggered_at.isoformat(),
            "details": self.details,
            "cooldown_expires": (
                self.cooldown_expires.isoformat() if self.cooldown_expires else None
            ),
            "is_processed": self.is_processed,
        }


@dataclass
class RegressionResult:
    """Result from regression test suite."""

    test_id: str
    model_version: str
    run_at: datetime
    passed: bool
    baseline_pr_auc: float = 0.0
    current_pr_auc: float = 0.0
    baseline_f1: float = 0.0
    current_f1: float = 0.0
    degradation: float = 0.0
    sample_count: int = 0
    failure_reason: Optional[str] = None
    test_details: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "test_id": self.test_id,
            "model_version": self.model_version,
            "run_at": self.run_at.isoformat(),
            "passed": self.passed,
            "baseline_pr_auc": self.baseline_pr_auc,
            "current_pr_auc": self.current_pr_auc,
            "baseline_f1": self.baseline_f1,
            "current_f1": self.current_f1,
            "degradation": self.degradation,
            "sample_count": self.sample_count,
            "failure_reason": self.failure_reason,
        }

    @property
    def is_improvement(self) -> bool:
        """Check if current model improved over baseline."""
        return self.current_pr_auc > self.baseline_pr_auc


@dataclass
class ModelSnapshot:
    """Snapshot of model state at a point in time."""

    snapshot_id: str
    model_version: str
    created_at: datetime
    pr_auc: float = 0.0
    f1_score: float = 0.0
    threshold: float = 0.5
    prompt_version: Optional[str] = None
    model_path: Optional[str] = None
    calibrator_path: Optional[str] = None
    config_hash: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "snapshot_id": self.snapshot_id,
            "model_version": self.model_version,
            "created_at": self.created_at.isoformat(),
            "pr_auc": self.pr_auc,
            "f1_score": self.f1_score,
            "threshold": self.threshold,
            "prompt_version": self.prompt_version,
            "model_path": self.model_path,
            "calibrator_path": self.calibrator_path,
            "config_hash": self.config_hash,
            "metadata": self.metadata,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ModelSnapshot":
        """Create from dictionary."""
        return cls(
            snapshot_id=data["snapshot_id"],
            model_version=data["model_version"],
            created_at=datetime.fromisoformat(data["created_at"]),
            pr_auc=data.get("pr_auc", 0.0),
            f1_score=data.get("f1_score", 0.0),
            threshold=data.get("threshold", 0.5),
            prompt_version=data.get("prompt_version"),
            model_path=data.get("model_path"),
            calibrator_path=data.get("calibrator_path"),
            config_hash=data.get("config_hash"),
            metadata=data.get("metadata", {}),
        )
