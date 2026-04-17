"""POST /knowledge/canonical: promote a candidate. Admin-only."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.training.dependencies import require_training_admin
from app.main import app
from app.models.training_user import TrainingUser


def _admin(partner_id="p1"):
    u = TrainingUser.model_construct(
        email="a@ex.com", password_hash="x", partner_id=partner_id,
        role="admin", display_name="A", status="active",
    )
    u.id = "adm1"
    return u


@pytest.mark.asyncio
async def test_promote_creates_canonical_and_upserts_vector():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    fake_cm = SimpleNamespace(id="cm1", status="active")
    with patch(
        "app.api.routes.training.knowledge_canonical._create_canonical",
        new=AsyncMock(return_value=fake_cm),
    ) as mc, patch(
        "app.api.routes.training.knowledge_canonical._link_candidate",
        new=AsyncMock(return_value=True),
    ), patch(
        "app.api.routes.training.knowledge_canonical._sync_to_pinecone",
        new=AsyncMock(),
    ) as msy:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/canonical", json={
                "candidate_id": "cand1",
                "question": "How do I X?",
                "answer": "By doing Y.",
                "citations": [{"type": "video", "content_id": "v1",
                               "timestamp_seconds": 42.0}],
                "stale_after_months": 6,
            })
    app.dependency_overrides.clear()
    assert r.status_code == 200
    data = r.json()
    assert data["canonical_id"] == "cm1"
    mc.assert_awaited_once()
    msy.assert_awaited_once()


@pytest.mark.asyncio
async def test_promote_requires_at_least_one_citation():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post("/api/v1/training/knowledge/canonical", json={
            "candidate_id": "cand1",
            "question": "Q?",
            "answer": "A.",
            "citations": [],
            "stale_after_months": 6,
        })
    app.dependency_overrides.clear()
    assert r.status_code == 422
