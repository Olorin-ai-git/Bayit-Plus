"""Unit tests for Olorin tier sync endpoint and feature gates."""

import pytest
from unittest.mock import AsyncMock, Mock, patch, MagicMock


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


from unittest.mock import Mock


class TestLipSyncTierGate:
    def test_free_user_cannot_request_lip_sync(self):
        from app.api.dependencies.olorin_tier import require_lip_sync
        from fastapi import HTTPException
        user = Mock()
        user.olorin_tier = "free"
        user.id = "u1"
        with pytest.raises(HTTPException) as exc:
            require_lip_sync(user)
        assert exc.value.status_code == 403
        assert "Superfan" in exc.value.detail

    def test_fan_user_cannot_request_lip_sync(self):
        from app.api.dependencies.olorin_tier import require_lip_sync
        from fastapi import HTTPException
        user = Mock()
        user.olorin_tier = "fan"
        user.id = "u2"
        with pytest.raises(HTTPException) as exc:
            require_lip_sync(user)
        assert exc.value.status_code == 403

    def test_superfan_user_can_request_lip_sync(self):
        from app.api.dependencies.olorin_tier import require_lip_sync
        user = Mock()
        user.olorin_tier = "superfan"
        user.id = "u3"
        result = require_lip_sync(user)
        assert result is None

    def test_b2b_user_can_request_lip_sync(self):
        from app.api.dependencies.olorin_tier import require_lip_sync
        user = Mock()
        user.olorin_tier = "b2b"
        user.id = "u4"
        result = require_lip_sync(user)
        assert result is None


class TestShareClipsTierGate:
    def test_free_user_cannot_generate_reel(self):
        from app.api.dependencies.olorin_tier import require_share_clips
        from fastapi import HTTPException
        user = Mock()
        user.olorin_tier = "free"
        user.id = "u1"
        with pytest.raises(HTTPException) as exc:
            require_share_clips(user)
        assert exc.value.status_code == 403
        assert "Fan" in exc.value.detail

    def test_fan_user_can_generate_reel(self):
        from app.api.dependencies.olorin_tier import require_share_clips
        user = Mock()
        user.olorin_tier = "fan"
        user.id = "u2"
        result = require_share_clips(user)
        assert result is None

    def test_superfan_user_can_generate_reel(self):
        from app.api.dependencies.olorin_tier import require_share_clips
        user = Mock()
        user.olorin_tier = "superfan"
        user.id = "u3"
        result = require_share_clips(user)
        assert result is None


class TestCharactersPerVideoLimit:
    def test_free_tier_max_3_characters(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        user = Mock()
        user.olorin_tier = "free"
        user.id = "u1"
        assert svc.get_max_characters(user) == 3

    def test_fan_tier_max_5_characters(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        user = Mock()
        user.olorin_tier = "fan"
        user.id = "u2"
        assert svc.get_max_characters(user) == 5

    def test_superfan_tier_max_5_characters(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        user = Mock()
        user.olorin_tier = "superfan"
        user.id = "u3"
        assert svc.get_max_characters(user) == 5

    def test_b2b_tier_max_10_characters(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        user = Mock()
        user.olorin_tier = "b2b"
        user.id = "u4"
        assert svc.get_max_characters(user) == 10


class TestTriviaGate:
    def test_free_user_cannot_use_trivia(self):
        from app.api.dependencies.olorin_tier import require_trivia
        from fastapi import HTTPException
        user = Mock()
        user.olorin_tier = "free"
        user.id = "u1"
        with pytest.raises(HTTPException) as exc:
            require_trivia(user)
        assert exc.value.status_code == 403

    def test_fan_user_cannot_use_trivia(self):
        from app.api.dependencies.olorin_tier import require_trivia
        from fastapi import HTTPException
        user = Mock()
        user.olorin_tier = "fan"
        user.id = "u2"
        with pytest.raises(HTTPException) as exc:
            require_trivia(user)
        assert exc.value.status_code == 403

    def test_superfan_user_can_use_trivia(self):
        from app.api.dependencies.olorin_tier import require_trivia
        user = Mock()
        user.olorin_tier = "superfan"
        user.id = "u3"
        result = require_trivia(user)
        assert result is None


class TestDubbingGate:
    def test_free_user_cannot_create_dubbing(self):
        from app.api.dependencies.olorin_tier import require_dubbing
        from fastapi import HTTPException
        user = Mock()
        user.olorin_tier = "free"
        user.id = "u1"
        with pytest.raises(HTTPException) as exc:
            require_dubbing(user)
        assert exc.value.status_code == 403

    def test_superfan_user_can_create_dubbing(self):
        from app.api.dependencies.olorin_tier import require_dubbing
        user = Mock()
        user.olorin_tier = "superfan"
        user.id = "u2"
        result = require_dubbing(user)
        assert result is None


class TestFreeLifetimeCredits:
    def test_build_refill_args_free_tier(self):
        from app.api.routes.credit_refill import _build_refill_args
        user = Mock()
        user.olorin_tier = "free"
        user.subscription_tier = "free"
        user.id = "u1"
        args = _build_refill_args(user)
        assert args["olorin_tier"] == "free"
        assert args["is_plus"] is False
