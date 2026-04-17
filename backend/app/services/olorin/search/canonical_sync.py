"""Upsert/delete canonical_qa vectors with deterministic ids mirroring Mongo state."""

import asyncio

from app.models.canonical_memory import CanonicalMemory
from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.pinecone_ops import safe_pinecone_upsert


def _vector_id(canonical_id: str) -> str:
    return f"canonical:{canonical_id}"


def _scope_literal(cm: CanonicalMemory) -> str:
    if cm.scope == "global":
        return "global"
    return f"partner:{cm.partner_id}"


async def upsert_canonical_vector(index, cm: CanonicalMemory) -> None:
    """Embed canonical question and upsert into Pinecone. Idempotent."""
    vec = await generate_embedding(cm.question)
    if not vec:
        raise RuntimeError("Embedding failed for canonical question")
    metadata = {
        "scope": _scope_literal(cm),
        "source_type": "canonical_qa",
        "canonical_id": str(cm.id),
        "canonical_status": cm.status,
        "question": cm.question,
        "answer": cm.answer,
        "text": cm.question,
        "partner_id": cm.partner_id or "",
    }
    await safe_pinecone_upsert(
        index,
        [{"id": _vector_id(str(cm.id)), "values": vec, "metadata": metadata}],
    )


async def delete_canonical_vector(index, canonical_id: str) -> None:
    """Hard-delete the Pinecone vector for a canonical."""
    await asyncio.to_thread(index.delete, ids=[_vector_id(canonical_id)])


async def sync_canonical_status(index, cm: CanonicalMemory) -> None:
    """Mirror a status-only change into Pinecone metadata (re-upsert)."""
    await upsert_canonical_vector(index, cm)
