#!/usr/bin/env python3
"""
Cleanup Old Olorin Collections (Phase 2 Post-Migration)

Removes Olorin collections from main Bayit+ database after successful migration
to separate Olorin database.

⚠️  CAUTION: This permanently deletes data. Only run after:
    1. Successful migration (migrate_olorin_data.py --execute)
    2. Verification passed (migrate_olorin_data.py --verify)
    3. Application tested with separate database enabled
    4. Database backup created

Usage:
    # Dry-run mode (preview only)
    poetry run python scripts/cleanup_old_olorin_collections.py --dry-run

    # Execute cleanup
    poetry run python scripts/cleanup_old_olorin_collections.py --execute
"""

import asyncio
import argparse
import logging
from typing import List
from motor.motor_asyncio import AsyncIOMotorClient

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

from app.core.config import settings


# Olorin collections to remove
OLORIN_COLLECTIONS: List[str] = [
    "integration_partners",
    "usage_records",
    "dubbing_sessions",
    "webhook_deliveries",
    "content_embeddings",
    "recap_sessions",
    "cultural_references",
]


async def cleanup_collections(dry_run: bool = True) -> bool:
    """
    Remove Olorin collections from main database.

    Args:
        dry_run: If True, only preview cleanup without deleting data

    Returns:
        bool: True if cleanup successful, False otherwise
    """
    logger.info("=" * 70)
    logger.info("CLEANUP OLD OLORIN COLLECTIONS")
    logger.info("=" * 70)

    if dry_run:
        logger.warning("MODE: DRY-RUN (preview only)")
    else:
        logger.warning("⚠️  MODE: EXECUTE (WILL DELETE DATA)")

    logger.info("")

    # Database details
    db_url = settings.MONGODB_URL
    db_name = settings.MONGODB_DB_NAME

    logger.info(f"Database: {db_name}")
    logger.info("")

    # Safety checks
    if not settings.olorin.database.use_separate_database:
        logger.error("❌ SAFETY CHECK FAILED")
        logger.error("   OLORIN_USE_SEPARATE_DATABASE is not enabled")
        logger.error("   Cannot cleanup without separate database configured")
        return False

    if not dry_run:
        logger.warning("")
        logger.warning("⚠️  WARNING: This will PERMANENTLY DELETE the following collections:")
        for collection in OLORIN_COLLECTIONS:
            logger.warning(f"   - {collection}")
        logger.warning("")
        logger.warning("   Make sure you have:")
        logger.warning("   1. Successfully migrated data to Olorin database")
        logger.warning("   2. Verified migration (--verify)")
        logger.warning("   3. Tested application with separate database")
        logger.warning("   4. Created a database backup")
        logger.warning("")

        response = input("Are you absolutely sure you want to proceed? (yes/no): ")
        if response.lower() != "yes":
            logger.info("Cleanup cancelled by user")
            return False

    # Connect to database
    logger.info("Connecting to database...")
    client = AsyncIOMotorClient(db_url)

    try:
        # Verify connection
        await client.admin.command('ping')
        logger.info("✓ Database connection established")
        logger.info("")

        db = client[db_name]

        # Get existing collections
        existing_collections = await db.list_collection_names()

        # Process each collection
        total_deleted = 0

        for collection_name in OLORIN_COLLECTIONS:
            if collection_name not in existing_collections:
                logger.info(f"⊗ {collection_name:30s} | Not found (already deleted?)")
                continue

            collection = db[collection_name]
            count = await collection.count_documents({})

            if dry_run:
                logger.info(
                    f"[DRY-RUN] {collection_name:30s} | "
                    f"Would delete {count:6d} documents"
                )
            else:
                await collection.drop()
                total_deleted += count
                logger.info(
                    f"✓ {collection_name:30s} | "
                    f"Deleted {count:6d} documents"
                )

        logger.info("")
        logger.info("=" * 70)

        if dry_run:
            logger.info("✓ Dry-run completed successfully")
            logger.info("")
            logger.info("To execute cleanup, run:")
            logger.info("  poetry run python scripts/cleanup_old_olorin_collections.py --execute")
        else:
            logger.info(f"✓ Cleanup completed - {total_deleted} documents deleted")
            logger.info("")
            logger.info("Olorin collections have been removed from main database")
            logger.info("Phase 2 separation is now complete")

        return True

    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        client.close()
        logger.info("")
        logger.info("Database connection closed")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Cleanup old Olorin collections from main database (Phase 2 post-migration)"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview cleanup without deleting data"
    )
    group.add_argument(
        "--execute",
        action="store_true",
        help="Execute cleanup and delete collections"
    )

    args = parser.parse_args()

    success = asyncio.run(cleanup_collections(dry_run=args.dry_run))

    exit(0 if success else 1)


if __name__ == "__main__":
    main()
