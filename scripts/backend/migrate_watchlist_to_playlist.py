"""
Migrate old watchlist and playlists collections to unified playlist_items.

Reads from the removed 'watchlist' and 'playlists' collections using raw motor
queries and writes individual documents into the new 'playlist_items' collection.

Usage:
    cd backend && poetry run python scripts/migrate_watchlist_to_playlist.py
"""

import asyncio
import sys
from datetime import datetime
from typing import Optional

sys.path.insert(0, str(__file__).rsplit("/", 2)[0])

from app.core.logging_config import get_logger
from app.models.playlist import ContentType
from olorin_shared.database import close_mongodb_connection, get_mongodb_database, init_mongodb

logger = get_logger(__name__)

CONTENT_TYPE_MAP = {
    "vod": ContentType.VOD,
    "live": ContentType.LIVE,
    "radio": ContentType.RADIO,
    "podcast": ContentType.PODCAST,
}


def _resolve_content_type(raw_value: Optional[str]) -> ContentType:
    """Map a raw content_type string to the ContentType enum, defaulting to VOD."""
    if not raw_value:
        return ContentType.VOD
    return CONTENT_TYPE_MAP.get(raw_value.strip().lower(), ContentType.VOD)


async def _init_beanie_for_metadata() -> None:
    """Initialize Beanie once so get_content_metadata can query content models."""
    from beanie import init_beanie
    from app.models.content import Content, LiveChannel, Podcast, RadioStation

    await init_beanie(
        database=get_mongodb_database(),
        document_models=[Content, LiveChannel, Podcast, RadioStation],
        skip_indexes=True,
    )


async def _lookup_metadata(content_id: str, content_type: ContentType) -> dict:
    """Fetch title/thumbnail/duration via the playlist helpers."""
    from app.api.routes.playlist_helpers import get_content_metadata
    return await get_content_metadata(content_id, content_type) or {}


async def _exists(col, user_id: str, content_id: str) -> bool:
    """Check if a playlist_items doc already exists for this user + content."""
    return await col.find_one({"user_id": user_id, "content_id": content_id}) is not None


async def _migrate_watchlist(db, playlist_col, stats: dict) -> None:
    """Phase 1: migrate docs from the old 'watchlist' collection."""
    watchlist_col = db["watchlist"]
    count = await watchlist_col.count_documents({})
    logger.info("Watchlist phase started", extra={"total_docs": count})
    if count == 0:
        return

    position_map: dict[tuple[str, Optional[str]], int] = {}
    async for doc in watchlist_col.find({}):
        stats["watchlist_processed"] += 1
        user_id = doc.get("user_id")
        content_id = doc.get("content_id")
        if not user_id or not content_id:
            stats["skipped"] += 1
            continue
        if await _exists(playlist_col, user_id, content_id):
            stats["skipped"] += 1
            continue

        profile_id = doc.get("profile_id")
        content_type = _resolve_content_type(doc.get("content_type"))
        meta = await _lookup_metadata(content_id, content_type)

        pos_key = (user_id, profile_id)
        pos = position_map.get(pos_key, 0)
        position_map[pos_key] = pos + 1

        await playlist_col.insert_one({
            "user_id": user_id,
            "profile_id": profile_id,
            "content_id": content_id,
            "content_type": content_type.value,
            "title": meta.get("title", content_id),
            "thumbnail": meta.get("thumbnail"),
            "duration": meta.get("duration"),
            "position": pos,
            "added_at": doc.get("added_at", datetime.utcnow()),
        })
        stats["migrated"] += 1

    logger.info("Watchlist phase complete", extra={
        "processed": stats["watchlist_processed"],
        "migrated_so_far": stats["migrated"],
    })


async def _migrate_playlists(db, playlist_col, stats: dict) -> None:
    """Phase 2: migrate embedded items from the old 'playlists' collection."""
    old_col = db["playlists"]
    count = await old_col.count_documents({})
    logger.info("Playlists phase started", extra={"total_docs": count})
    if count == 0:
        return

    async for doc in old_col.find({}):
        stats["playlists_processed"] += 1
        user_id = doc.get("user_id")
        if not user_id:
            continue

        fallback_added_at = doc.get("created_at", datetime.utcnow())
        for item in doc.get("items", []):
            content_id = item.get("content_id")
            if not content_id:
                stats["skipped"] += 1
                continue
            if await _exists(playlist_col, user_id, content_id):
                stats["skipped"] += 1
                continue

            await playlist_col.insert_one({
                "user_id": user_id,
                "profile_id": None,
                "content_id": content_id,
                "content_type": _resolve_content_type(item.get("content_type")).value,
                "title": item.get("title", content_id),
                "thumbnail": item.get("thumbnail"),
                "duration": item.get("duration"),
                "position": item.get("position", 0),
                "added_at": fallback_added_at,
            })
            stats["migrated"] += 1

    logger.info("Playlists phase complete", extra={
        "processed": stats["playlists_processed"],
        "migrated_so_far": stats["migrated"],
    })


async def main() -> None:
    """Run both migration phases and report results."""
    await init_mongodb()
    await _init_beanie_for_metadata()

    db = get_mongodb_database()
    playlist_col = db["playlist_items"]
    stats = {"watchlist_processed": 0, "playlists_processed": 0, "migrated": 0, "skipped": 0}

    logger.info("Starting watchlist/playlist migration to playlist_items")
    await _migrate_watchlist(db, playlist_col, stats)
    await _migrate_playlists(db, playlist_col, stats)

    logger.info("Migration complete", extra={
        "watchlist_docs_processed": stats["watchlist_processed"],
        "playlist_docs_processed": stats["playlists_processed"],
        "total_items_migrated": stats["migrated"],
        "total_items_skipped": stats["skipped"],
    })
    await close_mongodb_connection()


if __name__ == "__main__":
    asyncio.run(main())
