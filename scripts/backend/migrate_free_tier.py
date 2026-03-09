"""
Migration: Free Tier Backfill

One-time migration to backfill subscription_tier and BetaCredit
for existing users transitioning to the freemium model.

Usage: poetry run python scripts/migrate_free_tier.py
"""

import asyncio
from datetime import datetime

from app.core.config import settings
from app.core.database import connect_to_mongo_subset
from app.core.logging_config import get_logger
from app.models.beta_credit import BetaCredit
from app.models.beta_credit_transaction import BetaCreditTransaction
from app.models.user import User

logger = get_logger(__name__)


async def _backfill_subscription_tier() -> int:
    """Set subscription_tier='free' for all users where it is null."""
    result = await User.find(
        {"subscription_tier": None}
    ).update_many({"$set": {"subscription_tier": "free"}})

    updated_count = result.modified_count if result else 0
    logger.info(
        "Backfilled subscription_tier",
        extra={"updated_count": updated_count},
    )
    return updated_count


async def _allocate_missing_credits() -> int:
    """Create BetaCredit documents for users without one."""
    allocated_count = 0
    credit_amount = settings.FREE_MONTHLY_CREDITS

    all_users = await User.find_all().to_list()

    for user in all_users:
        user_id = str(user.id)
        existing = await BetaCredit.find_one({"user_id": user_id})
        if existing:
            continue

        credit = BetaCredit(
            user_id=user_id,
            total_credits=credit_amount,
            used_credits=0,
            remaining_credits=credit_amount,
            is_expired=False,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        await credit.insert()

        transaction = BetaCreditTransaction(
            user_id=user_id,
            credit_id=str(credit.id),
            transaction_type="credit",
            amount=credit_amount,
            balance_after=credit_amount,
            metadata={"event": "freemium_migration"},
            created_at=datetime.utcnow(),
        )
        await transaction.insert()
        allocated_count += 1

    logger.info(
        "Allocated credits for users without BetaCredit",
        extra={
            "allocated_count": allocated_count,
            "credit_amount": credit_amount,
        },
    )
    return allocated_count


async def run_migration() -> None:
    """Execute the free tier migration."""
    logger.info("Starting free tier migration")

    await connect_to_mongo_subset([
        User, BetaCredit, BetaCreditTransaction,
    ])

    tier_count = await _backfill_subscription_tier()
    credit_count = await _allocate_missing_credits()

    logger.info(
        "Free tier migration complete",
        extra={
            "users_tier_updated": tier_count,
            "users_credits_allocated": credit_count,
        },
    )


if __name__ == "__main__":
    asyncio.run(run_migration())
