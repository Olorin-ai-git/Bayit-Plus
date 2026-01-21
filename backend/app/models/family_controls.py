"""
Family Controls Model.

Unified parental control system for kids and youngsters content.
Provides age-based restrictions, content rating limits, and optional time-based controls.
"""

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field


class FamilyControls(Document):
    """
    Unified family parental controls for kids and youngsters content.

    Replaces separate kids/youngsters PIN systems with a single family control model.
    """

    # Parent/guardian user ID
    user_id: str = Field(..., description="Parent/guardian user ID")

    # Unified family PIN (hashed)
    pin_hash: str = Field(..., description="Hashed family PIN for parental controls")

    # Age restrictions per section
    kids_age_limit: int = Field(
        default=12, ge=0, le=12, description="Maximum age for kids content (0-12)"
    )
    youngsters_age_limit: int = Field(
        default=17,
        ge=12,
        le=17,
        description="Maximum age for youngsters content (12-17)",
    )

    # Section access controls
    kids_enabled: bool = Field(default=True, description="Enable kids content access")
    youngsters_enabled: bool = Field(
        default=True, description="Enable youngsters content access"
    )

    # Content rating restrictions
    max_content_rating: str = Field(
        default="PG-13", description="Maximum allowed content rating (G, PG, PG-13)"
    )

    # Time-based restrictions (optional)
    viewing_hours_enabled: bool = Field(
        default=False, description="Enable time-based viewing restrictions"
    )
    viewing_start_hour: int = Field(
        default=6,
        ge=0,
        le=23,
        description="Start hour for allowed viewing (24-hour format)",
    )
    viewing_end_hour: int = Field(
        default=22,
        ge=0,
        le=23,
        description="End hour for allowed viewing (24-hour format)",
    )

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "family_controls"
        indexes = [
            "user_id",
        ]

    @classmethod
    async def get_or_create_for_user(
        cls, user_id: str, pin_hash: str
    ) -> "FamilyControls":
        """
        Get existing family controls or create default for user.

        Args:
            user_id: Parent/guardian user ID
            pin_hash: Hashed PIN for initial setup

        Returns:
            FamilyControls instance
        """
        controls = await cls.find_one(cls.user_id == user_id)

        if not controls:
            controls = cls(
                user_id=user_id,
                pin_hash=pin_hash,
                kids_age_limit=12,
                youngsters_age_limit=17,
                kids_enabled=True,
                youngsters_enabled=True,
                max_content_rating="PG-13",
                viewing_hours_enabled=False,
            )
            await controls.save()

        return controls

    async def update_settings(
        self,
        kids_age_limit: Optional[int] = None,
        youngsters_age_limit: Optional[int] = None,
        kids_enabled: Optional[bool] = None,
        youngsters_enabled: Optional[bool] = None,
        max_content_rating: Optional[str] = None,
        viewing_hours_enabled: Optional[bool] = None,
        viewing_start_hour: Optional[int] = None,
        viewing_end_hour: Optional[int] = None,
    ) -> None:
        """
        Update family control settings.

        Only updates provided fields (None values are ignored).
        """
        if kids_age_limit is not None:
            self.kids_age_limit = kids_age_limit
        if youngsters_age_limit is not None:
            self.youngsters_age_limit = youngsters_age_limit
        if kids_enabled is not None:
            self.kids_enabled = kids_enabled
        if youngsters_enabled is not None:
            self.youngsters_enabled = youngsters_enabled
        if max_content_rating is not None:
            self.max_content_rating = max_content_rating
        if viewing_hours_enabled is not None:
            self.viewing_hours_enabled = viewing_hours_enabled
        if viewing_start_hour is not None:
            self.viewing_start_hour = viewing_start_hour
        if viewing_end_hour is not None:
            self.viewing_end_hour = viewing_end_hour

        self.updated_at = datetime.utcnow()
        await self.save()

    def is_viewing_allowed_now(self) -> bool:
        """
        Check if viewing is allowed at current time.

        Returns:
            True if viewing hours are disabled or current time is within allowed hours
        """
        if not self.viewing_hours_enabled:
            return True

        now = datetime.utcnow()
        current_hour = now.hour

        # Handle overnight time ranges (e.g., 22:00 to 06:00)
        if self.viewing_start_hour <= self.viewing_end_hour:
            return self.viewing_start_hour <= current_hour < self.viewing_end_hour
        else:
            return (
                current_hour >= self.viewing_start_hour
                or current_hour < self.viewing_end_hour
            )

    def is_content_allowed(self, content_rating: str, is_kids: bool = False) -> bool:
        """
        Check if content with given rating is allowed.

        Args:
            content_rating: Content rating (G, PG, PG-13, etc.)
            is_kids: Whether this is kids content (affects section enable check)

        Returns:
            True if content is allowed under current restrictions
        """
        # Check section access
        if is_kids and not self.kids_enabled:
            return False
        if not is_kids and not self.youngsters_enabled:
            return False

        # Check content rating
        rating_hierarchy = {
            "G": 0,
            "TV-G": 0,
            "PG": 1,
            "TV-PG": 1,
            "PG-13": 2,
            "TV-14": 2,
            "R": 3,
            "TV-MA": 3,
        }

        content_level = rating_hierarchy.get(content_rating, 99)
        max_level = rating_hierarchy.get(self.max_content_rating, 2)

        return content_level <= max_level


# Response models
class FamilyControlsResponse(Document):
    """API response model for family controls."""

    user_id: str
    kids_age_limit: int
    youngsters_age_limit: int
    kids_enabled: bool
    youngsters_enabled: bool
    max_content_rating: str
    viewing_hours_enabled: bool
    viewing_start_hour: int
    viewing_end_hour: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class FamilyControlsUpdate(Document):
    """Request model for updating family controls."""

    new_pin: Optional[str] = None
    kids_age_limit: Optional[int] = Field(None, ge=0, le=12)
    youngsters_age_limit: Optional[int] = Field(None, ge=12, le=17)
    kids_enabled: Optional[bool] = None
    youngsters_enabled: Optional[bool] = None
    max_content_rating: Optional[str] = None
    viewing_hours_enabled: Optional[bool] = None
    viewing_start_hour: Optional[int] = Field(None, ge=0, le=23)
    viewing_end_hour: Optional[int] = Field(None, ge=0, le=23)
