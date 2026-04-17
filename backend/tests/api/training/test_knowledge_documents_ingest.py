"""Document ingestion endpoints: upload / paste / url."""

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
async def test_paste_creates_document_and_enqueues_ingest():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    fake_doc = SimpleNamespace(id="doc1", status="pending", gcs_path=None, save=AsyncMock())
    with patch(
        "app.api.routes.training.knowledge_documents._get_tier",
        new=AsyncMock(return_value="organization"),
    ), patch(
        "app.api.routes.training.knowledge_documents.check_per_file_size",
    ), patch(
        "app.api.routes.training.knowledge_documents.check_total_storage",
        new=AsyncMock(),
    ), patch(
        "app.api.routes.training.knowledge_documents.upload_document_bytes",
        new=AsyncMock(),
    ), patch(
        "app.api.routes.training.knowledge_documents._create_document",
        new=AsyncMock(return_value=fake_doc),
    ) as mc, patch(
        "app.api.routes.training.knowledge_documents._enqueue_ingest",
        new=AsyncMock(),
    ) as meq:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post(
                "/api/v1/training/knowledge/documents/paste",
                json={"title": "Note", "text": "# Heading\n\nsome content here"},
            )
    app.dependency_overrides.clear()
    assert r.status_code == 200
    body = r.json()
    assert body["document_id"] == "doc1"
    assert body["status"] == "pending"
    mc.assert_awaited_once()
    meq.assert_awaited_once()


@pytest.mark.asyncio
async def test_url_checks_rate_limit_before_creating():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    from app.services.training.document_quota import QuotaExceededError

    with patch(
        "app.api.routes.training.knowledge_documents._get_tier",
        new=AsyncMock(return_value="organization"),
    ), patch(
        "app.api.routes.training.knowledge_documents.check_url_rate",
        new=AsyncMock(side_effect=QuotaExceededError("rate")),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post(
                "/api/v1/training/knowledge/documents/url",
                json={"url": "https://example.com/a"},
            )
    app.dependency_overrides.clear()
    assert r.status_code == 429


@pytest.mark.asyncio
async def test_upload_rejects_non_pdf_mime():
    app.dependency_overrides[require_training_admin] = lambda: _admin()

    files = {"file": ("x.jpg", b"binary", "image/jpeg")}
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
        r = await c.post(
            "/api/v1/training/knowledge/documents/upload",
            files=files, data={"title": "x"},
        )
    app.dependency_overrides.clear()
    assert r.status_code == 415


@pytest.mark.asyncio
async def test_team_tier_blocked_from_paste():
    app.dependency_overrides[require_training_admin] = lambda: _admin()
    from app.services.training.document_quota import QuotaExceededError

    with patch(
        "app.api.routes.training.knowledge_documents._get_tier",
        new=AsyncMock(return_value="team"),
    ), patch(
        "app.api.routes.training.knowledge_documents.check_per_file_size",
        side_effect=QuotaExceededError("team tier cannot upload"),
    ):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://t") as c:
            r = await c.post(
                "/api/v1/training/knowledge/documents/paste",
                json={"title": "Note", "text": "hello world"},
            )
    app.dependency_overrides.clear()
    assert r.status_code == 403
