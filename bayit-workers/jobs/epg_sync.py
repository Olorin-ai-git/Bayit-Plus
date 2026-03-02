"""
Cloud Run Job: YouTube EPG schedule sync.

Run-once job triggered by Cloud Scheduler. Syncs EPG schedules for all
active YouTube playlist channels so users see synchronized playback.

Usage: python -m jobs.epg_sync
"""

import asyncio
import logging

from app.core.database import close_mongo_connection, connect_to_mongo_subset
from app.core.logging_config import setup_logging
from app.models.content import Content, EPGEntry, LiveChannel

setup_logging()
logger = logging.getLogger(__name__)

JOB_MODELS = [Content, LiveChannel, EPGEntry]


async def run() -> None:
    """Sync EPG for all active YouTube playlist channels."""
    await connect_to_mongo_subset(document_models=JOB_MODELS)
    try:
        from app.services.youtube_epg_sync_service import youtube_epg_sync_service

        channels = await LiveChannel.find(
            {"stream_type": "youtube-playlist", "is_active": True}
        ).to_list()

        logger.info("Syncing EPG for %d YouTube playlist channel(s)", len(channels))

        for channel in channels:
            try:
                result = await youtube_epg_sync_service.sync_channel_epg(str(channel.id))
                logger.info(
                    "EPG sync for %s: %d entries, current: %s",
                    channel.name,
                    result.get("epg_entries_created", 0),
                    result.get("current_program", "N/A"),
                )
            except Exception as e:
                logger.error("EPG sync failed for %s: %s", channel.name, e)
    finally:
        await close_mongo_connection()


if __name__ == "__main__":
    asyncio.run(run())
