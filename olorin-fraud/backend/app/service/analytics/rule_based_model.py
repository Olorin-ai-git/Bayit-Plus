"""
Rule-Based Fraud Detection Model.

Wraps pattern adjustment engine as an ensemble model.

Week 8 Phase 3 implementation.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.analytics.model_base import FraudDetectionModel, ModelPrediction
from app.service.analytics.pattern_adjustments import PatternAdjustmentEngine

logger = logging.getLogger(__name__)


class RuleBasedModel(FraudDetectionModel):
    """
    Rule-based fraud detection model using pattern adjustments.

    Wraps the PatternAdjustmentEngine from Week 6 as an ensemble model.
    """

    def __init__(self, model_version: str = "1.0"):
        """
        Initialize rule-based model.

        Args:
            model_version: Model version identifier
        """
        super().__init__(model_name="rule_based", model_version=model_version)
        self.pattern_engine = PatternAdjustmentEngine()
        self.is_trained = True  # Rules don't require training

        # Get base score from configuration
        base_score_env = os.getenv("RULE_BASED_BASE_SCORE")
        if not base_score_env:
            raise RuntimeError("RULE_BASED_BASE_SCORE environment variable is required")
        self.base_score = float(base_score_env)

    def predict(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        advanced_features: Optional[Dict[str, Any]] = None,
    ) -> ModelPrediction:
        """
        Generate rule-based risk prediction.

        Args:
            transaction: Transaction dictionary
            features: Extracted features
            advanced_features: Advanced features (velocity, patterns, etc.)

        Returns:
            ModelPrediction with score and metadata
        """
        # Detect patterns
        historical_transactions = (
            advanced_features.get("historical_transactions")
            if advanced_features
            else None
        )
        patterns = self.pattern_engine.detect_all_patterns(
            transaction=transaction,
            historical_transactions=historical_transactions,
            advanced_features=advanced_features,
        )

        # Calculate total adjustment
        total_adjustment = self.pattern_engine.calculate_total_adjustment(patterns)

        # Apply adjustment to base score
        risk_score = min(1.0, self.base_score + total_adjustment)

        # Calculate confidence based on number of patterns detected
        conf_base_env = os.getenv("RULE_BASED_CONFIDENCE_BASE")
        conf_increment_env = os.getenv("RULE_BASED_CONFIDENCE_INCREMENT")
        if not conf_base_env or not conf_increment_env:
            raise RuntimeError(
                "RULE_BASED_CONFIDENCE_BASE and RULE_BASED_CONFIDENCE_INCREMENT "
                "environment variables are required"
            )
        conf_base = float(conf_base_env)
        conf_increment = float(conf_increment_env)
        confidence = min(1.0, conf_base + (len(patterns) * conf_increment))

        # Extract feature names used
        features_used = list(features.keys())

        metadata = {
            "patterns_detected": len(patterns),
            "pattern_details": [
                {
                    "type": p["pattern_type"],
                    "adjustment": p["risk_adjustment"],
                    "confidence": p["confidence"],
                }
                for p in patterns
            ],
            "total_adjustment": total_adjustment,
            "base_score": self.base_score,
        }

        return ModelPrediction(
            score=risk_score,
            confidence=confidence,
            model_name=self.model_name,
            model_version=self.model_version,
            features_used=features_used,
            metadata=metadata,
            timestamp=datetime.utcnow(),
        )

    def get_feature_importance(self) -> Dict[str, float]:
        """
        Get feature importance for rule-based model.

        Returns pattern relevance as feature importance from configuration.
        """
        importance_config_env = os.getenv("RULE_BASED_FEATURE_IMPORTANCE")
        if not importance_config_env:
            raise RuntimeError(
                "RULE_BASED_FEATURE_IMPORTANCE environment variable is required. "
                "Format: feature1:weight1,feature2:weight2,..."
            )

        # Parse configuration: "feature1:0.85,feature2:0.90,..."
        importance = {}
        for pair in importance_config_env.split(","):
            parts = pair.strip().split(":")
            if len(parts) != 2:
                raise ValueError(f"Invalid feature importance format: {pair}")
            feature_name = parts[0].strip()
            weight = float(parts[1].strip())
            importance[feature_name] = weight

        return importance

    def get_required_features(self) -> List[str]:
        """Get required features for rule-based model."""
        return ["tx_amount", "tx_hour"]
