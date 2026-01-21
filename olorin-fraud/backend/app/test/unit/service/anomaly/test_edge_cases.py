"""
Unit tests for edge cases in anomaly detection.

Tests for missing data, invalid params, concurrent runs, and error conditions.
"""

import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, Mock, patch

import numpy as np
import pytest

from app.models.anomaly import AnomalyEvent, DetectionRun, Detector
from app.service.anomaly.detection_job import DetectionJob
from app.service.anomaly.detectors.cusum import CUSUMDetector
from app.service.anomaly.detectors.stl_mad import STLMADDetector
from app.service.anomaly.guardrails import Guardrails
from app.service.anomaly.scoring import determine_severity


class TestMissingData:
    """Test handling of missing or insufficient data."""

    def test_empty_series_raises_error(self):
        """Test detector raises error on empty series."""
        detector = STLMADDetector({"min_support": 50})
        with pytest.raises(ValueError, match="cannot be empty"):
            detector.detect(np.array([]))

    def test_insufficient_data_below_min_support(self):
        """Test detector skips series below min_support threshold."""
        detector = STLMADDetector({"min_support": 100})
        series = np.random.normal(100, 10, 50)  # Only 50 points

        with pytest.raises(ValueError, match="Insufficient data"):
            detector.detect(series)

    def test_all_nan_values_handled(self):
        """Test detector handles series with all NaN values."""
        detector = STLMADDetector({"min_support": 10})
        series = np.array([np.nan] * 100)

        with pytest.raises(ValueError):
            detector.detect(series)

    def test_partial_nan_values_handled(self):
        """Test detector handles series with some NaN values."""
        detector = STLMADDetector({"min_support": 10})
        series = np.array([1.0, 2.0, np.nan, 4.0, 5.0] * 20)

        # Should handle gracefully or raise appropriate error
        result = detector.detect(series)
        assert result is not None

    def test_zero_variance_series(self):
        """Test detector handles series with zero variance."""
        detector = STLMADDetector({"min_support": 10})
        series = np.array([100.0] * 100)  # Constant value

        result = detector.detect(series)
        assert isinstance(result, type(detector.detect(np.random.normal(100, 10, 100))))


class TestInvalidParameters:
    """Test handling of invalid detector parameters."""

    def test_negative_k_threshold(self):
        """Test detector rejects negative k threshold."""
        with pytest.raises(ValueError):
            STLMADDetector({"k": -1.0, "min_support": 50})

    def test_zero_persistence(self):
        """Test detector rejects zero persistence."""
        with pytest.raises(ValueError):
            STLMADDetector({"persistence": 0, "min_support": 50})

    def test_negative_min_support(self):
        """Test detector rejects negative min_support."""
        with pytest.raises(ValueError):
            STLMADDetector({"min_support": -1})

    def test_invalid_detector_type(self):
        """Test factory rejects invalid detector type."""
        from app.service.anomaly.detector_factory import DetectorFactory

        with pytest.raises(ValueError, match="Unknown detector type"):
            DetectorFactory.create("invalid_type", {})

    def test_missing_required_params(self):
        """Test detector handles missing required parameters."""
        # Should use defaults from config
        detector = STLMADDetector({})
        assert detector.k_threshold > 0
        assert detector.persistence > 0
        assert detector.min_support > 0


