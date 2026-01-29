#!/usr/bin/env python3
"""Rollback script for payment_pending migration.

This script reverts users from payment_pending state back to regular viewer role.
Use this if the payment-required feature needs to be disabled due to issues.

Usage:
    poetry run python scripts/rollback_payment_pending.py [--dry-run]

Options:
    --dry-run: Show what would be rolled back without making changes
"""
import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.core.database import init_db
from app.core.logging_config import get_logger
from app.models.user import User

logger = get_logger(__name__)


async def rollback_payment_pending(dry_run: bool = False) -> dict:
    """Rollback payment_pending users to normal viewer state.

    Args:
        dry_run: If True, only show what would be rolled back

    Returns:
        Dictionary with rollback statistics
    """
    await init_db()

    # Find users with payment_pending=True
    query = {
        "payment_pending": True,
    }

    total_pending = await User.find(query).count()

    logger.info(
        f"{'[DRY RUN] ' if dry_run else ''}Found {total_pending} users with payment_pending"
    )

    if total_pending == 0:
        logger.info("No users to rollback")
        return {
            "total_pending": 0,
            "rolled_back": 0,
            "errors": 0,
        }

    if dry_run:
        # In dry-run mode, show sample users
        sample_users = await User.find(query).limit(10).to_list()
        logger.info(f"[DRY RUN] Sample users (showing first 10):")
        for user in sample_users:
            logger.info(
                f"  - {user.email} (ID: {user.id}, pending_plan: {user.pending_plan_id})"
            )

        return {
            "total_pending": total_pending,
            "rolled_back": 0,
            "errors": 0,
            "dry_run": True,
        }

    # BULK UPDATE (clear payment_pending)
    logger.info("Starting bulk rollback...")

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

    logger.info(
        f"Rollback complete: {rolled_back_count} users restored to viewer access"
    )

    # Log affected users for audit trail
    rolled_back_users = await User.find(
        {
            "payment_pending": False,
            "role": "viewer",
            "updated_at": {"$gte": datetime.now(timezone.utc)},
        }
    ).limit(10).to_list()

    logger.info("Sample rolled back users:")
    for user in rolled_back_users:
        logger.info(f"  - {user.email} (ID: {user.id})")

    # TODO: Queue notification emails
    logger.info("TODO: Send apology/notification emails to affected users")

    return {
        "total_pending": total_pending,
        "rolled_back": rolled_back_count,
        "errors": total_pending - rolled_back_count,
    }


async def cleanup_abandoned_signups(days: int = 7, dry_run: bool = False) -> dict:
    """Clean up abandoned signups (payment_pending for >N days).

    Args:
        days: Delete users with payment_pending older than this many days
        dry_run: If True, only show what would be deleted

    Returns:
        Dictionary with cleanup statistics
    """
    await init_db()

    from datetime import timedelta

    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Find abandoned signups
    query = {
        "payment_pending": True,
        "payment_created_at": {"$lt": cutoff_date},
    }

    total_abandoned = await User.find(query).count()

    logger.info(
        f"{'[DRY RUN] ' if dry_run else ''}Found {total_abandoned} abandoned signups (>{days} days old)"
    )

    if total_abandoned == 0:
        logger.info("No abandoned signups to clean up")
        return {
            "total_abandoned": 0,
            "deleted": 0,
            "errors": 0,
        }

    if dry_run:
        # Show sample
        sample_users = await User.find(query).limit(10).to_list()
        logger.info(f"[DRY RUN] Sample abandoned signups:")
        for user in sample_users:
            age_days = (datetime.now(timezone.utc) - user.payment_created_at).days
            logger.info(
                f"  - {user.email} (ID: {user.id}, age: {age_days} days)"
            )

        return {
            "total_abandoned": total_abandoned,
            "deleted": 0,
            "errors": 0,
            "dry_run": True,
        }

    # DELETE abandoned signups
    logger.info("Starting cleanup...")

    delete_result = await User.get_motor_collection().delete_many(query)

    deleted_count = delete_result.deleted_count

    logger.info(f"Cleanup complete: {deleted_count} abandoned signups deleted")

    return {
        "total_abandoned": total_abandoned,
        "deleted": deleted_count,
        "errors": total_abandoned - deleted_count,
    }


async def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Rollback payment_pending migration or cleanup abandoned signups"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without making changes",
    )
    parser.add_argument(
        "--cleanup",
        action="store_true",
        help="Clean up abandoned signups instead of rollback",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="For cleanup: delete signups older than N days (default: 7)",
    )

    args = parser.parse_args()

    if args.cleanup:
        logger.info("=" * 80)
        logger.info(f"CLEANUP ABANDONED SIGNUPS (>{args.days} days old)")
        logger.info("=" * 80)

        if args.dry_run:
            logger.info("DRY RUN MODE - No changes will be made")
        else:
            confirm = input(
                f"This will DELETE users with payment_pending >{args.days} days. Continue? (yes/no): "
            )
            if confirm.lower() != "yes":
                logger.info("Cleanup cancelled")
                return

        stats = await cleanup_abandoned_signups(days=args.days, dry_run=args.dry_run)

        logger.info("=" * 80)
        logger.info("CLEANUP COMPLETE" if not args.dry_run else "DRY RUN COMPLETE")
        logger.info(f"Total abandoned signups: {stats['total_abandoned']}")
        logger.info(f"Deleted: {stats['deleted']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info("=" * 80)

    else:
        logger.info("=" * 80)
        logger.info("ROLLBACK PAYMENT_PENDING TO VIEWER")
        logger.info("=" * 80)

        if args.dry_run:
            logger.info("DRY RUN MODE - No changes will be made")
        else:
            confirm = input(
                "This will restore viewer access for all payment_pending users. Continue? (yes/no): "
            )
            if confirm.lower() != "yes":
                logger.info("Rollback cancelled")
                return

        stats = await rollback_payment_pending(dry_run=args.dry_run)

        logger.info("=" * 80)
        logger.info("ROLLBACK COMPLETE" if not args.dry_run else "DRY RUN COMPLETE")
        logger.info(f"Total payment_pending users: {stats['total_pending']}")
        logger.info(f"Rolled back: {stats['rolled_back']}")
        logger.info(f"Errors: {stats['errors']}")
        logger.info("=" * 80)

        if not args.dry_run and stats['rolled_back'] > 0:
            logger.info("")
            logger.info("NEXT STEPS:")
            logger.info("1. Disable REQUIRE_PAYMENT_ON_SIGNUP in settings")
            logger.info("2. Send apology emails to affected users")
            logger.info("3. Offer extended trial or discount code")
            logger.info("4. Review metrics to identify root cause")
            logger.info("")
            logger.info("To cleanup abandoned signups:")
            logger.info("  poetry run python scripts/rollback_payment_pending.py --cleanup --days 7")


if __name__ == "__main__":
    asyncio.run(main())
