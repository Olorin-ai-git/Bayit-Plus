"""Sync state tracking for documentary content sources."""

import logging
from datetime import datetime
from typing import Any, Dict, Optional

from beanie import Document
from pydantic import Field
from pymongo import IndexModel

logger = logging.getLogger(__name__)


class DocSyncState(Document):
    """Tracks sync state for each documentary content source."""

    source: str
    last_sync_at: Optional[datetime] = None
    last_item_date: Optional[datetime] = None
    items_synced_total: int = 0
    last_sync_result: Optional[Dict[str, Any]] = None

    class Settings:
        name = "doc_sync_state"
        indexes = [
            IndexModel([("source", 1)], unique=True, name="source_unique"),
        ]


async def get_sync_state(source: str) -> DocSyncState:
    """Get or create sync state for a source."""
    state = await DocSyncState.find_one(DocSyncState.source == source)
    if state is None:
        state = DocSyncState(source=source)
        await state.insert()
    return state


async def update_sync_state(
    source: str,
    items_synced: int,
    last_item_date: Optional[datetime] = None,
    sync_result: Optional[Dict[str, Any]] = None,
) -> DocSyncState:
    """Update sync state after an import run."""
    state = await get_sync_state(source)
    state.last_sync_at = datetime.utcnow()
    state.items_synced_total += items_synced
    if last_item_date:
        state.last_item_date = last_item_date
    if sync_result:
        state.last_sync_result = sync_result
    await state.save()
    logger.info(
        "Updated sync state",
        extra={
            "source": source,
            "items_synced": items_synced,
            "total": state.items_synced_total,
        },
    )
    return state
