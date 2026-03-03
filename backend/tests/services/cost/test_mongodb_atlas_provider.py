"""Tests for MongoDB Atlas billing provider."""

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.olorin.cost.providers.mongodb_atlas import (
    MongoDBAtlasProvider,
)


@pytest.fixture
def mock_atlas_config():
    """Mock Atlas billing config."""
    with patch("app.services.olorin.cost.providers.mongodb_atlas.settings") as mock:
        mock.olorin.mongodb_billing.enabled = True
        mock.olorin.mongodb_billing.org_id = "test-org-id"
        mock.olorin.mongodb_billing.public_key = "pub-key"
        mock.olorin.mongodb_billing.private_key = "priv-key"
        mock.olorin.infrastructure.mongodb_monthly = 500.0
        yield mock


@pytest.fixture
def mock_atlas_disabled():
    """Mock disabled Atlas billing."""
    with patch("app.services.olorin.cost.providers.mongodb_atlas.settings") as mock:
        mock.olorin.mongodb_billing.enabled = False
        mock.olorin.mongodb_billing.org_id = ""
        mock.olorin.mongodb_billing.public_key = ""
        mock.olorin.mongodb_billing.private_key = ""
        mock.olorin.infrastructure.mongodb_monthly = 500.0
        yield mock


class TestMongoDBAtlasProvider:
    """Test MongoDB Atlas billing provider."""

    @pytest.mark.asyncio
    async def test_disabled_returns_fallback(self, mock_atlas_disabled):
        provider = MongoDBAtlasProvider()
        result = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 2))
        assert result.service_name == "mongodb_atlas"
        assert result.metadata.get("source") == "config_fallback"

    @pytest.mark.asyncio
    async def test_api_error_falls_back(self, mock_atlas_config):
        provider = MongoDBAtlasProvider()
        with patch.object(
            provider, "_query_atlas_api",
            side_effect=Exception("Atlas auth failed"),
        ):
            result = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 2))
            assert result.metadata.get("source") == "config_fallback"

    @pytest.mark.asyncio
    async def test_api_success_returns_real_data(self, mock_atlas_config):
        provider = MongoDBAtlasProvider()
        mock_result = (
            Decimal("85.50"),
            {"cluster:bayit-prod": Decimal("60"), "cluster:fraud": Decimal("25.50")},
        )
        with patch.object(
            provider, "_query_atlas_api",
            new_callable=AsyncMock,
            return_value=mock_result,
        ):
            result = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 2))
            assert result.amount == Decimal("85.50")
            assert result.metadata.get("source") == "atlas_api"
            assert len(result.breakdown) == 2

    @pytest.mark.asyncio
    async def test_health_check_disabled(self, mock_atlas_disabled):
        provider = MongoDBAtlasProvider()
        assert await provider.health_check() is True
