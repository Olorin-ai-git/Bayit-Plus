"""Tests for /admin/costs/toggles endpoint logic."""

from datetime import UTC, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.routes.admin.cost_service_schemas import (
    CostCategoryEnum,
    ProviderToggleListResponse,
    ProviderToggleRequest,
    ProviderToggleResponse,
    ToggleSourceEnum,
)
from app.api.routes.admin.cost_toggles import (
    _PROVIDER_META,
    _get_config_enabled,
)
from app.models.cost_provider_settings import (
    VALID_PROVIDER_KEYS,
    CostProviderSettings,
)


class TestProviderMeta:
    """Ensure all valid keys have display metadata."""

    def test_all_keys_have_meta(self):
        for key in VALID_PROVIDER_KEYS:
            assert key in _PROVIDER_META, f"Missing meta for {key}"

    def test_meta_has_display_name_and_category(self):
        for key, (name, cat) in _PROVIDER_META.items():
            assert len(name) > 0
            assert isinstance(cat, CostCategoryEnum)


class TestGetConfigEnabled:
    """Test config-based enabled flag resolution."""

    def test_unknown_key_returns_true(self):
        assert _get_config_enabled("nonexistent") is True

    def test_fixed_costs_returns_true(self):
        assert _get_config_enabled("fixed_costs") is True

    def test_gcp_reads_from_config(self):
        with patch("app.api.routes.admin.cost_toggles.settings") as mock:
            mock.olorin.gcp_billing.enabled = False
            assert _get_config_enabled("gcp") is False

    def test_gcp_enabled_reads_true(self):
        with patch("app.api.routes.admin.cost_toggles.settings") as mock:
            mock.olorin.gcp_billing.enabled = True
            assert _get_config_enabled("gcp") is True


class TestProviderToggleSchemas:
    """Test toggle request/response schemas."""

    def test_toggle_request_valid(self):
        req = ProviderToggleRequest(enabled=True)
        assert req.enabled is True

    def test_toggle_request_false(self):
        req = ProviderToggleRequest(enabled=False)
        assert req.enabled is False

    def test_toggle_response_from_config(self):
        resp = ProviderToggleResponse(
            provider_key="gcp",
            display_name="Google Cloud Platform",
            enabled=True,
            source=ToggleSourceEnum.CONFIG,
            category=CostCategoryEnum.INFRASTRUCTURE,
            updated_at=None,
        )
        assert resp.source == ToggleSourceEnum.CONFIG
        assert resp.updated_at is None

    def test_toggle_response_from_override(self):
        now = datetime.now(UTC)
        resp = ProviderToggleResponse(
            provider_key="openai",
            display_name="OpenAI",
            enabled=False,
            source=ToggleSourceEnum.OVERRIDE,
            category=CostCategoryEnum.AI,
            updated_at=now,
        )
        assert resp.source == ToggleSourceEnum.OVERRIDE
        assert resp.updated_at == now

    def test_toggle_list_response(self):
        resp = ProviderToggleListResponse(
            providers=[
                ProviderToggleResponse(
                    provider_key="gcp",
                    display_name="GCP",
                    enabled=True,
                    source=ToggleSourceEnum.CONFIG,
                    category=CostCategoryEnum.INFRASTRUCTURE,
                    updated_at=None,
                )
            ]
        )
        assert len(resp.providers) == 1


class TestValidProviderKeys:
    """Test the provider key registry."""

    def test_expected_keys_present(self):
        expected = {
            "gcp",
            "mongodb_atlas",
            "openai",
            "elevenlabs",
            "stripe",
            "pinecone",
            "twilio",
            "redis_cloud",
            "fixed_costs",
            "config_fallback",
        }
        assert VALID_PROVIDER_KEYS == expected

    def test_keys_are_lowercase(self):
        for key in VALID_PROVIDER_KEYS:
            assert key == key.lower()


class TestCostProviderSettingsModel:
    """Test the Beanie document model schema."""

    def test_model_fields(self):
        """Verify model field definitions without MongoDB connection."""
        fields = CostProviderSettings.model_fields
        assert "provider_key" in fields
        assert "enabled" in fields
        assert "updated_by" in fields
        assert "updated_at" in fields

    def test_collection_name(self):
        assert CostProviderSettings.Settings.name == "cost_provider_settings"
