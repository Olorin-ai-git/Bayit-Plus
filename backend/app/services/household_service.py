"""
Household Service

Manages household creation, member management, invitations, and shared family controls.
"""

import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from app.models.household import (
    Household,
    HouseholdMember,
    HouseholdRole,
    PendingInvitation,
)
from app.models.family_controls import FamilyControls
from app.services.family_controls_service import family_controls_service
import logging

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
        # Check if user already belongs to a household
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
        # Check if user is owner
        household = await Household.find_one(Household.owner_id == user_id)
        if household:
            return household

        # Check if user is member
        household = await Household.find_one({"members.user_id": user_id})
        return household

    async def invite_member(
        self,
        household_id: str,
        inviter_id: str,
        invitee_email: str,
        role: HouseholdRole,
    ) -> dict:
        """
        Send invitation to join household.
        
        Args:
            household_id: Household ID
            inviter_id: User ID of inviter (must be parent)
            invitee_email: Email address of invitee
            role: Role being offered (CHILD or GUARDIAN)
            
        Returns:
            Dict with invitation_id and expires_at
            
        Raises:
            PermissionError: If inviter is not parent
            ValueError: If household not found or invitation already exists
        """
        household = await Household.find_one(Household.household_id == household_id)
        if not household:
            raise ValueError("Household not found")

        # Verify inviter is parent
        if not household.is_parent(inviter_id):
            raise PermissionError("Only parents can invite members")

        # Check for existing invitation
        if household.get_invitation_by_email(invitee_email):
            raise ValueError("Invitation already sent to this email")

        # Create invitation
        invitation_id = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=7)

        invitation = PendingInvitation(
            invitation_id=invitation_id,
            email=invitee_email,
            role=role,
            invited_by=inviter_id,
            expires_at=expires_at,
        )

        household.pending_invitations.append(invitation)
        await household.save()

        logger.info(
            f"Created invitation {invitation_id} for {invitee_email} to join household {household_id}"
        )

        return {
            "invitation_id": invitation_id,
            "expires_at": expires_at.isoformat(),
        }

    async def accept_invitation(
        self, user_id: str, invitation_code: str
    ) -> Household:
        """
        Accept household invitation and join as member.
        
        Args:
            user_id: User ID accepting invitation
            invitation_code: Invitation code (UUID)
            
        Returns:
            Household instance
            
        Raises:
            ValueError: If invitation not found or expired
        """
        # Find household with this invitation
        household = await Household.find_one(
            {"pending_invitations.invitation_id": invitation_code}
        )

        if not household:
            raise ValueError("Invalid invitation code")

        # Get invitation
        invitation = household.get_invitation_by_code(invitation_code)
        if not invitation:
            raise ValueError("Invitation not found")

        # Check expiration
        if invitation.expires_at < datetime.utcnow():
            household.remove_invitation(invitation_code)
            await household.save()
            raise ValueError("Invitation has expired")

        # Add member
        household.add_member(
            user_id=user_id, role=invitation.role, invited_by=invitation.invited_by
        )

        # Remove invitation
        household.remove_invitation(invitation_code)

        await household.save()

        logger.info(
            f"User {user_id} accepted invitation and joined household {household.household_id}"
        )

        return household

    async def remove_member(
        self, household_id: str, requester_id: str, member_id: str
    ) -> Household:
        """
        Remove member from household.
        
        Args:
            household_id: Household ID
            requester_id: User ID making request (must be parent)
            member_id: User ID to remove
            
        Returns:
            Updated Household instance
            
        Raises:
            PermissionError: If requester is not parent
            ValueError: If household not found or member is owner
        """
        household = await Household.find_one(Household.household_id == household_id)
        if not household:
            raise ValueError("Household not found")

        # Verify requester is parent
        if not household.is_parent(requester_id):
            raise PermissionError("Only parents can remove members")

        # Remove member
        if not household.remove_member(member_id):
            raise ValueError("Cannot remove household owner or member not found")

        await household.save()

        logger.info(
            f"User {member_id} removed from household {household_id} by {requester_id}"
        )

        return household

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

        # Verify requester is parent
        if not household.is_parent(requester_id):
            raise PermissionError("Only parents can update shared controls")

        # Verify controls exist
        controls = await family_controls_service.get_by_id(controls_id)
        if not controls:
            raise ValueError("Family controls not found")

        household.shared_controls_id = controls_id
        household.updated_at = datetime.utcnow()
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

        # Verify requester is owner
        if not household.is_owner(requester_id):
            raise PermissionError("Only household owner can delete household")

        await household.delete()

        logger.info(f"Household {household_id} deleted by owner {requester_id}")

        return True


# Singleton instance
household_service = HouseholdService()
