"""
Dataset Models
Feature: 026-llm-training-pipeline

Dataclasses for dataset management in fraud detection training.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.training.training_models import TrainingSample


@dataclass
class SamplingConfig:
    """Configuration for stratified sampling."""

    target_fraud_entities: int = 500
    max_fraud_entities: int = 1000
    legit_multiplier: int = 20
    stratify_by_merchant: bool = True
    min_samples_per_merchant: int = 10


@dataclass
class DatasetSplit:
    """Container for train/validation/test split."""

    train: List[TrainingSample] = field(default_factory=list)
    validation: List[TrainingSample] = field(default_factory=list)
    test: List[TrainingSample] = field(default_factory=list)

    def get_train_count(self) -> int:
        """Get training set size."""
        return len(self.train)

    def get_validation_count(self) -> int:
        """Get validation set size."""
        return len(self.validation)

    def get_test_count(self) -> int:
        """Get test set size."""
        return len(self.test)

    def get_total_count(self) -> int:
        """Get total sample count across all splits."""
        return len(self.train) + len(self.validation) + len(self.test)

    def get_fraud_counts(self) -> Dict[str, int]:
        """Get fraud counts per split."""
        return {
            "train": sum(1 for s in self.train if s.is_fraud),
            "validation": sum(1 for s in self.validation if s.is_fraud),
            "test": sum(1 for s in self.test if s.is_fraud),
        }


@dataclass
class DatasetMetadata:
    """Metadata for a dataset version."""

    version: str
    created_at: datetime
    total_samples: int
    fraud_samples: int
    legit_samples: int
    train_samples: int
    validation_samples: int
    test_samples: int
    merchants: List[str] = field(default_factory=list)
    feature_period_start: Optional[datetime] = None
    feature_period_end: Optional[datetime] = None
    observation_period_start: Optional[datetime] = None
    observation_period_end: Optional[datetime] = None
    config: Optional[SamplingConfig] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert metadata to dictionary."""
        return {
            "version": self.version,
            "created_at": self.created_at.isoformat(),
            "total_samples": self.total_samples,
            "fraud_samples": self.fraud_samples,
            "legit_samples": self.legit_samples,
            "train_samples": self.train_samples,
            "validation_samples": self.validation_samples,
            "test_samples": self.test_samples,
            "merchants": self.merchants,
            "feature_period_start": (
                self.feature_period_start.isoformat()
                if self.feature_period_start
                else None
            ),
            "feature_period_end": (
                self.feature_period_end.isoformat()
                if self.feature_period_end
                else None
            ),
            "observation_period_start": (
                self.observation_period_start.isoformat()
                if self.observation_period_start
                else None
            ),
            "observation_period_end": (
                self.observation_period_end.isoformat()
                if self.observation_period_end
                else None
            ),
        }

    def get_fraud_ratio(self) -> float:
        """Calculate fraud ratio."""
        if self.total_samples == 0:
            return 0.0
        return self.fraud_samples / self.total_samples
