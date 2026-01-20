"""
Family Controls Service.

Manages unified parental controls for kids and youngsters content.
Handles PIN verification, settings management, and migration from legacy controls.
"""
import logging
from typing import Optional
from datetime import datetime

from app.models.family_controls import FamilyControls, FamilyControlsResponse
from app.models.user import User
from app.core.security import get_password_hash, verify_password


logger = logging.getLogger(__name__)


class FamilyControlsService:
    """Service for managing family parental controls."""

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
    async def verify_pin(user_id: str, pin: str) -> bool:
        """
        Verify family PIN.

        Args:
            user_id: User ID
            pin: Plain text PIN to verify

        Returns:
            True if PIN is correct, False otherwise
        """
        controls = await FamilyControls.find_one(FamilyControls.user_id == user_id)
        if not controls:
            logger.warning(f"No family controls found for user {user_id}")
            return False

        return verify_password(pin, controls.pin_hash)

    @staticmethod
    async def update_pin(user_id: str, old_pin: str, new_pin: str) -> bool:
        """
        Update family PIN.

        Args:
            user_id: User ID
            old_pin: Current PIN for verification
            new_pin: New PIN to set

        Returns:
            True if PIN was updated, False if old PIN incorrect
        """
        controls = await FamilyControls.find_one(FamilyControls.user_id == user_id)
        if not controls:
            logger.warning(f"No family controls found for user {user_id}")
            return False

        # Verify old PIN
        if not verify_password(old_pin, controls.pin_hash):
            logger.warning(f"Invalid old PIN for user {user_id}")
            return False

        # Hash and set new PIN
        controls.pin_hash = get_password_hash(new_pin)
        controls.updated_at = datetime.utcnow()
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
    async def check_viewing_allowed(user_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if viewing is currently allowed based on time restrictions.

        Args:
            user_id: User ID

        Returns:
            Tuple of (is_allowed, reason_if_blocked)
        """
        controls = await FamilyControls.find_one(FamilyControls.user_id == user_id)
        if not controls:
            # No controls set up - allow by default
            return True, None

        if controls.is_viewing_allowed_now():
            return True, None

        return False, f"Viewing is only allowed between {controls.viewing_start_hour}:00 and {controls.viewing_end_hour}:00"

    @staticmethod
    async def check_content_allowed(
        user_id: str,
        content_rating: str,
        is_kids: bool = False
    ) -> tuple[bool, Optional[str]]:
        """
        Check if specific content is allowed based on controls.

        Args:
            user_id: User ID
            content_rating: Content rating (G, PG, PG-13, etc.)
            is_kids: Whether this is kids content

        Returns:
            Tuple of (is_allowed, reason_if_blocked)
        """
        controls = await FamilyControls.find_one(FamilyControls.user_id == user_id)
        if not controls:
            # No controls set up - allow by default
            return True, None

        if not controls.is_content_allowed(content_rating, is_kids):
            section = "Kids" if is_kids else "Youngsters"
            return False, f"{section} content with rating {content_rating} is not allowed"

        return True, None

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
        has_youngsters_pin = hasattr(user, "youngsters_pin_hash") and user.youngsters_pin_hash

        if not has_kids_pin and not has_youngsters_pin:
            logger.info(f"No legacy controls to migrate for user {user.id}")
            return None

        # Check if already migrated
        existing = await FamilyControls.find_one(FamilyControls.user_id == str(user.id))
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
        logger.info(f"Migrated legacy controls to unified family controls for user {user.id}")

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
