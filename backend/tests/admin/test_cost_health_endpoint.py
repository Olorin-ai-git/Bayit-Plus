"""Tests for /admin/costs/health endpoint."""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.api.routes.admin.cost_service_schemas import (
    CostHealthResponse,
    ProviderHealthResponse,
)


class TestProviderHealthResponse:
    """Test health response schema."""

    def test_healthy_provider(self):
        response = ProviderHealthResponse(
            name="GCP BigQuery",
            enabled=True,
            is_healthy=True,
            last_success_at=None,
            last_error=None,
        )
        assert response.is_healthy is True
        assert response.last_error is None

    def test_unhealthy_provider(self):
        response = ProviderHealthResponse(
            name="MongoDB Atlas",
            enabled=True,
            is_healthy=False,
            last_success_at=None,
            last_error="Connection timeout",
        )
        assert response.is_healthy is False
        assert response.last_error == "Connection timeout"

    def test_disabled_provider(self):
        response = ProviderHealthResponse(
            name="Pinecone",
            enabled=False,
            is_healthy=True,
        )
        assert response.enabled is False


class TestCostHealthResponse:
    """Test overall health response."""

    def test_all_healthy(self):
        response = CostHealthResponse(
            providers=[
                ProviderHealthResponse(
                    name="GCP BigQuery",
                    enabled=True,
                    is_healthy=True,
                ),
                ProviderHealthResponse(
                    name="MongoDB Atlas",
                    enabled=True,
                    is_healthy=True,
                ),
            ],
            healthy_count=2,
            total_count=2,
            data_freshness_minutes=45,
        )
        assert response.healthy_count == 2
        assert response.data_freshness_minutes == 45

    def test_partial_health(self):
        response = CostHealthResponse(
            providers=[
                ProviderHealthResponse(
                    name="GCP", enabled=True, is_healthy=True
                ),
                ProviderHealthResponse(
                    name="Atlas", enabled=True, is_healthy=False,
                    last_error="Auth failed"
                ),
            ],
            healthy_count=1,
            total_count=2,
            data_freshness_minutes=None,
        )
        assert response.healthy_count == 1
        assert response.data_freshness_minutes is None
