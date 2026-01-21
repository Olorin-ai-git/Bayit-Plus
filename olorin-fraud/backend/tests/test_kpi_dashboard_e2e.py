"""
End-to-End Test for KPI Dashboard Microservice

Tests all components of the KPI dashboard feature:
- Models
- Schemas
- Service layer
- Router endpoints
- Integration points
"""

from datetime import datetime, timedelta
from unittest.mock import MagicMock, Mock

import pytest
from sqlalchemy.orm import Session

from app.models.kpi_models import KPIBreakdown, KPIDailyMetrics, KPIThresholdSweep
from app.router.kpi_router import check_kpi_permission, get_current_tenant, router
from app.schemas.kpi_schemas import (
    KPIBreakdownResponse,
    KPIDailyMetricsResponse,
    KPIDashboardResponse,
    KPIThresholdSweepResponse,
)
from app.security.auth import User
from app.service.kpi_service import KPIService


class TestKPIModels:
    """Test KPI database models."""

    def test_kpi_daily_metrics_model(self):
        """Test KPIDailyMetrics model instantiation."""
        metric = KPIDailyMetrics(
            id="test-id-1",
            pilot_id="test_pilot",
            tenant_id="test_tenant",
            metric_date=datetime.utcnow(),
            precision=0.95,
            recall=0.88,
            fpr=0.12,
        )

        assert metric.id == "test-id-1"
        assert metric.pilot_id == "test_pilot"
        assert metric.tenant_id == "test_tenant"
        assert metric.precision == 0.95
        assert metric.recall == 0.88
        assert metric.fpr == 0.12

    def test_kpi_threshold_sweep_model(self):
        """Test KPIThresholdSweep model instantiation."""
        sweep = KPIThresholdSweep(
            id="test-id-2",
            pilot_id="test_pilot",
            tenant_id="test_tenant",
            sweep_date=datetime.utcnow(),
            threshold=0.5,
            profit=100000.0,
        )

        assert sweep.id == "test-id-2"
        assert sweep.pilot_id == "test_pilot"
        assert sweep.threshold == 0.5
        assert sweep.profit == 100000.0

    def test_kpi_breakdown_model(self):
        """Test KPIBreakdown model instantiation."""
        breakdown = KPIBreakdown(
            id="test-id-3",
            pilot_id="test_pilot",
            tenant_id="test_tenant",
            breakdown_date=datetime.utcnow(),
            breakdown_type="merchant",
            breakdown_value="merchant_123",
        )

        assert breakdown.id == "test-id-3"
        assert breakdown.breakdown_type == "merchant"
        assert breakdown.breakdown_value == "merchant_123"


class TestKPISchemas:
    """Test KPI Pydantic schemas."""

    def test_kpi_daily_metrics_response(self):
        """Test KPIDailyMetricsResponse schema."""
        response = KPIDailyMetricsResponse(
            id="test-id",
            pilot_id="test_pilot",
            tenant_id="test_tenant",
            metric_date=datetime.utcnow(),
            precision=0.95,
            recall=0.88,
            fpr=0.12,
            true_positives=100,
            false_positives=5,
            true_negatives=900,
            false_negatives=12,
        )

        assert response.precision == 0.95
        assert response.recall == 0.88
        assert response.fpr == 0.12

    def test_kpi_dashboard_response(self):
        """Test KPIDashboardResponse schema."""
        response = KPIDashboardResponse(
            recall=0.88,
            fpr=0.12,
            precision=0.95,
            net_savings=125000.0,
            latency_p95=45.2,
            error_rate=0.003,
            daily_metrics=[],
            threshold_sweep=[],
            breakdowns=[],
            pilot_id="test_pilot",
            tenant_id="test_tenant",
            date_range_start=datetime.utcnow(),
            date_range_end=datetime.utcnow(),
            last_updated=datetime.utcnow(),
        )

        assert response.recall == 0.88
        assert response.fpr == 0.12
        assert response.precision == 0.95
        assert response.net_savings == 125000.0


