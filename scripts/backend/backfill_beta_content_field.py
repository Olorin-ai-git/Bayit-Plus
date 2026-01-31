"""
Backfill is_beta_content Field on All Content Collections

Adds is_beta_content: false to all existing documents in:
- content (VOD)
- live_channels
- radio_stations
- podcasts

Also adds is_beta_user: false to all users that lack the field.

This must be run BEFORE adding sparse indexes so the field
exists on every document and queries use simple equality.
"""

import asyncio
import logging

from app.core.config import settings
from app.models.content import Content, LiveChannel, Podcast, RadioStation
from app.models.user import User
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def backfill():
    """Backfill is_beta_content on all content collections and is_beta_user on users."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=db,
        document_models=[Content, LiveChannel, RadioStation, Podcast, User],
    )

    collections = [
        ("content", "is_beta_content"),
        ("live_channels", "is_beta_content"),
        ("radio_stations", "is_beta_content"),
        ("podcasts", "is_beta_content"),
        ("users", "is_beta_user"),
    ]

    for collection_name, field_name in collections:
        collection = db[collection_name]
        result = await collection.update_many(
            {field_name: {"$exists": False}},
            {"$set": {field_name: False}},
        )
        logger.info(
            "Backfilled %s.%s: %d documents updated",
            collection_name,
            field_name,
            result.modified_count,
        )

    logger.info("Backfill complete")
    client.close()


if __name__ == "__main__":
    asyncio.run(backfill())
