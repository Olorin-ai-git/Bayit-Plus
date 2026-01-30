"""Tests for retry logic with exponential backoff."""

import pytest
from unittest.mock import AsyncMock
from olorin_email.retry import with_retry, _should_retry, _calculate_backoff_delay
from olorin_email.provider.base import SendResult


@pytest.mark.asyncio
async def test_success_on_first_attempt(email_settings):
    """Test that success on first attempt returns immediately."""
    send_fn = AsyncMock(return_value=SendResult(success=True, message_id="msg-123"))
    result = await with_retry(send_fn, email_settings)

    assert result.success is True
    send_fn.assert_called_once()


@pytest.mark.asyncio
async def test_retries_on_retryable_errors(email_settings):
    """Test that function retries on retryable errors and eventually succeeds."""
    send_fn = AsyncMock(side_effect=[
        SendResult(success=False, status_code=500, error="Server error"),
        SendResult(success=False, status_code=500, error="Server error"),
        SendResult(success=True, message_id="msg-123")
    ])

    result = await with_retry(send_fn, email_settings)
    assert result.success is True
    assert send_fn.call_count == 3


@pytest.mark.asyncio
async def test_does_not_retry_on_non_retryable_errors(email_settings):
    """Test that function does not retry on non-retryable errors (4xx)."""
    for status_code in [400, 401, 403, 404]:
        send_fn = AsyncMock(return_value=SendResult(
            success=False,
            status_code=status_code,
            error="Client error"
        ))
        result = await with_retry(send_fn, email_settings)

        assert result.success is False
        send_fn.assert_called_once()
        send_fn.reset_mock()


@pytest.mark.asyncio
async def test_gives_up_after_max_retries(email_settings):
    """Test that retry gives up after max retries are exhausted."""
    send_fn = AsyncMock(return_value=SendResult(
        success=False,
        status_code=500,
        error="Persistent error"
    ))

    result = await with_retry(send_fn, email_settings)
    assert result.success is False
    assert send_fn.call_count == email_settings.EMAIL_MAX_RETRIES + 1


@pytest.mark.asyncio
async def test_retries_on_all_retryable_status_codes(email_settings):
    """Test that function retries on all retryable status codes (429, 5xx)."""
    for status_code in [429, 500, 502, 503, 504]:
        send_fn = AsyncMock(side_effect=[
            SendResult(success=False, status_code=status_code, error="Error"),
            SendResult(success=True, message_id="msg-123")
        ])
        result = await with_retry(send_fn, email_settings)

        assert result.success is True
        assert send_fn.call_count == 2
        send_fn.reset_mock()


@pytest.mark.asyncio
async def test_retries_when_status_code_is_none(email_settings):
    """Test that function retries when status_code is None (network error)."""
    send_fn = AsyncMock(side_effect=[
        SendResult(success=False, status_code=None, error="Network error"),
        SendResult(success=True, message_id="msg-123")
    ])

    result = await with_retry(send_fn, email_settings)
    assert result.success is True
    assert send_fn.call_count == 2


def test_should_retry_logic():
    """Test _should_retry returns correct values for various status codes."""
    # Retryable codes
    for code in [429, 500, 502, 503, 504, None]:
        assert _should_retry(SendResult(success=False, status_code=code)) is True

    # Non-retryable codes
    for code in [400, 401, 403, 404]:
        assert _should_retry(SendResult(success=False, status_code=code)) is False


def test_backoff_delay_increases_exponentially():
    """Test that backoff delay increases exponentially with jitter."""
    base_delay = 1.0

    delay_0 = _calculate_backoff_delay(0, base_delay)
    delay_1 = _calculate_backoff_delay(1, base_delay)
    delay_2 = _calculate_backoff_delay(2, base_delay)

    # Delays should roughly double each attempt (with up to 10% jitter)
    assert 1.0 <= delay_0 <= 1.1
    assert 2.0 <= delay_1 <= 2.2
    assert 4.0 <= delay_2 <= 4.4


def test_backoff_delay_includes_random_jitter():
    """Test that backoff delay includes random jitter."""
    base_delay = 1.0
    delays = [_calculate_backoff_delay(0, base_delay) for _ in range(10)]

    # All delays should be different due to jitter
    assert len(set(delays)) > 1

    # All delays should be within expected range
    for delay in delays:
        assert base_delay <= delay <= base_delay * 1.1


def test_backoff_delay_formula_correctness():
    """Test that backoff delay calculation follows exponential formula."""
    base_delay = 2.0

    # Expected: base_delay * (2 ** attempt) + jitter (up to 10%)
    for attempt, expected_base in [(0, 2.0), (1, 4.0), (2, 8.0), (3, 16.0)]:
        delay = _calculate_backoff_delay(attempt, base_delay)
        assert expected_base <= delay <= expected_base * 1.1
