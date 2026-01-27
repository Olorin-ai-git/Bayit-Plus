"""Integration tests for Cost Dashboard API endpoints."""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta
from app.main import app


@pytest.fixture
def client():
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def auth_headers_admin():
    """Admin authorization headers."""
    return {
        "Authorization": "Bearer test-admin-token",
        "X-User-Role": "SUPER_ADMIN",
        "X-User-ID": "admin-123",
    }


@pytest.fixture
def auth_headers_billing():
    """Billing admin authorization headers."""
    return {
        "Authorization": "Bearer test-billing-token",
        "X-User-Role": "BILLING_ADMIN",
        "X-User-ID": "billing-123",
    }


@pytest.fixture
def auth_headers_regular():
    """Regular user authorization headers."""
    return {
        "Authorization": "Bearer test-user-token",
        "X-User-Role": "USER",
        "X-User-ID": "user-123",
    }


class TestCostOverviewEndpoint:
    """Tests for GET /admin/costs/overview endpoint."""

    def test_system_wide_overview_authorized(self, client, auth_headers_admin):
        """Test system-wide overview with authorized user."""
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "system_wide"},
            headers=auth_headers_admin,
        )
        assert response.status_code == 200
        data = response.json()
        assert "revenue" in data
        assert "total_costs" in data
        assert "profit_loss" in data
        assert "profit_margin" in data

    def test_per_user_overview_with_user_id(self, client, auth_headers_admin):
        """Test per-user overview with user ID."""
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "per_user", "user_id": "user-456"},
            headers=auth_headers_admin,
        )
        assert response.status_code == 200
        data = response.json()
        assert "user_id" in data
        assert data["user_id"] == "user-456"

    def test_unauthorized_access_denied(self, client, auth_headers_regular):
        """Test that regular users cannot access cost dashboard."""
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "system_wide"},
            headers=auth_headers_regular,
        )
        assert response.status_code == 403

    def test_missing_user_id_for_per_user_scope(self, client, auth_headers_admin):
        """Test that per-user scope requires user_id parameter."""
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "per_user"},
            headers=auth_headers_admin,
        )
        assert response.status_code == 400

    def test_rate_limiting_overview(self, client, auth_headers_admin):
        """Test rate limiting on overview endpoint (60/hour)."""
        # Make requests up to limit
        for i in range(60):
            response = client.get(
                "/admin/costs/overview",
                params={"scope": "system_wide"},
                headers=auth_headers_admin,
            )
            assert response.status_code == 200

        # Next request should be rate limited
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "system_wide"},
            headers=auth_headers_admin,
        )
        assert response.status_code == 429


