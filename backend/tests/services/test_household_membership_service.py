"""
Unit tests for Household Membership Service.

Tests household invitations, acceptance, and member management.
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch

from app.models.household import Household, HouseholdMember, HouseholdRole
from app.models.user import User
from app.services.household_membership_service import (
    household_membership_service,
)


@pytest.mark.asyncio
class TestHouseholdMembershipService:
    """Test suite for HouseholdMembershipService."""

    async def test_invite_member_success(self, db_session):
        """Test successful member invitation."""
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                )
            ],
        )
        await household.insert()

        user = User(
            email="parent@test.com",
            name="Parent User",
            is_active=True,
        )
        await user.save()

        # Mock email service to avoid actual email sending
        with patch(
            "app.services.household_membership_service.send_household_invitation",
            new_callable=AsyncMock,
        ) as mock_email:
            mock_email.return_value = True

            result = await household_membership_service.invite_member(
                household_id="hh123",
                inviter_id="parent123",
                invitee_email="child@test.com",
                role=HouseholdRole.CHILD,
            )

        assert "invitation_id" in result
        assert "expires_at" in result
        assert mock_email.called

        # Verify invitation was added to household
        updated = await Household.find_one(
            Household.household_id == "hh123"
        )
        assert len(updated.pending_invitations) == 1
        assert updated.pending_invitations[0].email == "child@test.com"
        assert updated.pending_invitations[0].role == HouseholdRole.CHILD

    async def test_invite_member_not_parent(self, db_session):
        """Test invitation fails if inviter is not parent."""
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                ),
                HouseholdMember(
                    user_id="child123", role=HouseholdRole.CHILD
                ),
            ],
        )
        await household.insert()

        with pytest.raises(PermissionError, match="Only parents can invite"):
            await household_membership_service.invite_member(
                household_id="hh123",
                inviter_id="child123",
                invitee_email="friend@test.com",
                role=HouseholdRole.CHILD,
            )

    async def test_invite_member_already_invited(self, db_session):
        """Test invitation fails if email already invited."""
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                )
            ],
        )
        await household.insert()

        # Add first invitation
        with patch(
            "app.services.household_membership_service.send_household_invitation",
            new_callable=AsyncMock,
        ):
            await household_membership_service.invite_member(
                household_id="hh123",
                inviter_id="parent123",
                invitee_email="child@test.com",
                role=HouseholdRole.CHILD,
            )

        # Try to invite same email again
        with pytest.raises(
            ValueError, match="Invitation already sent to this email"
        ):
            await household_membership_service.invite_member(
                household_id="hh123",
                inviter_id="parent123",
                invitee_email="child@test.com",
                role=HouseholdRole.CHILD,
            )

    async def test_accept_invitation_success(self, db_session):
        """Test successful invitation acceptance."""
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                )
            ],
        )
        await household.insert()

        # Add invitation
        with patch(
            "app.services.household_membership_service.send_household_invitation",
            new_callable=AsyncMock,
        ):
            invite = await household_membership_service.invite_member(
                household_id="hh123",
                inviter_id="parent123",
                invitee_email="child@test.com",
                role=HouseholdRole.CHILD,
            )

        # Accept invitation
        result = await household_membership_service.accept_invitation(
            user_id="child123",
            invitation_code=invite["invitation_id"],
        )

        assert result.household_id == "hh123"
        assert len(result.members) == 2
        assert len(result.pending_invitations) == 0

        # Verify new member added
        child_member = next(
            (m for m in result.members if m.user_id == "child123"), None
        )
        assert child_member is not None
        assert child_member.role == HouseholdRole.CHILD

    async def test_accept_invitation_expired(self, db_session):
        """Test accepting expired invitation fails."""
        from datetime import timedelta

        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                )
            ],
        )
        await household.insert()

        # Add invitation with past expiration
        with patch(
            "app.services.household_membership_service.send_household_invitation",
            new_callable=AsyncMock,
        ):
            with patch(
                "app.services.household_membership_service.datetime"
            ) as mock_datetime:
                past_time = datetime.now(timezone.utc) - timedelta(days=8)
                mock_datetime.now.return_value = past_time

                invite = await household_membership_service.invite_member(
                    household_id="hh123",
                    inviter_id="parent123",
                    invitee_email="child@test.com",
                    role=HouseholdRole.CHILD,
                )

        # Try to accept expired invitation
        with pytest.raises(ValueError, match="Invitation has expired"):
            await household_membership_service.accept_invitation(
                user_id="child123",
                invitation_code=invite["invitation_id"],
            )

    async def test_remove_member_success(self, db_session):
        """Test successful member removal."""
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                ),
                HouseholdMember(
                    user_id="child123", role=HouseholdRole.CHILD
                ),
            ],
        )
        await household.insert()

        # Remove child member
        result = await household_membership_service.remove_member(
            household_id="hh123",
            requester_id="parent123",
            member_id="child123",
        )

        assert len(result.members) == 1
        assert result.members[0].user_id == "parent123"

    async def test_remove_member_not_parent(self, db_session):
        """Test removal fails if requester is not parent."""
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                ),
                HouseholdMember(
                    user_id="child123", role=HouseholdRole.CHILD
                ),
            ],
        )
        await household.insert()

        with pytest.raises(
            PermissionError, match="Only parents can remove members"
        ):
            await household_membership_service.remove_member(
                household_id="hh123",
                requester_id="child123",
                member_id="parent123",
            )

    async def test_remove_member_cannot_remove_owner(self, db_session):
        """Test cannot remove household owner."""
        household = Household(
            household_id="hh123",
            name="Test Household",
            owner_id="parent123",
            members=[
                HouseholdMember(
                    user_id="parent123", role=HouseholdRole.PARENT
                )
            ],
        )
        await household.insert()

        with pytest.raises(
            ValueError,
            match="Cannot remove household owner or member not found",
        ):
            await household_membership_service.remove_member(
                household_id="hh123",
                requester_id="parent123",
                member_id="parent123",
            )
