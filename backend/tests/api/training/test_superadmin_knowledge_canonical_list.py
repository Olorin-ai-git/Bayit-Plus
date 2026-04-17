"""GET /superadmin/knowledge/canonical — list all global canonicals."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.training.dependencies import require_superadmin
from app.main import app
from app.models.training_user import TrainingUser


def _super():
    u = TrainingUser.model_construct(
        email="s@o", password_hash="x", partner_id="internal",
        role="superadmin", display_name="S", status="active",
    )
    u.id = "sa1"
    return u


@pytest.mark.asyncio
async def test_list_returns_global_canonicals_only():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    rows = [
        {"_id": "g1", "partner_id": None, "scope": "global",
         "question": "Q1", "answer": "A1", "citations": [],
         "status": "active", "stale_after_months": 12,
         "last_verified_at": datetime.now(timezone.utc),
         "created_at": datetime.now(timezone.utc),
         "updated_at": datetime.now(timezone.utc), "created_by": "sa1"},
    ]
    with patch(
        "app.api.routes.training.superadmin_knowledge_canonical._fetch_global_canonicals",
        new=AsyncMock(return_value=(rows, 1)),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.get("/api/v1/training/superadmin/knowledge/canonical")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["canonical_id"] == "g1"
