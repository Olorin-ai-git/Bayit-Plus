"""
Evaluation Models
Feature: 026-llm-training-pipeline

Dataclasses for advanced evaluation metrics and results.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional


@dataclass
class PRCurve:
    """Precision-Recall curve data."""

    precisions: List[float] = field(default_factory=list)
    recalls: List[float] = field(default_factory=list)
    thresholds: List[float] = field(default_factory=list)
    pr_auc: float = 0.0
    roc_auc: float = 0.0
    average_precision: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "pr_auc": self.pr_auc,
            "roc_auc": self.roc_auc,
            "average_precision": self.average_precision,
            "n_points": len(self.thresholds),
        }

    def get_recall_at_precision(self, target_precision: float) -> float:
        """Get maximum recall at given precision level."""
        for i, p in enumerate(self.precisions):
            if p >= target_precision:
                return self.recalls[i]
        return 0.0

    def get_precision_at_recall(self, target_recall: float) -> float:
        """Get maximum precision at given recall level."""
        for i, r in enumerate(self.recalls):
            if r >= target_recall:
                return self.precisions[i]
        return 0.0


@dataclass
class CohortMetrics:
    """Metrics for a specific cohort (merchant, region, etc.)."""

    cohort_name: str
    cohort_dimension: str
    sample_count: int = 0
    fraud_count: int = 0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    fpr: float = 0.0
    pr_auc: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "cohort_name": self.cohort_name,
            "cohort_dimension": self.cohort_dimension,
            "sample_count": self.sample_count,
            "fraud_count": self.fraud_count,
            "fraud_rate": self.get_fraud_rate(),
            "precision": self.precision,
            "recall": self.recall,
            "f1_score": self.f1_score,
            "fpr": self.fpr,
            "pr_auc": self.pr_auc,
        }

    def get_fraud_rate(self) -> float:
        """Calculate fraud rate for cohort."""
        if self.sample_count == 0:
            return 0.0
        return self.fraud_count / self.sample_count


@dataclass
class ChallengerResult:
    """Result from champion-challenger comparison."""

    challenger_id: str
    champion_id: str
    comparison_date: datetime
    challenger_pr_auc: float = 0.0
    champion_pr_auc: float = 0.0
    challenger_f1: float = 0.0
    champion_f1: float = 0.0
    sample_count: int = 0
    improvement: float = 0.0
    is_promoted: bool = False
    promotion_reason: Optional[str] = None
    shadow_mode: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "challenger_id": self.challenger_id,
            "champion_id": self.champion_id,
            "comparison_date": self.comparison_date.isoformat(),
            "challenger_pr_auc": self.challenger_pr_auc,
            "champion_pr_auc": self.champion_pr_auc,
            "challenger_f1": self.challenger_f1,
            "champion_f1": self.champion_f1,
            "sample_count": self.sample_count,
            "improvement": self.improvement,
            "is_promoted": self.is_promoted,
            "promotion_reason": self.promotion_reason,
            "shadow_mode": self.shadow_mode,
        }

    @property
    def is_improvement(self) -> bool:
        """Check if challenger improved over champion."""
        return self.improvement > 0


@dataclass
class RecallAtFPR:
    """Recall at target false positive rate."""

    target_fpr: float
    achieved_recall: float
    actual_fpr: float
    threshold_used: float

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "target_fpr": self.target_fpr,
            "achieved_recall": self.achieved_recall,
            "actual_fpr": self.actual_fpr,
            "threshold_used": self.threshold_used,
        }
