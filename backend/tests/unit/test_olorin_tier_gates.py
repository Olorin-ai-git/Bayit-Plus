"""Unit tests for Olorin tier sync endpoint and feature gates."""

import pytest
from unittest.mock import AsyncMock, Mock, patch


class TestTierSyncEndpoint:
    @pytest.mark.asyncio
    async def test_sync_activate_sets_tier(self):
        from app.api.routes.olorin_tier_sync import _sync_tier
        mock_user = Mock()
        mock_user.olorin_tier = "free"
        mock_user.save = AsyncMock()

        with patch("app.api.routes.olorin_tier_sync.User") as MockUser:
            MockUser.find_one = AsyncMock(return_value=mock_user)
            result = await _sync_tier(
                email="fan@test.com", product="olorin-fan", action="activate",
            )
        assert mock_user.olorin_tier == "fan"
        mock_user.save.assert_awaited_once()
        assert result["tier"] == "fan"

    @pytest.mark.asyncio
    async def test_sync_activate_superfan(self):
        from app.api.routes.olorin_tier_sync import _sync_tier
        mock_user = Mock()
        mock_user.olorin_tier = "free"
        mock_user.save = AsyncMock()

        with patch("app.api.routes.olorin_tier_sync.User") as MockUser:
            MockUser.find_one = AsyncMock(return_value=mock_user)
            result = await _sync_tier(
                email="super@test.com", product="olorin-superfan", action="activate",
            )
        assert mock_user.olorin_tier == "superfan"

    @pytest.mark.asyncio
    async def test_sync_deactivate_resets_to_free(self):
        from app.api.routes.olorin_tier_sync import _sync_tier
        mock_user = Mock()
        mock_user.olorin_tier = "fan"
        mock_user.save = AsyncMock()

        with patch("app.api.routes.olorin_tier_sync.User") as MockUser:
            MockUser.find_one = AsyncMock(return_value=mock_user)
            result = await _sync_tier(
                email="ex@test.com", product="olorin-fan", action="deactivate",
            )
        assert mock_user.olorin_tier == "free"
        assert result["tier"] == "free"

    @pytest.mark.asyncio
    async def test_sync_unknown_user_returns_not_found(self):
        from app.api.routes.olorin_tier_sync import _sync_tier
        with patch("app.api.routes.olorin_tier_sync.User") as MockUser:
            MockUser.find_one = AsyncMock(return_value=None)
            result = await _sync_tier(
                email="nobody@test.com", product="olorin-fan", action="activate",
            )
        assert result["status"] == "user_not_found"
