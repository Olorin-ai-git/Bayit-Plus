"""
Database Index Migration Script for Search Functionality.

This script creates all necessary MongoDB indexes to enable comprehensive search across:
- Content (movies, series, etc.)
- Subtitle tracks (for dialogue search)

Run with: poetry run python -m app.scripts.create_search_indexes
"""

import asyncio
import logging

from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import OperationFailure

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def create_content_indexes(db):
    """Create search indexes on Content collection."""
    collection = db["content"]

    logger.info("Creating Content collection indexes...")

    try:
        # Drop any existing text indexes to avoid conflicts
        logger.info("Checking for existing text indexes...")
        existing_indexes = await collection.list_indexes().to_list(None)
        for index in existing_indexes:
            if "textIndexVersion" in index:
                logger.info(f"Dropping existing text index: {index['name']}")
                await collection.drop_index(index["name"])

        # Create multi-field text index with weights
        logger.info("Creating multi-field text index on Content...")
        await collection.create_index(
            [
                ("title", "text"),
                ("title_en", "text"),
                ("title_es", "text"),
                ("description", "text"),
                ("description_en", "text"),
                ("description_es", "text"),
                ("cast", "text"),
                ("director", "text"),
                ("genres", "text"),
            ],
            weights={
                "title": 10,
                "title_en": 10,
                "title_es": 10,
                "cast": 5,
                "director": 5,
                "genres": 3,
                "description": 1,
                "description_en": 1,
                "description_es": 1,
            },
            name="content_text_search",
            default_language="english",
        )
        logger.info("✓ Created text index on Content")

        # Create filter indexes for advanced search
        logger.info("Creating filter indexes...")

        # Year index (for range queries)
        try:
            await collection.create_index("year", name="year_1")
            logger.info("✓ Created year index")
        except OperationFailure as e:
            if "already exists" not in str(e):
                raise
            logger.info("  Year index already exists")

        # Genres array index
        try:
            await collection.create_index("genres", name="genres_1")
            logger.info("✓ Created genres index")
        except OperationFailure as e:
            if "already exists" not in str(e):
                raise
            logger.info("  Genres index already exists")

        # Available subtitle languages array index
        try:
            await collection.create_index(
                "available_subtitle_languages", name="available_subtitle_languages_1"
            )
            logger.info("✓ Created available_subtitle_languages index")
        except OperationFailure as e:
            if "already exists" not in str(e):
                raise
            logger.info("  Available subtitle languages index already exists")

        # Subscription tier index
        try:
            await collection.create_index(
                "requires_subscription", name="requires_subscription_1"
            )
            logger.info("✓ Created requires_subscription index")
        except OperationFailure as e:
            if "already exists" not in str(e):
                raise
            logger.info("  Requires subscription index already exists")

        # Kids content index
        try:
            await collection.create_index("is_kids_content", name="is_kids_content_1")
            logger.info("✓ Created is_kids_content index")
        except OperationFailure as e:
            if "already exists" not in str(e):
                raise
            logger.info("  Is kids content index already exists")

        # Content type index
        try:
            await collection.create_index("content_type", name="content_type_1")
            logger.info("✓ Created content_type index")
        except OperationFailure as e:
            if "already exists" not in str(e):
                raise
            logger.info("  Content type index already exists")

        logger.info("✓ All Content indexes created successfully")

    except Exception as e:
        logger.error(f"Error creating Content indexes: {e}", exc_info=True)
        raise


async def create_subtitle_indexes(db):
    """Create search indexes on SubtitleTrackDoc collection."""
    collection = db["subtitle_tracks"]

    logger.info("Creating SubtitleTrackDoc collection indexes...")

    try:
        # Drop any existing text indexes to avoid conflicts
        logger.info("Checking for existing text indexes...")
        existing_indexes = await collection.list_indexes().to_list(None)
        for index in existing_indexes:
            if "textIndexVersion" in index:
                logger.info(f"Dropping existing text index: {index['name']}")
                await collection.drop_index(index["name"])

        # Create text index on subtitle cues for dialogue search
        logger.info("Creating text index on subtitle cues...")
        await collection.create_index(
            [("cues.text", "text")],
            name="subtitle_text_search",
            default_language="english",
        )
        logger.info("✓ Created text index on SubtitleTrackDoc cues")

        logger.info("✓ All SubtitleTrackDoc indexes created successfully")

    except Exception as e:
        logger.error(f"Error creating SubtitleTrackDoc indexes: {e}", exc_info=True)
        raise


async def verify_indexes(db):
    """Verify that all indexes were created successfully."""
    logger.info("\n" + "=" * 60)
    logger.info("VERIFYING INDEXES")
    logger.info("=" * 60)

    # Verify Content indexes
    logger.info("\nContent collection indexes:")
    content_indexes = await db["content"].list_indexes().to_list(None)
    for index in content_indexes:
        logger.info(f"  - {index['name']}: {index.get('key', {})}")

    # Verify SubtitleTrackDoc indexes
    logger.info("\nSubtitleTrackDoc collection indexes:")
    subtitle_indexes = await db["subtitle_tracks"].list_indexes().to_list(None)
    for index in subtitle_indexes:
        logger.info(f"  - {index['name']}: {index.get('key', {})}")

    logger.info("\n" + "=" * 60)
    logger.info("VERIFICATION COMPLETE")
    logger.info("=" * 60)


async def run_migration():
    """Run the complete index migration."""
    logger.info("=" * 60)
    logger.info("SEARCH INDEX MIGRATION SCRIPT")
    logger.info("=" * 60)
    logger.info(
        f"MongoDB URI: {settings.MONGODB_URL.split('@')[1] if '@' in settings.MONGODB_URL else settings.MONGODB_URL}"
    )
    logger.info(f"Database: {settings.MONGODB_DB_NAME}")
    logger.info("=" * 60 + "\n")

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]

    try:
        # Test connection
        await client.admin.command("ping")
        logger.info("✓ Connected to MongoDB successfully\n")

        # Create Content indexes
        await create_content_indexes(db)
        logger.info("")

        # Create SubtitleTrackDoc indexes
        await create_subtitle_indexes(db)
        logger.info("")

        # Verify all indexes
        await verify_indexes(db)

        logger.info("\n✅ Migration completed successfully!")

    except Exception as e:
        logger.error(f"\n❌ Migration failed: {e}", exc_info=True)
        raise
    finally:
        client.close()
        logger.info("\n✓ Database connection closed")


if __name__ == "__main__":
    asyncio.run(run_migration())
