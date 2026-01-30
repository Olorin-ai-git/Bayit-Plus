"""Tests for email rate limiter."""

import pytest
import time
from unittest.mock import patch, MagicMock
from olorin_email.rate_limiter import EmailRateLimiter


def test_check_behavior_at_various_limits(email_settings):
    """Test check returns correct values at different limit thresholds."""
    limiter = EmailRateLimiter(email_settings)
    recipient = "test@example.com"

    # Under limit - should pass
    assert limiter.check(recipient) is True

    # Record 4 emails - just under limit
    for _ in range(4):
        limiter.record(recipient)
    assert limiter.check(recipient) is True

    # Record 1 more - at limit
    limiter.record(recipient)
    assert limiter.check(recipient) is False


def test_record_increases_count(email_settings):
    """Test that record increases send count."""
    limiter = EmailRateLimiter(email_settings)
    recipient = "test@example.com"

    initial = limiter.get_remaining(recipient)
    limiter.record(recipient)
    after = limiter.get_remaining(recipient)

    assert after == initial - 1


def test_reset_clears_history(email_settings):
    """Test that reset clears recipient's send history."""
    limiter = EmailRateLimiter(email_settings)
    recipient = "test@example.com"

    for _ in range(3):
        limiter.record(recipient)

    assert limiter.get_remaining(recipient) == 2

    limiter.reset(recipient)
    assert limiter.get_remaining(recipient) == 5


def test_get_remaining_returns_correct_count(email_settings):
    """Test that get_remaining returns correct remaining sends."""
    limiter = EmailRateLimiter(email_settings)
    recipient = "test@example.com"

    assert limiter.get_remaining(recipient) == 5

    for i in range(3):
        limiter.record(recipient)
        assert limiter.get_remaining(recipient) == 4 - i


def test_get_remaining_never_negative(email_settings):
    """Test that get_remaining never returns negative values."""
    limiter = EmailRateLimiter(email_settings)
    recipient = "test@example.com"

    for _ in range(10):
        limiter.record(recipient)

    assert limiter.get_remaining(recipient) == 0


def test_cleanup_old_entries(email_settings):
    """Test that old entries outside the window are cleaned up."""
    limiter = EmailRateLimiter(email_settings)
    recipient = "test@example.com"

    with patch('olorin_email.rate_limiter.time.time') as mock_time:
        # Record entry 2 hours ago
        current_time = 10000.0
        mock_time.return_value = current_time - 7200
        limiter.record(recipient)

        # Record entry now
        mock_time.return_value = current_time
        limiter.record(recipient)

        # Check cleanup - only recent entry should remain
        assert limiter.get_remaining(recipient) == 4

        # Test multiple entries with some expired
        recipient2 = "test2@example.com"
        mock_time.return_value = 1000.0
        limiter.record(recipient2)
        mock_time.return_value = 1200.0
        limiter.record(recipient2)
        mock_time.return_value = 5000.0
        limiter.record(recipient2)
        limiter._cleanup_old_entries(recipient2)

        # Cutoff is 5000-3600=1400, so entries at 1000 and 1200 are expired (< 1400)
        # Only entry at 5000 remains
        assert limiter.get_remaining(recipient2) == 4


def test_different_recipients_tracked_independently(email_settings):
    """Test that different recipients are tracked independently."""
    limiter = EmailRateLimiter(email_settings)

    for _ in range(3):
        limiter.record("user1@example.com")

    for _ in range(2):
        limiter.record("user2@example.com")

    assert limiter.get_remaining("user1@example.com") == 2
    assert limiter.get_remaining("user2@example.com") == 3

    limiter.reset("user1@example.com")

    assert limiter.get_remaining("user1@example.com") == 5
    assert limiter.get_remaining("user2@example.com") == 3


def test_check_cleans_up_before_checking(email_settings):
    """Test that check cleans up old entries before checking limit."""
    limiter = EmailRateLimiter(email_settings)
    recipient = "test@example.com"

    with patch('olorin_email.rate_limiter.time.time') as mock_time:
        # Record 5 entries (at limit) 2 hours ago
        current_time = 10000.0
        mock_time.return_value = current_time - 7200
        for _ in range(5):
            limiter.record(recipient)

        # Check at current time should trigger cleanup and pass
        mock_time.return_value = current_time
        assert limiter.check(recipient) is True


def test_window_and_settings(email_settings):
    """Test window duration and configurable limit settings."""
    # Window is 1 hour
    limiter = EmailRateLimiter(email_settings)
    assert limiter.window_seconds == 3600

    # Custom limit is respected
    email_settings.EMAIL_RATE_LIMIT_PER_RECIPIENT_PER_HOUR = 3
    limiter = EmailRateLimiter(email_settings)
    recipient = "test@example.com"

    for _ in range(3):
        assert limiter.check(recipient) is True
        limiter.record(recipient)

    assert limiter.check(recipient) is False


def test_sliding_window_time_progression(email_settings):
    """Test sliding window behavior as time progresses."""
    limiter = EmailRateLimiter(email_settings)
    recipient = "test@example.com"

    with patch('olorin_email.rate_limiter.time.time') as mock_time:
        base_time = 10000.0

        # At limit
        mock_time.return_value = base_time
        for _ in range(5):
            limiter.record(recipient)
        assert limiter.check(recipient) is False

        # 30 min later - still in window
        mock_time.return_value = base_time + 1800
        assert limiter.check(recipient) is False

        # 61 min later - outside window
        mock_time.return_value = base_time + 3660
        assert limiter.check(recipient) is True


def test_edge_cases(email_settings):
    """Test edge cases: nonexistent recipient, cleanup deletes empty."""
    limiter = EmailRateLimiter(email_settings)

    # Reset nonexistent recipient doesn't error
    limiter.reset("nonexistent@example.com")

    # Cleanup deletes recipient when empty
    with patch('olorin_email.rate_limiter.time.time') as mock_time:
        mock_time.return_value = 1000.0
        limiter.record("temp@example.com")
        mock_time.return_value = 5000.0
        limiter._cleanup_old_entries("temp@example.com")
        assert "temp@example.com" not in limiter._send_times
