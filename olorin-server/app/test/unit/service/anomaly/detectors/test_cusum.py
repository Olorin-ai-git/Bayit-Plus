"""
Unit tests for CUSUM detector.

Tests must be written FIRST and FAIL before implementation.
"""

import pytest
import numpy as np

from app.service.anomaly.detectors.cusum import CUSUMDetector
from app.service.anomaly.detectors.base import DetectorResult


class TestCUSUMDetector:
    """Test suite for CUSUM detector."""

    def test_detector_initialization(self):
        """Test detector initializes with valid parameters."""
        params = {
            'delta': 0.75,
            'threshold': 5.0,
            'k': 3.5,
            'persistence': 2,
            'min_support': 50
        }
        detector = CUSUMDetector(params)
        assert detector.delta_multiplier == 0.75
        assert detector.threshold_multiplier == 5.0
        assert detector.k_threshold == 3.5

    def test_detector_validates_series(self):
        """Test detector validates series has sufficient data."""
        params = {'min_support': 50}
        detector = CUSUMDetector(params)
        
        with pytest.raises(ValueError, match="cannot be empty"):
            detector.detect(np.array([]))
        
        with pytest.raises(ValueError, match="Insufficient data"):
            detector.detect(np.array([1.0] * 49))

    def test_detector_detects_level_shift(self):
        """Test detector identifies level shift anomaly."""
        params = {'delta': 0.75, 'threshold': 5.0, 'k': 3.0, 'min_support': 20}
        detector = CUSUMDetector(params)
        
        # Create series with level shift
        series = np.concatenate([
            np.random.normal(100, 10, 50),
            np.random.normal(150, 10, 50)  # Shift up
        ])
        
        result = detector.detect(series)
        
        assert isinstance(result, DetectorResult)
        assert len(result.scores) == len(series)
        # Should detect anomalies around shift point
        assert len(result.anomalies) > 0
        assert 's_pos' in result.evidence
        assert 's_neg' in result.evidence

    def test_detector_detects_negative_shift(self):
        """Test detector identifies negative level shift."""
        params = {'delta': 0.75, 'threshold': 5.0, 'k': 3.0, 'min_support': 20}
        detector = CUSUMDetector(params)
        
        # Create series with negative shift
        series = np.concatenate([
            np.random.normal(150, 10, 50),
            np.random.normal(100, 10, 50)  # Shift down
        ])
        
        result = detector.detect(series)
        
        assert isinstance(result, DetectorResult)
        # Should detect anomalies around shift point
        assert len(result.anomalies) > 0
        assert 's_neg' in result.evidence

    def test_detector_uses_auto_delta_threshold(self):
        """Test detector calculates delta/threshold from std if not provided."""
        params = {'k': 3.0, 'min_support': 20}
        detector = CUSUMDetector(params)
        
        series = np.random.normal(100, 10, 100)
        result = detector.detect(series)
        
        assert isinstance(result, DetectorResult)
        assert len(result.scores) == len(series)

    def test_detector_tracks_changepoint(self):
        """Test detector tracks changepoint index."""
        params = {'delta': 0.75, 'threshold': 5.0, 'k': 3.0, 'min_support': 20}
        detector = CUSUMDetector(params)
        
        # Create series with known changepoint
        series = np.concatenate([
            np.random.normal(100, 10, 50),
            np.random.normal(150, 10, 50)
        ])
        
        result = detector.detect(series)
        
        assert 'changepoint_index' in result.evidence
        changepoint = result.evidence['changepoint_index']
        assert 0 <= changepoint < len(series)

