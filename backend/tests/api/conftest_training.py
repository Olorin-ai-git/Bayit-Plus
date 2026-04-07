"""Training-specific test fixtures for API-level tests."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from unittest.mock import MagicMock

from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
    require_training_teacher_or_admin,
)
from app.main import app


@pytest.fixture
def mock_training_admin():
    """Mock training admin user."""
    user = MagicMock()
    user.id = "training_admin_001"
    user.email = "admin@testorg.com"
    user.role = "admin"
    user.display_name = "Test Admin"
    user.partner_id = "training-testorg-abc12345"
    user.department = None
    user.status = "active"
    return user


@pytest.fixture
def mock_training_viewer():
    """Mock training viewer user."""
    user = MagicMock()
    user.id = "training_viewer_001"
    user.email = "viewer@testorg.com"
    user.role = "viewer"
    user.display_name = "Test Viewer"
    user.partner_id = "training-testorg-abc12345"
    user.department = "Engineering"
    user.status = "active"
    return user


@pytest_asyncio.fixture
async def training_admin_client(mock_training_admin):
    """AsyncClient with training admin auth override."""
    app.dependency_overrides[get_current_training_user] = lambda: mock_training_admin
    app.dependency_overrides[require_training_admin] = lambda: mock_training_admin
    app.dependency_overrides[require_training_teacher_or_admin] = (
        lambda: mock_training_admin
    )

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.pop(get_current_training_user, None)
    app.dependency_overrides.pop(require_training_admin, None)
    app.dependency_overrides.pop(require_training_teacher_or_admin, None)


@pytest_asyncio.fixture
async def training_public_client():
    """AsyncClient with no auth (for public endpoints like register/login)."""
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac
