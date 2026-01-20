#!/usr/bin/env python3
"""
Olorin Data Migration Script (Phase 2)

Migrates Olorin platform data from main Bayit+ database to separate Olorin database.

Usage:
    # Dry-run mode (preview only)
    poetry run python scripts/migrate_olorin_data.py --dry-run

    # Execute migration
    poetry run python scripts/migrate_olorin_data.py --execute

    # Verify migration results
    poetry run python scripts/migrate_olorin_data.py --verify
"""

import asyncio
import argparse
import logging
from typing import Dict, List, Type
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import Document, init_beanie
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Olorin models
from app.models.integration_partner import (
    IntegrationPartner,
    UsageRecord,
    DubbingSession,
    WebhookDelivery,
)
from app.models.content_embedding import ContentEmbedding, RecapSession
from app.models.cultural_reference import CulturalReference
from app.core.config import settings


# Collection mapping: model_class -> collection_name
OLORIN_COLLECTIONS: Dict[Type[Document], str] = {
    IntegrationPartner: "integration_partners",
    UsageRecord: "usage_records",
    DubbingSession: "dubbing_sessions",
    WebhookDelivery: "webhook_deliveries",
    ContentEmbedding: "content_embeddings",
    RecapSession: "recap_sessions",
    CulturalReference: "cultural_references",
}


async def get_collection_count(
    client: AsyncIOMotorClient,
    db_name: str,
    collection_name: str
) -> int:
    """Get document count for a collection."""
    db = client[db_name]
    return await db[collection_name].count_documents({})


async def copy_collection(
    source_client: AsyncIOMotorClient,
    source_db_name: str,
    target_client: AsyncIOMotorClient,
    target_db_name: str,
    collection_name: str,
    dry_run: bool = True
) -> Dict[str, int]:
    """
    Copy documents from source collection to target collection.

    Returns:
        dict: Statistics {source_count, target_count_before, target_count_after, copied}
    """
    source_db = source_client[source_db_name]
    target_db = target_client[target_db_name]

    source_collection = source_db[collection_name]
    target_collection = target_db[collection_name]

    # Get counts before migration
    source_count = await source_collection.count_documents({})
    target_count_before = await target_collection.count_documents({})

    logger.info(f"  Source: {source_count} documents")
    logger.info(f"  Target: {target_count_before} documents (before)")

    if source_count == 0:
        logger.info(f"  ⚠️  No documents to migrate")
        return {
            "source_count": source_count,
            "target_count_before": target_count_before,
            "target_count_after": target_count_before,
            "copied": 0
        }

    if dry_run:
        logger.info(f"  [DRY-RUN] Would copy {source_count} documents")
        return {
            "source_count": source_count,
            "target_count_before": target_count_before,
            "target_count_after": target_count_before,
            "copied": 0
        }

    # Execute migration using upsert pattern for idempotency
    from pymongo import UpdateOne

    documents = []
    async for doc in source_collection.find():
        documents.append(doc)

    if documents:
        # Upsert in batches of 1000 for idempotent re-runnable migration
        batch_size = 1000
        for i in range(0, len(documents), batch_size):
            batch = documents[i:i + batch_size]

            # Build bulk write operations with upsert
            operations = [
                UpdateOne(
                    {"_id": doc["_id"]},  # Match by _id
                    {"$set": doc},         # Update entire document
                    upsert=True            # Insert if doesn't exist
                )
                for doc in batch
            ]

            result = await target_collection.bulk_write(operations, ordered=False)
            logger.info(
                f"  Batch {i//batch_size + 1}: "
                f"{result.upserted_count} inserted, "
                f"{result.modified_count} updated"
            )

    target_count_after = await target_collection.count_documents({})
    logger.info(f"  Target: {target_count_after} documents (after)")

    return {
        "source_count": source_count,
        "target_count_before": target_count_before,
        "target_count_after": target_count_after,
        "copied": target_count_after - target_count_before
    }


