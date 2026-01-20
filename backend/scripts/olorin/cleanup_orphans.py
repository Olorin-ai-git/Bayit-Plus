#!/usr/bin/env python3
"""
Olorin Orphan Cleanup Script

Removes orphaned records from Olorin database that reference deleted content
in the Bayit+ database.

Cleans:
- ContentEmbedding records with invalid content_id
- RecapSession records with invalid channel_id
- DubbingSession records with invalid partner_id

Usage:
    # Dry-run mode (preview only)
    poetry run python scripts/olorin/cleanup_orphans.py --dry-run

    # Execute cleanup
    poetry run python scripts/olorin/cleanup_orphans.py --execute
"""

import asyncio
import argparse
import logging
from typing import List, Set
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import PydanticObjectId

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

from app.core.config import settings
from app.models.content_embedding import ContentEmbedding, RecapSession
from app.models.integration_partner import IntegrationPartner, DubbingSession
from app.models.content import Content, LiveChannel


async def get_all_content_ids(bayit_client: AsyncIOMotorClient) -> Set[str]:
    """Get all valid Content IDs from Bayit+ database."""
    db = bayit_client[settings.MONGODB_DB_NAME]
    content_collection = db["contents"]

    content_ids = set()
    async for doc in content_collection.find({}, {"_id": 1}):
        content_ids.add(str(doc["_id"]))

    return content_ids


async def get_all_channel_ids(bayit_client: AsyncIOMotorClient) -> Set[str]:
    """Get all valid LiveChannel IDs from Bayit+ database."""
    db = bayit_client[settings.MONGODB_DB_NAME]
    channels_collection = db["live_channels"]

    channel_ids = set()
    async for doc in channels_collection.find({}, {"_id": 1}):
        channel_ids.add(str(doc["_id"]))

    return channel_ids


async def get_all_partner_ids() -> Set[str]:
    """Get all valid IntegrationPartner IDs from Olorin database."""
    partner_ids = set()
    async for partner in IntegrationPartner.find():
        partner_ids.add(partner.partner_id)

    return partner_ids


async def cleanup_content_embeddings(
    valid_content_ids: Set[str],
    dry_run: bool = True
) -> int:
    """
    Remove ContentEmbedding records with invalid content_id.

    Args:
        valid_content_ids: Set of valid Content IDs from Bayit+ database
        dry_run: If True, only count orphans without deleting

    Returns:
        Number of orphaned records
    """
    logger.info("Checking ContentEmbedding orphans...")

    orphan_count = 0
    batch_size = 1000
    batch = []

    async for embedding in ContentEmbedding.find():
        if embedding.content_id not in valid_content_ids:
            orphan_count += 1
            if not dry_run:
                batch.append(embedding.id)

                # Delete in batches
                if len(batch) >= batch_size:
                    await ContentEmbedding.find(
                        {"_id": {"$in": batch}}
                    ).delete()
                    logger.info(f"  Deleted batch of {len(batch)} orphaned embeddings")
                    batch = []

    # Delete remaining batch
    if not dry_run and batch:
        await ContentEmbedding.find({"_id": {"$in": batch}}).delete()
        logger.info(f"  Deleted final batch of {len(batch)} orphaned embeddings")

    if dry_run:
        logger.info(f"  [DRY-RUN] Found {orphan_count} orphaned ContentEmbedding records")
    else:
        logger.info(f"  Deleted {orphan_count} orphaned ContentEmbedding records")

    return orphan_count


async def cleanup_recap_sessions(
    valid_channel_ids: Set[str],
    dry_run: bool = True
) -> int:
    """
    Remove RecapSession records with invalid channel_id.

    Args:
        valid_channel_ids: Set of valid LiveChannel IDs from Bayit+ database
        dry_run: If True, only count orphans without deleting

    Returns:
        Number of orphaned records
    """
    logger.info("Checking RecapSession orphans...")

    orphan_count = 0
    batch_size = 1000
    batch = []

    async for recap in RecapSession.find():
        if recap.channel_id and recap.channel_id not in valid_channel_ids:
            orphan_count += 1
            if not dry_run:
                batch.append(recap.id)

                # Delete in batches
                if len(batch) >= batch_size:
                    await RecapSession.find(
                        {"_id": {"$in": batch}}
                    ).delete()
                    logger.info(f"  Deleted batch of {len(batch)} orphaned recap sessions")
                    batch = []

    # Delete remaining batch
    if not dry_run and batch:
        await RecapSession.find({"_id": {"$in": batch}}).delete()
        logger.info(f"  Deleted final batch of {len(batch)} orphaned recap sessions")

    if dry_run:
        logger.info(f"  [DRY-RUN] Found {orphan_count} orphaned RecapSession records")
    else:
        logger.info(f"  Deleted {orphan_count} orphaned RecapSession records")

    return orphan_count


