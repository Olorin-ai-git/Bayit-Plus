"""GET /superadmin/knowledge/candidates — cross-partner harvest view."""

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
async def test_list_candidates_across_partners():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    rows = [
        {"_id": "c1", "partner_id": "pA", "asker_user_id": "uA",
         "question": "q1", "answer": "a1", "mode": "blended",
         "sources": [], "canonical_hits": [], "credits_charged": 1,
         "dismissed": False, "promoted_to": None, "scope": "partner",
         "created_at": datetime.now(timezone.utc)},
        {"_id": "c2", "partner_id": "pB", "asker_user_id": "uB",
         "question": "q2", "answer": "a2", "mode": "video_only",
         "sources": [], "canonical_hits": [], "credits_charged": 1,
         "dismissed": False, "promoted_to": None, "scope": "partner",
         "created_at": datetime.now(timezone.utc)},
    ]
    with patch(
        "app.api.routes.training.superadmin_knowledge_candidates._fetch_all_candidates",
        new=AsyncMock(return_value=(rows, 2)),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.get("/api/v1/training/superadmin/knowledge/candidates")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
