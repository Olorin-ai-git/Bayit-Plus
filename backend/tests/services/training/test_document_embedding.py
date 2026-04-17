"""Per-chunk embedding + Pinecone upsert with deterministic ids."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

import pytest

from app.services.training.document_embedding import (
    delete_document_vectors,
    embed_and_upsert_chunks,
)


@pytest.mark.asyncio
async def test_upserts_one_vector_per_chunk_with_deterministic_id():
    chunks = [
        {"chunk_index": 0, "text": "alpha", "page_number": 1, "heading_path": []},
        {"chunk_index": 1, "text": "beta", "page_number": 1, "heading_path": []},
    ]
    with patch(
        "app.services.training.document_embedding.generate_embedding",
        new=AsyncMock(side_effect=[[0.1], [0.2]]),
    ), patch(
        "app.services.training.document_embedding.safe_pinecone_upsert",
        new=AsyncMock(return_value={"upserted_count": 2}),
    ) as mup:
        await embed_and_upsert_chunks(
            index=SimpleNamespace(),
            document_id="doc99",
            partner_id="p1",
            scope="partner",
            title="Handbook",
            chunks=chunks,
        )
    vectors = mup.call_args.args[1]
    assert len(vectors) == 2
    assert vectors[0]["id"] == "doc:doc99:0"
    assert vectors[1]["id"] == "doc:doc99:1"


@pytest.mark.asyncio
async def test_metadata_carries_scope_and_source_type():
    chunks = [{"chunk_index": 0, "text": "t", "page_number": 5, "heading_path": ["A"]}]
    with patch(
        "app.services.training.document_embedding.generate_embedding",
        new=AsyncMock(return_value=[0.1]),
    ), patch(
        "app.services.training.document_embedding.safe_pinecone_upsert",
        new=AsyncMock(return_value={"upserted_count": 1}),
    ) as mup:
        await embed_and_upsert_chunks(
            index=SimpleNamespace(), document_id="d",
            partner_id="p42", scope="partner",
            title="T", chunks=chunks,
        )
    meta = mup.call_args.args[1][0]["metadata"]
    assert meta["scope"] == "partner:p42"
    assert meta["source_type"] == "document_chunk"
    assert meta["document_id"] == "d"
    assert meta["chunk_index"] == 0
    assert meta["page_number"] == 5
    assert meta["title"] == "T"


@pytest.mark.asyncio
async def test_global_scope_emits_global_literal():
    chunks = [{"chunk_index": 0, "text": "t", "page_number": None, "heading_path": []}]
    with patch(
        "app.services.training.document_embedding.generate_embedding",
        new=AsyncMock(return_value=[0.1]),
    ), patch(
        "app.services.training.document_embedding.safe_pinecone_upsert",
        new=AsyncMock(return_value={"upserted_count": 1}),
    ) as mup:
        await embed_and_upsert_chunks(
            index=SimpleNamespace(), document_id="d",
            partner_id=None, scope="global",
            title="T", chunks=chunks,
        )
    assert mup.call_args.args[1][0]["metadata"]["scope"] == "global"


@pytest.mark.asyncio
async def test_delete_removes_all_chunk_vectors():
    fake_index = SimpleNamespace()
    with patch(
        "app.services.training.document_embedding.asyncio.to_thread",
        new=AsyncMock(return_value={"deleted": 3}),
    ) as mth:
        await delete_document_vectors(fake_index, document_id="dX", chunk_count=3)
    called_ids = mth.call_args.kwargs["ids"]
    assert called_ids == ["doc:dX:0", "doc:dX:1", "doc:dX:2"]
