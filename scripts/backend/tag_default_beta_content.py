"""
Tag Default Beta Content

Sets is_beta_content: true on:
1. YouTube VOD content (stream_url matches youtube.com or youtu.be)
2. All podcasts
3. Kan11 live channel (name = "כאן 11")

Pattern follows backfill_beta_content_field.py structure.
This script uses raw MongoDB operations (no Beanie ODM) for efficiency.
"""

import asyncio
import logging

from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

YOUTUBE_URL_REGEX = r"youtube\.com|youtu\.be"
KAN11_CHANNEL_NAME = "כאן 11"


async def tag_beta_content():
    """Tag YouTube content, all podcasts, and Kan11 as beta content."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    # 1. YouTube VOD content
    youtube_result = await db["content"].update_many(
        {"stream_url": {"$regex": YOUTUBE_URL_REGEX, "$options": "i"}},
        {"$set": {"is_beta_content": True}},
    )
    logger.info(
        "Tagged YouTube content as beta: %d documents updated",
        youtube_result.modified_count,
    )

    # 2. All podcasts
    podcasts_result = await db["podcasts"].update_many(
        {},
        {"$set": {"is_beta_content": True}},
    )
    logger.info(
        "Tagged all podcasts as beta: %d documents updated",
        podcasts_result.modified_count,
    )

    # 3. Kan11 live channel
    kan11_result = await db["live_channels"].update_many(
        {"name": KAN11_CHANNEL_NAME},
        {"$set": {"is_beta_content": True}},
    )
    logger.info(
        "Tagged Kan11 live channel as beta: %d documents updated",
        kan11_result.modified_count,
    )

    total = (
        youtube_result.modified_count
        + podcasts_result.modified_count
        + kan11_result.modified_count
    )
    logger.info("Beta content tagging complete. Total documents updated: %d", total)
    client.close()


if __name__ == "__main__":
    asyncio.run(tag_beta_content())
