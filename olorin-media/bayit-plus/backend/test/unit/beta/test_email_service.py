"""Unit tests for EmailVerificationService."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timedelta
import hmac
import hashlib
from app.services.beta.email_service import EmailVerificationService
from app.models.beta_user import BetaUser
from app.core.config import Settings


@pytest.fixture
def mock_settings():
    """Mock Settings with email verification configuration."""
    settings = MagicMock(spec=Settings)
    settings.EMAIL_VERIFICATION_SECRET_KEY = "test-secret-key-12345"
    settings.EMAIL_VERIFICATION_TOKEN_EXPIRY_HOURS = 24
    settings.SENDGRID_API_KEY = "SG.test-key"
    settings.SENDGRID_FROM_EMAIL = "noreply@bayit.plus"
    settings.SENDGRID_FROM_NAME = "Bayit+ Beta"
    settings.FRONTEND_URL = "https://app.bayit.plus"
    return settings


@pytest.fixture
def email_service(mock_settings):
    """Create EmailVerificationService with mocked settings."""
    return EmailVerificationService(settings=mock_settings)


class TestGenerateVerificationToken:
    """Tests for generate_verification_token method."""

    def test_generate_token_format(self, email_service):
        """Test that token has correct format: email|expiry|hmac."""
        email = "test@example.com"
        token = email_service.generate_verification_token(email)

        # Token should have 3 parts separated by |
        parts = token.split('|')
        assert len(parts) == 3

        # First part should be email
        assert parts[0] == email

        # Second part should be timestamp (integer)
        expiry_timestamp = int(parts[1])
        assert expiry_timestamp > 0

        # Third part should be HMAC signature (64 hex characters for SHA256)
        assert len(parts[2]) == 64
        assert all(c in '0123456789abcdef' for c in parts[2])

    def test_generate_token_expiry_time(self, email_service):
        """Test that token expiry is 24 hours from now."""
        email = "test@example.com"
        token = email_service.generate_verification_token(email)

        parts = token.split('|')
        expiry_timestamp = int(parts[1])
        expiry_datetime = datetime.fromtimestamp(expiry_timestamp)

        # Should expire approximately 24 hours from now (within 1 minute tolerance)
        expected_expiry = datetime.utcnow() + timedelta(hours=24)
        time_diff = abs((expiry_datetime - expected_expiry).total_seconds())
        assert time_diff < 60  # Within 1 minute

    def test_generate_token_unique_for_different_emails(self, email_service):
        """Test that different emails produce different tokens."""
        token1 = email_service.generate_verification_token("user1@example.com")
        token2 = email_service.generate_verification_token("user2@example.com")

        assert token1 != token2


class TestVerifyToken:
    """Tests for verify_token method."""

    def test_verify_valid_token(self, email_service):
        """Test verification of valid, non-expired token."""
        email = "test@example.com"
        token = email_service.generate_verification_token(email)

        valid, verified_email, error = email_service.verify_token(token)

        assert valid is True
        assert verified_email == email
        assert error is None

    def test_verify_expired_token(self, email_service):
        """Test verification of expired token."""
        email = "test@example.com"

        # Manually create expired token (1 hour ago)
        expiry = datetime.utcnow() - timedelta(hours=1)
        payload = f"{email}|{int(expiry.timestamp())}"
        signature = hmac.new(
            email_service.settings.EMAIL_VERIFICATION_SECRET_KEY.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        expired_token = f"{payload}|{signature}"

        valid, verified_email, error = email_service.verify_token(expired_token)

        assert valid is False
        assert verified_email is None
        assert error == "expired"

    def test_verify_invalid_signature(self, email_service):
        """Test verification of token with invalid signature."""
        email = "test@example.com"
        expiry = datetime.utcnow() + timedelta(hours=24)
        payload = f"{email}|{int(expiry.timestamp())}"
        # Wrong signature (not matching the payload)
        wrong_signature = "0" * 64
        invalid_token = f"{payload}|{wrong_signature}"

        valid, verified_email, error = email_service.verify_token(invalid_token)

        assert valid is False
        assert verified_email is None
        assert error == "invalid_signature"

    def test_verify_malformed_token(self, email_service):
        """Test verification of malformed token."""
        malformed_token = "not-a-valid-token"

        valid, verified_email, error = email_service.verify_token(malformed_token)

        assert valid is False
        assert verified_email is None
        assert error == "invalid_format"

    def test_verify_token_missing_parts(self, email_service):
        """Test verification of token with missing parts."""
        incomplete_token = "test@example.com|123456"  # Missing signature

        valid, verified_email, error = email_service.verify_token(incomplete_token)

        assert valid is False
        assert verified_email is None
        assert error == "invalid_format"


class TestVerifyUserEmail:
    """Tests for verify_user_email method."""

    @pytest.mark.asyncio
    async def test_verify_user_email_success(self, email_service):
        """Test successful user email verification."""
        email = "test@example.com"
        token = email_service.generate_verification_token(email)

        # Mock user
        mock_user = MagicMock()
        mock_user.status = "pending_verification"
        mock_user.save = AsyncMock()

        with patch('app.services.beta.email_service.BetaUser') as MockUser:
            MockUser.find_one = AsyncMock(return_value=mock_user)

            success, error = await email_service.verify_user_email(token)

            assert success is True
            assert error is None
            assert mock_user.status == "active"
            assert mock_user.verified_at is not None
            mock_user.save.assert_called_once()

    @pytest.mark.asyncio
    async def test_verify_user_email_invalid_token(self, email_service):
        """Test email verification with invalid token."""
        invalid_token = "invalid-token"

        success, error = await email_service.verify_user_email(invalid_token)

        assert success is False
        assert error == "invalid_format"

    @pytest.mark.asyncio
    async def test_verify_user_email_user_not_found(self, email_service):
        """Test email verification when user doesn't exist."""
        email = "nonexistent@example.com"
        token = email_service.generate_verification_token(email)

        with patch('app.services.beta.email_service.BetaUser') as MockUser:
            MockUser.find_one = AsyncMock(return_value=None)

            success, error = await email_service.verify_user_email(token)

            assert success is False
            assert error == "user_not_found"

    @pytest.mark.asyncio
    async def test_verify_user_email_already_verified(self, email_service):
        """Test email verification when user already active."""
        email = "test@example.com"
        token = email_service.generate_verification_token(email)

        # Mock already active user
        mock_user = MagicMock()
        mock_user.status = "active"

        with patch('app.services.beta.email_service.BetaUser') as MockUser:
            MockUser.find_one = AsyncMock(return_value=mock_user)

            # Should succeed (idempotent)
            success, error = await email_service.verify_user_email(token)

            assert success is True
            assert error is None


