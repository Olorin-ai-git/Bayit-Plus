"""Nightly canonical staleness sweep. Idempotent — re-running is safe."""

from datetime import datetime, timedelta, timezone
from typing import AsyncIterator

from bson import ObjectId

from app.core.logging_config import get_logger
from app.models.canonical_memory import CanonicalMemory
from app.services.olorin.search.canonical_sync import upsert_canonical_vector
from app.services.olorin.search.client import client_manager

logger = get_logger(__name__)


async def _iter_active_canonicals() -> AsyncIterator[dict]:
    coll = CanonicalMemory.get_motor_collection()
    async for row in coll.find({"status": "active"}):
        yield row


async def _flip_to_stale(canonical_id: str) -> None:
    coll = CanonicalMemory.get_motor_collection()
    await coll.update_one(
        {"_id": ObjectId(canonical_id)},
        {"$set": {
            "status": "stale",
            "updated_at": datetime.now(timezone.utc),
        }},
    )


async def _resync_pinecone(row: dict) -> None:
    if not client_manager.is_initialized:
        await client_manager.initialize()
    idx = client_manager.pinecone_index
    if idx is None:
        return
    cm = CanonicalMemory.model_construct(
        partner_id=row.get("partner_id"),
        scope=row.get("scope", "partner"),
        question=row["question"],
        answer=row["answer"],
        citations=[],
        status="stale",
        stale_after_months=row.get("stale_after_months"),
        last_verified_at=row["last_verified_at"],
        created_by=row.get("created_by", "system"),
    )
    cm.id = row["_id"]
    await upsert_canonical_vector(idx, cm)


async def run_canonical_staleness_sweep() -> dict:
    """Scan active canonicals; flip those past `stale_after_months` to `stale`."""
    now = datetime.now(timezone.utc)
    flipped = 0
    async for row in _iter_active_canonicals():
        months = row.get("stale_after_months")
        if months is None:
            continue
        verified = row.get("last_verified_at")
        if verified is None:
            continue
        if verified.tzinfo is None:
            verified = verified.replace(tzinfo=timezone.utc)
        boundary = verified + timedelta(days=int(months) * 30)
        if now >= boundary:
            await _flip_to_stale(str(row["_id"]))
            await _resync_pinecone(row)
            flipped += 1
    logger.info("Canonical staleness sweep complete", extra={"flipped": flipped})
    return {"flipped": flipped}
