"""
Unit tests for Temporal Framework Module
Feature: 026-llm-training-pipeline
"""

from datetime import datetime
import uuid

import pytest

from app.service.training.temporal.drift_monitor import DriftMonitor
from app.service.training.temporal.ootv_manager import OOTVManager
from app.service.training.temporal.rolling_windows import RollingWindowManager
from app.service.training.temporal.temporal_models import (
    DriftAlert,
    OOTVConfig,
    TemporalWindow,
    WindowPair,
)
from typing import Tuple


class TestTemporalWindow:
    """Tests for temporal window dataclass."""

    def test_temporal_window_creation(self):
        """Test creating temporal window."""
        window = TemporalWindow(
            window_id="w_1m",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 2, 1),
            window_months=1,
            purpose="feature",
        )
        assert window.window_id == "w_1m"
        assert window.window_months == 1

    def test_temporal_window_duration(self):
        """Test calculating window duration."""
        window = TemporalWindow(
            window_id="w_3m",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 4, 1),
            window_months=3,
            purpose="feature",
        )
        assert window.get_duration_days() == 91

    def test_temporal_window_contains(self):
        """Test checking if date is within window."""
        window = TemporalWindow(
            window_id="test",
            start_date=datetime(2024, 1, 1),
            end_date=datetime(2024, 2, 1),
            window_months=1,
            purpose="feature",
        )
        assert window.contains(datetime(2024, 1, 15)) is True
        assert window.contains(datetime(2024, 3, 1)) is False


class TestOOTVConfig:
    """Tests for OOTV configuration."""

    def test_ootv_config_creation(self):
        """Test creating OOTV config."""
        config = OOTVConfig(
            enabled=True,
            train_months=9,
            eval_months=3,
        )
        assert config.enabled is True
        assert config.train_months == 9
        assert config.eval_months == 3


class TestDriftAlert:
    """Tests for drift alert dataclass."""

    def test_drift_alert_creation(self):
        """Test creating drift alert."""
        alert = DriftAlert(
            alert_id=str(uuid.uuid4()),
            feature_name="velocity_1h",
            drift_score=0.35,
            threshold=0.25,
            detected_at=datetime.utcnow(),
            severity="high",
        )
        assert alert.feature_name == "velocity_1h"
        assert alert.severity == "high"

    def test_drift_alert_is_actionable(self):
        """Test is_actionable method."""
        high_alert = DriftAlert(
            alert_id="a1",
            feature_name="test",
            drift_score=0.35,
            threshold=0.25,
            detected_at=datetime.utcnow(),
            severity="high",
        )
        assert high_alert.is_actionable() is True

        low_alert = DriftAlert(
            alert_id="a2",
            feature_name="test",
            drift_score=0.15,
            threshold=0.25,
            detected_at=datetime.utcnow(),
            severity="low",
        )
        assert low_alert.is_actionable() is False


class TestRollingWindowManager:
    """Tests for rolling window manager."""

    def test_rolling_window_manager_init(self):
        """Test rolling window manager initialization."""
        manager = RollingWindowManager()
        assert manager is not None

    def test_get_rolling_windows(self):
        """Test getting rolling windows."""
        manager = RollingWindowManager()
        reference_time = datetime(2024, 6, 1)
        windows = manager.get_rolling_windows(reference_time=reference_time)
        assert isinstance(windows, list)
        assert len(windows) > 0
        for window in windows:
            assert isinstance(window, TemporalWindow)

    def test_get_historical_window_pairs(self):
        """Test getting historical window pairs."""
        manager = RollingWindowManager()
        reference_time = datetime(2024, 6, 1)
        pairs = manager.get_historical_window_pairs(
            num_pairs=3, reference_time=reference_time
        )
        assert isinstance(pairs, list)
        assert len(pairs) == 3
        for pair in pairs:
            assert isinstance(pair, WindowPair)

    def test_get_current_window_pair(self):
        """Test getting current window pair."""
        manager = RollingWindowManager()
        reference_time = datetime(2024, 6, 1)
        pair = manager.get_current_window_pair(reference_time=reference_time)
        assert isinstance(pair, WindowPair)
        assert pair.feature_window is not None
        assert pair.observation_window is not None


class TestOOTVManager:
    """Tests for out-of-time validation manager."""

    def test_ootv_manager_init(self):
        """Test OOTV manager initialization."""
        manager = OOTVManager()
        assert manager is not None

    def test_ootv_is_enabled(self):
        """Test OOTV is_enabled method."""
        manager = OOTVManager()
        assert isinstance(manager.is_enabled(), bool)

    def test_ootv_get_windows(self):
        """Test getting OOTV windows."""
        manager = OOTVManager()
        reference_time = datetime(2024, 6, 1)
        train_window, eval_window = manager.get_ootv_windows(
            reference_time=reference_time
        )
        assert isinstance(train_window, TemporalWindow)
        assert isinstance(eval_window, TemporalWindow)
        assert train_window.purpose == "train"
        assert eval_window.purpose == "eval"
        assert train_window.end_date == eval_window.start_date


class TestDriftMonitor:
    """Tests for drift monitor."""

    def test_drift_monitor_init(self):
        """Test drift monitor initialization."""
        monitor = DriftMonitor()
        assert monitor is not None

    def test_drift_monitor_calculate_psi(self):
        """Test PSI calculation."""
        monitor = DriftMonitor()
        baseline = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        current = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
        psi = monitor._calculate_psi(baseline, current)
        assert psi >= 0.0

    def test_drift_monitor_has_actionable_alerts(self):
        """Test checking for actionable alerts."""
        monitor = DriftMonitor()
        assert isinstance(monitor.has_actionable_alerts(), bool)

    def test_drift_monitor_get_recent_alerts(self):
        """Test getting recent alerts."""
        monitor = DriftMonitor()
        alerts = monitor.get_recent_alerts()
        assert isinstance(alerts, list)
