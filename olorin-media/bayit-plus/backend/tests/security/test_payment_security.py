"""Security tests for payment flow.

These tests verify critical security features:
- Webhook idempotency (replay attack prevention)
- Session token tampering protection
- Payment pending access control
- Atomic state transitions
"""
import pytest
from datetime import datetime, timezone
from unittest.mock import Mock, patch

from app.core.security import generate_session_token, verify_session_token
from app.models.user import User
from app.models.webhook_event import WebhookEvent


class TestSessionTokenSecurity:
    """Test session token generation and verification."""

    def test_generate_session_token(self):
        """Test generating a valid session token."""
        user_id = "user_123"
        plan_id = "premium"
        secret_key = "test_secret_key_minimum_32_chars_long!"

        token = generate_session_token(user_id, plan_id, secret_key)

        # Token should have 4 parts: user_id:plan_id:timestamp:signature
        parts = token.split(":")
        assert len(parts) == 4
        assert parts[0] == user_id
        assert parts[1] == plan_id

    def test_verify_valid_session_token(self):
        """Test verifying a valid session token."""
        user_id = "user_123"
        plan_id = "premium"
        secret_key = "test_secret_key_minimum_32_chars_long!"

        token = generate_session_token(user_id, plan_id, secret_key)
        verified_user_id, verified_plan_id = verify_session_token(token, secret_key)

        assert verified_user_id == user_id
        assert verified_plan_id == plan_id

    def test_reject_tampered_session_token(self):
        """Test rejecting a tampered session token."""
        user_id = "user_123"
        plan_id = "premium"
        secret_key = "test_secret_key_minimum_32_chars_long!"

        token = generate_session_token(user_id, plan_id, secret_key)

        # Tamper with user_id
        tampered_token = token.replace(user_id, "malicious_user")

        # Should raise ValueError
        with pytest.raises(ValueError, match="Invalid signature"):
            verify_session_token(tampered_token, secret_key)

    def test_reject_tampered_plan_id(self):
        """Test rejecting a token with tampered plan_id."""
        user_id = "user_123"
        plan_id = "basic"
        secret_key = "test_secret_key_minimum_32_chars_long!"

        token = generate_session_token(user_id, plan_id, secret_key)

        # Tamper with plan_id (try to upgrade from basic to family)
        tampered_token = token.replace(plan_id, "family")

        # Should raise ValueError
        with pytest.raises(ValueError, match="Invalid signature"):
            verify_session_token(tampered_token, secret_key)

    def test_reject_expired_session_token(self):
        """Test rejecting an expired session token."""
        user_id = "user_123"
        plan_id = "premium"
        secret_key = "test_secret_key_minimum_32_chars_long!"

        token = generate_session_token(user_id, plan_id, secret_key)

        # Verify with very short max_age (1 second)
        import time
        time.sleep(2)

        # Should raise ValueError for expiration
        with pytest.raises(ValueError, match="Token expired"):
            verify_session_token(token, secret_key, max_age_seconds=1)

    def test_reject_invalid_token_format(self):
        """Test rejecting tokens with invalid format."""
        secret_key = "test_secret_key_minimum_32_chars_long!"

        # Not enough parts
        with pytest.raises(ValueError, match="Invalid token format"):
            verify_session_token("user_123:premium", secret_key)

        # Too many parts
        with pytest.raises(ValueError, match="Invalid token format"):
            verify_session_token("user_123:premium:123456:sig:extra", secret_key)


@pytest.mark.asyncio
class TestWebhookIdempotency:
    """Test webhook idempotency and replay attack prevention."""

    async def test_webhook_processed_once(self):
        """Test that duplicate webhooks are rejected."""
        event_id = "evt_test_12345"
        event_type = "checkout.session.completed"

        # First webhook - should be marked as new
        is_processed = await WebhookEvent.is_processed(event_id)
        assert is_processed is False

        # Mark as processed
        await WebhookEvent.mark_processed(event_id, event_type)

        # Second webhook (duplicate) - should be detected
        is_processed = await WebhookEvent.is_processed(event_id)
        assert is_processed is True

    async def test_webhook_idempotency_with_user(self):
        """Test webhook idempotency tracking with user_id."""
        event_id = "evt_test_67890"
        event_type = "checkout.session.completed"
        user_id = "user_123"

        # Mark webhook as processed with user_id
        webhook_event = await WebhookEvent.mark_processed(
            event_id, event_type, user_id
        )

        assert webhook_event.stripe_event_id == event_id
        assert webhook_event.event_type == event_type
        assert webhook_event.user_id == user_id
        assert webhook_event.processed_at is not None

        # Verify it's marked as processed
        is_processed = await WebhookEvent.is_processed(event_id)
        assert is_processed is True


