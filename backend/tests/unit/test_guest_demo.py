"""Unit tests for guest demo endpoint."""

import pytest
from unittest.mock import Mock, AsyncMock, patch


class TestGuestDemoConfig:
    def test_demo_content_id_exists(self):
        from app.core.config import Settings
        s = Settings()
        assert hasattr(s, "DEMO_CONTENT_ID")

    def test_guest_demo_max_interactions_default(self):
        from app.core.config import Settings
        s = Settings()
        assert s.GUEST_DEMO_MAX_INTERACTIONS == 10


class TestGuestDemoUsageModel:
    def test_model_fields(self):
        from app.models.guest_demo import GuestDemoUsage
        # Use model_construct to bypass Beanie's collection init check in unit tests
        usage = GuestDemoUsage.model_construct(
            fingerprint="test-fp-123", ip_address="127.0.0.1", interaction_count=0,
        )
        assert usage.fingerprint == "test-fp-123"
        assert usage.interaction_count == 0

    def test_can_interact_under_limit(self):
        from app.models.guest_demo import GuestDemoUsage
        usage = GuestDemoUsage.model_construct(fingerprint="fp", interaction_count=5)
        assert usage.can_interact(max_interactions=10) is True

    def test_cannot_interact_at_limit(self):
        from app.models.guest_demo import GuestDemoUsage
        usage = GuestDemoUsage.model_construct(fingerprint="fp", interaction_count=10)
        assert usage.can_interact(max_interactions=10) is False


class TestGuestDemoEndpointLogic:
    @pytest.mark.asyncio
    async def test_get_or_create_usage_new(self):
        from app.api.routes.guest_demo import _get_or_create_usage
        with patch("app.api.routes.guest_demo.GuestDemoUsage") as MockUsage:
            MockUsage.find_one = AsyncMock(return_value=None)
            mock_new = Mock()
            mock_new.interaction_count = 0
            mock_new.insert = AsyncMock(return_value=mock_new)
            MockUsage.return_value = mock_new
            usage = await _get_or_create_usage("fp-new", "1.2.3.4")
        assert usage.interaction_count == 0

    @pytest.mark.asyncio
    async def test_get_or_create_usage_existing(self):
        from app.api.routes.guest_demo import _get_or_create_usage
        existing = Mock()
        existing.interaction_count = 5
        with patch("app.api.routes.guest_demo.GuestDemoUsage") as MockUsage:
            MockUsage.find_one = AsyncMock(return_value=existing)
            usage = await _get_or_create_usage("fp-exists", "1.2.3.4")
        assert usage.interaction_count == 5

    def test_rejects_over_limit(self):
        from app.api.routes.guest_demo import _check_demo_limit
        from fastapi import HTTPException
        usage = Mock()
        usage.can_interact = Mock(return_value=False)
        usage.interaction_count = 10
        with pytest.raises(HTTPException) as exc:
            _check_demo_limit(usage, max_interactions=10)
        assert exc.value.status_code == 429

    def test_allows_under_limit(self):
        from app.api.routes.guest_demo import _check_demo_limit
        usage = Mock()
        usage.can_interact = Mock(return_value=True)
        result = _check_demo_limit(usage, max_interactions=10)
        assert result is None


class TestDynamicContentId:
    def test_request_model_accepts_optional_content_id(self):
        from app.api.routes.guest_demo import GuestDemoRequest
        req = GuestDemoRequest(
            fingerprint="fp-12345678",
            message="Hello Walter!",
            character_name="Walter Burns",
            content_id="abc123def456",
        )
        assert req.content_id == "abc123def456"

    def test_request_model_content_id_defaults_none(self):
        from app.api.routes.guest_demo import GuestDemoRequest
        req = GuestDemoRequest(
            fingerprint="fp-12345678",
            message="Hello!",
            character_name="Walter Burns",
        )
        assert req.content_id is None
