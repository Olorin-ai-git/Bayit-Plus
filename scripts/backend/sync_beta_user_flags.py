"""
Sync Beta User Flags

Queries all active BetaUser documents, finds matching User by email,
and sets is_beta_user = True on the User document.

Also marks expired beta users as is_beta_user = False.

Run after backfill_beta_content_field.py to ensure the is_beta_user
field exists on all user documents.
"""

import asyncio
import logging

from app.core.config import settings
from app.models.beta_user import BetaUser
from app.models.content import Content, LiveChannel, Podcast, RadioStation
from app.models.user import User
from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def sync_beta_flags():
    """Sync is_beta_user flag from BetaUser collection to User collection."""
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]

    await init_beanie(
        database=db,
        document_models=[
            Content, LiveChannel, RadioStation, Podcast,
            User, BetaUser,
        ],
    )

    # Find all active beta users
    active_beta_users = await BetaUser.find(
        BetaUser.status == "active"
    ).to_list()

    activated_count = 0
    for beta_user in active_beta_users:
        if beta_user.is_expired():
            continue

        user = await User.find_one(User.email == beta_user.email)
        if user and not getattr(user, "is_beta_user", False):
            user.is_beta_user = True
            await user.save()
            activated_count += 1
            logger.info("Set is_beta_user=True for %s", user.email)

    # Find expired beta users and clear their flags
    expired_beta_users = await BetaUser.find(
        BetaUser.status.in_(["expired", "suspended"])
    ).to_list()

    deactivated_count = 0
    for beta_user in expired_beta_users:
        user = await User.find_one(User.email == beta_user.email)
        if user and getattr(user, "is_beta_user", False):
            user.is_beta_user = False
            await user.save()
            deactivated_count += 1
            logger.info("Set is_beta_user=False for %s", user.email)

    logger.info(
        "Sync complete: %d activated, %d deactivated",
        activated_count,
        deactivated_count,
    )
    client.close()


if __name__ == "__main__":
    asyncio.run(sync_beta_flags())
