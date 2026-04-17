"""Super-admin document ingestion — scope=global, partner_id=None."""

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
async def test_paste_creates_global_doc_and_enqueues_ingest():
    app.dependency_overrides[require_superadmin] = lambda: _super()

    captured_kwargs = {}

    async def _fake_create(**kwargs):
        captured_kwargs.update(kwargs)
        ns = SimpleNamespace(id="gDoc1", status="pending")
        ns.save = AsyncMock()
        return ns

    with patch(
        "app.api.routes.training.superadmin_knowledge_documents._create_global_document",
        new=AsyncMock(side_effect=_fake_create),
    ), patch(
        "app.api.routes.training.superadmin_knowledge_documents.upload_document_bytes",
        new=AsyncMock(),
    ), patch(
        "app.api.routes.training.superadmin_knowledge_documents._enqueue_ingest",
        new=AsyncMock(),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post(
                "/api/v1/training/superadmin/knowledge/documents/paste",
                json={"title": "Training Standards", "text": "# Overview\n\ncontent"},
            )

    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert r.json()["document_id"] == "gDoc1"
    assert captured_kwargs.get("partner_id") is None
    assert captured_kwargs.get("scope") == "global"


@pytest.mark.asyncio
async def test_url_ingest_as_global():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    with patch(
        "app.api.routes.training.superadmin_knowledge_documents._create_global_document",
        new=AsyncMock(return_value=SimpleNamespace(id="gDoc2", status="pending")),
    ), patch(
        "app.api.routes.training.superadmin_knowledge_documents._enqueue_ingest",
        new=AsyncMock(),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post(
                "/api/v1/training/superadmin/knowledge/documents/url",
                json={"url": "https://public-source.example/article"},
            )
    app.dependency_overrides.clear()
    assert r.status_code == 200
    assert r.json()["document_id"] == "gDoc2"


@pytest.mark.asyncio
async def test_list_returns_only_global_docs():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    rows = [
        {"_id": "gDoc1", "partner_id": None, "scope": "global",
         "title": "T1", "source_format": "pdf", "status": "ready",
         "word_count": 100, "chunk_count": 4,
         "created_at": datetime.now(timezone.utc),
         "source_url": None, "last_reindexed_at": None, "error": None},
    ]
    with patch(
        "app.api.routes.training.superadmin_knowledge_documents._fetch_global_documents",
        new=AsyncMock(return_value=(rows, 1)),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.get("/api/v1/training/superadmin/knowledge/documents")
    app.dependency_overrides.clear()
    body = r.json()
    assert body["total"] == 1
    assert body["items"][0]["id"] == "gDoc1"


@pytest.mark.asyncio
async def test_delete_returns_404_for_partner_scope_doc():
    app.dependency_overrides[require_superadmin] = lambda: _super()
    with patch(
        "app.api.routes.training.superadmin_knowledge_documents._load_global_document",
        new=AsyncMock(return_value=None),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.delete("/api/v1/training/superadmin/knowledge/documents/someDocId")
    app.dependency_overrides.clear()
    assert r.status_code == 404