async def migrate_data(dry_run: bool = True) -> bool:
    """
    Migrate Olorin data from main database to Olorin database.

    Args:
        dry_run: If True, only preview migration without copying data

    Returns:
        bool: True if migration successful, False otherwise
    """
    logger.info("=" * 70)
    logger.info("OLORIN DATA MIGRATION (Phase 2)")
    logger.info("=" * 70)

    if dry_run:
        logger.info("MODE: DRY-RUN (preview only)")
    else:
        logger.info("MODE: EXECUTE (will copy data)")

    logger.info("")

    # Connection details
    source_url = settings.MONGODB_URL
    source_db_name = settings.MONGODB_DB_NAME

    target_url = settings.olorin.database.mongodb_url or settings.MONGODB_URL
    target_db_name = settings.olorin.database.mongodb_db_name

    logger.info(f"Source Database: {source_db_name}")
    logger.info(f"Target Database: {target_db_name}")
    logger.info("")

    # Check if separate database is configured
    if not settings.olorin.database.use_separate_database:
        logger.error("❌ OLORIN_USE_SEPARATE_DATABASE is not enabled")
        logger.error("   Enable Phase 2 by setting OLORIN_USE_SEPARATE_DATABASE=true")
        return False

    if source_db_name == target_db_name and source_url == target_url:
        logger.error("❌ Source and target databases are the same")
        logger.error("   Cannot migrate to the same database")
        return False

    # Connect to databases
    logger.info("Connecting to databases...")
    source_client = AsyncIOMotorClient(source_url)
    target_client = AsyncIOMotorClient(target_url)

    try:
        # Verify connections
        await source_client.admin.command('ping')
        await target_client.admin.command('ping')
        logger.info("✓ Database connections established")
        logger.info("")

        # Migrate each collection
        migration_stats = {}

        for model_class, collection_name in OLORIN_COLLECTIONS.items():
            logger.info(f"Collection: {collection_name}")
            logger.info("-" * 70)

            stats = await copy_collection(
                source_client=source_client,
                source_db_name=source_db_name,
                target_client=target_client,
                target_db_name=target_db_name,
                collection_name=collection_name,
                dry_run=dry_run
            )

            migration_stats[collection_name] = stats
            logger.info("")

        # Summary
        logger.info("=" * 70)
        logger.info("MIGRATION SUMMARY")
        logger.info("=" * 70)

        total_source = sum(s["source_count"] for s in migration_stats.values())
        total_copied = sum(s["copied"] for s in migration_stats.values())

        for collection_name, stats in migration_stats.items():
            logger.info(
                f"{collection_name:30s} | "
                f"Source: {stats['source_count']:6d} | "
                f"Copied: {stats['copied']:6d}"
            )

        logger.info("-" * 70)
        logger.info(
            f"{'TOTAL':30s} | "
            f"Source: {total_source:6d} | "
            f"Copied: {total_copied:6d}"
        )
        logger.info("=" * 70)

        if dry_run:
            logger.info("")
            logger.info("✓ Dry-run completed successfully")
            logger.info("")
            logger.info("To execute migration, run:")
            logger.info("  poetry run python scripts/migrate_olorin_data.py --execute")
        else:
            logger.info("")
            logger.info("✓ Migration completed successfully")
            logger.info("")
            logger.info("Next steps:")
            logger.info("  1. Verify data: poetry run python scripts/migrate_olorin_data.py --verify")
            logger.info("  2. Run application tests: poetry run pytest")
            logger.info("  3. After verification, cleanup old data:")
            logger.info("     poetry run python scripts/cleanup_old_olorin_collections.py")

        return True

    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        source_client.close()
        target_client.close()
        logger.info("")
        logger.info("Database connections closed")


async def verify_migration() -> bool:
    """
    Verify migration by comparing document counts.

    Returns:
        bool: True if verification passed, False otherwise
    """
    logger.info("=" * 70)
    logger.info("MIGRATION VERIFICATION")
    logger.info("=" * 70)

    source_url = settings.MONGODB_URL
    source_db_name = settings.MONGODB_DB_NAME

    target_url = settings.olorin.database.mongodb_url or settings.MONGODB_URL
    target_db_name = settings.olorin.database.mongodb_db_name

    logger.info(f"Source Database: {source_db_name}")
    logger.info(f"Target Database: {target_db_name}")
    logger.info("")

    source_client = AsyncIOMotorClient(source_url)
    target_client = AsyncIOMotorClient(target_url)

    try:
        all_match = True

        for model_class, collection_name in OLORIN_COLLECTIONS.items():
            source_count = await get_collection_count(
                source_client, source_db_name, collection_name
            )
            target_count = await get_collection_count(
                target_client, target_db_name, collection_name
            )

            match = source_count == target_count
            status = "✓" if match else "✗"

            logger.info(
                f"{status} {collection_name:30s} | "
                f"Source: {source_count:6d} | "
                f"Target: {target_count:6d}"
            )

            if not match:
                all_match = False

        logger.info("=" * 70)

        if all_match:
            logger.info("✓ Verification PASSED - All document counts match")
            return True
        else:
            logger.error("✗ Verification FAILED - Document counts do not match")
            return False

    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        return False

    finally:
        source_client.close()
        target_client.close()


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Migrate Olorin data to separate database (Phase 2)"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview migration without copying data"
    )
    group.add_argument(
        "--execute",
        action="store_true",
        help="Execute migration and copy data"
    )
    group.add_argument(
        "--verify",
        action="store_true",
        help="Verify migration by comparing document counts"
    )

    args = parser.parse_args()

    if args.verify:
        success = asyncio.run(verify_migration())
    else:
        success = asyncio.run(migrate_data(dry_run=args.dry_run))

    exit(0 if success else 1)


if __name__ == "__main__":
    main()