class TestKPIService:
    """Test KPI service layer."""

    def test_service_initialization(self):
        """Test KPIService initialization."""
        mock_db = Mock(spec=Session)
        service = KPIService(mock_db)

        assert service.db == mock_db
        assert hasattr(service, "default_date_range_days")
        assert isinstance(service.default_date_range_days, int)

    def test_get_dashboard_metrics_no_data(self):
        """Test get_dashboard_metrics when no data exists."""
        mock_db = Mock(spec=Session)
        mock_query = Mock()
        mock_filter = Mock()
        mock_order_by = Mock()

        mock_db.query.return_value = mock_query
        mock_query.filter.return_value = mock_filter
        mock_filter.order_by.return_value = mock_order_by
        mock_order_by.first.return_value = None
        mock_order_by.asc.return_value = []

        service = KPIService(mock_db)
        result = service.get_dashboard_metrics(
            pilot_id="test_pilot",
            tenant_id="test_tenant",
        )

        assert result is not None
        assert result.recall is None
        assert result.fpr is None
        assert result.precision is None
        assert result.pilot_id == "test_pilot"
        assert result.tenant_id == "test_tenant"
        assert result.daily_metrics == []
        assert result.threshold_sweep == []
        assert result.breakdowns == []


class TestKPIRouter:
    """Test KPI router endpoints."""

    def test_get_current_tenant_from_scope(self):
        """Test tenant extraction from user scopes."""
        user = Mock(spec=User)
        user.scopes = ["admin", "tenant:test_tenant"]

        tenant_id = get_current_tenant(user)
        assert tenant_id == "test_tenant"

    def test_get_current_tenant_from_attribute(self):
        """Test tenant extraction from user attribute."""
        user = Mock(spec=User)
        user.scopes = []
        user.tenant_id = "test_tenant"

        tenant_id = get_current_tenant(user)
        assert tenant_id == "test_tenant"

    def test_get_current_tenant_fails_when_missing(self):
        """Test tenant extraction fails when not found."""
        user = Mock(spec=User)
        user.scopes = []
        del user.tenant_id

        with pytest.raises(Exception):  # Should raise HTTPException
            get_current_tenant(user)

    def test_check_kpi_permission_admin(self):
        """Test permission check for admin role."""
        user = Mock(spec=User)
        user.scopes = ["admin"]

        assert check_kpi_permission(user, "read") is True
        assert check_kpi_permission(user, "write") is True
        assert check_kpi_permission(user, "view") is True

    def test_check_kpi_permission_analyst(self):
        """Test permission check for analyst role."""
        user = Mock(spec=User)
        user.scopes = ["analyst"]

        assert check_kpi_permission(user, "read") is True
        assert check_kpi_permission(user, "write") is True
        assert check_kpi_permission(user, "view") is False

    def test_check_kpi_permission_client_viewer(self):
        """Test permission check for client_viewer role."""
        user = Mock(spec=User)
        user.scopes = ["client_viewer"]

        assert check_kpi_permission(user, "read") is True
        assert check_kpi_permission(user, "write") is False
        assert check_kpi_permission(user, "view") is True


class TestKPIIntegration:
    """Test KPI feature integration."""

    def test_router_registration(self):
        """Test that KPI router is properly registered."""
        from fastapi import FastAPI

        from app.service.config import get_settings_for_env
        from app.service.router.router_config import configure_routes

        app = FastAPI()
        config = get_settings_for_env()
        configure_routes(app, config)

        routes = [r.path for r in app.routes if hasattr(r, "path")]
        kpi_routes = [r for r in routes if "kpi" in r.lower()]

        assert len(kpi_routes) >= 4
        assert any("/api/v1/kpi/dashboard" in r for r in routes)
        assert any("/api/v1/kpi/daily" in r for r in routes)
        assert any("/api/v1/kpi/threshold-sweep" in r for r in routes)
        assert any("/api/v1/kpi/breakdowns" in r for r in routes)

    def test_service_uses_environment_config(self):
        """Test that service reads from environment variables."""
        import os

        original_value = os.environ.get("KPI_DEFAULT_DATE_RANGE_DAYS")

        try:
            os.environ["KPI_DEFAULT_DATE_RANGE_DAYS"] = "60"
            mock_db = Mock(spec=Session)
            service = KPIService(mock_db)
            assert service.default_date_range_days == 60
        finally:
            if original_value:
                os.environ["KPI_DEFAULT_DATE_RANGE_DAYS"] = original_value
            else:
                os.environ.pop("KPI_DEFAULT_DATE_RANGE_DAYS", None)
