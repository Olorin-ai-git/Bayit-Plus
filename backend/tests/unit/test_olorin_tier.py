"""Unit tests for Olorin tier model, service, and dependencies."""

import pytest
from unittest.mock import Mock

from app.models.olorin_tier import (
    OlorinTier,
    OLORIN_TIER_CONFIGS,
    get_tier_config,
)


class TestOlorinTierEnum:
    def test_all_tiers_defined(self):
        assert OlorinTier.FREE == "free"
        assert OlorinTier.FAN == "fan"
        assert OlorinTier.SUPERFAN == "superfan"
        assert OlorinTier.B2B == "b2b"

    def test_tier_ordering(self):
        assert OlorinTier.FREE.rank < OlorinTier.FAN.rank
        assert OlorinTier.FAN.rank < OlorinTier.SUPERFAN.rank
        assert OlorinTier.SUPERFAN.rank < OlorinTier.B2B.rank


class TestOlorinTierConfig:
    def test_free_tier_config(self):
        cfg = get_tier_config(OlorinTier.FREE)
        assert cfg.monthly_credits == 10
        assert cfg.is_lifetime is True
        assert cfg.can_lip_sync is False
        assert cfg.can_custom_urls is False
        assert cfg.can_share_clips is False
        assert cfg.can_dubbing is False
        assert cfg.max_characters_per_video == 3

    def test_fan_tier_config(self):
        cfg = get_tier_config(OlorinTier.FAN)
        assert cfg.monthly_credits == 100
        assert cfg.is_lifetime is False
        assert cfg.can_lip_sync is False
        assert cfg.can_custom_urls is True
        assert cfg.can_share_clips is True
        assert cfg.can_dubbing is False
        assert cfg.max_characters_per_video == 5

    def test_superfan_tier_config(self):
        cfg = get_tier_config(OlorinTier.SUPERFAN)
        assert cfg.monthly_credits == 300
        assert cfg.is_lifetime is False
        assert cfg.can_lip_sync is True
        assert cfg.can_custom_urls is True
        assert cfg.can_share_clips is True
        assert cfg.can_dubbing is True
        assert cfg.max_characters_per_video == 5

    def test_b2b_tier_config(self):
        cfg = get_tier_config(OlorinTier.B2B)
        assert cfg.monthly_credits == 5000
        assert cfg.is_lifetime is False
        assert cfg.can_lip_sync is True
        assert cfg.can_custom_urls is True
        assert cfg.can_share_clips is True
        assert cfg.can_dubbing is True

    def test_get_tier_config_with_string(self):
        cfg = get_tier_config("fan")
        assert cfg.monthly_credits == 100

    def test_get_tier_config_invalid_raises(self):
        with pytest.raises(KeyError):
            get_tier_config("nonexistent")

    def test_all_tiers_have_configs(self):
        for tier in OlorinTier:
            assert tier.value in OLORIN_TIER_CONFIGS


def _make_mock_user(olorin_tier: str = "free") -> Mock:
    user = Mock()
    user.olorin_tier = olorin_tier
    user.id = "user-123"
    return user


class TestOlorinTierService:
    def test_resolve_tier_free(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.resolve_tier(_make_mock_user("free")) == OlorinTier.FREE

    def test_resolve_tier_fan(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.resolve_tier(_make_mock_user("fan")) == OlorinTier.FAN

    def test_resolve_tier_unknown_defaults_free(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.resolve_tier(_make_mock_user("unknown")) == OlorinTier.FREE

    def test_can_use_lip_sync_free(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.can_use_lip_sync(_make_mock_user("free")) is False

    def test_can_use_lip_sync_fan(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.can_use_lip_sync(_make_mock_user("fan")) is False

    def test_can_use_lip_sync_superfan(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.can_use_lip_sync(_make_mock_user("superfan")) is True

    def test_can_share_clips_free(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.can_share_clips(_make_mock_user("free")) is False

    def test_can_share_clips_fan(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.can_share_clips(_make_mock_user("fan")) is True

    def test_get_monthly_credits_fan(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.get_monthly_credits(_make_mock_user("fan")) == 100

    def test_get_max_characters_free(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.get_max_characters(_make_mock_user("free")) == 3

    def test_get_max_characters_fan(self):
        from app.services.olorin.tier_service import OlorinTierService
        svc = OlorinTierService()
        assert svc.get_max_characters(_make_mock_user("fan")) == 5


class TestOlorinTierDependency:
    def test_require_lip_sync_rejects_fan(self):
        from app.api.dependencies.olorin_tier import require_lip_sync
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            require_lip_sync(_make_mock_user("fan"))
        assert exc_info.value.status_code == 403

    def test_require_lip_sync_allows_superfan(self):
        from app.api.dependencies.olorin_tier import require_lip_sync
        result = require_lip_sync(_make_mock_user("superfan"))
        assert result is None

    def test_require_share_clips_rejects_free(self):
        from app.api.dependencies.olorin_tier import require_share_clips
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            require_share_clips(_make_mock_user("free"))
        assert exc_info.value.status_code == 403

    def test_require_share_clips_allows_fan(self):
        from app.api.dependencies.olorin_tier import require_share_clips
        result = require_share_clips(_make_mock_user("fan"))
        assert result is None
