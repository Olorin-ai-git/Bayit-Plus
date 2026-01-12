"""Add existing GCS movies to database."""
import os
import sys
import asyncio
import logging

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.models.content import Content, Category
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Movies already in GCS
MOVIES = [
    {
        "title": "Winnie the Pooh",
        "year": 2011,
        "stream_url": "https://storage.googleapis.com/bayit-plus-media-new-new/movies/1-3-3-8_com_Winnie_the_Pooh_-AMIABLE/1-3-3-8.com_Winnie.the.Pooh.2011.720p.BluRay.X264-AMIABLE.mkv"
    },
    {
        "title": "25th Hour",
        "year": 2002,
        "stream_url": "https://storage.googleapis.com/bayit-plus-media-new-new/movies/25th_Hour_TV_-BoK/25th.Hour.2002.HDTV.720p.AC3.5.1-BoK.mkv"
    },
    {
        "title": "300",
        "year": 2006,
        "stream_url": "https://storage.googleapis.com/bayit-plus-media-new-new/movies/300_p_-hV/300.2006.1080p.BluRay.x264-hV.mkv"
    },
    {
        "title": "65",
        "year": 2023,
        "stream_url": "https://storage.googleapis.com/bayit-plus-media-new-new/movies/65_-_MX/65.2023.720p.WEBRip.x264.AAC-[YTS.MX].mp4"
    }
]


async def add_movies():
    """Add movies to database."""
    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    # Initialize Beanie
    await init_beanie(database=db, document_models=[Content, Category])
    logger.info("Connected to MongoDB Atlas")

    # Get Movies category
    movies_category = await Category.find_one(Category.name == "Movies")
    if not movies_category:
        logger.error("Movies category not found!")
        return

    category_id = str(movies_category.id)
    logger.info(f"Using Movies category: {category_id}")

    # Add each movie
    for movie_data in MOVIES:
        # Check if already exists
        existing = await Content.find_one(
            Content.title == movie_data["title"],
            Content.category_id == category_id
        )

        if existing:
            logger.info(f"  Skipped: {movie_data['title']} - already exists")
            continue

        # Create content document
        content = Content(
            title=movie_data["title"],
            description=f"{movie_data['title']} ({movie_data['year']})",
            stream_url=movie_data["stream_url"],
            category_id=category_id,
            category_name="Movies",
            is_published=True,
            is_featured=False,
            is_series=False,
            year=movie_data["year"]
        )

        await content.insert()
        logger.info(f"  Added: {movie_data['title']} ({movie_data['year']}) - ID: {content.id}")

    client.close()
    logger.info("Done!")


if __name__ == "__main__":
    asyncio.run(add_movies())