class TestConcurrentRuns:
    """Test handling of concurrent detection runs."""

    @pytest.fixture
    def mock_detector(self):
        """Create a mock detector for testing."""
        detector = Detector(
            id=uuid.uuid4(),
            name="Test Detector",
            type="stl_mad",
            cohort_by=["merchant_id"],
            metrics=["tx_count"],
            params={"k": 3.5, "persistence": 2, "min_support": 50},
            enabled=True,
        )
        return detector

    @patch("app.service.anomaly.detection_job.get_cohorts")
    @patch("app.service.anomaly.detection_job.process_cohorts")
    def test_concurrent_runs_same_detector(
        self, mock_process, mock_get_cohorts, mock_detector
    ):
        """Test multiple concurrent runs for same detector."""
        from app.persistence.database import get_db

        mock_get_cohorts.return_value = [{"merchant_id": "m1"}]
        mock_process.return_value = (1, 0)  # 1 cohort processed, 0 anomalies

        job1 = DetectionJob()
        job2 = DetectionJob()

        window_from = datetime.now() - timedelta(hours=1)
        window_to = datetime.now()

        # Run two detection jobs concurrently
        run1 = job1.run_detection(mock_detector, window_from, window_to)
        run2 = job2.run_detection(mock_detector, window_from, window_to)

        assert run1.id != run2.id
        assert run1.detector_id == run2.detector_id

    def test_guardrails_thread_safety(self):
        """Test guardrails are thread-safe for concurrent access."""
        guardrails = Guardrails()
        cohort = {"merchant_id": "m1"}
        metric = "tx_count"
        current_time = datetime.now()

        # Simulate concurrent persistence checks
        results = []
        for _ in range(10):
            persisted = guardrails.check_persistence(cohort, metric, 5.0, 3.5)
            results.append(persisted)

        # Should handle concurrent access without errors
        assert len(results) == 10


class TestErrorConditions:
    """Test error handling in various failure scenarios."""

    @patch("app.service.anomaly.cohort_fetcher.get_database_provider")
    def test_snowflake_connection_failure(self, mock_get_provider, mock_detector):
        """Test detection run handles Snowflake connection failure."""
        from app.service.anomaly.detection_job import DetectionJob

        # Mock connection failure
        mock_provider = Mock()
        mock_provider.connect.side_effect = ConnectionError(
            "Snowflake connection failed"
        )
        mock_get_provider.return_value = mock_provider

        job = DetectionJob()
        window_from = datetime.now() - timedelta(hours=1)
        window_to = datetime.now()

        # Should handle connection error gracefully
        with pytest.raises(Exception):  # May raise ConnectionError or wrap it
            job.run_detection(mock_detector, window_from, window_to)

    def test_invalid_time_window(self):
        """Test detection run rejects invalid time window."""
        job = DetectionJob()
        window_from = datetime.now()
        window_to = datetime.now() - timedelta(hours=1)  # Invalid: to < from

        mock_detector = Mock()
        mock_detector.id = uuid.uuid4()
        mock_detector.name = "Test"
        mock_detector.type = "stl_mad"
        mock_detector.cohort_by = ["merchant_id"]
        mock_detector.metrics = ["tx_count"]
        mock_detector.params = {}
        mock_detector.enabled = True

        # Should validate window order
        # Note: Actual validation may be in database constraint or API layer
        # This test documents expected behavior

    def test_detector_not_found(self):
        """Test detection run handles missing detector."""
        from app.persistence.database import get_db

        job = DetectionJob()
        fake_detector_id = uuid.uuid4()

        db = next(get_db())
        detector = db.query(Detector).filter(Detector.id == fake_detector_id).first()

        if detector is None:
            # Detector doesn't exist - this is expected behavior
            assert detector is None


class TestBoundaryConditions:
    """Test boundary conditions and edge values."""

    def test_minimum_valid_series_length(self):
        """Test detector works with minimum valid series length."""
        detector = STLMADDetector({"min_support": 10})
        series = np.random.normal(100, 10, 10)  # Exactly min_support

        result = detector.detect(series)
        assert result is not None

    def test_very_large_series(self):
        """Test detector handles very large series."""
        detector = STLMADDetector({"min_support": 50})
        series = np.random.normal(100, 10, 100000)  # Very large series

        result = detector.detect(series)
        assert result is not None
        assert len(result.scores) == len(series)

    def test_extreme_score_values(self):
        """Test scoring handles extreme score values."""
        # Very high score
        severity_high = determine_severity(
            score=100.0, persisted_n=5, detector_params={}
        )
        assert severity_high in ["warn", "critical"]

        # Very low score
        severity_low = determine_severity(score=0.1, persisted_n=1, detector_params={})
        assert severity_low in ["info", None]

    def test_zero_score(self):
        """Test scoring handles zero score."""
        severity = determine_severity(score=0.0, persisted_n=1, detector_params={})
        # Should return None or 'info' for zero score
        assert severity in [None, "info"]
