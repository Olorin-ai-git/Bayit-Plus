"""
Profile Controls Service

Manages per-profile family controls with household inheritance.
Determines which controls apply to each profile (household vs custom).
"""

import logging
from typing import Optional

from app.models.profile import Profile
from app.models.family_controls import FamilyControls
from app.models.household import Household
from app.services.family_controls_service import family_controls_service

logger = logging.getLogger(__name__)


class ProfileControlsService:
    """Service for profile-aware family controls."""

    async def get_effective_controls(
        self, profile_id: str
    ) -> Optional[FamilyControls]:
        """
        Get effective family controls for a profile.

        Control Hierarchy:
        1. If profile has custom_controls_id, use those controls
        2. Else if profile inherits household controls, use household shared controls
        3. Else return None (no controls)

        Args:
            profile_id: Profile ID

        Returns:
            FamilyControls if applicable, None otherwise
        """
        profile = await Profile.get(profile_id)
        if not profile:
            raise ValueError("Profile not found")

        if not profile.inherit_household_controls and profile.custom_controls_id:
            controls = await family_controls_service.get_by_id(
                profile.custom_controls_id
            )
            logger.info(f"Using custom controls for profile {profile_id}")
            return controls

        if profile.inherit_household_controls:
            household = await Household.find_one(
                {"members.user_id": profile.user_id}
            )

            if household and household.shared_controls_id:
                controls = await family_controls_service.get_by_id(
                    household.shared_controls_id
                )
                logger.info(
                    f"Using household controls for profile {profile_id}"
                )
                return controls

        logger.info(f"No family controls for profile {profile_id}")
        return None

    async def set_custom_controls(
        self, profile_id: str, controls_id: str
    ) -> Profile:
        """
        Set custom family controls for a profile.

        Args:
            profile_id: Profile ID
            controls_id: FamilyControls ID

        Returns:
            Updated Profile

        Raises:
            ValueError: If profile or controls not found
        """
        profile = await Profile.get(profile_id)
        if not profile:
            raise ValueError("Profile not found")

        controls = await family_controls_service.get_by_id(controls_id)
        if not controls:
            raise ValueError("Family controls not found")

        profile.custom_controls_id = controls_id
        profile.inherit_household_controls = False
        await profile.save()

        logger.info(
            f"Set custom controls {controls_id} for profile {profile_id}"
        )

        return profile

    async def inherit_household_controls(self, profile_id: str) -> Profile:
        """
        Configure profile to inherit household controls.

        Args:
            profile_id: Profile ID

        Returns:
            Updated Profile

        Raises:
            ValueError: If profile not found
        """
        profile = await Profile.get(profile_id)
        if not profile:
            raise ValueError("Profile not found")

        profile.inherit_household_controls = True
        profile.custom_controls_id = None
        await profile.save()

        logger.info(
            f"Profile {profile_id} now inherits household controls"
        )

        return profile

    async def get_controls_source(
        self, profile_id: str
    ) -> dict:
        """
        Get information about which controls source is active.

        Args:
            profile_id: Profile ID

        Returns:
            Dict with source info:
            - source: "household" | "custom" | "none"
            - controls_id: ID of active controls (if any)
            - inherit_household_controls: Boolean flag
        """
        profile = await Profile.get(profile_id)
        if not profile:
            raise ValueError("Profile not found")

        if not profile.inherit_household_controls and profile.custom_controls_id:
            return {
                "source": "custom",
                "controls_id": profile.custom_controls_id,
                "inherit_household_controls": False,
            }

        if profile.inherit_household_controls:
            household = await Household.find_one(
                {"members.user_id": profile.user_id}
            )

            if household and household.shared_controls_id:
                return {
                    "source": "household",
                    "controls_id": household.shared_controls_id,
                    "inherit_household_controls": True,
                }

        return {
            "source": "none",
            "controls_id": None,
            "inherit_household_controls": profile.inherit_household_controls,
        }


# Singleton instance
profile_controls_service = ProfileControlsService()
