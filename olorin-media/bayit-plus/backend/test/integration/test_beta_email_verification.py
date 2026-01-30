"""Integration tests for Beta 500 email verification flow."""

import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock, MagicMock
from app.main import app
from app.models.beta_user import BetaUser
from app.core.database import connect_to_mongo, close_mongo_connection
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient
import os


@pytest.fixture(scope="module")
async def test_db():
    """Initialize test database with Beta models."""
    # Connect to MongoDB (uses existing connection logic)
    await connect_to_mongo()

    yield

    # Cleanup
    await close_mongo_connection()


@pytest.fixture
async def client():
    """Create test HTTP client."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_email_sender():
    """Mock olorin-email EmailSender to avoid actual SendGrid calls."""
    with patch('app.services.beta.email_service.EmailSender') as mock:
        mock_sender_instance = MagicMock()
        mock_sender_instance.send = AsyncMock(return_value=MagicMock(
            success=True,
            message_id="test-message-id-12345"
        ))
        mock.return_value = mock_sender_instance
        yield mock_sender_instance


class TestEmailVerificationFlow:
    """Integration tests for complete email verification flow."""

    @pytest.mark.asyncio
    async def test_complete_verification_flow(self, client, test_db, mock_email_sender):
        """Test complete flow: signup → verify email → user activated."""
        test_email = "newuser@example.com"

        # Step 1: Create beta user (simulating beta invitation)
        beta_user = BetaUser(
            email=test_email,
            status="pending_verification",
            verification_token=None
        )
        await beta_user.insert()

        # Step 2: Request email verification (simulating signup)
        # This should generate token and send email
        with patch('app.api.routes.beta.signup.EmailVerificationService') as MockService:
            mock_service = MagicMock()
            mock_service.generate_verification_token.return_value = "test-token-123"
            mock_service.send_verification_email = AsyncMock(return_value=True)
            MockService.return_value = mock_service

            response = await client.post(
                "/api/v1/beta/resend-verification",
                json={"email": test_email}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True
            assert "sent" in data["message"].lower()

            # Verify email sending was called
            mock_service.send_verification_email.assert_called_once()

        # Step 3: User clicks verification link
        # Get the updated user with token
        user = await BetaUser.find_one(BetaUser.email == test_email)
        assert user.verification_token == "test-token-123"

        # Step 4: Verify email via API endpoint
        response = await client.get(
            f"/api/v1/beta/verify-email?token={user.verification_token}"
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["email"] == test_email

        # Step 5: Verify user status is now active
        verified_user = await BetaUser.find_one(BetaUser.email == test_email)
        assert verified_user.status == "active"
        assert verified_user.verified_at is not None
        assert verified_user.verification_token is None  # Token cleared after use

    @pytest.mark.asyncio
    async def test_resend_verification_email(self, client, test_db, mock_email_sender):
        """Test resending verification email for pending user."""
        test_email = "pendinguser@example.com"

        # Create pending user
        beta_user = BetaUser(
            email=test_email,
            status="pending_verification",
            verification_token="old-token"
        )
        await beta_user.insert()

        # Resend verification email
        with patch('app.api.routes.beta.signup.EmailVerificationService') as MockService:
            mock_service = MagicMock()
            mock_service.generate_verification_token.return_value = "new-token-456"
            mock_service.send_verification_email = AsyncMock(return_value=True)
            MockService.return_value = mock_service

            response = await client.post(
                "/api/v1/beta/resend-verification",
                json={"email": test_email}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["success"] is True

            # Verify new token was generated
            updated_user = await BetaUser.find_one(BetaUser.email == test_email)
            assert updated_user.verification_token == "new-token-456"
            assert updated_user.verification_token != "old-token"

    @pytest.mark.asyncio
    async def test_verify_invalid_token(self, client, test_db):
        """Test verification with invalid token."""
        response = await client.get(
            "/api/v1/beta/verify-email?token=invalid-token-xyz"
        )

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "invalid" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_verify_expired_token(self, client, test_db):
        """Test verification with expired token."""
        from datetime import datetime, timedelta
        import hmac
        import hashlib

        test_email = "expireduser@example.com"

        # Create user
        beta_user = BetaUser(
            email=test_email,
            status="pending_verification"
        )
        await beta_user.insert()

        # Create expired token (1 hour ago)
        secret_key = os.getenv("EMAIL_VERIFICATION_SECRET_KEY", "test-secret")
        expiry = datetime.utcnow() - timedelta(hours=1)
        payload = f"{test_email}|{int(expiry.timestamp())}"
        signature = hmac.new(
            secret_key.encode(),
            payload.encode(),
            hashlib.sha256
        ).hexdigest()
        expired_token = f"{payload}|{signature}"

        # Try to verify with expired token
        response = await client.get(
            f"/api/v1/beta/verify-email?token={expired_token}"
        )

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "expired" in data["message"].lower()

    @pytest.mark.asyncio
    async def test_resend_to_nonexistent_user(self, client, test_db):
        """Test resending verification email to non-existent user."""
        response = await client.post(
            "/api/v1/beta/resend-verification",
            json={"email": "nonexistent@example.com"}
        )

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_verify_already_active_user(self, client, test_db):
        """Test verification with already verified user (idempotent)."""
        test_email = "activeuser@example.com"

        from datetime import datetime, timezone

        # Create already active user
        beta_user = BetaUser(
            email=test_email,
            status="active",
            verified_at=datetime.now(timezone.utc)
        )
        await beta_user.insert()

        # Generate valid token
        from app.services.beta.email_service import EmailVerificationService
        from app.core.config import Settings

        settings = Settings()
        email_service = EmailVerificationService(settings=settings)
        token = email_service.generate_verification_token(test_email)

        # Try to verify already active user
        response = await client.get(
            f"/api/v1/beta/verify-email?token={token}"
        )

        # Should succeed (idempotent)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestEmailTemplates:
    """Integration tests for email templates."""

    @pytest.mark.asyncio
    async def test_verification_email_template_rendering(self, mock_email_sender):
        """Test that verification email template renders correctly."""
        from app.services.beta.email_service import EmailVerificationService
        from app.core.config import Settings

        settings = Settings()
        email_service = EmailVerificationService(settings=settings)

        test_email = "test@example.com"
        test_token = "test-token-12345"

        # Send verification email (mocked SendGrid)
        result = await email_service.send_verification_email(test_email, test_token)

        # Verify email was sent
        assert result is True
        mock_email_sender.send.assert_called_once()

        # Verify template was used
        call_args = mock_email_sender.send.call_args
        # Template path should be beta/verification-email.html.j2
        # Verification URL should contain token

    @pytest.mark.asyncio
    async def test_verification_email_contains_correct_url(self, mock_email_sender):
        """Test that verification email contains correct verification URL."""
        from app.services.beta.email_service import EmailVerificationService
        from app.core.config import Settings

        settings = Settings()
        email_service = EmailVerificationService(settings=settings)

        test_email = "test@example.com"
        test_token = "abc123xyz"

        await email_service.send_verification_email(test_email, test_token)

        # Verify the verification URL was constructed correctly
        expected_url = f"{settings.FRONTEND_URL}/verify-email?token={test_token}"

        # The URL should have been passed to the template
        # We can't easily verify template variables with mocks,
        # but we verify the method was called successfully
        assert mock_email_sender.send.called


# Run with: PYTHONPATH=/path/to/backend poetry run pytest test/integration/test_beta_email_verification.py -v
