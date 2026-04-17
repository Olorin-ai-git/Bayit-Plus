"""Per-chunk embedding + Pinecone upsert/delete with deterministic ids `doc:<id>:<idx>`."""

import asyncio

from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.pinecone_ops import safe_pinecone_upsert


def _vector_id(document_id: str, chunk_index: int) -> str:
    return f"doc:{document_id}:{chunk_index}"


def _scope_literal(partner_id: str | None, scope: str) -> str:
    if scope == "global":
        return "global"
    return f"partner:{partner_id}"


async def embed_and_upsert_chunks(
    *, index, document_id: str, partner_id: str | None, scope: str,
    title: str, chunks: list[dict],
) -> None:
    vectors = []
    for chunk in chunks:
        vec = await generate_embedding(chunk["text"])
        if not vec:
            raise RuntimeError(f"Embedding failed for doc {document_id} chunk {chunk['chunk_index']}")
        metadata = {
            "scope": _scope_literal(partner_id, scope),
            "source_type": "document_chunk",
            "document_id": document_id,
            "chunk_index": chunk["chunk_index"],
            "page_number": chunk.get("page_number"),
            "heading_path": chunk.get("heading_path") or [],
            "title": title,
            "text": chunk["text"],
            "partner_id": partner_id or "",
        }
        vectors.append({
            "id": _vector_id(document_id, chunk["chunk_index"]),
            "values": vec,
            "metadata": metadata,
        })
    if vectors:
        await safe_pinecone_upsert(index, vectors)


def _delete_sync(index, *, ids: list) -> dict:
    return index.delete(ids=ids)


async def delete_document_vectors(index, *, document_id: str, chunk_count: int) -> None:
    ids = [_vector_id(document_id, i) for i in range(chunk_count)]
    if not ids:
        return
    await asyncio.to_thread(_delete_sync, index, ids=ids)