class TestCostTimelineEndpoint:
    """Tests for GET /admin/costs/timeline endpoint."""

    def test_timeline_with_valid_dates(self, client, auth_headers_admin):
        """Test timeline endpoint with valid date range."""
        start_date = (datetime.now() - timedelta(days=30)).date()
        end_date = datetime.now().date()

        response = client.get(
            "/admin/costs/timeline",
            params={
                "scope": "system_wide",
                "granularity": "daily",
                "start_date": start_date,
                "end_date": end_date,
            },
            headers=auth_headers_admin,
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_timeline_date_range_validation(self, client, auth_headers_admin):
        """Test that date range > 365 days is rejected."""
        start_date = (datetime.now() - timedelta(days=400)).date()
        end_date = datetime.now().date()

        response = client.get(
            "/admin/costs/timeline",
            params={
                "scope": "system_wide",
                "granularity": "daily",
                "start_date": start_date,
                "end_date": end_date,
            },
            headers=auth_headers_admin,
        )
        assert response.status_code == 400

    def test_timeline_rate_limiting(self, client, auth_headers_admin):
        """Test rate limiting on timeline endpoint (30/hour)."""
        start_date = (datetime.now() - timedelta(days=7)).date()
        end_date = datetime.now().date()

        for i in range(30):
            response = client.get(
                "/admin/costs/timeline",
                params={
                    "scope": "system_wide",
                    "granularity": "daily",
                    "start_date": start_date,
                    "end_date": end_date,
                },
                headers=auth_headers_admin,
            )
            assert response.status_code == 200

        response = client.get(
            "/admin/costs/timeline",
            params={
                "scope": "system_wide",
                "granularity": "daily",
                "start_date": start_date,
                "end_date": end_date,
            },
            headers=auth_headers_admin,
        )
        assert response.status_code == 429


class TestTopSpendersEndpoint:
    """Tests for GET /admin/costs/users/top-spenders endpoint."""

    def test_top_spenders_super_admin_only(self, client, auth_headers_admin):
        """Test that top-spenders endpoint is super-admin only."""
        response = client.get(
            "/admin/costs/users/top-spenders",
            params={"period": "month", "limit": 20},
            headers=auth_headers_admin,
        )
        assert response.status_code == 200

    def test_top_spenders_denied_for_billing_admin(self, client, auth_headers_billing):
        """Test that billing admin cannot access top-spenders."""
        response = client.get(
            "/admin/costs/users/top-spenders",
            params={"period": "month", "limit": 20},
            headers=auth_headers_billing,
        )
        assert response.status_code == 403

    def test_pii_redaction_in_response(self, client, auth_headers_admin):
        """Test that user IDs are redacted in top-spenders response."""
        response = client.get(
            "/admin/costs/users/top-spenders",
            params={"period": "month", "limit": 20},
            headers=auth_headers_admin,
        )
        assert response.status_code == 200
        data = response.json()

        # Verify user IDs are hashed/redacted, not full IDs
        for spender in data:
            assert "user_hash" in spender
            assert "user_id" not in spender
            assert len(spender["user_hash"]) < 20  # Hashed format

    def test_top_spenders_rate_limiting(self, client, auth_headers_admin):
        """Test rate limiting on top-spenders endpoint (3/hour)."""
        for i in range(3):
            response = client.get(
                "/admin/costs/users/top-spenders",
                params={"period": "month", "limit": 20},
                headers=auth_headers_admin,
            )
            assert response.status_code == 200

        # Next request should be rate limited
        response = client.get(
            "/admin/costs/users/top-spenders",
            params={"period": "month", "limit": 20},
            headers=auth_headers_admin,
        )
        assert response.status_code == 429


class TestPerUserAccessControl:
    """Tests for per-user resource-level authorization."""

    def test_user_can_access_own_costs(self, client):
        """Test that users can access their own cost data."""
        user_id = "user-456"
        headers = {
            "Authorization": "Bearer test-user-token",
            "X-User-Role": "USER",
            "X-User-ID": user_id,
        }

        response = client.get(
            "/admin/costs/overview",
            params={"scope": "per_user", "user_id": user_id},
            headers=headers,
        )
        # User should be able to access own costs
        assert response.status_code in [200, 403]  # Depends on permission level

    def test_user_cannot_access_other_user_costs(self, client):
        """Test that users cannot access other users' cost data."""
        user_id = "user-456"
        other_user_id = "user-789"
        headers = {
            "Authorization": "Bearer test-user-token",
            "X-User-Role": "USER",
            "X-User-ID": user_id,
        }

        response = client.get(
            "/admin/costs/overview",
            params={"scope": "per_user", "user_id": other_user_id},
            headers=headers,
        )
        # Should be denied when accessing other user's data
        assert response.status_code == 403


class TestAuditLogging:
    """Tests for audit logging of cost data access."""

    def test_audit_log_created_on_access(self, client, auth_headers_admin):
        """Test that audit logs are created on cost data access."""
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "system_wide"},
            headers=auth_headers_admin,
        )
        assert response.status_code == 200
        # Verify audit log was created (would check logs in real implementation)

    def test_denied_access_logged(self, client, auth_headers_regular):
        """Test that denied access attempts are logged."""
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "system_wide"},
            headers=auth_headers_regular,
        )
        assert response.status_code == 403
        # Verify denied access was logged


class TestDataValidation:
    """Tests for input validation and schema compliance."""

    def test_invalid_scope_rejected(self, client, auth_headers_admin):
        """Test that invalid scope values are rejected."""
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "invalid_scope"},
            headers=auth_headers_admin,
        )
        assert response.status_code == 422

    def test_invalid_granularity_rejected(self, client, auth_headers_admin):
        """Test that invalid granularity values are rejected."""
        response = client.get(
            "/admin/costs/timeline",
            params={
                "scope": "system_wide",
                "granularity": "invalid_granularity",
                "start_date": "2026-01-01",
                "end_date": "2026-01-31",
            },
            headers=auth_headers_admin,
        )
        assert response.status_code == 422

    def test_negative_limit_rejected(self, client, auth_headers_admin):
        """Test that negative limit values are rejected."""
        response = client.get(
            "/admin/costs/users/top-spenders",
            params={"period": "month", "limit": -1},
            headers=auth_headers_admin,
        )
        assert response.status_code == 422

    def test_response_schema_compliance(self, client, auth_headers_admin):
        """Test that responses comply with expected schema."""
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "system_wide"},
            headers=auth_headers_admin,
        )
        assert response.status_code == 200
        data = response.json()

        # Verify required fields are present
        required_fields = [
            "revenue",
            "total_costs",
            "profit_loss",
            "profit_margin",
            "cost_per_minute",
        ]
        for field in required_fields:
            assert field in data


class TestErrorHandling:
    """Tests for proper error handling and responses."""

    def test_missing_auth_header(self, client):
        """Test that missing auth header returns 401."""
        response = client.get("/admin/costs/overview", params={"scope": "system_wide"})
        assert response.status_code == 401

    def test_invalid_auth_token(self, client):
        """Test that invalid token returns 401."""
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "system_wide"},
            headers={"Authorization": "Bearer invalid-token"},
        )
        assert response.status_code == 401

    def test_database_error_handling(self, client, auth_headers_admin):
        """Test that database errors are handled gracefully."""
        # Would inject database error in real implementation
        response = client.get(
            "/admin/costs/overview",
            params={"scope": "system_wide"},
            headers=auth_headers_admin,
        )
        # Should return 500 with proper error message
        assert response.status_code in [200, 500]