async def cleanup_dubbing_sessions(
    valid_partner_ids: Set[str],
    dry_run: bool = True
) -> int:
    """
    Remove DubbingSession records with invalid partner_id.

    Args:
        valid_partner_ids: Set of valid IntegrationPartner IDs
        dry_run: If True, only count orphans without deleting

    Returns:
        Number of orphaned records
    """
    logger.info("Checking DubbingSession orphans...")

    orphan_count = 0
    batch_size = 1000
    batch = []

    async for session in DubbingSession.find():
        if session.partner_id not in valid_partner_ids:
            orphan_count += 1
            if not dry_run:
                batch.append(session.id)

                # Delete in batches
                if len(batch) >= batch_size:
                    await DubbingSession.find(
                        {"_id": {"$in": batch}}
                    ).delete()
                    logger.info(f"  Deleted batch of {len(batch)} orphaned dubbing sessions")
                    batch = []

    # Delete remaining batch
    if not dry_run and batch:
        await DubbingSession.find({"_id": {"$in": batch}}).delete()
        logger.info(f"  Deleted final batch of {len(batch)} orphaned dubbing sessions")

    if dry_run:
        logger.info(f"  [DRY-RUN] Found {orphan_count} orphaned DubbingSession records")
    else:
        logger.info(f"  Deleted {orphan_count} orphaned DubbingSession records")

    return orphan_count


async def cleanup_orphans(dry_run: bool = True) -> bool:
    """
    Main orchestration function for orphan cleanup.

    Args:
        dry_run: If True, only preview orphans without deleting

    Returns:
        bool: True if cleanup successful, False otherwise
    """
    logger.info("=" * 70)
    logger.info("OLORIN ORPHAN CLEANUP")
    logger.info("=" * 70)

    if dry_run:
        logger.info("MODE: DRY-RUN (preview only)")
    else:
        logger.warning("⚠️  MODE: EXECUTE (WILL DELETE DATA)")

    logger.info("")

    # Safety check
    if not settings.olorin.database.use_separate_database:
        logger.error("❌ SAFETY CHECK FAILED")
        logger.error("   OLORIN_USE_SEPARATE_DATABASE is not enabled")
        logger.error("   Orphan cleanup only applies to Phase 2 (separate database)")
        return False

    # Connect to databases
    logger.info("Connecting to databases...")
    from app.core.database_olorin import connect_to_olorin_mongo, olorin_db
    from app.core.database import connect_to_mongo, db

    await connect_to_mongo()
    await connect_to_olorin_mongo()

    try:
        # Get valid reference IDs
        logger.info("Loading valid reference IDs...")
        valid_content_ids = await get_all_content_ids(olorin_db.bayit_client)
        valid_channel_ids = await get_all_channel_ids(olorin_db.bayit_client)
        valid_partner_ids = await get_all_partner_ids()

        logger.info(f"  Valid Content IDs: {len(valid_content_ids)}")
        logger.info(f"  Valid Channel IDs: {len(valid_channel_ids)}")
        logger.info(f"  Valid Partner IDs: {len(valid_partner_ids)}")
        logger.info("")

        # Cleanup each collection
        total_orphans = 0

        orphans_embeddings = await cleanup_content_embeddings(valid_content_ids, dry_run)
        total_orphans += orphans_embeddings

        orphans_recaps = await cleanup_recap_sessions(valid_channel_ids, dry_run)
        total_orphans += orphans_recaps

        orphans_dubbing = await cleanup_dubbing_sessions(valid_partner_ids, dry_run)
        total_orphans += orphans_dubbing

        # Summary
        logger.info("")
        logger.info("=" * 70)
        logger.info("CLEANUP SUMMARY")
        logger.info("=" * 70)
        logger.info(f"ContentEmbedding orphans: {orphans_embeddings}")
        logger.info(f"RecapSession orphans:     {orphans_recaps}")
        logger.info(f"DubbingSession orphans:   {orphans_dubbing}")
        logger.info("-" * 70)
        logger.info(f"Total orphans:            {total_orphans}")
        logger.info("=" * 70)

        if dry_run:
            logger.info("")
            logger.info("✓ Dry-run completed successfully")
            logger.info("")
            logger.info("To execute cleanup, run:")
            logger.info("  poetry run python scripts/olorin/cleanup_orphans.py --execute")
        else:
            logger.info("")
            logger.info("✓ Cleanup completed successfully")
            logger.info("")
            logger.info(f"Removed {total_orphans} orphaned records")

        return True

    except Exception as e:
        logger.error(f"❌ Cleanup failed: {e}")
        import traceback
        traceback.print_exc()
        return False

    finally:
        from app.core.database_olorin import close_olorin_mongo_connection
        from app.core.database import close_mongo_connection

        await close_mongo_connection()
        await close_olorin_mongo_connection()
        logger.info("")
        logger.info("Database connections closed")


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="Cleanup orphaned records in Olorin database"
    )
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview orphans without deleting data"
    )
    group.add_argument(
        "--execute",
        action="store_true",
        help="Execute cleanup and delete orphaned records"
    )

    args = parser.parse_args()

    success = asyncio.run(cleanup_orphans(dry_run=args.dry_run))

    exit(0 if success else 1)


if __name__ == "__main__":
    main()
