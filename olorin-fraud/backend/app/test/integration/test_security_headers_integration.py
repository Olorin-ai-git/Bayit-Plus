"""
Integration tests for Security Headers Middleware.

This test module validates that security headers are properly applied to
HTTP responses through the FastAPI application.
"""

import pytest
from fastapi.testclient import TestClient

from app.service import create_app
from app.service.config import SvcSettings


@pytest.fixture
def test_config():
    """Create minimal test configuration."""
    return SvcSettings()


@pytest.fixture
def client(test_config):
    """Create test client with the FastAPI app."""
    app = create_app(test_config=test_config)
    return TestClient(app)


class TestSecurityHeadersIntegration:
    """Integration test suite for security headers middleware."""

    def test_health_endpoint_has_security_headers(self, client):
        """Test that health endpoint returns all security headers."""
        response = client.get("/health")

        assert response.status_code == 200

        # Verify all required security headers are present
        assert "Content-Security-Policy" in response.headers
        assert "Strict-Transport-Security" in response.headers
        assert "X-Frame-Options" in response.headers
        assert "X-Content-Type-Options" in response.headers
        assert "X-XSS-Protection" in response.headers
        assert "Referrer-Policy" in response.headers
        assert "Permissions-Policy" in response.headers

    def test_version_endpoint_has_security_headers(self, client):
        """Test that version endpoint returns all security headers."""
        response = client.get("/version")

        assert response.status_code == 200

        # Verify security headers
        assert "Content-Security-Policy" in response.headers
        assert "Strict-Transport-Security" in response.headers
        assert "X-Frame-Options" in response.headers

    def test_csp_header_value(self, client):
        """Test Content-Security-Policy header has proper value."""
        response = client.get("/health")

        csp = response.headers.get("Content-Security-Policy")
        assert csp is not None
        assert "default-src" in csp
        assert "'self'" in csp

    def test_hsts_header_value(self, client):
        """Test HSTS header has proper value."""
        response = client.get("/health")

        hsts = response.headers.get("Strict-Transport-Security")
        assert hsts is not None
        assert "max-age=" in hsts

    def test_x_frame_options_value(self, client):
        """Test X-Frame-Options header value."""
        response = client.get("/health")

        x_frame_options = response.headers.get("X-Frame-Options")
        assert x_frame_options is not None
        assert x_frame_options in ["DENY", "SAMEORIGIN"]

    def test_x_content_type_options_value(self, client):
        """Test X-Content-Type-Options header value."""
        response = client.get("/health")

        x_content_type_options = response.headers.get("X-Content-Type-Options")
        assert x_content_type_options == "nosniff"

    def test_referrer_policy_value(self, client):
        """Test Referrer-Policy header value."""
        response = client.get("/health")

        referrer_policy = response.headers.get("Referrer-Policy")
        assert referrer_policy is not None
        assert len(referrer_policy) > 0

    def test_permissions_policy_value(self, client):
        """Test Permissions-Policy header value."""
        response = client.get("/health")

        permissions_policy = response.headers.get("Permissions-Policy")
        assert permissions_policy is not None
        assert len(permissions_policy) > 0

    def test_404_response_has_security_headers(self, client):
        """Test that 404 responses also include security headers."""
        response = client.get("/nonexistent-endpoint")

        assert response.status_code == 404

        # Security headers should be present even on error responses
        assert "Content-Security-Policy" in response.headers
        assert "Strict-Transport-Security" in response.headers
        assert "X-Frame-Options" in response.headers

    def test_options_request_has_security_headers(self, client):
        """Test that OPTIONS requests (CORS preflight) include security headers."""
        response = client.options("/health")

        # Security headers should be present on OPTIONS requests
        assert "Content-Security-Policy" in response.headers
        assert "X-Frame-Options" in response.headers

    def test_post_request_has_security_headers(self, client):
        """Test that POST requests include security headers."""
        # Note: This endpoint may not exist, but we're testing header presence
        response = client.post("/health", json={})

        # Security headers should be present regardless of method
        assert "Content-Security-Policy" in response.headers
        assert "Strict-Transport-Security" in response.headers

    def test_security_headers_on_authenticated_endpoints(self, client):
        """Test security headers on endpoints that require authentication."""
        # Attempt to access protected endpoint without auth
        response = client.get("/investigations")

        # Security headers should be present even when unauthorized
        assert "Content-Security-Policy" in response.headers
        assert "Strict-Transport-Security" in response.headers
        assert "X-Frame-Options" in response.headers
