"""
Ensemble Fraud Detection Model.

Orchestrates multiple models and combines predictions using ensemble strategies.

Week 8 Phase 3 implementation.
"""

import logging
import os
from typing import Dict, Any, List, Optional

from app.service.analytics.model_base import FraudDetectionModel, ModelPrediction
from app.service.analytics.ensemble_strategy import get_ensemble_strategy, EnsembleStrategy
from app.service.analytics.rule_based_model import RuleBasedModel
from app.service.analytics.xgboost_model import XGBoostModel
from app.service.analytics.lightgbm_model import LightGBMModel

logger = logging.getLogger(__name__)


class EnsembleModel:
    """
    Ensemble fraud detection model orchestrator.

    Manages multiple models and combines their predictions.
    """

    def __init__(
        self,
        strategy_name: Optional[str] = None,
        models: Optional[List[FraudDetectionModel]] = None
    ):
        """Initialize ensemble model with strategy and models."""
        if strategy_name is None:
            strategy_env = os.getenv("ENSEMBLE_STRATEGY")
            if not strategy_env:
                raise RuntimeError("ENSEMBLE_STRATEGY environment variable is required")
            self.strategy_name = strategy_env
        else:
            self.strategy_name = strategy_name

        self.strategy = get_ensemble_strategy(self.strategy_name)
        self.models = models or self._initialize_default_models()
        self.prediction_count = 0
        self.model_stats = {m.model_name: {"predictions": 0, "errors": 0} for m in self.models}
        logger.info(
            f"📊 EnsembleModel: {len(self.models)} models, {self.strategy_name} strategy"
        )

    def _initialize_default_models(self) -> List[FraudDetectionModel]:
        """Initialize default model ensemble from configuration."""
        models = []

        # Rule-based model is always included
        rule_version_env = os.getenv("RULE_BASED_MODEL_VERSION")
        if not rule_version_env:
            raise RuntimeError("RULE_BASED_MODEL_VERSION environment variable is required")
        models.append(RuleBasedModel(model_version=rule_version_env))
        logger.info("✓ RuleBasedModel added")

        # XGBoost model - optional
        enable_xgb_env = os.getenv("ENABLE_XGBOOST_MODEL")
        if not enable_xgb_env:
            raise RuntimeError("ENABLE_XGBOOST_MODEL environment variable is required (set to 'true' or 'false')")
        if enable_xgb_env.lower() == "true":
            xgb_version_env = os.getenv("XGBOOST_MODEL_VERSION")
            if not xgb_version_env:
                raise RuntimeError("XGBOOST_MODEL_VERSION environment variable is required when ENABLE_XGBOOST_MODEL=true")
            xgb_model = XGBoostModel(model_version=xgb_version_env)
            if xgb_model.is_trained:
                models.append(xgb_model)
                logger.info("✓ XGBoostModel added")
            else:
                logger.warning("✗ XGBoostModel not trained")

        # LightGBM model - optional
        enable_lgbm_env = os.getenv("ENABLE_LIGHTGBM_MODEL")
        if not enable_lgbm_env:
            raise RuntimeError("ENABLE_LIGHTGBM_MODEL environment variable is required (set to 'true' or 'false')")
        if enable_lgbm_env.lower() == "true":
            lgbm_version_env = os.getenv("LIGHTGBM_MODEL_VERSION")
            if not lgbm_version_env:
                raise RuntimeError("LIGHTGBM_MODEL_VERSION environment variable is required when ENABLE_LIGHTGBM_MODEL=true")
            lgbm_model = LightGBMModel(model_version=lgbm_version_env)
            if lgbm_model.is_trained:
                models.append(lgbm_model)
                logger.info("✓ LightGBMModel added")
            else:
                logger.warning("✗ LightGBMModel not trained")

        return models

    def predict(
        self,
        transaction: Dict[str, Any],
        features: Dict[str, Any],
        advanced_features: Optional[Dict[str, Any]] = None
    ) -> ModelPrediction:
        """Generate ensemble prediction for a transaction."""
        predictions = []

        for model in self.models:
            try:
                if not model.validate_features(features):
                    logger.warning(f"{model.model_name}: Missing features")
                    continue

                prediction = model.predict(transaction, features, advanced_features)
                predictions.append(prediction)
                self.model_stats[model.model_name]["predictions"] += 1
                logger.debug(f"{model.model_name}: {prediction.score:.3f}")
            except Exception as e:
                logger.error(f"{model.model_name}: {e}")
                self.model_stats[model.model_name]["errors"] += 1

        ensemble_prediction = self.strategy.combine(predictions)
        self.prediction_count += 1
        logger.info(
            f"📊 Ensemble: {ensemble_prediction.score:.3f} "
            f"({len(predictions)} models)"
        )
        return ensemble_prediction

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about ensemble and all models."""
        return {
            "ensemble_strategy": self.strategy_name,
            "num_models": len(self.models),
            "models": [m.get_model_info() for m in self.models],
            "prediction_count": self.prediction_count,
            "model_stats": self.model_stats
        }

    def get_combined_feature_importance(self) -> Dict[str, float]:
        """Get combined feature importance across all models."""
        all_importance = {}
        feature_counts = {}

        for model in self.models:
            if not model.is_trained:
                continue

            model_importance = model.get_feature_importance()
            for feature, importance in model_importance.items():
                if feature not in all_importance:
                    all_importance[feature] = 0.0
                    feature_counts[feature] = 0

                all_importance[feature] += importance
                feature_counts[feature] += 1

        # Average importance across models
        averaged_importance = {
            feature: total / feature_counts[feature]
            for feature, total in all_importance.items()
        }

        # Sort by importance
        sorted_importance = dict(
            sorted(averaged_importance.items(), key=lambda x: x[1], reverse=True)
        )

        return sorted_importance

    def add_model(self, model: FraudDetectionModel) -> None:
        """Add a new model to the ensemble."""
        self.models.append(model)
        self.model_stats[model.model_name] = {"predictions": 0, "errors": 0}
        logger.info(f"✓ Added {model.model_name}")

    def remove_model(self, model_name: str) -> bool:
        """Remove a model from the ensemble."""
        for i, model in enumerate(self.models):
            if model.model_name == model_name:
                del self.models[i]
                logger.info(f"✗ Removed {model_name} from ensemble")
                return True

        logger.warning(f"Model {model_name} not found in ensemble")
        return False
