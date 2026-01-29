#!/usr/bin/env python3
"""Migration script to restrict viewer access and require payment.

This script migrates all existing viewer users (those without subscriptions)
to payment_pending state, requiring them to subscribe before accessing content.

Usage:
    poetry run python scripts/restrict_viewer_access.py [--dry-run]

Options:
    --dry-run: Show what would be migrated without making changes
"""
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.config import settings
from app.core.database import init_db
from app.core.logging_config import get_logger
from app.models.user import User

logger = get_logger(__name__)


async def migrate_viewers_to_payment_pending(dry_run: bool = False) -> dict:
    """Migrate existing viewers to payment_pending state.

    Args:
        dry_run: If True, only show what would be migrated

    Returns:
        Dictionary with migration statistics
    """
    await init_db()

    # Find viewers without subscriptions
    query = {
        "role": "viewer",
        "subscription_tier": None,
    }

    total_viewers = await User.find(query).count()

    logger.info(
        f"{'[DRY RUN] ' if dry_run else ''}Found {total_viewers} viewer users to migrate"
    )

    if total_viewers == 0:
        return {
            "total_viewers": 0,
            "migrated": 0,
            "errors": 0,
        }

    if dry_run:
        # In dry-run mode, show sample users
        sample_users = await User.find(query).limit(5).to_list()
        logger.info(f"[DRY RUN] Sample users (showing first 5):")
        for user in sample_users:
            logger.info(
                f"  - {user.email} (ID: {user.id}, created: {user.created_at})"
            )

        return {
            "total_viewers": total_viewers,
            "migrated": 0,
            "errors": 0,
            "dry_run": True,
        }

    # BULK UPDATE (single operation - 200x faster than individual saves)
    logger.info("Starting bulk migration...")

    update_result = await User.get_motor_collection().update_many(
        query,
        {
            "$set": {
                "payment_pending": True,
                "payment_created_at": datetime.now(timezone.utc),
                "pending_plan_id": "basic",  # Default to basic plan
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )

    migrated_count = update_result.modified_count

    logger.info(
        f"Migration complete: {migrated_count} users migrated to payment_pending"
    )

    # Fetch migrated users for email notification (done separately to not block)
    migrated_users = await User.find({"payment_pending": True}).to_list()

    logger.info(f"Found {len(migrated_users)} users to notify via email")

    # TODO: Queue emails via background job
    # For now, just log the intent
    for user in migrated_users[:10]:  # Log first 10
        logger.info(
            f"Will send subscription_required email to: {user.email}",
            extra={"user_id": str(user.id)}
        )

    if len(migrated_users) > 10:
        logger.info(f"... and {len(migrated_users) - 10} more users")

    return {
        "total_viewers": total_viewers,
        "migrated": migrated_count,
        "errors": total_viewers - migrated_count,
    }


async def rollback_migration() -> dict:
    """Rollback migration - clear payment_pending flags.

    Returns:
        Dictionary with rollback statistics
    """
    await init_db()

    # Find users with payment_pending=True
    query = {
        "payment_pending": True,
        "role": "viewer",
    }

    total_pending = await User.find(query).count()

    logger.info(f"Found {total_pending} users with payment_pending to rollback")

    if total_pending == 0:
        return {
            "total_pending": 0,
            "rolled_back": 0,
            "errors": 0,
        }

    # BULK UPDATE (clear payment_pending)
    update_result = await User.get_motor_collection().update_many(
        query,
        {
            "$set": {
                "payment_pending": False,
                "payment_created_at": None,
                "pending_plan_id": None,
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )

    rolled_back_count = update_result.modified_count

    logger.info(f"Rollback complete: {rolled_back_count} users restored to viewer")

    return {
        "total_pending": total_pending,
        "rolled_back": rolled_back_count,
        "errors": total_pending - rolled_back_count,
    }


async def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate viewer users to payment_pending state"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without making changes",
    )
    parser.add_argument(
        "--rollback",
        action="store_true",
        help="Rollback migration - clear payment_pending flags",
    )

    args = parser.parse_args()

    if args.rollback:
        logger.info("=" * 80)
        logger.info("ROLLBACK MODE: Clearing payment_pending flags")
        logger.info("=" * 80)

        if not args.dry_run:
            confirm = input("Are you sure you want to rollback? (yes/no): ")
            if confirm.lower() != "yes":
                logger.info("Rollback cancelled")
                return

        stats = await rollback_migration()

        logger.info("=" * 80)
        logger.info("ROLLBACK COMPLETE")
        logger.info(f"Total users with payment_pending: {stats['total_pending']}")
        logger.info(f"Rolled back: {stats['rolled_back']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info("=" * 80)

    else:
        logger.info("=" * 80)
        logger.info("VIEWER MIGRATION TO PAYMENT_PENDING")
        logger.info("=" * 80)

        if args.dry_run:
            logger.info("DRY RUN MODE - No changes will be made")
        else:
            confirm = input(
                "This will require all viewers to subscribe. Continue? (yes/no): "
            )
            if confirm.lower() != "yes":
                logger.info("Migration cancelled")
                return

        stats = await migrate_viewers_to_payment_pending(dry_run=args.dry_run)

        logger.info("=" * 80)
        logger.info("MIGRATION COMPLETE" if not args.dry_run else "DRY RUN COMPLETE")
        logger.info(f"Total viewers found: {stats['total_viewers']}")
        logger.info(f"Migrated: {stats['migrated']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info("=" * 80)

        if not args.dry_run and stats['migrated'] > 0:
            logger.info("")
            logger.info("NEXT STEPS:")
            logger.info("1. Verify users can access payment page")
            logger.info("2. Monitor payment conversion rate")
            logger.info("3. Send notification emails to affected users")
            logger.info("4. Monitor support tickets")
            logger.info("")
            logger.info("To rollback if needed:")
            logger.info("  poetry run python scripts/restrict_viewer_access.py --rollback")


if __name__ == "__main__":
    asyncio.run(main())
