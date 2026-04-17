"""PUT /canonical/{id} (edit) + POST /canonical/{id}/verify (re-verify)."""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.routes.training.dependencies import require_training_admin
from app.main import app
from app.models.training_user import TrainingUser


def _admin():
    u = TrainingUser.model_construct(
        email="a@e", password_hash="x", partner_id="p1",
        role="admin", display_name="A", status="active",
    )
    u.id = "adm1"
    return u


@pytest.mark.asyncio
async def test_edit_updates_fields_and_resyncs_pinecone():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    loaded = SimpleNamespace(
        id="cm1", partner_id="p1", scope="partner",
        question="Old?", answer="old",
        citations=[], status="active",
        stale_after_months=6, last_verified_at=datetime.now(timezone.utc),
        save=AsyncMock(),
    )
    with patch(
        "app.api.routes.training.knowledge_canonical._load_own",
        new=AsyncMock(return_value=loaded),
    ), patch(
        "app.api.routes.training.knowledge_canonical._sync_to_pinecone",
        new=AsyncMock(),
    ) as msy:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.put("/api/v1/training/knowledge/canonical/cm1", json={
                "question": "New?",
                "answer": "new.",
                "citations": [{"type": "video", "content_id": "v1"}],
                "stale_after_months": 12,
            })
    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert loaded.question == "New?"
    assert loaded.answer == "new."
    assert loaded.stale_after_months == 12
    msy.assert_awaited_once()


@pytest.mark.asyncio
async def test_verify_sets_last_verified_and_restores_active():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    stale_date = datetime.now(timezone.utc) - timedelta(days=200)
    loaded = SimpleNamespace(
        id="cm1", partner_id="p1", scope="partner",
        question="Q", answer="A", citations=[], status="stale",
        stale_after_months=6, last_verified_at=stale_date,
        save=AsyncMock(),
    )
    with patch(
        "app.api.routes.training.knowledge_canonical._load_own",
        new=AsyncMock(return_value=loaded),
    ), patch(
        "app.api.routes.training.knowledge_canonical._sync_to_pinecone",
        new=AsyncMock(),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/canonical/cm1/verify")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert loaded.status == "active"
    assert loaded.last_verified_at > stale_date
