"""
Family Controls Migration Service.

Handles migration from legacy kids/youngsters PIN systems to unified family controls.
"""

import logging
from typing import Optional

from app.models.family_controls import FamilyControls
from app.models.user import User

logger = logging.getLogger(__name__)


class FamilyControlsMigrationService:
    """Service for migrating legacy parental control systems."""

    @staticmethod
    async def migrate_from_legacy_controls(user: User) -> Optional[FamilyControls]:
        """
        Migrate from legacy kids/youngsters PIN systems to unified family controls.

        Args:
            user: User object with legacy PIN fields

        Returns:
            Created FamilyControls instance or None if no legacy controls found
        """
        # Check if user has legacy kids or youngsters PINs
        has_kids_pin = hasattr(user, "kids_pin_hash") and user.kids_pin_hash
        has_youngsters_pin = (
            hasattr(user, "youngsters_pin_hash") and user.youngsters_pin_hash
        )

        if not has_kids_pin and not has_youngsters_pin:
            logger.info(f"No legacy controls to migrate for user {user.id}")
            return None

        # Check if already migrated
        existing = await FamilyControls.find_one(
            {"user_id": str(user.id)}
)
        if existing:
            logger.info(f"User {user.id} already has unified family controls")
            return existing

        # Prefer kids PIN if both exist (assume it's the primary one)
        pin_hash = user.kids_pin_hash if has_kids_pin else user.youngsters_pin_hash

        # Create unified controls
        controls = FamilyControls(
            user_id=str(user.id),
            pin_hash=pin_hash,
            kids_age_limit=getattr(user, "kids_age_limit", 12),
            youngsters_age_limit=getattr(user, "youngsters_age_limit", 17),
            kids_enabled=True,
            youngsters_enabled=True,
            max_content_rating="PG-13",
            viewing_hours_enabled=False,
        )

        await controls.save()
        logger.info(
            f"Migrated legacy controls to unified family controls for user {user.id}"
        )

        return controls


# Global service instance
family_controls_migration_service = FamilyControlsMigrationService()
