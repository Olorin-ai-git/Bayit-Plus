"""Super-admin canonical CRUD — scope hard-locked to global."""

from datetime import datetime, timezone
from types import SimpleNamespace
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
async def test_create_global_canonical_sets_scope_global_and_null_partner():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    captured_kwargs = {}

    async def _fake_create(**kwargs):
        captured_kwargs.update(kwargs)
        return SimpleNamespace(id="g1", status="active")

    with patch(
        "app.api.routes.training.superadmin_knowledge_canonical._create_global_canonical",
        new=AsyncMock(side_effect=_fake_create),
    ), patch(
        "app.api.routes.training.superadmin_knowledge_canonical._sync_to_pinecone",
        new=AsyncMock(),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post(
                "/api/v1/training/superadmin/knowledge/canonical",
                json={
                    "question": "What is OSHA?",
                    "answer": "Occupational Safety and Health Administration.",
                    "citations": [{"type": "document", "document_id": "gDoc1"}],
                    "stale_after_months": 12,
                },
            )

    app.dependency_overrides.clear()
    assert r.status_code == 200
    data = r.json()
    assert data["canonical_id"] == "g1"
    assert captured_kwargs.get("scope") == "global"
    assert captured_kwargs.get("partner_id") is None


@pytest.mark.asyncio
async def test_create_rejects_empty_citations():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post(
            "/api/v1/training/superadmin/knowledge/canonical",
            json={
                "question": "Q??",
                "answer": "A.",
                "citations": [],
                "stale_after_months": 6,
            },
        )
    app.dependency_overrides.clear()
    assert r.status_code == 422


@pytest.mark.asyncio
async def test_edit_rejects_non_global_canonical():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    with patch(
        "app.api.routes.training.superadmin_knowledge_canonical._load_global",
        new=AsyncMock(return_value=None),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.put(
                "/api/v1/training/superadmin/knowledge/canonical/cm9",
                json={
                    "question": "Edited?",
                    "answer": "New.",
                    "citations": [{"type": "document", "document_id": "d1"}],
                    "stale_after_months": 6,
                },
            )
    app.dependency_overrides.clear()
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_retract_global_canonical():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    loaded = SimpleNamespace(
        id="g1", partner_id=None, scope="global",
        question="Q", answer="A", citations=[], status="active",
        stale_after_months=12,
        last_verified_at=datetime.now(timezone.utc),
        save=AsyncMock(),
    )
    with patch(
        "app.api.routes.training.superadmin_knowledge_canonical._load_global",
        new=AsyncMock(return_value=loaded),
    ), patch(
        "app.api.routes.training.superadmin_knowledge_canonical._delete_from_pinecone",
        new=AsyncMock(),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.delete("/api/v1/training/superadmin/knowledge/canonical/g1")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert loaded.status == "retracted"


@pytest.mark.asyncio
async def test_verify_global_canonical():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    from datetime import timedelta
    stale_date = datetime.now(timezone.utc) - timedelta(days=400)
    loaded = SimpleNamespace(
        id="g1", partner_id=None, scope="global",
        question="Q", answer="A", citations=[], status="stale",
        stale_after_months=12, last_verified_at=stale_date,
        save=AsyncMock(),
    )
    with patch(
        "app.api.routes.training.superadmin_knowledge_canonical._load_global",
        new=AsyncMock(return_value=loaded),
    ), patch(
        "app.api.routes.training.superadmin_knowledge_canonical._sync_to_pinecone",
        new=AsyncMock(),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/superadmin/knowledge/canonical/g1/verify")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert loaded.status == "active"
    assert loaded.last_verified_at > stale_date
