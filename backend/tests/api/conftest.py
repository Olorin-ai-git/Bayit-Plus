"""
Pytest fixtures for API-level tests (non-admin).

Provides client, auth_headers, and mock_user fixtures
for unit-testing route handlers with mocked auth.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from unittest.mock import MagicMock

from app.core.security import get_current_active_user, get_current_user
from app.main import app


@pytest.fixture
def mock_user():
    """Mock authenticated user for route tests."""
    user = MagicMock()
    user.id = "test_user_id_12345"
    user.email = "testuser@bayitplus.com"
    user.role = "user"
    user.subscription_tier = "premium"
    user.is_active = True
    user.custom_permissions = []
    return user


@pytest_asyncio.fixture
async def client(mock_user):
    """AsyncClient with mocked auth dependency."""
    app.dependency_overrides[get_current_user] = lambda: mock_user
    app.dependency_overrides[get_current_active_user] = lambda: mock_user

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest.fixture
def auth_headers():
    """Auth headers (unused with dependency override, kept for signature compat)."""
    return {"Authorization": "Bearer test-token-mocked"}
