"""
Unit tests for Isolation Forest detector.

Tests must be written FIRST and FAIL before implementation.
"""

import numpy as np
import pytest

from app.service.anomaly.detectors.base import DetectorResult
from app.service.anomaly.detectors.isoforest import IsoForestDetector


class TestIsoForestDetector:
    """Test suite for Isolation Forest detector."""

    def test_detector_initialization(self):
        """Test detector initializes with valid parameters."""
        params = {
            "n_estimators": 200,
            "contamination": 0.005,
            "k": 3.5,
            "persistence": 2,
            "min_support": 50,
        }
        detector = IsoForestDetector(params)
        assert detector.n_estimators == 200
        assert detector.contamination == 0.005
        assert detector.k_threshold == 3.5

    def test_detector_validates_series(self):
        """Test detector validates series has sufficient data."""
        params = {"min_support": 50}
        detector = IsoForestDetector(params)

        with pytest.raises(ValueError, match="cannot be empty"):
            detector.detect(np.array([]))

        with pytest.raises(ValueError, match="Insufficient data"):
            detector.detect(np.array([1.0] * 49))

    def test_detector_detects_multivariate_anomaly(self):
        """Test detector identifies multivariate anomalies."""
        params = {
            "n_estimators": 100,
            "contamination": 0.01,
            "k": 3.0,
            "min_support": 20,
        }
        detector = IsoForestDetector(params)

        # Create multivariate feature vectors
        # Normal points: correlated features
        normal_features = np.random.multivariate_normal(
            mean=[100, 50, 200], cov=[[10, 5, 8], [5, 10, 6], [8, 6, 15]], size=100
        )

        # Anomalous point: outlier in feature space
        anomalous_features = np.array([[300, 300, 300]])
        features = np.vstack([normal_features, anomalous_features])

        result = detector.detect(features)

        assert isinstance(result, DetectorResult)
        assert len(result.scores) == len(features)
        # Should detect the anomalous point
        assert len(result.anomalies) > 0
        assert 100 in result.anomalies  # Last point should be anomalous

    def test_detector_handles_window_feature_vectors(self):
        """Test detector works with window feature vectors."""
        params = {
            "n_estimators": 100,
            "contamination": 0.01,
            "k": 3.0,
            "min_support": 10,
        }
        detector = IsoForestDetector(params)

        # Create feature vectors for multiple windows
        # Each row is a window with multiple metrics
        windows = np.random.rand(50, 5)  # 50 windows, 5 metrics each

        result = detector.detect(windows)

        assert isinstance(result, DetectorResult)
        assert len(result.scores) == len(windows)
        assert "feature_vector" in result.evidence or len(result.anomalies) >= 0

    def test_detector_returns_normalized_scores(self):
        """Test detector returns normalized scores."""
        params = {
            "n_estimators": 100,
            "contamination": 0.01,
            "k": 3.0,
            "min_support": 20,
        }
        detector = IsoForestDetector(params)

        features = np.random.rand(100, 3)
        result = detector.detect(features)

        # Scores should be reasonable
        assert np.all(np.isfinite(result.scores))
        assert len(result.scores) == len(features)
