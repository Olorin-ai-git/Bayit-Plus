"""
Household Membership Service

Manages household member invitations, acceptances, and removals.
"""

import uuid
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.models.household import Household, HouseholdRole, PendingInvitation
from app.models.user import User
from app.services.bayit_email_service import get_bayit_email_service

logger = logging.getLogger(__name__)


class HouseholdMembershipService:
    """Service for managing household memberships and invitations."""

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

        if not household.is_parent(inviter_id):
            raise PermissionError("Only parents can invite members")

        if household.get_invitation_by_email(invitee_email):
            raise ValueError("Invitation already sent to this email")

        invitation_id = str(uuid.uuid4())
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)

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

        inviter = await User.get(inviter_id)
        inviter_name = inviter.name if inviter else "A Bayit+ user"

        email_service = get_bayit_email_service()
        await email_service.send_household_invitation(
            to_email=invitee_email,
            inviter_name=inviter_name,
            household_name=household.name,
            invitation_code=invitation_id,
            role=role.value,
            expires_at=expires_at.strftime("%B %d, %Y at %I:%M %p UTC"),
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
        household = await Household.find_one(
            {"pending_invitations.invitation_id": invitation_code}
        )

        if not household:
            raise ValueError("Invalid invitation code")

        invitation = household.get_invitation_by_code(invitation_code)
        if not invitation:
            raise ValueError("Invitation not found")

        if invitation.expires_at < datetime.now(timezone.utc):
            household.remove_invitation(invitation_code)
            await household.save()
            raise ValueError("Invitation has expired")

        household.add_member(
            user_id=user_id, role=invitation.role, invited_by=invitation.invited_by
        )

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

        if not household.is_parent(requester_id):
            raise PermissionError("Only parents can remove members")

        if not household.remove_member(member_id):
            raise ValueError("Cannot remove household owner or member not found")

        await household.save()

        logger.info(
            f"User {member_id} removed from household {household_id} by {requester_id}"
        )

        return household


# Singleton instance
household_membership_service = HouseholdMembershipService()
