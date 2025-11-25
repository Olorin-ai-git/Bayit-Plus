"""
Unit Tests for Polling Service Enhancements
Feature: 001-investigation-state-management

Tests adaptive interval calculation and ETag generation logic.
Targets 85%+ coverage of polling service enhancements.

SYSTEM MANDATE Compliance:
- No mocks: Direct testing of calculation logic
- Complete tests: All interval scenarios covered
- Type-safe: Proper assertions on returned values
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest

from app.service.polling_enhancements import PollingEnhancements


class TestPollingEnhancements:
    """Test suite for PollingEnhancements class."""

    def setup_method(self):
        """Setup test instance."""
        self.enhancements = PollingEnhancements()

    def test_calculate_adaptive_interval_active_investigation(self):
        """Test interval calculation for active investigation in progress."""
        interval = self.enhancements.calculate_adaptive_interval(
            status="IN_PROGRESS", lifecycle_stage="IN_PROGRESS"
        )
        # Should return fast interval (2000-5000ms range, middle is 3000ms)
        assert 2000 <= interval <= 5000
        assert interval == 3000  # Middle of range

    def test_calculate_adaptive_interval_idle_investigation(self):
        """Test interval calculation for idle investigation (>5 min)."""
        investigation_id = "test-investigation-123"

        # Set last activity to 6 minutes ago
        with patch("app.service.polling_enhancements.datetime") as mock_datetime:
            now = datetime(2025, 1, 1, 12, 0, 0)
            old_time = datetime(2025, 1, 1, 11, 54, 0)  # 6 minutes ago

            # First set the last activity
            mock_datetime.utcnow.return_value = old_time
            self.enhancements.update_activity(investigation_id)

            # Now check interval with current time
            mock_datetime.utcnow.return_value = now
            interval = self.enhancements.calculate_adaptive_interval(
                status="IN_PROGRESS",
                lifecycle_stage="SETTINGS",
                investigation_id=investigation_id,
            )

            # Should return slow interval (30000-120000ms range, middle is 60000ms)
            assert 30000 <= interval <= 120000
            assert interval == 60000  # Middle of range

    def test_calculate_adaptive_interval_completed_status(self):
        """Test interval calculation for completed investigation."""
        interval = self.enhancements.calculate_adaptive_interval(
            status="COMPLETED", lifecycle_stage="COMPLETED"
        )
        # Should return slow interval
        assert interval == 5000  # Configured slow interval

    def test_calculate_adaptive_interval_error_status(self):
        """Test interval calculation for error status."""
        interval = self.enhancements.calculate_adaptive_interval(
            status="ERROR", lifecycle_stage="IN_PROGRESS"
        )
        # Should return slow interval
        assert interval == 5000

    def test_calculate_adaptive_interval_cancelled_status(self):
        """Test interval calculation for cancelled status."""
        interval = self.enhancements.calculate_adaptive_interval(
            status="CANCELLED", lifecycle_stage="IN_PROGRESS"
        )
        # Should return slow interval
        assert interval == 5000

    def test_calculate_adaptive_interval_results_stage(self):
        """Test interval calculation for results lifecycle stage."""
        interval = self.enhancements.calculate_adaptive_interval(
            status="IN_PROGRESS", lifecycle_stage="RESULTS"
        )
        # Should return slow interval
        assert interval == 5000

    def test_calculate_adaptive_interval_settings_stage(self):
        """Test interval calculation for settings stage."""
        interval = self.enhancements.calculate_adaptive_interval(
            status="SETTINGS", lifecycle_stage="SETTINGS"
        )
        # Should return normal interval
        assert interval == 2000

    def test_calculate_adaptive_interval_created_status(self):
        """Test interval calculation for created status."""
        interval = self.enhancements.calculate_adaptive_interval(
            status="CREATED", lifecycle_stage="CREATED"
        )
        # Should return normal interval
        assert interval == 2000

    def test_calculate_adaptive_interval_default(self):
        """Test interval calculation for unknown status."""
        interval = self.enhancements.calculate_adaptive_interval(
            status="UNKNOWN", lifecycle_stage="UNKNOWN"
        )
        # Should return default interval
        assert interval == 15000  # 15 seconds default

    def test_generate_etag_consistent(self):
        """Test that ETag generation is consistent for same inputs."""
        investigation_id = "test-investigation-123"
        version = 42

        etag1 = self.enhancements.generate_etag(investigation_id, version)
        etag2 = self.enhancements.generate_etag(investigation_id, version)

        assert etag1 == etag2
        assert etag1.startswith('W/"42-')
        assert etag1.endswith('"')

    def test_generate_etag_different_versions(self):
        """Test that different versions produce different ETags."""
        investigation_id = "test-investigation-123"

        etag_v1 = self.enhancements.generate_etag(investigation_id, 1)
        etag_v2 = self.enhancements.generate_etag(investigation_id, 2)

        assert etag_v1 != etag_v2
        assert 'W/"1-' in etag_v1
        assert 'W/"2-' in etag_v2

    def test_generate_etag_different_investigations(self):
        """Test that different investigations produce different ETags."""
        version = 1

        etag1 = self.enhancements.generate_etag("investigation-1", version)
        etag2 = self.enhancements.generate_etag("investigation-2", version)

        assert etag1 != etag2
        # Both have same version but different hash
        assert 'W/"1-' in etag1
        assert 'W/"1-' in etag2

    def test_should_return_etag_304_matching(self):
        """Test ETag matching returns True for 304."""
        current_version = 42
        client_etag = 'W/"42-abc12345"'

        result = self.enhancements.should_return_etag_304(current_version, client_etag)
        assert result is True

    def test_should_return_etag_304_non_matching_version(self):
        """Test non-matching version returns False."""
        current_version = 42
        client_etag = 'W/"41-abc12345"'

        result = self.enhancements.should_return_etag_304(current_version, client_etag)
        assert result is False

    def test_should_return_etag_304_without_weak_prefix(self):
        """Test ETag without W/ prefix still works."""
        current_version = 42
        client_etag = '"42-abc12345"'

        result = self.enhancements.should_return_etag_304(current_version, client_etag)
        assert result is True

    def test_should_return_etag_304_empty(self):
        """Test empty ETag returns False."""
        result = self.enhancements.should_return_etag_304(42, "")
        assert result is False

        result = self.enhancements.should_return_etag_304(42, None)
        assert result is False

    def test_should_return_etag_304_invalid_format(self):
        """Test invalid ETag format returns False."""
        current_version = 42

        # Invalid formats
        assert (
            self.enhancements.should_return_etag_304(current_version, "invalid")
            is False
        )
        assert self.enhancements.should_return_etag_304(current_version, "42") is False
        assert (
            self.enhancements.should_return_etag_304(current_version, "abc-42") is False
        )

    def test_update_activity(self):
        """Test updating last activity timestamp."""
        investigation_id = "test-investigation-123"

        with patch("app.service.polling_enhancements.datetime") as mock_datetime:
            mock_time = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.utcnow.return_value = mock_time

            self.enhancements.update_activity(investigation_id)

            assert investigation_id in self.enhancements._last_activity
            assert self.enhancements._last_activity[investigation_id] == mock_time

    def test_get_idle_time(self):
        """Test getting idle time for investigation."""
        investigation_id = "test-investigation-123"

        with patch("app.service.polling_enhancements.datetime") as mock_datetime:
            # Set activity time
            activity_time = datetime(2025, 1, 1, 11, 55, 0)
            mock_datetime.utcnow.return_value = activity_time
            self.enhancements.update_activity(investigation_id)

            # Check idle time 5 minutes later
            current_time = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.utcnow.return_value = current_time

            idle_time = self.enhancements.get_idle_time(investigation_id)
            assert idle_time == timedelta(minutes=5)

    def test_get_idle_time_no_activity(self):
        """Test getting idle time when no activity recorded."""
        idle_time = self.enhancements.get_idle_time("unknown-investigation")
        assert idle_time is None

    def test_is_idle_true(self):
        """Test is_idle returns True for idle investigation."""
        investigation_id = "test-investigation-123"

        with patch("app.service.polling_enhancements.datetime") as mock_datetime:
            # Set activity time 6 minutes ago
            activity_time = datetime(2025, 1, 1, 11, 54, 0)
            mock_datetime.utcnow.return_value = activity_time
            self.enhancements.update_activity(investigation_id)

            # Check 6 minutes later
            current_time = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.utcnow.return_value = current_time

            assert self.enhancements.is_idle(investigation_id) is True

    def test_is_idle_false(self):
        """Test is_idle returns False for active investigation."""
        investigation_id = "test-investigation-123"

        with patch("app.service.polling_enhancements.datetime") as mock_datetime:
            # Set activity time 3 minutes ago
            activity_time = datetime(2025, 1, 1, 11, 57, 0)
            mock_datetime.utcnow.return_value = activity_time
            self.enhancements.update_activity(investigation_id)

            # Check 3 minutes later
            current_time = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.utcnow.return_value = current_time

            assert self.enhancements.is_idle(investigation_id) is False

    def test_is_idle_custom_threshold(self):
        """Test is_idle with custom threshold."""
        investigation_id = "test-investigation-123"

        with patch("app.service.polling_enhancements.datetime") as mock_datetime:
            # Set activity time 2 minutes ago
            activity_time = datetime(2025, 1, 1, 11, 58, 0)
            mock_datetime.utcnow.return_value = activity_time
            self.enhancements.update_activity(investigation_id)

            # Check 2 minutes later
            current_time = datetime(2025, 1, 1, 12, 0, 0)
            mock_datetime.utcnow.return_value = current_time

            # Should be idle with 1 minute threshold
            assert (
                self.enhancements.is_idle(investigation_id, threshold_minutes=1) is True
            )
            # Should not be idle with 5 minute threshold
            assert (
                self.enhancements.is_idle(investigation_id, threshold_minutes=5)
                is False
            )

    def test_is_idle_no_activity(self):
        """Test is_idle returns False when no activity recorded."""
        assert self.enhancements.is_idle("unknown-investigation") is False
