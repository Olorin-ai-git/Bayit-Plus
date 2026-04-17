"""On Content delete, mark citations orphaned and flip fully-orphaned canonicals."""

from datetime import datetime, timezone
from typing import AsyncIterator

from bson import ObjectId

from app.core.logging_config import get_logger
from app.models.canonical_memory import CanonicalMemory

logger = get_logger(__name__)


async def _iter_citing(content_id: str) -> AsyncIterator[dict]:
    coll = CanonicalMemory.get_motor_collection()
    async for row in coll.find({
        "citations.content_id": content_id,
        "status": {"$ne": "retracted"},
    }):
        yield row


async def _update_canonical(
    *, canonical_id: str, citations: list[dict], new_status: str,
) -> None:
    coll = CanonicalMemory.get_motor_collection()
    await coll.update_one(
        {"_id": ObjectId(canonical_id)},
        {"$set": {
            "citations": citations,
            "status": new_status,
            "updated_at": datetime.now(timezone.utc),
        }},
    )


async def handle_content_deletion(content_id: str) -> dict:
    """Mark citations to deleted content as orphaned; flip fully-orphaned canonicals."""
    flipped = 0
    partial = 0
    async for row in _iter_citing(content_id):
        citations = row.get("citations") or []
        updated = []
        for c in citations:
            if c.get("type") == "video" and c.get("content_id") == content_id:
                updated.append({**c, "orphaned": True})
            else:
                updated.append(c)
        all_orphan = all(c.get("orphaned") for c in updated)
        new_status = "pending_review" if all_orphan else row.get("status", "active")
        await _update_canonical(
            canonical_id=str(row["_id"]),
            citations=updated,
            new_status=new_status,
        )
        if all_orphan:
            flipped += 1
        else:
            partial += 1
    logger.info("Content-delete orphan hook", extra={
        "content_id": content_id, "flipped_pending_review": flipped,
        "partial_orphaned": partial,
    })
    return {"flipped_pending_review": flipped, "partial_orphaned": partial}
