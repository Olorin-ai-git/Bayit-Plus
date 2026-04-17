"""Canonical vector sync: upsert by deterministic id, delete, status mirror."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.models.canonical_memory import CanonicalMemory, Citation
from app.services.olorin.search.canonical_sync import (
    delete_canonical_vector,
    upsert_canonical_vector,
)


def _cm(cid="c1", partner_id="p1", scope="partner", status="active"):
    cm = CanonicalMemory.model_construct(
        partner_id=partner_id if scope == "partner" else None,
        scope=scope,
        question="Q?",
        answer="A.",
        citations=[Citation(type="video", content_id="v1")],
        status=status,
        created_by="u1",
    )
    cm.id = cid
    return cm


@pytest.mark.asyncio
async def test_upsert_uses_deterministic_vector_id():
    cm = _cm(cid="abc123")
    fake_index = SimpleNamespace()
    with patch(
        "app.services.olorin.search.canonical_sync.generate_embedding",
        new=AsyncMock(return_value=[0.1] * 3),
    ), patch(
        "app.services.olorin.search.canonical_sync.safe_pinecone_upsert",
        new=AsyncMock(return_value={"upserted_count": 1}),
    ) as mup:
        await upsert_canonical_vector(fake_index, cm)
    vectors = mup.call_args.args[1]
    assert vectors[0]["id"] == "canonical:abc123"


@pytest.mark.asyncio
async def test_upsert_embeds_question_text():
    cm = _cm()
    cm.question = "How do I reset my 401k?"
    with patch(
        "app.services.olorin.search.canonical_sync.generate_embedding",
        new=AsyncMock(return_value=[0.9] * 3),
    ) as memb, patch(
        "app.services.olorin.search.canonical_sync.safe_pinecone_upsert",
        new=AsyncMock(return_value={"upserted_count": 1}),
    ):
        await upsert_canonical_vector(SimpleNamespace(), cm)
    memb.assert_awaited_once_with("How do I reset my 401k?")


@pytest.mark.asyncio
async def test_upsert_metadata_carries_scope_and_status():
    cm = _cm(cid="abc", partner_id="p99", scope="partner", status="stale")
    with patch(
        "app.services.olorin.search.canonical_sync.generate_embedding",
        new=AsyncMock(return_value=[0.1] * 3),
    ), patch(
        "app.services.olorin.search.canonical_sync.safe_pinecone_upsert",
        new=AsyncMock(return_value={"upserted_count": 1}),
    ) as mup:
        await upsert_canonical_vector(SimpleNamespace(), cm)
    meta = mup.call_args.args[1][0]["metadata"]
    assert meta["scope"] == "partner:p99"
    assert meta["source_type"] == "canonical_qa"
    assert meta["canonical_id"] == "abc"
    assert meta["canonical_status"] == "stale"


@pytest.mark.asyncio
async def test_global_scope_emits_global_literal():
    cm = _cm(cid="g1", partner_id=None, scope="global")
    with patch(
        "app.services.olorin.search.canonical_sync.generate_embedding",
        new=AsyncMock(return_value=[0.1] * 3),
    ), patch(
        "app.services.olorin.search.canonical_sync.safe_pinecone_upsert",
        new=AsyncMock(return_value={"upserted_count": 1}),
    ) as mup:
        await upsert_canonical_vector(SimpleNamespace(), cm)
    meta = mup.call_args.args[1][0]["metadata"]
    assert meta["scope"] == "global"


@pytest.mark.asyncio
async def test_delete_removes_by_deterministic_id():
    fake_index = SimpleNamespace(delete=lambda ids=None: {"deleted": len(ids)})
    with patch(
        "app.services.olorin.search.canonical_sync.asyncio.to_thread",
        new=AsyncMock(return_value={"deleted": 1}),
    ) as mth:
        await delete_canonical_vector(fake_index, "xyz")
    assert mth.await_count == 1
    assert mth.call_args.kwargs["ids"] == ["canonical:xyz"]