class TestSendWelcomeEmail:
    """Tests for send_welcome_email method."""

    @pytest.mark.asyncio
    async def test_send_welcome_email_success(self, email_service):
        """Test sending welcome email after verification."""
        email = "newuser@example.com"
        user_name = "New User"
        credits_balance = 500

        with patch('app.services.beta.email_service.EmailSender') as MockSender, \
             patch('app.services.beta.email_service.httpx.AsyncClient') as MockClient:

            # Mock EmailSender
            mock_sender_instance = MagicMock()
            mock_sender_instance.send = AsyncMock(return_value=MagicMock(
                success=True,
                message_id="test-welcome-message-id"
            ))
            MockSender.return_value = mock_sender_instance

            # Mock httpx.AsyncClient
            mock_client = AsyncMock()
            mock_client.aclose = AsyncMock()
            MockClient.return_value = mock_client

            result = await email_service.send_welcome_email(email, user_name, credits_balance)

            assert result is True
            mock_sender_instance.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_welcome_email_contains_credits_info(self, email_service):
        """Test that welcome email includes credit balance information."""
        email = "test@example.com"
        user_name = "Test User"
        credits_balance = 500

        with patch('app.services.beta.email_service.EmailSender') as MockSender, \
             patch('app.services.beta.email_service.httpx.AsyncClient') as MockClient:

            mock_sender_instance = MagicMock()
            mock_sender_instance.send = AsyncMock(return_value=MagicMock(
                success=True,
                message_id="test-message-id"
            ))
            MockSender.return_value = mock_sender_instance

            mock_client = AsyncMock()
            mock_client.aclose = AsyncMock()
            MockClient.return_value = mock_client

            await email_service.send_welcome_email(email, user_name, credits_balance)

            # Verify EmailBuilder was called with correct template and variables
            mock_sender_instance.send.assert_called_once()
            # Template should be beta/welcome-email.html.j2
            # Variables should include user_name and credits_balance


@pytest.mark.skip(reason="SendGrid integration not implemented - service has TODO for Twilio SendGrid")
class TestSendVerificationEmail:
    """Tests for send_verification_email method."""

    @pytest.mark.asyncio
    async def test_send_verification_email_success(self, email_service):
        """Test sending verification email."""
        email = "test@example.com"
        token = "test-token-123"

        with patch('app.services.beta.email_service.Mail') as MockMail, \
             patch('app.services.beta.email_service.SendGridAPIClient') as MockClient:

            mock_client = MagicMock()
            MockClient.return_value = mock_client
            mock_client.send = MagicMock()

            await email_service.send_verification_email(email, token)

            # Verify email was constructed and sent
            MockMail.assert_called_once()
            mock_client.send.assert_called_once()

    @pytest.mark.asyncio
    async def test_send_verification_email_contains_verification_link(self, email_service):
        """Test that verification email contains correct link."""
        email = "test@example.com"
        token = "test-token-123"

        with patch('app.services.beta.email_service.Mail') as MockMail, \
             patch('app.services.beta.email_service.SendGridAPIClient'):

            await email_service.send_verification_email(email, token)

            # Check that Mail was called with content containing the verification link
            call_args = MockMail.call_args
            expected_link = f"{email_service.settings.FRONTEND_URL}/beta/verify/{token}"

            # Verification link should be in the email content
            assert any(expected_link in str(arg) for arg in call_args[0]) or \
                   any(expected_link in str(v) for v in call_args[1].values())
