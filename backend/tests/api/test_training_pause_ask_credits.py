"""Test credit enforcement on voice-mode Pause & Ask."""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from unittest.mock import AsyncMock, patch, MagicMock

from app.api.routes.training.dependencies import get_current_training_user
from app.main import app


def _make_user(partner_id="training-test-abc12345"):
    user = MagicMock()
    user.id = "user_001"
    user.email = "user@test.com"
    user.role = "viewer"
    user.display_name = "User"
    user.partner_id = partner_id
    user.status = "active"
    return user


@pytest_asyncio.fixture
async def client():
    user = _make_user()
    app.dependency_overrides[get_current_training_user] = lambda: user
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        yield ac
    app.dependency_overrides.pop(get_current_training_user, None)


@pytest.mark.asyncio
async def test_voice_pause_ask_rejects_when_credits_exhausted(client):
    """Voice-mode Pause & Ask should return 402 when credits are gone."""
    partner = MagicMock()
    partner.partner_id = "training-test-abc12345"
    partner.training_config = {
        "credits_used": 50,
        "credit_limit_monthly": 50,
        "org_tier": "team",
    }

    with patch(
        "app.api.routes.training.pause_ask.IntegrationPartner"
    ) as mock_ip:
        mock_ip.find_one = AsyncMock(return_value=partner)

        resp = await client.post(
            "/api/v1/training/pause-ask",
            json={
                "content_id": "abc123",
                "character": "Speaker",
                "question": "What is this about?",
                "mode": "voice",
            },
        )

    assert resp.status_code == 402
    assert "credit" in resp.json()["detail"].lower()
