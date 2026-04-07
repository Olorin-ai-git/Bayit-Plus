"""Test credit enforcement on BYOC import endpoint."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch, MagicMock

from app.api.routes.training.dependencies import (
    get_current_training_user,
    require_training_admin,
)
from app.main import app


def _make_admin(partner_id="training-test-abc12345"):
    user = MagicMock()
    user.id = "admin_001"
    user.email = "admin@test.com"
    user.role = "admin"
    user.display_name = "Admin"
    user.partner_id = partner_id
    user.status = "active"
    return user


@pytest_asyncio.fixture
async def client():
    admin = _make_admin()
    app.dependency_overrides[get_current_training_user] = lambda: admin
    app.dependency_overrides[require_training_admin] = lambda: admin
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.pop(get_current_training_user, None)
    app.dependency_overrides.pop(require_training_admin, None)


@pytest.mark.asyncio
async def test_byoc_import_rejects_when_credits_exhausted(client):
    """BYOC import should return 402 when org credits are exhausted."""
    partner = MagicMock()
    partner.partner_id = "training-test-abc12345"
    partner.training_config = {
        "credits_used": 50,
        "credit_limit_monthly": 50,
    }

    with patch(
        "app.api.routes.training.byoc.IntegrationPartner"
    ) as mock_ip:
        mock_ip.find_one = AsyncMock(return_value=partner)

        resp = await client.post(
            "/api/v1/training/byoc/import",
            json={
                "source_type": "playlist",
                "url": "https://youtube.com/playlist?list=PL123",
                "name": "Test Playlist",
            },
        )

    assert resp.status_code == 402
    assert "Credit limit" in resp.json()["detail"]
