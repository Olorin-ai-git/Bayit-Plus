"""
Tests for DELETE /api/v1/auth/v2/me account deletion proxy.
"""

import pytest
import pytest_asyncio
import respx
from beanie import init_beanie
from fastapi.testclient import TestClient
from httpx import Response
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.security import get_current_active_user, get_password_hash
from app.main import app
from app.models.user import User

_AUTH_SERVICE_BASE = "https://auth.olorin.ai"
_DELETE_ACCOUNT_PATH = "/account/delete"


@pytest_asyncio.fixture
async def db_client():
    """Initialize Beanie with User model against isolated test DB."""
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    test_db_name = "test_auth_proxy_delete_account"

    await init_beanie(
        database=client[test_db_name],
        document_models=[User],
    )

    yield client

    await client.drop_database(test_db_name)
    client.close()


@pytest_asyncio.fixture
async def bayit_user(db_client):
    """Create an active Bayit+ user and return the User document."""
    user = User(
        email="delete-me@example.com",
        name="Delete Me",
        hashed_password=get_password_hash("Test@1234"),
        role="user",
        is_active=True,
        email_verified=True,
        is_verified=True,
    )
    await user.insert()
    return user


@pytest.fixture
def client():
    """Sync TestClient with real auth stack (no dependency overrides)."""
    return TestClient(app)


def test_delete_me_requires_auth(client):
    """DELETE /api/v1/auth/v2/me without a token must return 401."""
    response = client.delete("/api/v1/auth/v2/me")
    assert response.status_code == 401


@respx.mock
@pytest.mark.asyncio
async def test_delete_me_forwards_to_auth_service_and_removes_bayit_user(
    db_client, bayit_user
):
    """
    DELETE /api/v1/auth/v2/me with a valid token must:
      1. Forward the deletion to auth.olorin.ai/account/delete
      2. Remove the Bayit+ user from the database
      3. Return 204 No Content
    """
    user = bayit_user

    # Override auth dependency to return the real Beanie doc (bypasses RS256 check).
    app.dependency_overrides[get_current_active_user] = lambda: user

    respx.delete(f"{_AUTH_SERVICE_BASE}{_DELETE_ACCOUNT_PATH}").mock(
        return_value=Response(204)
    )

    try:
        async with __import__("httpx").AsyncClient(
            transport=__import__("httpx").ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            response = await ac.delete(
                "/api/v1/auth/v2/me",
                headers={"Authorization": "Bearer test-token"},
            )
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    assert response.status_code == 204

    reloaded = await User.get(user.id)
    assert reloaded is None


@respx.mock
@pytest.mark.asyncio
async def test_delete_me_surfaces_auth_service_failure(
    db_client, bayit_user
):
    """
    DELETE /api/v1/auth/v2/me when auth.olorin.ai returns 500 must:
      1. Return 502 or 500 to the client
      2. Leave the Bayit+ user record intact (atomic semantics)
    """
    user = bayit_user

    # Override auth dependency to return the real Beanie doc (bypasses RS256 check).
    app.dependency_overrides[get_current_active_user] = lambda: user

    respx.delete(f"{_AUTH_SERVICE_BASE}{_DELETE_ACCOUNT_PATH}").mock(
        return_value=Response(500, json={"detail": "internal error"})
    )

    try:
        async with __import__("httpx").AsyncClient(
            transport=__import__("httpx").ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            response = await ac.delete(
                "/api/v1/auth/v2/me",
                headers={"Authorization": "Bearer test-token"},
            )
    finally:
        app.dependency_overrides.pop(get_current_active_user, None)

    assert response.status_code in (500, 502)

    reloaded = await User.get(user.id)
    assert reloaded is not None
