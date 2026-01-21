"""
Bulk download and store thumbnails for all content items
This script downloads images from URLs and stores them as base64 in MongoDB
"""
import asyncio
import os
import sys

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import logging

from app.models.content import Content
from app.services.image_storage import download_and_encode_image
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def bulk_download_thumbnails():
    """Download and store thumbnails for all content"""

    # Get MongoDB URI from environment
    mongodb_uri = os.getenv("MONGODB_URI") or os.getenv(
        "MONGODB_URL", "mongodb://localhost:27017"
    )
    mongodb_db = os.getenv("MONGODB_DB") or os.getenv("MONGODB_DB_NAME", "bayit_plus")

    logger.info(f"Connecting to MongoDB: {mongodb_db}")

    # Connect to MongoDB
    client = AsyncIOMotorClient(mongodb_uri)
    await init_beanie(database=client[mongodb_db], document_models=[Content])

    # Find all content with thumbnail URLs but no thumbnail_data
    items = await Content.find(
        {
            "$or": [
                {"thumbnail": {"$ne": None, "$exists": True}},
                {"poster_url": {"$ne": None, "$exists": True}},
            ]
        }
    ).to_list()

    logger.info(f"\n📊 Found {len(items)} content items with image URLs\n")

    processed = 0
    downloaded = 0
    skipped = 0
    failed = 0

    for item in items:
        processed += 1
        logger.info(f"[{processed}/{len(items)}] Processing: {item.title}")

        # Skip if already has thumbnail_data
        if item.thumbnail_data:
            logger.info(f"  ⏭️  Already has stored thumbnail data, skipping")
            skipped += 1
            continue

        # Get thumbnail URL (prefer thumbnail over poster_url)
        thumbnail_url = item.thumbnail or item.poster_url

        if not thumbnail_url:
            logger.info(f"  ⚠️  No thumbnail URL available")
            skipped += 1
            continue

        if not thumbnail_url.startswith(("http://", "https://")):
            logger.info(f"  ⚠️  Thumbnail is not a URL: {thumbnail_url[:50]}")
            skipped += 1
            continue

        logger.info(f"  📥 Downloading from: {thumbnail_url}")

        # Download and encode
        thumbnail_data = await download_and_encode_image(
            thumbnail_url, max_size=(800, 1200)
        )

        if thumbnail_data:
            # Save to database
            item.thumbnail = thumbnail_url
            item.thumbnail_data = thumbnail_data
            await item.save()

            downloaded += 1
            logger.info(f"  ✅ Downloaded and stored ({len(thumbnail_data)} chars)")
        else:
            failed += 1
            logger.warning(f"  ❌ Failed to download")

        # Small delay to avoid overwhelming servers
        await asyncio.sleep(0.5)

    logger.info(f"\n" + "=" * 60)
    logger.info(f"📊 SUMMARY")
    logger.info(f"=" * 60)
    logger.info(f"  Total items processed: {processed}")
    logger.info(f"  ✅ Successfully downloaded: {downloaded}")
    logger.info(f"  ⏭️  Skipped (already had data): {skipped}")
    logger.info(f"  ❌ Failed: {failed}")
    logger.info(f"=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(bulk_download_thumbnails())
