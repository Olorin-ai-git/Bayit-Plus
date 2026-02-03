#!/usr/bin/env python3
"""
Rebuild ContentTrivia Collection Indexes

Applies all indexes defined in the ContentTrivia model to the MongoDB collection.
This ensures optimal query performance for multilingual trivia operations.

Usage:
    poetry run python scripts/rebuild_trivia_indexes.py [--drop-existing]

Options:
    --drop-existing    Drop existing indexes before rebuilding (use with caution)
"""

import asyncio
import argparse
import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.trivia import ContentTrivia

logger = get_logger(__name__)


async def rebuild_indexes(drop_existing: bool = False):
    """
    Rebuild all indexes for ContentTrivia collection.

    Args:
        drop_existing: If True, drop existing indexes before rebuilding
    """
    logger.info("Connecting to MongoDB Atlas")
    client = AsyncIOMotorClient(settings.MONGODB_URI)

    try:
        # Initialize Beanie with ContentTrivia model
        await init_beanie(
            database=client[settings.MONGODB_DB_NAME],
            document_models=[ContentTrivia]
        )

        collection = ContentTrivia.get_motor_collection()

        # Get existing indexes
        existing_indexes = await collection.list_indexes().to_list(length=None)
        logger.info(
            f"Current indexes on {ContentTrivia.Settings.name}",
            extra={"count": len(existing_indexes)}
        )

        for idx in existing_indexes:
            logger.info(f"  - {idx['name']}: {idx.get('key', {})}")

        if drop_existing:
            logger.warning("Dropping all existing indexes (except _id)")
            # Drop all indexes except _id (cannot drop _id index)
            for idx in existing_indexes:
                if idx['name'] != '_id_':
                    await collection.drop_index(idx['name'])
                    logger.info(f"Dropped index: {idx['name']}")

        # Rebuild indexes (Beanie will create them automatically)
        logger.info("Creating indexes from model definition")

        # Get the collection and create indexes
        await ContentTrivia.get_motor_collection().create_indexes(
            ContentTrivia.get_indexes()
        )

        # Verify new indexes
        new_indexes = await collection.list_indexes().to_list(length=None)
        logger.info(
            f"Indexes after rebuild",
            extra={"count": len(new_indexes)}
        )

        for idx in new_indexes:
            logger.info(f"  ✓ {idx['name']}: {idx.get('key', {})}")

        logger.info("Index rebuild complete")

        # Summary
        print("\n" + "=" * 60)
        print("INDEX REBUILD SUMMARY")
        print("=" * 60)
        print(f"Collection:        {ContentTrivia.Settings.name}")
        print(f"Total indexes:     {len(new_indexes)}")
        print(f"Indexes created:   {len(new_indexes) - len(existing_indexes) if not drop_existing else len(new_indexes) - 1}")
        print("=" * 60)

        print("\n✓ Index rebuild successful")

    except Exception as e:
        logger.error(
            "Index rebuild failed",
            extra={"error": str(e)},
            exc_info=True
        )
        print(f"\n✗ Index rebuild failed: {e}")
        sys.exit(1)

    finally:
        client.close()


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Rebuild ContentTrivia collection indexes"
    )
    parser.add_argument(
        "--drop-existing",
        action="store_true",
        help="Drop existing indexes before rebuilding (use with caution)"
    )
    args = parser.parse_args()

    if args.drop_existing:
        print("\n⚠️  WARNING: This will drop all existing indexes!")
        confirmation = input("Type 'yes' to confirm: ")
        if confirmation.lower() != 'yes':
            print("Aborted")
            sys.exit(0)

    await rebuild_indexes(drop_existing=args.drop_existing)


if __name__ == "__main__":
    asyncio.run(main())
