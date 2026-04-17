"""End-to-end ingestion: status transitions and error capture."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.training.document_orchestrator import ingest_document


def _doc(doc_id="d1", source_format="pdf"):
    d = SimpleNamespace(
        id=doc_id, partner_id="p1", scope="partner",
        source_format=source_format, title="T",
        gcs_path="training/documents/partner/p1/d1-x.pdf",
        source_url=None, status="pending",
        word_count=0, chunk_count=0, chunks=[],
        created_by="u", last_reindexed_at=None, error=None,
        save=AsyncMock(),
    )
    return d


@pytest.mark.asyncio
async def test_pdf_happy_path_sets_ready_and_chunks():
    d = _doc(source_format="pdf")
    with patch(
        "app.services.training.document_orchestrator._load_document_bytes",
        new=AsyncMock(return_value=b"pdf-bytes"),
    ), patch(
        "app.services.training.document_orchestrator.extract_pdf_pages",
        return_value=[(1, "word " * 100)],
    ), patch(
        "app.services.training.document_orchestrator.chunk_pdf_pages",
        return_value=[{"chunk_index": 0, "text": "t", "page_number": 1, "heading_path": []}],
    ), patch(
        "app.services.training.document_orchestrator.embed_and_upsert_chunks",
        new=AsyncMock(),
    ), patch(
        "app.services.training.document_orchestrator._get_index",
        new=AsyncMock(return_value=SimpleNamespace()),
    ):
        await ingest_document(d)
    assert d.status == "ready"
    assert d.chunk_count == 1
    assert d.error is None


@pytest.mark.asyncio
async def test_password_protected_pdf_sets_failed():
    from app.services.training.document_extraction import PasswordProtectedError
    d = _doc(source_format="pdf")
    with patch(
        "app.services.training.document_orchestrator._load_document_bytes",
        new=AsyncMock(return_value=b"x"),
    ), patch(
        "app.services.training.document_orchestrator.extract_pdf_pages",
        side_effect=PasswordProtectedError("encrypted"),
    ):
        await ingest_document(d)
    assert d.status == "failed"
    assert "password" in (d.error or "").lower()


@pytest.mark.asyncio
async def test_url_source_fetches_and_chunks():
    d = _doc(source_format="url")
    d.source_url = "https://example.com/page"
    d.gcs_path = None
    with patch(
        "app.services.training.document_orchestrator.fetch_url_content",
        new=AsyncMock(return_value={"text": "# H\n\ncontent", "title": "H", "source_url": "https://example.com/page"}),
    ), patch(
        "app.services.training.document_orchestrator.extract_markdown_sections",
        return_value=[{"heading_path": ["H"], "text": "content"}],
    ), patch(
        "app.services.training.document_orchestrator.chunk_markdown_sections",
        return_value=[{"chunk_index": 0, "text": "content", "page_number": None, "heading_path": ["H"]}],
    ), patch(
        "app.services.training.document_orchestrator.embed_and_upsert_chunks",
        new=AsyncMock(),
    ), patch(
        "app.services.training.document_orchestrator._get_index",
        new=AsyncMock(return_value=SimpleNamespace()),
    ):
        await ingest_document(d)
    assert d.status == "ready"
    assert d.chunk_count == 1


@pytest.mark.asyncio
async def test_unknown_source_format_sets_failed():
    d = _doc(source_format="docx")
    await ingest_document(d)
    assert d.status == "failed"
    assert "format" in (d.error or "").lower()
