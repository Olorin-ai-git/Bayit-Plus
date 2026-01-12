"""Add landscape backdrop for Avatar and download it"""
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


async def add_backdrop():
    """Add landscape backdrop for Avatar"""
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
    logger.info(f"  Current backdrop: {avatar.backdrop}")
    logger.info(f"  Current backdrop_data: {'YES' if avatar.backdrop_data else 'NO'}")

    # Set the TMDB backdrop URL (1920x1080 landscape)
    backdrop_url = "https://image.tmdb.org/t/p/original/jlQJDD0L5ZojjlS0KYnApdO0n19.jpg"

    logger.info(f"\n📝 Setting backdrop URL to: {backdrop_url}")
    avatar.backdrop = backdrop_url
    await avatar.save()
    logger.info(f"✅ Backdrop URL saved to database")

    # Download and encode the backdrop image
    logger.info(f"\n📥 Downloading backdrop image from: {backdrop_url}")
    backdrop_data = await download_and_encode_image(backdrop_url, max_size=(1920, 1080))

    if backdrop_data:
        logger.info(f"✅ Successfully downloaded and encoded backdrop!")
        logger.info(f"   Size: {len(backdrop_data)} characters")
        logger.info(f"   Preview: {backdrop_data[:80]}...")

        # Save to database
        avatar.backdrop_data = backdrop_data
        await avatar.save()

        logger.info(f"\n💾 Saved backdrop_data to database!")
        logger.info(f"✅ Avatar now has landscape backdrop for carousel")

        logger.info(f"\n📊 Avatar Summary:")
        logger.info(f"  - thumbnail (portrait): {'YES' if avatar.thumbnail_data else 'NO'}")
        logger.info(f"  - backdrop (landscape): {'YES' if avatar.backdrop_data else 'NO'}")
        logger.info(f"  - is_featured: {avatar.is_featured}")
    else:
        logger.error(f"❌ Failed to download backdrop from {backdrop_url}")


if __name__ == "__main__":
    asyncio.run(add_backdrop())
