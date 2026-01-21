"""
Scorer Models
Feature: 026-llm-training-pipeline

Dataclasses for classical scoring and calibration results.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class ScorerResult:
    """Result from classical model scoring."""

    risk_score: float
    raw_score: float
    feature_contributions: Dict[str, float] = field(default_factory=dict)
    model_version: Optional[str] = None
    is_calibrated: bool = False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "risk_score": self.risk_score,
            "raw_score": self.raw_score,
            "feature_contributions": self.feature_contributions,
            "model_version": self.model_version,
            "is_calibrated": self.is_calibrated,
        }


@dataclass
class CalibrationResult:
    """Result from score calibration."""

    original_score: float
    calibrated_score: float
    calibration_method: str
    is_valid: bool = True
    error: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "original_score": self.original_score,
            "calibrated_score": self.calibrated_score,
            "calibration_method": self.calibration_method,
            "is_valid": self.is_valid,
            "error": self.error,
        }


@dataclass
class ThresholdResult:
    """Result from threshold optimization."""

    optimal_threshold: float
    cost_at_threshold: float
    precision_at_threshold: float
    recall_at_threshold: float
    f1_at_threshold: float
    cost_fn_ratio: float
    cost_fp_ratio: float
    search_range: tuple = (0.0, 1.0)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "optimal_threshold": self.optimal_threshold,
            "cost_at_threshold": self.cost_at_threshold,
            "precision_at_threshold": self.precision_at_threshold,
            "recall_at_threshold": self.recall_at_threshold,
            "f1_at_threshold": self.f1_at_threshold,
            "cost_fn_ratio": self.cost_fn_ratio,
            "cost_fp_ratio": self.cost_fp_ratio,
        }


@dataclass
class FeatureWeight:
    """Weight for a single feature in the model."""

    feature_name: str
    weight: float
    is_positive: bool

    @property
    def contribution_direction(self) -> str:
        """Get contribution direction for explainability."""
        return "increases risk" if self.weight > 0 else "decreases risk"


@dataclass
class ModelWeights:
    """Collection of feature weights from the model."""

    weights: List[FeatureWeight] = field(default_factory=list)
    intercept: float = 0.0
    feature_names: List[str] = field(default_factory=list)

    def get_top_contributors(self, n: int = 5) -> List[FeatureWeight]:
        """Get top n features by absolute weight."""
        sorted_weights = sorted(self.weights, key=lambda w: abs(w.weight), reverse=True)
        return sorted_weights[:n]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "intercept": self.intercept,
            "weights": {w.feature_name: w.weight for w in self.weights},
        }
