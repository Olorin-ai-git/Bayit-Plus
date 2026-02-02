"""
Household Service

Manages household creation, member management, invitations, and shared family controls.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from app.models.household import Household, HouseholdMember, HouseholdRole, PendingInvitation
from app.models.family_controls import FamilyControls
from app.services.family_controls_service import family_controls_service
from app.services.household_membership_service import household_membership_service

logger = logging.getLogger(__name__)


class HouseholdService:
    """Service for managing households and family account linking."""

    async def create_household(self, owner_id: str, name: str) -> Household:
        """
        Create new household with owner as primary parent.

        Args:
            owner_id: User ID of household owner
            name: Household name (e.g., "Smith Family")

        Returns:
            Created Household instance
        """
        existing = await self.get_household_for_user(owner_id)
        if existing:
            raise ValueError("User already belongs to a household")

        household = Household(
            household_id=str(uuid.uuid4()),
            name=name,
            owner_id=owner_id,
            members=[
                HouseholdMember(user_id=owner_id, role=HouseholdRole.PARENT)
            ],
        )

        await household.insert()
        logger.info(f"Created household {household.household_id} for owner {owner_id}")
        return household

    async def get_household_for_user(self, user_id: str) -> Optional[Household]:
        """
        Get household that user belongs to.

        Args:
            user_id: User ID to search for

        Returns:
            Household if found, None otherwise
        """
        household = await Household.find_one(Household.owner_id == user_id)
        if household:
            return household

        household = await Household.find_one({"members.user_id": user_id})
        return household

    async def invite_member(
        self,
        household_id: str,
        inviter_id: str,
        invitee_email: str,
        role: HouseholdRole,
    ) -> dict:
        """Delegate to household_membership_service."""
        return await household_membership_service.invite_member(
            household_id, inviter_id, invitee_email, role
        )

    async def accept_invitation(
        self, user_id: str, invitation_code: str
    ) -> Household:
        """Delegate to household_membership_service."""
        return await household_membership_service.accept_invitation(
            user_id, invitation_code
        )

    async def remove_member(
        self, household_id: str, requester_id: str, member_id: str
    ) -> Household:
        """Delegate to household_membership_service."""
        return await household_membership_service.remove_member(
            household_id, requester_id, member_id
        )

    async def get_shared_controls(self, user_id: str) -> Optional[FamilyControls]:
        """
        Get family controls for user's household.

        Args:
            user_id: User ID

        Returns:
            FamilyControls if household has shared controls, None otherwise
        """
        household = await self.get_household_for_user(user_id)
        if not household or not household.shared_controls_id:
            return None

        controls = await family_controls_service.get_by_id(
            household.shared_controls_id
        )
        return controls

    async def update_shared_controls(
        self, household_id: str, requester_id: str, controls_id: str
    ) -> Household:
        """
        Update household's shared family controls.

        Args:
            household_id: Household ID
            requester_id: User ID making request (must be parent)
            controls_id: FamilyControls ID to set as shared

        Returns:
            Updated Household instance

        Raises:
            PermissionError: If requester is not parent
            ValueError: If household or controls not found
        """
        household = await Household.find_one(Household.household_id == household_id)
        if not household:
            raise ValueError("Household not found")

        if not household.is_parent(requester_id):
            raise PermissionError("Only parents can update shared controls")

        controls = await family_controls_service.get_by_id(controls_id)
        if not controls:
            raise ValueError("Family controls not found")

        household.shared_controls_id = controls_id
        household.updated_at = datetime.now(timezone.utc)
        await household.save()

        logger.info(
            f"Updated shared controls for household {household_id} to {controls_id}"
        )

        return household

    async def delete_household(self, household_id: str, requester_id: str) -> bool:
        """
        Delete household (owner only).

        Args:
            household_id: Household ID
            requester_id: User ID making request (must be owner)

        Returns:
            True if deleted

        Raises:
            PermissionError: If requester is not owner
            ValueError: If household not found
        """
        household = await Household.find_one(Household.household_id == household_id)
        if not household:
            raise ValueError("Household not found")

        if not household.is_owner(requester_id):
            raise PermissionError("Only household owner can delete household")

        await household.delete()

        logger.info(f"Household {household_id} deleted by owner {requester_id}")

        return True


# Singleton instance
household_service = HouseholdService()
