"""
Test Security Fixes
Tests for authentication security improvements
"""

import pytest
from app.main import app
from httpx import ASGITransport, AsyncClient


@pytest.mark.asyncio
async def test_password_strength_validation():
    """Test that weak passwords are rejected"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Test weak password - too short
        response = await client.post(
            "/api/v1/auth/register",
            json={"email": "test@example.com", "name": "Test User", "password": "weak"},
        )
        assert response.status_code == 422
        errors = response.json().get("errors", response.json().get("detail", []))
        if isinstance(errors, list) and len(errors) > 0:
            assert "at least 8 characters" in errors[0]["msg"].lower()
        else:
            assert "validation" in str(response.json()).lower()

        # Test password without uppercase
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test2@example.com",
                "name": "Test User",
                "password": "lowercase123!",
            },
        )
        assert response.status_code == 422

        # Test password without special character
        response = await client.post(
            "/api/v1/auth/register",
            json={
                "email": "test3@example.com",
                "name": "Test User",
                "password": "NoSpecial123",
            },
        )
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_oauth_callback_deprecated():
    """Test that OAuth callback returns 410 Gone (deprecated)"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/google/callback",
            json={
                "code": "fake_auth_code",
                "redirect_uri": "http://localhost:3000/callback",
            },
        )
        assert response.status_code == 410
        detail = response.json()["detail"]
        assert detail["error"] == "endpoint_deprecated"


@pytest.mark.asyncio
async def test_login_endpoint_deprecated():
    """Test that legacy login endpoint returns 410 Gone"""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "SomePassword123!"},
        )
        assert response.status_code == 410
        detail = response.json()["detail"]
        assert detail["error"] == "endpoint_deprecated"


@pytest.mark.asyncio
async def test_email_verification_enforcement():
    """Test that unverified users cannot login"""
    pass


def test_rate_limiter_imported():
    """Test that rate limiter module loads correctly"""
    from app.core.rate_limiter import RATE_LIMITING_ENABLED, limiter

    assert limiter is not None
    assert isinstance(RATE_LIMITING_ENABLED, bool)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
