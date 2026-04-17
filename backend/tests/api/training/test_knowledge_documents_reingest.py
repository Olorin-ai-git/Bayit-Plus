"""POST /documents/{id}/reingest — re-run pipeline, mark citing canonicals pending_review."""

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
async def test_reingest_resets_status_and_enqueues():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    fake_doc = SimpleNamespace(
        id="d1", partner_id="p1", chunk_count=3,
        status="ready", error=None,
        chunks=[],
        save=AsyncMock(),
    )
    with patch(
        "app.api.routes.training.knowledge_documents._load_own_document",
        new=AsyncMock(return_value=fake_doc),
    ), patch(
        "app.api.routes.training.knowledge_documents.delete_document_vectors",
        new=AsyncMock(),
    ), patch(
        "app.api.routes.training.knowledge_documents._get_index",
        new=AsyncMock(return_value=SimpleNamespace()),
    ), patch(
        "app.api.routes.training.knowledge_documents._enqueue_ingest",
        new=AsyncMock(),
    ) as meq, patch(
        "app.api.routes.training.knowledge_documents._flag_citing_canonicals_pending",
        new=AsyncMock(),
    ) as mfc:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/documents/d1/reingest")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert fake_doc.status == "pending"
    meq.assert_awaited_once()
    mfc.assert_awaited_once()


@pytest.mark.asyncio
async def test_reingest_returns_404_for_unknown_doc():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    with patch(
        "app.api.routes.training.knowledge_documents._load_own_document",
        new=AsyncMock(return_value=None),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post("/api/v1/training/knowledge/documents/dX/reingest")
    app.dependency_overrides.clear()
    assert r.status_code == 404
