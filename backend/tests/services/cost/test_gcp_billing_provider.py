"""Tests for GCP BigQuery billing provider."""

from datetime import date
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.olorin.cost.providers.gcp_billing import (
    GCPBillingProvider,
)


@pytest.fixture
def mock_gcp_config():
    """Mock GCP billing config."""
    with patch("app.services.olorin.cost.providers.gcp_billing.settings") as mock:
        mock.olorin.gcp_billing.enabled = True
        mock.olorin.gcp_billing.billing_export_table = "project.dataset.billing"
        mock.olorin.gcp_billing.project_ids = ["bayit-plus", "olorin-fraud"]
        mock.olorin.gcp_billing.data_lag_hours = 4
        mock.olorin.infrastructure.gcp_monthly = 2000.0
        yield mock


@pytest.fixture
def mock_gcp_disabled():
    """Mock disabled GCP billing."""
    with patch("app.services.olorin.cost.providers.gcp_billing.settings") as mock:
        mock.olorin.gcp_billing.enabled = False
        mock.olorin.gcp_billing.billing_export_table = ""
        mock.olorin.gcp_billing.project_ids = []
        mock.olorin.gcp_billing.data_lag_hours = 4
        mock.olorin.infrastructure.gcp_monthly = 2000.0
        yield mock


class TestGCPBillingProvider:
    """Test GCP billing provider."""

    @pytest.mark.asyncio
    async def test_disabled_returns_fallback(self, mock_gcp_disabled):
        provider = GCPBillingProvider()
        result = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 2))
        assert result.service_name == "gcp"
        assert result.metadata.get("source") == "config_fallback"

    @pytest.mark.asyncio
    async def test_fallback_calculates_daily_cost(self, mock_gcp_disabled):
        provider = GCPBillingProvider()
        result = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 31))
        expected_daily = 2000.0 / 30
        expected = Decimal(str(expected_daily * 30))
        assert abs(result.amount - expected) < Decimal("1")

    @pytest.mark.asyncio
    async def test_bigquery_error_falls_back(self, mock_gcp_config):
        provider = GCPBillingProvider()
        with patch.object(
            provider, "_query_bq", side_effect=Exception("BQ timeout")
        ):
            result = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 2))
            assert result.metadata.get("source") == "config_fallback"

    @pytest.mark.asyncio
    async def test_bigquery_success_returns_real_data(self, mock_gcp_config):
        provider = GCPBillingProvider()
        mock_result = (
            Decimal("150.50"),
            {"project:bayit-plus": Decimal("100")},
            {"service:Compute Engine": Decimal("80")},
        )
        with patch.object(
            provider, "_query_bq", new_callable=AsyncMock, return_value=mock_result
        ):
            result = await provider.get_costs(date(2026, 3, 1), date(2026, 3, 2))
            assert result.amount == Decimal("150.50")
            assert result.metadata.get("source") == "bigquery"
            assert "project:bayit-plus" in result.breakdown

    @pytest.mark.asyncio
    async def test_health_check_disabled(self, mock_gcp_disabled):
        provider = GCPBillingProvider()
        assert await provider.health_check() is True
