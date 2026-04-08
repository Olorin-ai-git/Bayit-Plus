"""Test content ownership enforcement on Pause & Ask (E6)."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, MagicMock, patch

from app.api.routes.training.dependencies import get_current_training_user
from app.main import app


def _make_user(partner_id="training-org-a"):
    user = MagicMock()
    user.id = "user_001"
    user.email = "user@orga.com"
    user.role = "viewer"
    user.display_name = "User"
    user.partner_id = partner_id
    user.status = "active"
    return user


@pytest_asyncio.fixture
async def client():
    user = _make_user("training-org-a")
    app.dependency_overrides[get_current_training_user] = lambda: user
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.pop(get_current_training_user, None)


@pytest.mark.asyncio
async def test_pause_ask_rejects_cross_org_content(client):
    """Pause & Ask must 404 when content belongs to a different org."""
    partner = MagicMock()
    partner.partner_id = "training-org-a"
    partner.training_config = {
        "credits_used": 0,
        "credit_limit_monthly": 100,
        "org_tier": "team",
    }

    # Content belongs to org-b, not the requesting org-a
    foreign_content = MagicMock()
    foreign_content.partner_id = "training-org-b"

    with (
        patch("app.api.routes.training.pause_ask.IntegrationPartner") as mock_ip,
        patch("app.api.routes.training.pause_ask.Content") as mock_content,
    ):
        mock_ip.find_one = AsyncMock(return_value=partner)
        mock_content.get = AsyncMock(return_value=foreign_content)

        resp = await client.post(
            "/api/v1/training/pause-ask",
            json={
                "content_id": "aaaaaaaaaaaaaaaaaaaaaaaa",
                "character": "Speaker",
                "question": "What is this about?",
                "mode": "voice",
            },
        )

    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_pause_ask_rejects_missing_content(client):
    """Pause & Ask must 404 when content_id does not exist."""
    partner = MagicMock()
    partner.partner_id = "training-org-a"
    partner.training_config = {
        "credits_used": 0,
        "credit_limit_monthly": 100,
        "org_tier": "team",
    }

    with (
        patch("app.api.routes.training.pause_ask.IntegrationPartner") as mock_ip,
        patch("app.api.routes.training.pause_ask.Content") as mock_content,
    ):
        mock_ip.find_one = AsyncMock(return_value=partner)
        mock_content.get = AsyncMock(return_value=None)

        resp = await client.post(
            "/api/v1/training/pause-ask",
            json={
                "content_id": "aaaaaaaaaaaaaaaaaaaaaaaa",
                "character": "Speaker",
                "question": "What is this about?",
                "mode": "voice",
            },
        )

    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_pause_ask_rejects_invalid_content_id(client):
    """Pause & Ask must 404 when content_id is not a valid ObjectId."""
    partner = MagicMock()
    partner.partner_id = "training-org-a"
    partner.training_config = {
        "credits_used": 0,
        "credit_limit_monthly": 100,
        "org_tier": "team",
    }

    with patch("app.api.routes.training.pause_ask.IntegrationPartner") as mock_ip:
        mock_ip.find_one = AsyncMock(return_value=partner)

        resp = await client.post(
            "/api/v1/training/pause-ask",
            json={
                "content_id": "not-a-valid-objectid",
                "character": "Speaker",
                "question": "What is this about?",
                "mode": "voice",
            },
        )

    assert resp.status_code == 404
    assert "not found" in resp.json()["detail"].lower()
