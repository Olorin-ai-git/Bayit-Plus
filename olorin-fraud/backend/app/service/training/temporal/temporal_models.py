"""
Temporal Models
Feature: 026-llm-training-pipeline

Dataclasses for temporal framework in fraud detection training.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class TemporalWindow:
    """Represents a time window for feature extraction or labeling."""

    window_id: str
    start_date: datetime
    end_date: datetime
    window_months: int
    purpose: str  # "feature" or "observation"

    def get_duration_days(self) -> int:
        """Get window duration in days."""
        return (self.end_date - self.start_date).days

    def contains(self, dt: datetime) -> bool:
        """Check if datetime falls within window."""
        return self.start_date <= dt <= self.end_date

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "window_id": self.window_id,
            "start_date": self.start_date.isoformat(),
            "end_date": self.end_date.isoformat(),
            "window_months": self.window_months,
            "purpose": self.purpose,
            "duration_days": self.get_duration_days(),
        }


@dataclass
class OOTVConfig:
    """Configuration for out-of-time validation."""

    enabled: bool = True
    train_months: int = 9
    eval_months: int = 3
    min_train_samples: int = 100
    min_eval_samples: int = 50


@dataclass
class DriftAlert:
    """Alert for detected feature drift."""

    alert_id: str
    feature_name: str
    drift_score: float
    threshold: float
    detected_at: datetime
    severity: str  # "low", "medium", "high"
    baseline_window: Optional[TemporalWindow] = None
    current_window: Optional[TemporalWindow] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def is_actionable(self) -> bool:
        """Check if drift requires action."""
        return self.severity in ("medium", "high")

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "alert_id": self.alert_id,
            "feature_name": self.feature_name,
            "drift_score": self.drift_score,
            "threshold": self.threshold,
            "detected_at": self.detected_at.isoformat(),
            "severity": self.severity,
            "is_actionable": self.is_actionable(),
            "metadata": self.metadata,
        }


@dataclass
class WindowPair:
    """Pair of feature and observation windows for temporal holdout."""

    feature_window: TemporalWindow
    observation_window: TemporalWindow
    pair_id: str

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "pair_id": self.pair_id,
            "feature_window": self.feature_window.to_dict(),
            "observation_window": self.observation_window.to_dict(),
        }
