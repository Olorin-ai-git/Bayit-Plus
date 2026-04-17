"""Integration tests for GET /training/knowledge/stats."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.training.dependencies import get_current_training_user
from app.main import app


def _make_user(partner_id: str = "p1"):
    user = MagicMock()
    user.id = "user-1"
    user.partner_id = partner_id
    user.role = "admin"
    user.email = "u@x.com"
    return user


def _make_partner(tier: str = "organization"):
    """Build a mock partner whose `_get_tier` resolves to `tier`.

    `_get_tier` in knowledge.py reads `billing_tier == "training"` and then
    pulls the sub-tier from `training_config["org_tier"]` (matches the
    TrainingConfig pydantic model field, which is what the prod DB actually
    writes).
    """
    partner = MagicMock()
    partner.partner_id = "p1"
    partner.billing_tier = "training"
    partner.training_config = {"org_tier": tier}
    return partner


@pytest.mark.asyncio
async def test_stats_returns_library_counts():
    partner = _make_partner()
    mock_collection = MagicMock()
    mock_collection.find.return_value.to_list = AsyncMock(return_value=[
        {"video_metadata": {"duration": 600.0}, "updated_at": datetime(2026, 4, 14, tzinfo=timezone.utc)},
        {"video_metadata": {"duration": 1200.0}, "updated_at": datetime(2026, 4, 15, tzinfo=timezone.utc)},
    ])
    app.dependency_overrides[get_current_training_user] = lambda: _make_user()
    try:
        with patch(
            "app.api.routes.training.knowledge.IntegrationPartner"
        ) as MockIP, patch(
            "app.api.routes.training.knowledge_stats.ContentModel"
        ) as MockCM:
            MockIP.find_one = AsyncMock(return_value=partner)
            MockCM.get_motor_collection.return_value = mock_collection
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as c:
                r = await c.get(
                    "/api/v1/training/knowledge/stats",
                    headers={"Authorization": "Bearer t"},
                )
    finally:
        app.dependency_overrides.pop(get_current_training_user, None)

    assert r.status_code == 200
    body = r.json()
    assert body["video_count"] == 2
    assert body["total_duration_seconds"] == 1800.0
    assert body["last_indexed_at"] == "2026-04-15T00:00:00Z"


@pytest.mark.asyncio
async def test_stats_blocks_team_tier():
    app.dependency_overrides[get_current_training_user] = lambda: _make_user()
    try:
        with patch(
            "app.api.routes.training.knowledge.IntegrationPartner"
        ) as MockIP:
            MockIP.find_one = AsyncMock(return_value=_make_partner(tier="team"))
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as c:
                r = await c.get(
                    "/api/v1/training/knowledge/stats",
                    headers={"Authorization": "Bearer t"},
                )
    finally:
        app.dependency_overrides.pop(get_current_training_user, None)
    assert r.status_code == 403


@pytest.mark.asyncio
async def test_stats_empty_library_returns_zeros():
    mock_collection = MagicMock()
    mock_collection.find.return_value.to_list = AsyncMock(return_value=[])
    app.dependency_overrides[get_current_training_user] = lambda: _make_user()
    try:
        with patch(
            "app.api.routes.training.knowledge.IntegrationPartner"
        ) as MockIP, patch(
            "app.api.routes.training.knowledge_stats.ContentModel"
        ) as MockCM:
            MockIP.find_one = AsyncMock(return_value=_make_partner())
            MockCM.get_motor_collection.return_value = mock_collection
            async with AsyncClient(
                transport=ASGITransport(app=app), base_url="http://test"
            ) as c:
                r = await c.get(
                    "/api/v1/training/knowledge/stats",
                    headers={"Authorization": "Bearer t"},
                )
    finally:
        app.dependency_overrides.pop(get_current_training_user, None)
    assert r.status_code == 200
    body = r.json()
    assert body["video_count"] == 0
    assert body["total_duration_seconds"] == 0.0
    assert body["last_indexed_at"] is None
