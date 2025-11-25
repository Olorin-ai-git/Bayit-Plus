"""
Ensemble Strategy for Fraud Detection Models.

Implements different strategies for combining multiple model predictions.

Week 8 Phase 3 implementation.
"""

import logging
from typing import Dict, Any, List
from abc import ABC, abstractmethod
from datetime import datetime

from app.service.analytics.model_base import ModelPrediction
from app.service.analytics.ensemble_helpers import combine_features

logger = logging.getLogger(__name__)


class EnsembleStrategy(ABC):
    """Base class for ensemble combination strategies."""

    def __init__(self, strategy_name: str):
        """
        Initialize ensemble strategy.

        Args:
            strategy_name: Name of this strategy
        """
        self.strategy_name = strategy_name

    @abstractmethod
    def combine(self, predictions: List[ModelPrediction]) -> ModelPrediction:
        """
        Combine multiple model predictions into a single prediction.

        Args:
            predictions: List of predictions from different models

        Returns:
            Combined ModelPrediction
        """
        pass


class AveragingStrategy(EnsembleStrategy):
    """Simple averaging of model predictions."""

    def __init__(self):
        super().__init__(strategy_name="averaging")

    def combine(self, predictions: List[ModelPrediction]) -> ModelPrediction:
        """Average all model scores equally."""
        if not predictions:
            raise ValueError("Cannot combine empty predictions list - at least one model required")

        avg_score = sum(p.score for p in predictions) / len(predictions)
        avg_confidence = sum(p.confidence for p in predictions) / len(predictions)

        metadata = {
            "strategy": self.strategy_name,
            "num_models": len(predictions),
            "model_contributions": [
                {"model": p.model_name, "score": p.score, "confidence": p.confidence}
                for p in predictions
            ]
        }

        return ModelPrediction(
            score=avg_score,
            confidence=avg_confidence,
            model_name="ensemble",
            model_version="1.0",
            features_used=combine_features(predictions),
            metadata=metadata,
            timestamp=datetime.utcnow()
        )


class WeightedAveragingStrategy(EnsembleStrategy):
    """Confidence-weighted averaging of model predictions."""

    def __init__(self):
        super().__init__(strategy_name="weighted_averaging")

    def combine(self, predictions: List[ModelPrediction]) -> ModelPrediction:
        """Combine predictions using confidence weighting."""
        if not predictions:
            raise ValueError("Cannot combine empty predictions list - at least one model required")

        valid_predictions = [p for p in predictions if p.confidence > 0]
        if not valid_predictions:
            raise ValueError(
                f"Cannot combine predictions - all {len(predictions)} predictions have zero confidence"
            )

        total_weight = sum(p.confidence for p in valid_predictions)
        if total_weight == 0:
            raise ValueError("Cannot combine predictions - total confidence weight is zero")

        weighted_score = sum(p.score * p.confidence for p in valid_predictions) / total_weight
        avg_confidence = sum(p.confidence for p in valid_predictions) / len(valid_predictions)

        metadata = {
            "strategy": self.strategy_name,
            "num_models": len(valid_predictions),
            "model_contributions": [
                {
                    "model": p.model_name,
                    "score": p.score,
                    "confidence": p.confidence,
                    "weight": p.confidence / total_weight
                }
                for p in valid_predictions
            ]
        }

        return ModelPrediction(
            score=weighted_score,
            confidence=avg_confidence,
            model_name="ensemble",
            model_version="1.0",
            features_used=combine_features(valid_predictions),
            metadata=metadata,
            timestamp=datetime.utcnow()
        )


class MaxScoreStrategy(EnsembleStrategy):
    """Take maximum score from all models (high-recall strategy)."""

    def __init__(self):
        super().__init__(strategy_name="max_score")

    def combine(self, predictions: List[ModelPrediction]) -> ModelPrediction:
        """Take the highest score from all models."""
        if not predictions:
            raise ValueError("Cannot combine empty predictions list - at least one model required")

        max_prediction = max(predictions, key=lambda p: p.score)

        metadata = {
            "strategy": self.strategy_name,
            "num_models": len(predictions),
            "selected_model": max_prediction.model_name,
            "selected_score": max_prediction.score,
            "all_scores": [{"model": p.model_name, "score": p.score} for p in predictions]
        }

        return ModelPrediction(
            score=max_prediction.score,
            confidence=max_prediction.confidence,
            model_name="ensemble",
            model_version="1.0",
            features_used=combine_features(predictions),
            metadata=metadata,
            timestamp=datetime.utcnow()
        )


def get_ensemble_strategy(strategy_name: str) -> EnsembleStrategy:
    """
    Get ensemble strategy by name from configuration.

    Args:
        strategy_name: Name of strategy ('averaging', 'weighted_averaging', 'max_score')

    Returns:
        EnsembleStrategy instance

    Raises:
        ValueError: If strategy_name is not recognized
    """
    strategies = {
        "averaging": AveragingStrategy,
        "weighted_averaging": WeightedAveragingStrategy,
        "max_score": MaxScoreStrategy
    }

    strategy_class = strategies.get(strategy_name)
    if not strategy_class:
        valid_strategies = ", ".join(strategies.keys())
        raise ValueError(
            f"Unknown ensemble strategy '{strategy_name}'. "
            f"Valid strategies: {valid_strategies}"
        )

    return strategy_class()
