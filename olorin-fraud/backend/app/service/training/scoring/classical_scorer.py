"""
Classical Scorer
Feature: 026-llm-training-pipeline

Provides logistic regression based fraud scoring with learned weights.
"""

import os
import pickle
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from app.service.logging import get_bridge_logger
from app.service.training.scoring.scorer_models import (
    FeatureWeight,
    ModelWeights,
    ScorerResult,
)
from app.service.training.training_config_loader import get_training_config

logger = get_bridge_logger(__name__)

FEATURE_ORDER = [
    "total_transactions", "total_gmv", "avg_tx_value", "std_tx_value",
    "ip_count", "device_count", "merchant_count",
    "tx_count_1h", "tx_count_24h", "tx_count_7d", "tx_count_30d",
    "velocity_1h_24h_ratio", "velocity_24h_7d_ratio",
    "account_age_days", "days_since_first_tx",
]


class ClassicalScorer:
    """Logistic regression based fraud scorer."""

    def __init__(self):
        """Initialize classical scorer from config."""
        self._config = get_training_config()
        self._init_from_config()
        self._model = None
        self._is_fitted = False
        self._model_version: Optional[str] = None
        self._load_model()

    def _init_from_config(self) -> None:
        """Initialize settings from configuration."""
        self._model_type = os.getenv("LLM_MODEL_TYPE", "logistic_regression")
        self._regularization = os.getenv("LLM_REGULARIZATION", "l2")
        self._c_value = float(os.getenv("LLM_C_VALUE", "1.0"))
        self._model_path = os.getenv("LLM_MODEL_PATH", "data/models")

    def _load_model(self) -> None:
        """Load saved model if available."""
        model_file = os.path.join(self._model_path, "classical_scorer.pkl")
        if os.path.exists(model_file):
            try:
                with open(model_file, "rb") as f:
                    saved = pickle.load(f)
                self._model = saved.get("model")
                self._model_version = saved.get("version")
                self._is_fitted = True
                logger.info(f"Loaded classical model v{self._model_version}")
            except Exception as e:
                logger.warning(f"Failed to load model: {e}")

    def fit(
        self,
        features: List[Dict[str, Any]],
        labels: List[bool],
        version: Optional[str] = None,
    ) -> None:
        """
        Fit the classical model on training data.

        Args:
            features: List of feature dictionaries
            labels: List of fraud labels (True=fraud)
            version: Optional model version identifier
        """
        from sklearn.linear_model import LogisticRegression
        from sklearn.preprocessing import StandardScaler

        if len(features) < 10:
            logger.warning("Insufficient samples for training")
            return

        X = self._prepare_feature_matrix(features)
        y = np.array([1 if label else 0 for label in labels])

        self._scaler = StandardScaler()
        X_scaled = self._scaler.fit_transform(X)

        self._model = LogisticRegression(
            penalty=self._regularization,
            C=self._c_value,
            max_iter=1000,
            random_state=42,
        )
        self._model.fit(X_scaled, y)
        self._is_fitted = True
        self._model_version = version or "v1"

        self._save_model()
        logger.info(f"Trained classical model on {len(features)} samples")

    def _prepare_feature_matrix(
        self, features: List[Dict[str, Any]]
    ) -> np.ndarray:
        """Convert feature dicts to numpy matrix."""
        X = []
        for feat_dict in features:
            row = [float(feat_dict.get(name, 0) or 0) for name in FEATURE_ORDER]
            X.append(row)
        return np.array(X)

    def _save_model(self) -> None:
        """Save model to disk."""
        Path(self._model_path).mkdir(parents=True, exist_ok=True)
        model_file = os.path.join(self._model_path, "classical_scorer.pkl")
        try:
            with open(model_file, "wb") as f:
                pickle.dump({
                    "model": self._model,
                    "scaler": self._scaler,
                    "version": self._model_version,
                }, f)
            logger.info(f"Saved model to {model_file}")
        except Exception as e:
            logger.error(f"Failed to save model: {e}")

    def score(self, features: Dict[str, Any]) -> ScorerResult:
        """
        Score a single entity.

        Args:
            features: Feature dictionary for entity

        Returns:
            ScorerResult with risk score and contributions
        """
        if not self._is_fitted or self._model is None:
            return ScorerResult(risk_score=0.5, raw_score=0.5)

        X = self._prepare_feature_matrix([features])
        X_scaled = self._scaler.transform(X)

        raw_score = float(self._model.predict_proba(X_scaled)[0, 1])
        contributions = self._calculate_contributions(features, X_scaled[0])

        return ScorerResult(
            risk_score=raw_score,
            raw_score=raw_score,
            feature_contributions=contributions,
            model_version=self._model_version,
            is_calibrated=False,
        )

    def _calculate_contributions(
        self,
        features: Dict[str, Any],
        scaled_features: np.ndarray,
    ) -> Dict[str, float]:
        """Calculate feature contributions to score."""
        contributions = {}
        if hasattr(self._model, "coef_"):
            coefs = self._model.coef_[0]
            for i, name in enumerate(FEATURE_ORDER):
                if i < len(coefs):
                    contribution = float(coefs[i] * scaled_features[i])
                    contributions[name] = round(contribution, 4)
        return contributions

    def get_weights(self) -> ModelWeights:
        """Get learned feature weights."""
        if not self._is_fitted or self._model is None:
            return ModelWeights()

        weights = []
        if hasattr(self._model, "coef_"):
            coefs = self._model.coef_[0]
            for i, name in enumerate(FEATURE_ORDER):
                if i < len(coefs):
                    weight = float(coefs[i])
                    weights.append(FeatureWeight(
                        feature_name=name,
                        weight=weight,
                        is_positive=weight > 0,
                    ))

        intercept = float(self._model.intercept_[0]) if hasattr(self._model, "intercept_") else 0.0

        return ModelWeights(
            weights=weights,
            intercept=intercept,
            feature_names=FEATURE_ORDER,
        )

    def is_fitted(self) -> bool:
        """Check if model is fitted."""
        return self._is_fitted


_classical_scorer: Optional[ClassicalScorer] = None


def get_classical_scorer() -> ClassicalScorer:
    """Get cached classical scorer instance."""
    global _classical_scorer
    if _classical_scorer is None:
        _classical_scorer = ClassicalScorer()
    return _classical_scorer
