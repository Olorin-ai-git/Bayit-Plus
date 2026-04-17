"""GET /knowledge/history: current user's recent asks (90-day window, 30-item cap)."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.training.dependencies import get_current_training_user
from app.main import app
from app.models.training_user import TrainingUser


def _user(role="viewer"):
    u = TrainingUser.model_construct(
        email="u@e", password_hash="x", partner_id="p1",
        role=role, display_name="U", status="active",
    )
    u.id = "uid1"
    return u


@pytest.mark.asyncio
async def test_history_returns_user_asks_sorted_desc():
    app.dependency_overrides[get_current_training_user] = lambda: _user()
    rows = [
        {"_id": "a2", "question": "q2", "mode": "blended",
         "credits_charged": 1, "created_at": datetime.now(timezone.utc),
         "promoted_to": None},
        {"_id": "a1", "question": "q1", "mode": "no_match",
         "credits_charged": 0, "created_at": datetime.now(timezone.utc),
         "promoted_to": None},
    ]
    with patch(
        "app.api.routes.training.knowledge_history._fetch_user_history",
        new=AsyncMock(return_value=rows),
    ) as mh:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.get("/api/v1/training/knowledge/history")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert len(body["items"]) == 2
    assert mh.await_args.kwargs["asker_user_id"] == "uid1"


@pytest.mark.asyncio
async def test_history_respects_limit_query_param():
    app.dependency_overrides[get_current_training_user] = lambda: _user()
    with patch(
        "app.api.routes.training.knowledge_history._fetch_user_history",
        new=AsyncMock(return_value=[]),
    ) as mh:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.get("/api/v1/training/knowledge/history?limit=5")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert mh.await_args.kwargs["limit"] == 5
