"""
Family Controls Viewing Service.

Handles time-based viewing restrictions and content rating checks.
"""

import logging
from typing import Optional

from app.models.family_controls import FamilyControls

logger = logging.getLogger(__name__)


class FamilyControlsViewingService:
    """Service for viewing time and content restriction checks."""

    @staticmethod
    async def check_viewing_allowed(user_id: str) -> tuple[bool, Optional[str]]:
        """
        Check if viewing is currently allowed based on time restrictions.

        Args:
            user_id: User ID

        Returns:
            Tuple of (is_allowed, reason_if_blocked)
        """
        controls = await FamilyControls.find_one({"user_id": user_id})
        if not controls:
            # No controls set up - allow by default
            return True, None

        if controls.is_viewing_allowed_now():
            return True, None

        return (
            False,
            f"Viewing is only allowed between {controls.viewing_start_hour}:00 and {controls.viewing_end_hour}:00",
        )

    @staticmethod
    async def check_content_allowed(
        user_id: str, content_rating: str, is_kids: bool = False
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
        controls = await FamilyControls.find_one({"user_id": user_id})
        if not controls:
            # No controls set up - allow by default
            return True, None

        if not controls.is_content_allowed(content_rating, is_kids):
            section = "Kids" if is_kids else "Youngsters"
            return (
                False,
                f"{section} content with rating {content_rating} is not allowed",
            )

        return True, None


# Global service instance
family_controls_viewing_service = FamilyControlsViewingService()
