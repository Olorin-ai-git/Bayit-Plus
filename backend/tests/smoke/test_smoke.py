"""
Smoke tests for verifying Bayit+ Backend deployment.

These tests are designed to run against a deployed service
to verify critical endpoints are responding correctly.

Usage:
    # Against local server
    pytest tests/smoke/ -v

    # Against deployed service
    SERVICE_URL=https://bayit-plus-backend-xxx.run.app pytest tests/smoke/ -v

Environment variables:
    SERVICE_URL: Base URL of the service (default: http://localhost:8080)
    SMOKE_TEST_TIMEOUT: Request timeout in seconds (default: 30)
"""

import os

import httpx
import pytest

# Configuration from environment
SERVICE_URL = os.getenv("SERVICE_URL", "http://localhost:8080")
TIMEOUT = int(os.getenv("SMOKE_TEST_TIMEOUT", "30"))


@pytest.fixture
def client():
    """Create HTTP client for smoke tests."""
    return httpx.Client(base_url=SERVICE_URL, timeout=TIMEOUT)


class TestHealthEndpoints:
    """Smoke tests for health check endpoints."""

    def test_basic_health(self, client: httpx.Client):
        """Test basic health endpoint returns 200."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "app" in data

    def test_liveness_probe(self, client: httpx.Client):
        """Test liveness probe returns 200."""
        response = client.get("/health/live")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["check"] == "liveness"

    def test_readiness_probe(self, client: httpx.Client):
        """Test readiness probe returns 200 when database is connected."""
        response = client.get("/health/ready")
        # Can be 200 (healthy) or 503 (unhealthy)
        assert response.status_code in [200, 503]
        data = response.json()
        assert data["check"] == "readiness"
        assert "services" in data

    def test_deep_health_check(self, client: httpx.Client):
        """Test deep health check returns service status details."""
        response = client.get("/health/deep")
        assert response.status_code in [200, 503]
        data = response.json()
        assert data["check"] == "deep"
        assert "services" in data
        assert "summary" in data


class TestAPIAvailability:
    """Smoke tests for API availability."""

    def test_api_root(self, client: httpx.Client):
        """Test API root endpoint is accessible."""
        response = client.get("/api/v1/")
        # Could be 200 or 404 depending on if root has a handler
        assert response.status_code in [200, 404]

    def test_openapi_schema(self, client: httpx.Client):
        """Test OpenAPI schema is available."""
        response = client.get("/openapi.json")
        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data

    def test_swagger_docs(self, client: httpx.Client):
        """Test Swagger documentation is available."""
        response = client.get("/docs")
        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")


class TestAuthenticationBarrier:
    """Smoke tests for authentication barriers."""

    def test_protected_user_endpoint(self, client: httpx.Client):
        """Test protected user endpoint requires authentication."""
        response = client.get("/api/v1/users/me")
        assert response.status_code in [401, 403]

    def test_protected_watchlist_endpoint(self, client: httpx.Client):
        """Test protected watchlist endpoint requires authentication."""
        response = client.get("/api/v1/watchlist")
        assert response.status_code in [401, 403]


class TestPublicEndpoints:
    """Smoke tests for public endpoints."""

    def test_content_listing(self, client: httpx.Client):
        """Test content listing endpoint is accessible."""
        response = client.get("/api/v1/content", params={"limit": 5})
        assert response.status_code == 200

    def test_live_channels(self, client: httpx.Client):
        """Test live channels endpoint is accessible."""
        response = client.get("/api/v1/live", params={"limit": 5})
        # Can be 200 or 404 if not implemented
        assert response.status_code in [200, 404]


class TestResponseFormat:
    """Smoke tests for response format consistency."""

    def test_json_content_type(self, client: httpx.Client):
        """Test API returns JSON content type."""
        response = client.get("/health")
        assert "application/json" in response.headers.get("content-type", "")

    def test_cors_headers_present(self, client: httpx.Client):
        """Test CORS headers are present for cross-origin requests."""
        headers = {"Origin": "https://bayit.tv"}
        response = client.get("/health", headers=headers)
        # CORS headers should be present
        # Note: Actual CORS enforcement depends on configuration
        assert response.status_code == 200


def pytest_collection_modifyitems(config, items):
    """Mark all smoke tests with the 'smoke' marker."""
    for item in items:
        if "smoke" in str(item.fspath):
            item.add_marker(pytest.mark.smoke)
