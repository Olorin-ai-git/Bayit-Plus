"""
Create the audiobook compound index on the Content collection.

Beanie skip_indexes=True means model indexes are not auto-created.
This script creates the audiobook_list_query_idx on Atlas.

Run with: poetry run python -m app.scripts.create_audiobook_index
"""

import asyncio
import logging

import pymongo
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure

from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_audiobook_index():
    """Create the audiobook compound index on the content collection."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    collection = db["content"]

    try:
        await client.admin.command("ping")
        logger.info("Connected to MongoDB")

        index_name = "audiobook_list_query_idx"

        existing = await collection.list_indexes().to_list(None)
        for idx in existing:
            if idx["name"] == index_name:
                logger.info("Index %s already exists, dropping to recreate", index_name)
                await collection.drop_index(index_name)
                break

        await collection.create_index(
            [
                ("content_format", pymongo.ASCENDING),
                ("is_published", pymongo.ASCENDING),
                ("series_id", pymongo.ASCENDING),
                ("is_featured", pymongo.DESCENDING),
                ("featured_order.audiobooks", pymongo.DESCENDING),
                ("created_at", pymongo.DESCENDING),
            ],
            name=index_name,
        )
        logger.info("Created index: %s", index_name)

        indexes = await collection.list_indexes().to_list(None)
        for idx in indexes:
            if idx["name"] == index_name:
                logger.info("Verified: %s -> %s", idx["name"], idx.get("key", {}))
                break

    except OperationFailure as e:
        logger.error("Index creation failed: %s", e)
        raise
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(create_audiobook_index())
