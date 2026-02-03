"""
Pytest fixtures for admin API tests.
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.admin import Permission
from app.models.user import User


@pytest_asyncio.fixture
async def admin_user(bayit_db_client):
    """Create admin user with MARKETING_READ and MARKETING_SEND permissions."""
    from app.core.security import get_password_hash

    user = User(
        email="admin@bayitplus.com",
        name="Admin User",
        hashed_password=get_password_hash("admin123"),
        subscription_tier="premium",
        is_active=True,
        role="admin",
        custom_permissions=[Permission.MARKETING_READ, Permission.MARKETING_SEND],
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def user_without_permission(bayit_db_client):
    """Create regular user without admin permissions."""
    from app.core.security import get_password_hash

    user = User(
        email="user@example.com",
        name="Regular User",
        hashed_password=get_password_hash("user123"),
        subscription_tier="premium",
        is_active=True,
        role="user",
        custom_permissions=[],
    )
    await user.insert()
    return user


@pytest_asyncio.fixture
async def admin_client(admin_user):
    """AsyncClient authenticated as admin user."""
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": str(admin_user.id)})

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        yield client


@pytest_asyncio.fixture
async def client_without_permission(user_without_permission):
    """AsyncClient authenticated as user without admin permissions."""
    from app.core.security import create_access_token

    token = create_access_token(data={"sub": str(user_without_permission.id)})

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
        headers={"Authorization": f"Bearer {token}"},
    ) as client:
        yield client
