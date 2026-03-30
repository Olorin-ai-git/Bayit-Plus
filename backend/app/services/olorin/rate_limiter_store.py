"""
MongoDB-backed storage for rate limit counters.

Documents are keyed by time buckets with TTL indexes for auto-expiry.
Collection: rate_limit_counters
"""

import logging
import time
from datetime import datetime, timedelta, timezone

logger = logging.getLogger(__name__)

COLLECTION_NAME = "rate_limit_counters"

_indexes_created = False


def _get_collection():
    """Get the rate_limit_counters Motor collection."""
    from olorin_shared.database import get_mongodb_database

    db = get_mongodb_database()
    return db[COLLECTION_NAME]


async def ensure_indexes() -> None:
    """Create TTL and unique indexes if not already present."""
    global _indexes_created
    if _indexes_created:
        return
    try:
        coll = _get_collection()
        await coll.create_index("expires_at", expireAfterSeconds=0)
        await coll.create_index("key", unique=True)
        _indexes_created = True
    except Exception:
        logger.warning("Failed to ensure rate_limit_counters indexes")


def _bucket_key(
    partner_id: str,
    capability: str,
    window_type: str,
    window_seconds: int,
) -> str:
    """Build the unique document key for a time bucket."""
    bucket = int(time.time() // window_seconds)
    return f"{partner_id}:{capability}:{window_type}:{bucket}"


def _bucket_expiry(window_seconds: int) -> datetime:
    """Calculate expiry timestamp for a bucket document."""
    return datetime.now(timezone.utc) + timedelta(seconds=window_seconds * 2)


async def increment(
    partner_id: str,
    capability: str,
    window_type: str,
    window_seconds: int,
) -> None:
    """Atomically increment a rate limit counter in MongoDB."""
    coll = _get_collection()
    key = _bucket_key(partner_id, capability, window_type, window_seconds)
    await coll.find_one_and_update(
        {"key": key},
        {
            "$inc": {"count": 1},
            "$setOnInsert": {
                "key": key,
                "partner_id": partner_id,
                "capability": capability,
                "window_type": window_type,
                "expires_at": _bucket_expiry(window_seconds),
            },
        },
        upsert=True,
    )


async def get_count(
    partner_id: str,
    capability: str,
    window_type: str,
    window_seconds: int,
) -> int:
    """Get the current count using weighted sliding window.

    Sums the current bucket and the previous bucket weighted by
    how much of the previous window still overlaps.
    """
    coll = _get_collection()
    now = time.time()
    current_bucket = int(now // window_seconds)
    prev_bucket = current_bucket - 1

    current_key = f"{partner_id}:{capability}:{window_type}:{current_bucket}"
    prev_key = f"{partner_id}:{capability}:{window_type}:{prev_bucket}"

    docs = await coll.find(
        {"key": {"$in": [current_key, prev_key]}}
    ).to_list(length=2)

    current_count = 0
    prev_count = 0
    for doc in docs:
        if doc["key"] == current_key:
            current_count = doc.get("count", 0)
        elif doc["key"] == prev_key:
            prev_count = doc.get("count", 0)

    elapsed_in_bucket = now - (current_bucket * window_seconds)
    weight = 1.0 - (elapsed_in_bucket / window_seconds)

    return current_count + int(prev_count * weight)
