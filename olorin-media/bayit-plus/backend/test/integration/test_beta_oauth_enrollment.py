"""Integration tests for Beta 500 OAuth auto-enrollment."""

import pytest
import pytest_asyncio
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch

from app.main import app
from app.core.database import get_database
from app.models.user import User
from app.models.beta_user import BetaUser
from app.models.beta_credit import BetaCredit
from app.core.config import settings


@pytest_asyncio.fixture
async def test_client():
    """Create test HTTP client."""
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def db():
    """Get database instance."""
    return get_database()


@pytest_asyncio.fixture
async def cleanup_test_user(db):
    """Cleanup test user data after each test."""
    test_email = "beta-oauth-test@example.com"

    yield

    # Cleanup after test
    try:
        # Delete user
        user = await User.find_one(User.email == test_email)
        if user:
            await user.delete()

        # Delete beta user
        await db.beta_users.delete_many({"email": test_email})

        # Delete beta credits
        await db.beta_credits.delete_many({"user_id": {"$regex": ".*"}})
    except Exception:
        pass


class TestOAuthBetaEnrollment:
    """Integration tests for OAuth auto-enrollment flow."""

    @pytest.mark.asyncio
    async def test_oauth_enrolls_beta_user_with_invitation(
        self,
        test_client,
        db,
        cleanup_test_user
    ):
        """Test that OAuth callback auto-enrolls user with beta invitation."""
        test_email = "beta-oauth-test@example.com"

        # 1. Create beta invitation (pending_verification status)
        await db.beta_users.insert_one({
            "email": test_email,
            "status": "pending_verification",
            "invitation_sent_at": datetime.now(timezone.utc),
            "created_at": datetime.now(timezone.utc)
        })

        # 2. Mock Google OAuth callback
        mock_oauth_response = {
            "email": test_email,
            "email_verified": True,
            "name": "Test Beta User",
            "picture": "https://example.com/photo.jpg",
            "sub": "google-oauth-123456"
        }

        with patch('app.api.routes.auth.google_auth') as mock_google:
            # Mock OAuth token exchange
            mock_google.authorize_access_token = AsyncMock(
                return_value={"userinfo": mock_oauth_response}
            )

            # Mock request object for audit logging
            mock_request = MagicMock()
            mock_request.client.host = "127.0.0.1"
            mock_request.headers = {"user-agent": "TestClient"}

            with patch('app.api.routes.auth.Request', return_value=mock_request):
                # Simulate OAuth callback
                response = await test_client.get(
                    "/api/v1/auth/google/callback",
                    follow_redirects=False
                )

        # 3. Verify user was created and enrolled
        user = await User.find_one(User.email == test_email)
        assert user is not None, "User should be created"
        assert user.subscription is not None, "User should have subscription"
        assert user.subscription.get("plan") == "beta", "User should be on beta plan"
        assert user.subscription.get("status") == "active", "Subscription should be active"

        # 4. Verify beta user status updated
        beta_user = await db.beta_users.find_one({"email": test_email})
        assert beta_user is not None, "Beta user record should exist"
        assert beta_user["status"] == "active", "Beta user should be active"
        assert beta_user["is_beta_user"] is True, "Should be marked as beta user"
        assert "enrolled_at" in beta_user, "Should have enrolled_at timestamp"

        # 5. Verify beta credits allocated
        credits = await db.beta_credits.find_one({"user_id": str(user.id)})
        assert credits is not None, "Credits should be allocated"
        assert credits["total_credits"] == settings.BETA_AI_CREDITS, f"Should have {settings.BETA_AI_CREDITS} credits"
        assert credits["remaining_credits"] == settings.BETA_AI_CREDITS, "All credits should be remaining"
        assert credits["used_credits"] == 0, "No credits should be used yet"
        assert credits["version"] == 0, "Version should be 0 (new record)"

    @pytest.mark.asyncio
    async def test_oauth_without_invitation_no_enrollment(
        self,
        test_client,
        db,
        cleanup_test_user
    ):
        """Test that OAuth without beta invitation does not enroll user."""
        test_email = "non-beta-oauth-test@example.com"

        # No beta invitation created

        # Mock Google OAuth callback
        mock_oauth_response = {
            "email": test_email,
            "email_verified": True,
            "name": "Regular User",
            "picture": "https://example.com/photo.jpg",
            "sub": "google-oauth-789012"
        }

        with patch('app.api.routes.auth.google_auth') as mock_google:
            mock_google.authorize_access_token = AsyncMock(
                return_value={"userinfo": mock_oauth_response}
            )

            mock_request = MagicMock()
            mock_request.client.host = "127.0.0.1"
            mock_request.headers = {"user-agent": "TestClient"}

            with patch('app.api.routes.auth.Request', return_value=mock_request):
                response = await test_client.get(
                    "/api/v1/auth/google/callback",
                    follow_redirects=False
                )

        # Verify user was created but NOT enrolled in beta
        user = await User.find_one(User.email == test_email)
        assert user is not None, "User should be created"
        assert user.subscription.get("plan") != "beta", "User should NOT be on beta plan"

        # Verify no beta credits allocated
        credits = await db.beta_credits.find_one({"user_id": str(user.id)})
        assert credits is None, "No credits should be allocated for non-beta user"

        # Cleanup
        if user:
            await user.delete()

    @pytest.mark.asyncio
    async def test_oauth_enrollment_already_active_idempotent(
        self,
        test_client,
        db,
        cleanup_test_user
    ):
        """Test that re-enrolling an already active beta user is idempotent."""
        test_email = "beta-oauth-already-active@example.com"

        # 1. Create already active beta user
        await db.beta_users.insert_one({
            "email": test_email,
            "status": "active",
            "is_beta_user": True,
            "enrolled_at": datetime.now(timezone.utc) - timedelta(days=1),
            "created_at": datetime.now(timezone.utc) - timedelta(days=1)
        })

        # 2. Create user with credits already allocated
        user = User(
            email=test_email,
            name="Already Active Beta User",
            subscription={"plan": "beta", "status": "active"}
        )
        await user.insert()

        await db.beta_credits.insert_one({
            "user_id": str(user.id),
            "total_credits": settings.BETA_AI_CREDITS,
            "remaining_credits": 400,
            "used_credits": 100,
            "version": 0,
            "is_expired": False,
            "created_at": datetime.now(timezone.utc)
        })

        # 3. Mock Google OAuth callback (user logs in again)
        mock_oauth_response = {
            "email": test_email,
            "email_verified": True,
            "name": "Already Active Beta User",
            "picture": "https://example.com/photo.jpg",
            "sub": "google-oauth-active-123"
        }

        with patch('app.api.routes.auth.google_auth') as mock_google:
            mock_google.authorize_access_token = AsyncMock(
                return_value={"userinfo": mock_oauth_response}
            )

            mock_request = MagicMock()
            mock_request.client.host = "127.0.0.1"
            mock_request.headers = {"user-agent": "TestClient"}

            with patch('app.api.routes.auth.Request', return_value=mock_request):
                response = await test_client.get(
                    "/api/v1/auth/google/callback",
                    follow_redirects=False
                )

        # 4. Verify user still exists and enrollment unchanged
        user_after = await User.find_one(User.email == test_email)
        assert user_after is not None, "User should still exist"
        assert user_after.subscription.get("plan") == "beta", "Should still be beta user"

        # 5. Verify credits unchanged (not re-allocated)
        credits_after = await db.beta_credits.find_one({"user_id": str(user.id)})
        assert credits_after is not None, "Credits should still exist"
        assert credits_after["remaining_credits"] == 400, "Credits should be unchanged"
        assert credits_after["used_credits"] == 100, "Used credits should be unchanged"


