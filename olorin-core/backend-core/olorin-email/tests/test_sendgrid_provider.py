"""Tests for SendGrid email provider."""

import pytest
from unittest.mock import AsyncMock, Mock
import httpx
from olorin_email.provider.sendgrid_provider import SendGridProvider
from olorin_email.provider.base import EmailMessage, SendResult


@pytest.fixture
def mock_client():
    """Create mock httpx AsyncClient."""
    return AsyncMock(spec=httpx.AsyncClient)


@pytest.fixture
def email_message():
    """Create test email message."""
    return EmailMessage(
        to_email="recipient@example.com",
        subject="Test Subject",
        html_content="<html>Test</html>",
        from_email="sender@example.com",
        from_name="Test Sender",
        email_id="test-email-123"
    )


@pytest.mark.asyncio
async def test_successful_send(email_settings, mock_client, email_message):
    """Test successful email send returns success result."""
    mock_response = Mock(status_code=202, headers={"x-message-id": "sg-msg-xyz"})
    mock_client.post.return_value = mock_response

    provider = SendGridProvider(mock_client, email_settings)
    result = await provider.send(email_message)

    assert result.success is True
    assert result.message_id == "sg-msg-xyz"
    assert result.status_code == 202


@pytest.mark.asyncio
async def test_failed_send_error_codes(email_settings, mock_client, email_message):
    """Test failed send with various error codes."""
    # 400 error
    mock_client.post.return_value = Mock(status_code=400, text="Bad request")
    result = await SendGridProvider(mock_client, email_settings).send(email_message)
    assert result.success is False
    assert result.status_code == 400

    # 500 error
    mock_client.post.return_value = Mock(status_code=500, text="Server error")
    result = await SendGridProvider(mock_client, email_settings).send(email_message)
    assert result.success is False
    assert result.status_code == 500


@pytest.mark.asyncio
async def test_http_error_handling(email_settings, mock_client, email_message):
    """Test HTTP exception handling."""
    mock_client.post.side_effect = httpx.ConnectError("Connection failed")
    result = await SendGridProvider(mock_client, email_settings).send(email_message)

    assert result.success is False
    assert "Connection failed" in result.error


@pytest.mark.asyncio
async def test_payload_with_all_fields(email_settings, mock_client):
    """Test payload construction with all optional fields."""
    message = EmailMessage(
        to_email="recipient@example.com",
        subject="Test",
        html_content="<html>Test</html>",
        plain_content="Test plain",
        from_email="custom@example.com",
        from_name="Custom",
        reply_to="reply@example.com",
        categories=["newsletter", "marketing"],
        custom_args={"user_id": "123"},
        headers={"X-Custom": "value"},
        email_id="test-123",
        template_name="welcome.html.j2"
    )

    mock_client.post.return_value = Mock(status_code=202, headers={})
    await SendGridProvider(mock_client, email_settings).send(message)

    payload = mock_client.post.call_args.kwargs["json"]
    assert payload["from"]["email"] == "custom@example.com"
    assert payload["reply_to"]["email"] == "reply@example.com"
    assert payload["categories"] == ["newsletter", "marketing"]
    assert payload["custom_args"] == {"user_id": "123"}
    assert payload["headers"]["X-Olorin-Email-Id"] == "test-123"
    assert payload["headers"]["X-Olorin-Template"] == "welcome.html.j2"
    assert len(payload["content"]) == 2


@pytest.mark.asyncio
async def test_payload_with_minimal_fields(email_settings, mock_client):
    """Test payload construction with minimal required fields."""
    message = EmailMessage(
        to_email="recipient@example.com",
        subject="Test",
        html_content="<html>Test</html>",
        email_id="test-123"
    )

    mock_client.post.return_value = Mock(status_code=202, headers={})
    await SendGridProvider(mock_client, email_settings).send(message)

    payload = mock_client.post.call_args.kwargs["json"]
    assert payload["from"]["email"] == email_settings.SENDGRID_FROM_EMAIL
    assert "reply_to" not in payload
    assert "categories" not in payload


@pytest.mark.asyncio
async def test_authorization_headers(email_settings, mock_client, email_message):
    """Test that Authorization header includes bearer token."""
    mock_client.post.return_value = Mock(status_code=202, headers={})
    await SendGridProvider(mock_client, email_settings).send(email_message)

    headers = mock_client.post.call_args.kwargs["headers"]
    assert headers["Authorization"] == f"Bearer {email_settings.SENDGRID_API_KEY}"
    assert headers["Content-Type"] == "application/json"
