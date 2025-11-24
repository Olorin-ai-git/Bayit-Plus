"""
Unit tests for severity scoring logic.

Tests must be written FIRST and FAIL before implementation.
"""

import pytest

from app.service.anomaly.scoring import determine_severity, normalize_score


class TestSeverityScoring:
    """Test suite for severity scoring."""

    def test_determine_severity_critical(self):
        """Test critical severity determination."""
        # Score above critical threshold
        severity = determine_severity(score=5.0, persisted_n=2)
        assert severity == 'critical'

    def test_determine_severity_warn(self):
        """Test warn severity determination."""
        # Score between warn and critical
        severity = determine_severity(score=4.0, persisted_n=2)
        assert severity == 'warn'

    def test_determine_severity_info(self):
        """Test info severity determination."""
        # Score between info and warn
        severity = determine_severity(score=2.5, persisted_n=2)
        assert severity == 'info'

    def test_determine_severity_below_threshold(self):
        """Test severity returns None for scores below info threshold."""
        severity = determine_severity(score=1.5, persisted_n=2)
        assert severity is None

    def test_determine_severity_uses_detector_thresholds(self):
        """Test severity uses detector-specific thresholds if provided."""
        detector_params = {
            'severity_thresholds': {
                'info_max': 2.0,
                'warn_max': 3.0,
                'critical_min': 3.0
            }
        }
        
        severity = determine_severity(
            score=2.5,
            persisted_n=2,
            detector_params=detector_params
        )
        assert severity == 'warn'

    def test_determine_severity_falls_back_to_global_defaults(self):
        """Test severity falls back to global defaults if detector thresholds invalid."""
        detector_params = {
            'severity_thresholds': {
                'info_max': 5.0,  # Invalid: > warn_max
                'warn_max': 3.0,
                'critical_min': 3.0
            }
        }
        
        # Should use global defaults instead
        severity = determine_severity(
            score=4.0,
            persisted_n=2,
            detector_params=detector_params
        )
        assert severity in ['warn', 'critical']  # Uses global defaults

    def test_normalize_score_standard(self):
        """Test standard score normalization."""
        normalized = normalize_score(5.0, method='standard')
        assert normalized >= 0.0

    def test_normalize_score_handles_negative(self):
        """Test normalization handles negative scores."""
        normalized = normalize_score(-1.0, method='standard')
        assert normalized >= 0.0  # Should clamp to 0

