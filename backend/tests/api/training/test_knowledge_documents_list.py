"""GET /documents list + DELETE /documents/{id}."""

from datetime import datetime, timezone
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
async def test_list_returns_partner_docs_sorted_desc():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    rows = [
        {"_id": "d2", "partner_id": "p1", "title": "T2",
         "source_format": "pdf", "status": "ready", "word_count": 100,
         "chunk_count": 3, "created_at": datetime.now(timezone.utc),
         "last_reindexed_at": None, "error": None, "source_url": None},
        {"_id": "d1", "partner_id": "p1", "title": "T1",
         "source_format": "url", "status": "pending", "word_count": 0,
         "chunk_count": 0, "created_at": datetime.now(timezone.utc),
         "last_reindexed_at": None, "error": None,
         "source_url": "https://example.com/a"},
    ]
    with patch(
        "app.api.routes.training.knowledge_documents._fetch_documents",
        new=AsyncMock(return_value=(rows, 2)),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.get("/api/v1/training/knowledge/documents")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 2
    assert len(body["items"]) == 2


@pytest.mark.asyncio
async def test_delete_removes_doc_and_vectors_and_blob():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    fake_doc = SimpleNamespace(
        id="d1", partner_id="p1", chunk_count=3,
        gcs_path="training/documents/partner/p1/d1-x.pdf",
        delete=AsyncMock(),
    )
    with patch(
        "app.api.routes.training.knowledge_documents._load_own_document",
        new=AsyncMock(return_value=fake_doc),
    ), patch(
        "app.api.routes.training.knowledge_documents.delete_document_vectors",
        new=AsyncMock(),
    ) as mdv, patch(
        "app.api.routes.training.knowledge_documents._get_index",
        new=AsyncMock(return_value=SimpleNamespace()),
    ), patch(
        "app.api.routes.training.knowledge_documents.delete_document_blob",
        new=AsyncMock(),
    ) as mdb:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.delete("/api/v1/training/knowledge/documents/d1")
    app.dependency_overrides.clear()
    assert r.status_code == 200
    mdv.assert_awaited_once()
    mdb.assert_awaited_once()


@pytest.mark.asyncio
async def test_delete_returns_404_for_cross_partner_doc():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    with patch(
        "app.api.routes.training.knowledge_documents._load_own_document",
        new=AsyncMock(return_value=None),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.delete("/api/v1/training/knowledge/documents/dX")
    app.dependency_overrides.clear()
    assert r.status_code == 404
