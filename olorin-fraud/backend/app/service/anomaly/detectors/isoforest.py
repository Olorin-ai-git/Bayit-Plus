"""
Isolation Forest Detector Implementation

Uses Isolation Forest algorithm for multivariate anomaly detection
on window feature vectors.
"""

from typing import Any, Dict

import numpy as np
from sklearn.ensemble import IsolationForest

from app.service.anomaly.detectors.base import BaseDetector, DetectorResult
from app.service.logging import get_bridge_logger

logger = get_bridge_logger(__name__)


class IsoForestDetector(BaseDetector):
    """
    Isolation Forest detector for multivariate anomaly detection.

    Works on feature vectors (multiple metrics per window) to detect
    anomalies in high-dimensional space.
    """

    def __init__(self, params: Dict[str, Any]):
        """
        Initialize Isolation Forest detector.

        Args:
            params: Detector parameters including:
                - n_estimators: Number of trees (default: 200)
                - contamination: Expected anomaly rate (default: 0.005)
                - k: Anomaly threshold multiplier (default: 3.5)
                - persistence: Required persistence windows (default: 2)
                - min_support: Minimum data points required (default: 50)
        """
        super().__init__(params)
        self.n_estimators = params.get("n_estimators", 200)
        self.contamination = params.get("contamination", 0.005)

    def detect(self, series: np.ndarray) -> DetectorResult:
        """
        Detect anomalies using Isolation Forest.

        Args:
            series: Feature vectors as numpy array (n_samples, n_features)
                   or 1D array (will be reshaped to 2D)

        Returns:
            DetectorResult with scores, anomaly indices, and evidence

        Raises:
            ValueError: If series is invalid or insufficient data
        """
        # Handle 1D input (single metric) by reshaping
        if series.ndim == 1:
            series = series.reshape(-1, 1)

        n_samples, n_features = series.shape

        # Validate minimum support
        if n_samples < self.min_support:
            raise ValueError(
                f"Insufficient data: {n_samples} < {self.min_support} (min_support)"
            )

        if n_samples == 0:
            raise ValueError("Series cannot be empty")

        # Check for non-finite values
        if not np.all(np.isfinite(series)):
            raise ValueError("Series contains non-finite values (NaN or Inf)")

        try:
            # Fit Isolation Forest model
            model = IsolationForest(
                n_estimators=self.n_estimators,
                contamination=self.contamination,
                max_samples="auto",
                random_state=42,
                n_jobs=-1,
            )
            model.fit(series)

            # Get anomaly scores (negative because lower = more anomalous in IsolationForest)
            raw_scores = -model.score_samples(series)

            # Normalize scores to consistent scale
            mean_score = np.mean(raw_scores)
            std_score = np.std(raw_scores)
            if std_score == 0:
                std_score = 1e-9

            scores = (raw_scores - mean_score) / std_score
            # Ensure non-negative
            scores = np.maximum(scores, 0.0)

            # Filter anomalies by k threshold
            anomalies = self.filter_anomalies(scores)

            # Build evidence
            evidence = {
                "feature_vector": series.tolist() if n_features <= 5 else [],
                "raw_scores": raw_scores.tolist(),
                "n_estimators": self.n_estimators,
                "contamination": self.contamination,
            }

            logger.debug(
                f"Isolation Forest detection: {len(anomalies)} anomalies found "
                f"out of {n_samples} samples with {n_features} features"
            )

            return DetectorResult(scores=scores, anomalies=anomalies, evidence=evidence)

        except Exception as e:
            logger.error(f"Isolation Forest detection failed: {e}")
            raise ValueError(f"Isolation Forest detection error: {e}") from e