class TestOAuthEnrollmentErrorHandling:
    """Tests for OAuth enrollment error scenarios."""

    @pytest.mark.asyncio
    async def test_oauth_enrollment_transaction_rollback_on_error(
        self,
        test_client,
        db,
        cleanup_test_user
    ):
        """Test that enrollment transaction rolls back on error."""
        test_email = "beta-oauth-error-test@example.com"

        # Create beta invitation
        await db.beta_users.insert_one({
            "email": test_email,
            "status": "pending_verification",
            "created_at": datetime.now(timezone.utc)
        })

        # Mock Google OAuth callback
        mock_oauth_response = {
            "email": test_email,
            "email_verified": True,
            "name": "Error Test User",
            "picture": "https://example.com/photo.jpg",
            "sub": "google-oauth-error-123"
        }

        with patch('app.api.routes.auth.google_auth') as mock_google:
            mock_google.authorize_access_token = AsyncMock(
                return_value={"userinfo": mock_oauth_response}
            )

            # Mock BetaCreditService.allocate_credits to raise an error
            with patch('app.api.routes.auth.BetaCreditService') as MockCreditService:
                mock_service = MagicMock()
                mock_service.allocate_credits = AsyncMock(
                    side_effect=Exception("Credit allocation failed")
                )
                MockCreditService.return_value = mock_service

                mock_request = MagicMock()
                mock_request.client.host = "127.0.0.1"
                mock_request.headers = {"user-agent": "TestClient"}

                with patch('app.api.routes.auth.Request', return_value=mock_request):
                    # OAuth should succeed (user created) but beta enrollment should fail
                    response = await test_client.get(
                        "/api/v1/auth/google/callback",
                        follow_redirects=False
                    )

        # User should be created (OAuth login succeeded)
        user = await User.find_one(User.email == test_email)
        assert user is not None, "User should be created despite enrollment error"

        # But beta enrollment should have rolled back
        beta_user = await db.beta_users.find_one({"email": test_email})
        # Status should still be pending_verification (transaction rolled back)
        assert beta_user["status"] == "pending_verification", "Beta status should be unchanged"

        # No credits should be allocated (transaction rolled back)
        credits = await db.beta_credits.find_one({"user_id": str(user.id)})
        assert credits is None, "Credits should not be allocated due to rollback"

        # Cleanup
        if user:
            await user.delete()
