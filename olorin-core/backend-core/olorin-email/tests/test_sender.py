"""Tests for EmailSender orchestrator."""

import pytest
from unittest.mock import AsyncMock, Mock
from olorin_email.sender import EmailSender
from olorin_email.builder import EmailBuilder
from olorin_email.provider.base import EmailMessage, SendResult
from olorin_email.template.engine import RenderedEmail


@pytest.fixture
def mock_provider():
    """Create mock email provider."""
    provider = AsyncMock()
    provider.send.return_value = SendResult(success=True, message_id="msg-123", status_code=200)
    return provider


@pytest.fixture
def mock_template_engine():
    """Create mock template engine."""
    engine = Mock()
    engine.render.return_value = RenderedEmail(
        html="<html>Rendered</html>",
        plain_text="Rendered"
    )
    return engine


@pytest.fixture
def email_sender(email_settings, mock_provider, mock_template_engine):
    """Create EmailSender instance with mocked dependencies."""
    return EmailSender(email_settings, mock_provider, mock_template_engine)


@pytest.mark.asyncio
async def test_send_with_message_and_builder(email_sender, email_settings, mock_provider):
    """Test sending succeeds with both EmailMessage and EmailBuilder input."""
    # Test with EmailMessage
    message = EmailMessage(
        to_email="test@example.com",
        subject="Test",
        html_content="<html>Test</html>",
        email_id="test-123"
    )
    result = await email_sender.send(message)
    assert result.success is True

    # Test with EmailBuilder
    builder = EmailBuilder(email_settings).to("test2@example.com").subject("Test").html("<html>Test</html>")
    result = await email_sender.send(builder)
    assert result.success is True
    assert mock_provider.send.call_count == 2


@pytest.mark.asyncio
async def test_rate_limit_blocks_when_exceeded(email_sender):
    """Test that rate limit blocks email when limit is exceeded."""
    message = EmailMessage(
        to_email="test@example.com",
        subject="Test",
        html_content="<html>Test</html>",
        email_id="test-123"
    )

    # Send up to the limit (5 emails)
    for _ in range(5):
        result = await email_sender.send(message)
        assert result.success is True

    # Next send should be blocked
    result = await email_sender.send(message)
    assert result.success is False
    assert result.status_code == 429
    assert "Rate limit exceeded" in result.error


@pytest.mark.asyncio
async def test_rate_limit_per_recipient(email_sender):
    """Test that rate limit is enforced per-recipient."""
    # Send to 5 different recipients
    for i in range(5):
        msg = EmailMessage(
            to_email=f"test{i}@example.com",
            subject="Test",
            html_content="<html>Test</html>",
            email_id=f"test-{i}"
        )
        result = await email_sender.send(msg)
        assert result.success is True

    # Should still be able to send to new recipient
    new_msg = EmailMessage(
        to_email="new@example.com",
        subject="Test",
        html_content="<html>Test</html>",
        email_id="test-new"
    )
    result = await email_sender.send(new_msg)
    assert result.success is True


@pytest.mark.asyncio
async def test_batch_send(email_sender, mock_provider):
    """Test batch send processes all messages."""
    messages = [
        EmailMessage(
            to_email=f"test{i}@example.com",
            subject=f"Test {i}",
            html_content=f"<html>Test {i}</html>",
            email_id=f"test-{i}"
        )
        for i in range(3)
    ]

    results = await email_sender.send_batch(messages)
    assert len(results) == 3
    assert all(r.success for r in results)
    assert mock_provider.send.call_count == 3


@pytest.mark.asyncio
async def test_batch_send_continues_on_failure(email_sender, mock_provider):
    """Test batch send continues even if some messages fail."""
    results_list = [
        SendResult(success=True, message_id="msg-1"),
        SendResult(success=False, error="Failed", status_code=400),
        SendResult(success=True, message_id="msg-3")
    ]
    call_count = [0]
    async def mock_send(msg):
        result = results_list[call_count[0]]
        call_count[0] += 1
        return result
    mock_provider.send.side_effect = mock_send

    messages = [
        EmailMessage(
            to_email=f"test{i}@example.com",
            subject="Test",
            html_content="<html>Test</html>",
            email_id=f"test-{i}"
        )
        for i in range(3)
    ]

    results = await email_sender.send_batch(messages)
    assert results[0].success is True
    assert results[1].success is False
    assert results[2].success is True


@pytest.mark.asyncio
async def test_template_rendering(email_sender, mock_template_engine):
    """Test template rendering behavior with and without template_name."""
    # With template_name - should render
    msg_template = EmailMessage(
        to_email="test@example.com",
        subject="Test",
        html_content="",
        template_name="welcome.html.j2",
        custom_args={"name": "John"},
        email_id="test-123"
    )
    await email_sender.send(msg_template)
    mock_template_engine.render.assert_called_once_with("welcome.html.j2", {"name": "John"})

    # Without template_name - should not render
    mock_template_engine.reset_mock()
    msg_direct = EmailMessage(
        to_email="test@example.com",
        subject="Test",
        html_content="<html>Direct</html>",
        template_name="",
        email_id="test-456"
    )
    await email_sender.send(msg_direct)
    mock_template_engine.render.assert_not_called()


@pytest.mark.asyncio
async def test_rate_limiter_records_successful_sends_only(email_sender, mock_provider):
    """Test that rate limiter only records successful sends."""
    # Successful send
    msg = EmailMessage(
        to_email="test@example.com",
        subject="Test",
        html_content="<html>Test</html>",
        email_id="test-123"
    )
    await email_sender.send(msg)
    assert email_sender.rate_limiter.get_remaining("test@example.com") == 4

    # Failed send should not consume quota
    mock_provider.send.return_value = SendResult(success=False, error="Error", status_code=500)
    await email_sender.send(msg)
    assert email_sender.rate_limiter.get_remaining("test@example.com") == 4
