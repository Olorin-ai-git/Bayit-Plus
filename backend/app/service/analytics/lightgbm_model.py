"""
LightGBM Fraud Detection Model.

Implements LightGBM model for the ensemble.

Week 8 Phase 3 implementation.
"""

import logging
import os
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.service.analytics.model_base import FraudDetectionModel, ModelPrediction

logger = logging.getLogger(__name__)


class LightGBMModel(FraudDetectionModel):
    """
    LightGBM-based fraud detection model.

    Requires trained model artifact from model registry.
    """

    def __init__(self, model_version: str = "1.0", model_path: Optional[str] = None):
        """
        Initialize LightGBM model.

        Args:
            model_version: Model version identifier
            model_path: Path to trained model artifact (from config/registry)
        """
        super().__init__(model_name="lightgbm", model_version=model_version)
        self.model_path = model_path or os.getenv("LIGHTGBM_MODEL_PATH")
        self.model = None
        self._load_model()

    def _load_model(self) -> None:
        """Load trained LightGBM model from registry."""
        if not self.model_path:
            logger.warning(
                f"{self.model_name}: No model path configured. "
                "Set LIGHTGBM_MODEL_PATH in environment or use model registry."
            )
            self.is_trained = False
            return

        try:
            import lightgbm as lgb

            if os.path.exists(self.model_path):
                self.model = lgb.Booster(model_file=self.model_path)
                self.is_trained = True
                logger.info(f"✓ Loaded LightGBM model from {self.model_path}")
            else:
                logger.warning(
                    f"{self.model_name}: Model file not found at {self.model_path}"
                )
                self.is_trained = False
        except ImportError:
            logger.warning(f"{self.model_name}: lightgbm library not available")
            self.is_trained = False
        except Exception as e:
            logger.error(f"{self.model_name}: Failed to load model: {e}")
            self.is_trained = False

    def predict(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        advanced_features: Optional[Dict[str, Any]] = None,
    ) -> ModelPrediction:
        """Generate LightGBM prediction."""
        if not self.is_trained or self.model is None:
            raise RuntimeError(
                f"{self.model_name}: Model not available. "
                f"Ensure LIGHTGBM_MODEL_PATH is configured and model is trained."
            )

        try:
            import numpy as np

            # Get confidence threshold from config
            confidence_env = os.getenv("LIGHTGBM_CONFIDENCE_THRESHOLD")
            if not confidence_env:
                raise RuntimeError(
                    "LIGHTGBM_CONFIDENCE_THRESHOLD environment variable is required"
                )
            confidence_threshold = float(confidence_env)

            # Convert features to array
            required_features = self.get_required_features()
            feature_values = []
            for f in required_features:
                if f not in features:
                    raise ValueError(f"Required feature '{f}' not found in features")
                feature_values.append(features[f])

            prediction = self.model.predict(np.array([feature_values]))[0]
            score = float(prediction)

            return ModelPrediction(
                score=score,
                confidence=confidence_threshold,
                model_name=self.model_name,
                model_version=self.model_version,
                features_used=required_features,
                metadata={"prediction_method": "lightgbm_inference"},
                timestamp=datetime.utcnow(),
            )
        except Exception as e:
            logger.error(f"{self.model_name}: Prediction failed: {e}")
            raise RuntimeError(f"{self.model_name}: Prediction failed - {e}") from e

    def get_feature_importance(self) -> Dict[str, float]:
        """Get LightGBM feature importance."""
        if not self.is_trained or self.model is None:
            raise RuntimeError(
                f"{self.model_name}: Cannot get feature importance - model not trained"
            )

        try:
            importance = self.model.feature_importance(importance_type="split")
            feature_names = self.get_required_features()
            if len(importance) == 0:
                raise RuntimeError(
                    f"{self.model_name}: Model returned empty feature importance"
                )
            max_importance = max(importance)
            return {
                name: float(imp) / max_importance
                for name, imp in zip(feature_names, importance)
            }
        except Exception as e:
            logger.error(f"{self.model_name}: Failed to get feature importance: {e}")
            raise RuntimeError(
                f"{self.model_name}: Failed to get feature importance - {e}"
            ) from e

    def get_required_features(self) -> List[str]:
        """Get required features for LightGBM model."""
        return [
            "tx_amount",
            "tx_hour",
            "tx_day_of_week",
            "velocity_5min",
            "velocity_15min",
            "velocity_1hr",
        ]
