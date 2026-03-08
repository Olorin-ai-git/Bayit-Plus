"""
Pytest fixtures for admin API tests.

Uses dependency overrides instead of real JWT tokens
to avoid RS256/HS256 token validation issues.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from unittest.mock import MagicMock

from app.core.security import get_current_active_user, get_current_user
from app.main import app
from app.models.admin import Permission


@pytest.fixture
def admin_user():
    """Mock admin user with MARKETING_READ and MARKETING_SEND permissions."""
    user = MagicMock()
    user.id = "admin_user_id_12345"
    user.email = "admin@bayitplus.com"
    user.name = "Admin User"
    user.role = "admin"
    user.subscription_tier = "premium"
    user.is_active = True
    user.custom_permissions = [
        Permission.MARKETING_READ.value,
        Permission.MARKETING_SEND.value,
    ]
    user.is_admin_user = lambda: True
    return user


@pytest.fixture
def user_without_permission():
    """Mock regular user without admin permissions."""
    user = MagicMock()
    user.id = "regular_user_id_12345"
    user.email = "user@example.com"
    user.name = "Regular User"
    user.role = "user"
    user.subscription_tier = "premium"
    user.is_active = True
    user.custom_permissions = []
    user.is_admin_user = lambda: False
    return user


@pytest_asyncio.fixture
async def admin_client(admin_user):
    """AsyncClient authenticated as admin user via dependency override."""
    app.dependency_overrides[get_current_user] = lambda: admin_user
    app.dependency_overrides[get_current_active_user] = lambda: admin_user

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)


@pytest_asyncio.fixture
async def client_without_permission(user_without_permission):
    """AsyncClient authenticated as user without admin permissions."""
    app.dependency_overrides[get_current_user] = lambda: user_without_permission
    app.dependency_overrides[get_current_active_user] = lambda: user_without_permission

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_current_active_user, None)
