"""
Unit tests for STL+MAD detector.

Tests must be written FIRST and FAIL before implementation.
"""

from datetime import datetime

import numpy as np
import pytest

from app.service.anomaly.detectors.base import DetectorResult
from app.service.anomaly.detectors.stl_mad import STLMADDetector


class TestSTLMADDetector:
    """Test suite for STL+MAD detector."""

    def test_detector_initialization(self):
        """Test detector initializes with valid parameters."""
        params = {
            "period": 672,
            "robust": True,
            "k": 3.5,
            "persistence": 2,
            "min_support": 50,
        }
        detector = STLMADDetector(params)
        assert detector.period == 672
        assert detector.robust is True
        assert detector.k_threshold == 3.5

    def test_detector_validates_series(self):
        """Test detector validates series has sufficient data."""
        params = {"period": 672, "min_support": 50}
        detector = STLMADDetector(params)

        # Empty series should raise ValueError
        with pytest.raises(ValueError, match="cannot be empty"):
            detector.detect(np.array([]))

        # Series below min_support should raise ValueError
        with pytest.raises(ValueError, match="Insufficient data"):
            detector.detect(np.array([1.0] * 49))

    def test_detector_detects_spike(self):
        """Test detector identifies spike anomaly."""
        params = {"period": 24, "k": 3.0, "min_support": 24}
        detector = STLMADDetector(params)

        # Create series with spike
        normal_values = np.random.normal(100, 10, 100)
        spike_index = 50
        normal_values[spike_index] = 300  # Large spike

        result = detector.detect(normal_values)

        assert isinstance(result, DetectorResult)
        assert len(result.scores) == len(normal_values)
        assert spike_index in result.anomalies
        assert "residuals" in result.evidence
        assert "mad" in result.evidence

    def test_detector_handles_seasonal_pattern(self):
        """Test detector handles seasonal patterns correctly."""
        params = {"period": 24, "k": 3.0, "min_support": 48}
        detector = STLMADDetector(params)

        # Create seasonal series
        t = np.arange(100)
        seasonal = 10 * np.sin(2 * np.pi * t / 24)
        trend = 0.1 * t
        noise = np.random.normal(0, 1, 100)
        series = trend + seasonal + noise

        result = detector.detect(series)

        assert isinstance(result, DetectorResult)
        assert len(result.scores) == len(series)
        assert "trend" in result.evidence
        assert "seasonal" in result.evidence

    def test_detector_returns_normalized_scores(self):
        """Test detector returns normalized scores."""
        params = {"period": 24, "k": 3.0, "min_support": 24}
        detector = STLMADDetector(params)

        series = np.random.normal(100, 10, 100)
        result = detector.detect(series)

        # Scores should be non-negative
        assert np.all(result.scores >= 0)
        # Most scores should be reasonable (not extreme)
        assert np.median(result.scores) < 10.0

    def test_detector_filters_by_k_threshold(self):
        """Test detector filters anomalies by k threshold."""
        params = {"period": 24, "k": 3.5, "min_support": 24}
        detector = STLMADDetector(params)

        series = np.random.normal(100, 10, 100)
        result = detector.detect(series)

        # All anomalies should have score > k_threshold
        for idx in result.anomalies:
            assert result.scores[idx] > 3.5