@pytest.mark.asyncio
class TestPaymentPendingAccessControl:
    """Test payment pending access control."""

    @pytest.fixture
    async def payment_pending_user(self):
        """Create a user with payment_pending=True."""
        user = User(
            email="pending@test.com",
            name="Pending User",
            hashed_password="hashed",
            role="viewer",
            payment_pending=True,
            pending_plan_id="basic",
        )
        await user.insert()
        yield user
        await user.delete()

    @pytest.fixture
    async def active_user(self):
        """Create an active user with subscription."""
        user = User(
            email="active@test.com",
            name="Active User",
            hashed_password="hashed",
            role="user",
            payment_pending=False,
            subscription_tier="premium",
            subscription_status="active",
        )
        await user.insert()
        yield user
        await user.delete()

    async def test_payment_pending_blocks_content_access(
        self, client, payment_pending_user
    ):
        """Test that payment_pending users cannot access protected content."""
        from app.core.security import create_access_token

        # Get auth token
        token = create_access_token(data={"sub": str(payment_pending_user.id)})

        # Try to access protected endpoint
        response = client.get(
            "/api/v1/content/vod/123",  # Example protected endpoint
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should be blocked
        assert response.status_code == 403
        assert "payment_pending" in response.json().get("detail", {}).get("error", "")

    async def test_active_user_can_access_content(self, client, active_user):
        """Test that active users can access protected content."""
        from app.core.security import create_access_token

        # Get auth token
        token = create_access_token(data={"sub": str(active_user.id)})

        # Try to access protected endpoint
        response = client.get(
            "/api/v1/content/vod/123",  # Example protected endpoint
            headers={"Authorization": f"Bearer {token}"},
        )

        # Should NOT be blocked by payment (might fail for other reasons like missing content)
        # But should not be 403 payment_pending error
        if response.status_code == 403:
            error_detail = response.json().get("detail", {})
            assert "payment_pending" not in str(error_detail)


@pytest.mark.asyncio
class TestAtomicStateTransitions:
    """Test atomic user state transitions."""

    @pytest.fixture
    async def viewer_user(self):
        """Create a viewer user for testing."""
        user = User(
            email="viewer@test.com",
            name="Viewer User",
            hashed_password="hashed",
            role="viewer",
            payment_pending=True,
        )
        await user.insert()
        yield user
        await user.delete()

    async def test_atomic_activation_from_webhook(self, viewer_user):
        """Test atomic user activation prevents race conditions."""
        from bson import ObjectId

        user_id = str(viewer_user.id)

        # Simulate webhook activation (atomic update)
        result = await User.get_motor_collection().update_one(
            {
                "_id": ObjectId(user_id),
                "payment_pending": True,
                "role": "viewer",
            },
            {
                "$set": {
                    "role": "user",
                    "payment_pending": False,
                    "subscription_tier": "premium",
                    "subscription_status": "active",
                }
            },
        )

        # Should update exactly 1 document
        assert result.modified_count == 1

        # Verify user was updated
        updated_user = await User.get(user_id)
        assert updated_user.role == "user"
        assert updated_user.payment_pending is False
        assert updated_user.subscription_tier == "premium"

    async def test_atomic_update_prevents_duplicate_activation(self, viewer_user):
        """Test that duplicate webhooks don't cause double activation."""
        from bson import ObjectId

        user_id = str(viewer_user.id)

        # First webhook - should succeed
        result1 = await User.get_motor_collection().update_one(
            {
                "_id": ObjectId(user_id),
                "payment_pending": True,
                "role": "viewer",
            },
            {
                "$set": {
                    "role": "user",
                    "payment_pending": False,
                    "subscription_tier": "premium",
                    "subscription_status": "active",
                }
            },
        )
        assert result1.modified_count == 1

        # Second webhook (duplicate) - should fail gracefully
        result2 = await User.get_motor_collection().update_one(
            {
                "_id": ObjectId(user_id),
                "payment_pending": True,  # No longer true
                "role": "viewer",  # No longer viewer
            },
            {
                "$set": {
                    "role": "user",
                    "payment_pending": False,
                    "subscription_tier": "premium",
                    "subscription_status": "active",
                }
            },
        )

        # Should modify 0 documents (conditions not met)
        assert result2.modified_count == 0

        # User state should be unchanged
        user = await User.get(user_id)
        assert user.role == "user"
        assert user.subscription_tier == "premium"


@pytest.mark.asyncio
class TestRateLimiting:
    """Test rate limiting on payment endpoints."""

    async def test_payment_status_rate_limit(self, client):
        """Test payment status endpoint has rate limiting."""
        # This test requires actual rate limiting middleware
        # Implementation depends on your rate limiting setup
        pass  # TODO: Implement when rate limiting is configured

    async def test_checkout_url_rate_limit(self, client):
        """Test checkout URL generation has strict rate limiting."""
        # This test requires actual rate limiting middleware
        # Implementation depends on your rate limiting setup
        pass  # TODO: Implement when rate limiting is configured
