"""
Base Model Interface for Fraud Detection Ensemble.

Defines the interface that all fraud detection models must implement.

Week 8 Phase 3 implementation.
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


@dataclass
class ModelPrediction:
    """
    Prediction result from a fraud detection model.

    Attributes:
        score: Risk score (0.0 to 1.0)
        confidence: Model confidence in prediction (0.0 to 1.0)
        model_name: Name of the model that generated this prediction
        model_version: Version of the model
        features_used: List of features used for prediction
        metadata: Additional model-specific metadata
        timestamp: When prediction was made
    """

    score: float
    confidence: float
    model_name: str
    model_version: str
    features_used: List[str]
    metadata: Dict[str, Any]
    timestamp: datetime

    def to_dict(self) -> Dict[str, Any]:
        """Convert prediction to dictionary."""
        return {
            "score": self.score,
            "confidence": self.confidence,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "features_used": self.features_used,
            "metadata": self.metadata,
            "timestamp": self.timestamp.isoformat(),
        }


class FraudDetectionModel(ABC):
    """
    Abstract base class for fraud detection models.

    All models in the ensemble must implement this interface.
    """

    def __init__(self, model_name: str, model_version: str):
        """
        Initialize model.

        Args:
            model_name: Unique name for this model
            model_version: Version identifier
        """
        self.model_name = model_name
        self.model_version = model_version
        self.is_trained = False
        logger.info(f"📊 Initialized {model_name} v{model_version}")

    @abstractmethod
    def predict(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        advanced_features: Optional[Dict[str, Any]] = None,
    ) -> ModelPrediction:
        """
        Generate risk prediction for a transaction.

        Args:
            transaction: Transaction dictionary
            features: Extracted features
            advanced_features: Advanced features (velocity, patterns, etc.)

        Returns:
            ModelPrediction with score and metadata
        """
        pass

    @abstractmethod
    def get_feature_importance(self) -> Dict[str, float]:
        """
        Get feature importance scores for this model.

        Returns:
            Dictionary mapping feature names to importance scores (0.0 to 1.0)
        """
        pass

    def get_model_info(self) -> Dict[str, Any]:
        """Get model metadata."""
        return {
            "name": self.model_name,
            "version": self.model_version,
            "is_trained": self.is_trained,
            "type": self.__class__.__name__,
        }

    def validate_features(self, features: Dict[str, Any]) -> bool:
        """
        Validate that required features are present.

        Args:
            features: Feature dictionary

        Returns:
            True if all required features present, False otherwise
        """
        required_features = self.get_required_features()
        missing = [f for f in required_features if f not in features]

        if missing:
            logger.warning(f"{self.model_name}: Missing required features: {missing}")
            return False
        return True

    def get_required_features(self) -> List[str]:
        """
        Get list of required features for this model.

        Returns:
            List of required feature names
        """
        return []
