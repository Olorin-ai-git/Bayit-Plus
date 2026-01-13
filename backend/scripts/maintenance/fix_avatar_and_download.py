"""Set Avatar's thumbnail URL and download the image"""
import asyncio
import sys
import os
from dotenv import load_dotenv

load_dotenv()
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content
from app.services.image_storage import download_and_encode_image
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def fix_avatar():
    """Set Avatar's thumbnail URL and download it"""
    mongodb_uri = os.getenv("MONGODB_URI") or os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    mongodb_db = os.getenv("MONGODB_DB") or os.getenv("MONGODB_DB_NAME", "bayit_plus")

    logger.info(f"Connecting to MongoDB: {mongodb_db}")
    client = AsyncIOMotorClient(mongodb_uri)
    await init_beanie(database=client[mongodb_db], document_models=[Content])

    avatar = await Content.find_one(Content.title == "Avatar")

    if not avatar:
        logger.error("❌ Avatar not found")
        return

    logger.info(f"✅ Found Avatar: {avatar.id}")
    logger.info(f"  Current thumbnail: {avatar.thumbnail}")
    logger.info(f"  Current thumbnail_data: {'YES' if avatar.thumbnail_data else 'NO'}")

    # Set the Wikipedia thumbnail URL
    thumbnail_url = "https://upload.wikimedia.org/wikipedia/en/d/d6/Avatar_%282009_film%29_poster.jpg"

    logger.info(f"\n📝 Setting thumbnail URL to: {thumbnail_url}")
    avatar.thumbnail = thumbnail_url
    await avatar.save()
    logger.info(f"✅ Thumbnail URL saved to database")

    # Now download and encode the image
    logger.info(f"\n📥 Downloading image from: {thumbnail_url}")
    thumbnail_data = await download_and_encode_image(thumbnail_url, max_size=(800, 1200))

    if thumbnail_data:
        logger.info(f"✅ Successfully downloaded and encoded image!")
        logger.info(f"   Size: {len(thumbnail_data)} characters")
        logger.info(f"   Preview: {thumbnail_data[:80]}...")

        # Save to database
        avatar.thumbnail_data = thumbnail_data
        await avatar.save()

        logger.info(f"\n💾 Saved thumbnail_data to database!")
        logger.info(f"✅ Avatar now has both thumbnail URL and stored image data")

        # Also mark as featured
        if not avatar.is_featured:
            avatar.is_featured = True
            await avatar.save()
            logger.info(f"✅ Marked Avatar as featured")
    else:
        logger.error(f"❌ Failed to download image from {thumbnail_url}")


if __name__ == "__main__":
    asyncio.run(fix_avatar())
