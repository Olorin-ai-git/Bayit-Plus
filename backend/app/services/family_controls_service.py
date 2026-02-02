"""
Family Controls Service.

Core service for managing unified parental controls.
Handles PIN verification, settings management, and CRUD operations.
"""

import logging
from datetime import datetime, timezone
from typing import Optional

from app.core.security import get_password_hash, verify_password
from app.models.family_controls import FamilyControls
from app.models.family_controls_schemas import FamilyControlsResponse

logger = logging.getLogger(__name__)


class FamilyControlsService:
    """Core service for managing family parental controls."""

    @staticmethod
    async def setup_family_controls(
        user_id: str,
        pin: str,
        kids_age_limit: int = 12,
        youngsters_age_limit: int = 17,
    ) -> FamilyControls:
        """
        Initial setup of family controls for a user.

        Args:
            user_id: Parent/guardian user ID
            pin: Plain text PIN (will be hashed)
            kids_age_limit: Maximum age for kids content
            youngsters_age_limit: Maximum age for youngsters content

        Returns:
            Created FamilyControls instance
        """
        # Check if controls already exist
        existing = await FamilyControls.find_one(FamilyControls.user_id == user_id)
        if existing:
            logger.warning(f"Family controls already exist for user {user_id}")
            return existing

        # Hash PIN
        pin_hash = get_password_hash(pin)

        # Create family controls
        controls = FamilyControls(
            user_id=user_id,
            pin_hash=pin_hash,
            kids_age_limit=kids_age_limit,
            youngsters_age_limit=youngsters_age_limit,
            kids_enabled=True,
            youngsters_enabled=True,
            max_content_rating="PG-13",
            viewing_hours_enabled=False,
        )

        await controls.save()
        logger.info(f"Created family controls for user {user_id}")

        return controls

    @staticmethod
    async def get_controls(user_id: str) -> Optional[FamilyControls]:
        """
        Get family controls for a user.

        Args:
            user_id: User ID

        Returns:
            FamilyControls instance or None if not set up
        """
        return await FamilyControls.find_one(FamilyControls.user_id == user_id)

    @staticmethod
    async def get_by_id(controls_id: str) -> Optional[FamilyControls]:
        """
        Get family controls by ID.

        Args:
            controls_id: FamilyControls document ID

        Returns:
            FamilyControls instance or None if not found
        """
        return await FamilyControls.get(controls_id)

    @staticmethod
    async def verify_pin(user_id: str, pin: str) -> bool:
        """
        Verify family PIN with account lockout protection.

        Args:
            user_id: User ID
            pin: Plain text PIN to verify

        Returns:
            True if PIN is correct, False otherwise

        Raises:
            ValueError: If PIN is locked due to too many failed attempts
        """
        controls = await FamilyControls.find_one(FamilyControls.user_id == user_id)
        if not controls:
            logger.warning(f"No family controls found for user {user_id}")
            return False

        # Check if PIN is locked
        if controls.is_pin_locked():
            lockout_remaining = (
                controls.pin_locked_until - datetime.now(timezone.utc)
            ).total_seconds() / 60
            logger.warning(
                f"PIN locked for user {user_id}, {lockout_remaining:.1f} minutes remaining"
            )
            raise ValueError(
                f"Account locked due to too many failed attempts. Try again in {int(lockout_remaining)} minutes."
            )

        # Verify PIN
        is_valid = verify_password(pin, controls.pin_hash)

        if is_valid:
            # Reset failed attempts on successful verification
            await controls.reset_failed_attempts()
            logger.info(f"PIN verified successfully for user {user_id}")
            return True
        else:
            # Record failed attempt (will lock after 5 attempts)
            await controls.record_failed_attempt(max_attempts=5, lockout_minutes=15)
            logger.warning(
                f"Failed PIN attempt for user {user_id} (attempt #{controls.failed_pin_attempts})"
            )
            return False

    @staticmethod
    async def update_pin(user_id: str, old_pin: str, new_pin: str) -> bool:
        """
        Update family PIN with account lockout protection.

        Args:
            user_id: User ID
            old_pin: Current PIN for verification
            new_pin: New PIN to set

        Returns:
            True if PIN was updated, False if old PIN incorrect

        Raises:
            ValueError: If PIN is locked due to too many failed attempts
        """
        controls = await FamilyControls.find_one(FamilyControls.user_id == user_id)
        if not controls:
            logger.warning(f"No family controls found for user {user_id}")
            return False

        # Check if PIN is locked (prevent bypass via PIN reset)
        if controls.is_pin_locked():
            lockout_remaining = (
                controls.pin_locked_until - datetime.now(timezone.utc)
            ).total_seconds() / 60
            logger.warning(
                f"PIN locked for user {user_id} during PIN update attempt, {lockout_remaining:.1f} minutes remaining"
            )
            raise ValueError(
                f"Account locked due to too many failed attempts. Try again in {int(lockout_remaining)} minutes."
            )

        # Verify old PIN
        if not verify_password(old_pin, controls.pin_hash):
            # Record failed attempt (will lock after 5 attempts)
            await controls.record_failed_attempt(max_attempts=5, lockout_minutes=15)
            logger.warning(
                f"Invalid old PIN for user {user_id} during PIN update (attempt #{controls.failed_pin_attempts})"
            )
            return False

        # Hash and set new PIN
        controls.pin_hash = get_password_hash(new_pin)
        controls.updated_at = datetime.now(timezone.utc)
        # Reset failed attempts on successful PIN update
        await controls.reset_failed_attempts()
        await controls.save()

        logger.info(f"Updated family PIN for user {user_id}")
        return True

    @staticmethod
    async def update_settings(
        user_id: str,
        kids_age_limit: Optional[int] = None,
        youngsters_age_limit: Optional[int] = None,
        kids_enabled: Optional[bool] = None,
        youngsters_enabled: Optional[bool] = None,
        max_content_rating: Optional[str] = None,
        viewing_hours_enabled: Optional[bool] = None,
        viewing_start_hour: Optional[int] = None,
        viewing_end_hour: Optional[int] = None,
    ) -> Optional[FamilyControls]:
        """
        Update family control settings.

        Args:
            user_id: User ID
            **kwargs: Settings to update (None values are ignored)

        Returns:
            Updated FamilyControls instance or None if not found
        """
        controls = await FamilyControls.find_one(FamilyControls.user_id == user_id)
        if not controls:
            logger.warning(f"No family controls found for user {user_id}")
            return None

        await controls.update_settings(
            kids_age_limit=kids_age_limit,
            youngsters_age_limit=youngsters_age_limit,
            kids_enabled=kids_enabled,
            youngsters_enabled=youngsters_enabled,
            max_content_rating=max_content_rating,
            viewing_hours_enabled=viewing_hours_enabled,
            viewing_start_hour=viewing_start_hour,
            viewing_end_hour=viewing_end_hour,
        )

        logger.info(f"Updated family controls for user {user_id}")
        return controls

    @staticmethod
    def format_response(controls: FamilyControls) -> dict:
        """
        Format FamilyControls for API response.

        Args:
            controls: FamilyControls instance

        Returns:
            Dictionary suitable for API response
        """
        return {
            "user_id": controls.user_id,
            "kids_age_limit": controls.kids_age_limit,
            "youngsters_age_limit": controls.youngsters_age_limit,
            "kids_enabled": controls.kids_enabled,
            "youngsters_enabled": controls.youngsters_enabled,
            "max_content_rating": controls.max_content_rating,
            "viewing_hours_enabled": controls.viewing_hours_enabled,
            "viewing_start_hour": controls.viewing_start_hour,
            "viewing_end_hour": controls.viewing_end_hour,
            "created_at": controls.created_at.isoformat(),
            "updated_at": controls.updated_at.isoformat(),
        }


# Global service instance
family_controls_service = FamilyControlsService()

# Re-export services for backward compatibility
from app.services.family_controls_viewing_service import (
    family_controls_viewing_service,
)
from app.services.family_controls_migration_service import (
    family_controls_migration_service,
)

# Legacy aliases
check_viewing_allowed = family_controls_viewing_service.check_viewing_allowed
check_content_allowed = family_controls_viewing_service.check_content_allowed
migrate_from_legacy_controls = (
    family_controls_migration_service.migrate_from_legacy_controls
)
