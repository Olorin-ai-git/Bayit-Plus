"""
Training Models
Feature: 026-llm-training-pipeline

Dataclass models for training pipeline.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.training.llm_reasoning_engine import FraudAssessment


@dataclass
class TrainingSample:
    """Single training sample with ground truth."""

    entity_type: str
    entity_value: str
    features: Dict[str, Any]
    is_fraud: bool
    merchant_name: Optional[str] = None
    tx_datetime: Optional[datetime] = None


@dataclass
class PredictionResult:
    """Result of prediction on a training sample."""

    sample: TrainingSample
    assessment: FraudAssessment
    is_correct: bool
    predicted_fraud: bool


@dataclass
class TrainingMetrics:
    """Metrics from training evaluation."""

    total_samples: int = 0
    true_positives: int = 0
    false_positives: int = 0
    true_negatives: int = 0
    false_negatives: int = 0
    precision: float = 0.0
    recall: float = 0.0
    f1_score: float = 0.0
    accuracy: float = 0.0
    prediction_results: List[PredictionResult] = field(default_factory=list)

    def calculate(self) -> None:
        """Calculate metrics from counts."""
        self.total_samples = (
            self.true_positives
            + self.false_positives
            + self.true_negatives
            + self.false_negatives
        )

        if self.total_samples > 0:
            self.accuracy = (self.true_positives + self.true_negatives) / self.total_samples

        if (self.true_positives + self.false_positives) > 0:
            self.precision = self.true_positives / (
                self.true_positives + self.false_positives
            )

        if (self.true_positives + self.false_negatives) > 0:
            self.recall = self.true_positives / (
                self.true_positives + self.false_negatives
            )

        if (self.precision + self.recall) > 0:
            self.f1_score = (
                2 * (self.precision * self.recall) / (self.precision + self.recall)
            )
