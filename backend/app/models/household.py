"""
Household Model

Enables parent-child account linking for shared family controls across multiple user accounts.
Supports family invitations, role-based permissions, and shared control inheritance.
"""

import pymongo
from beanie import Document, Indexed
from datetime import datetime, timezone
from enum import Enum
from pydantic import BaseModel, Field
from typing import List, Optional


class HouseholdRole(str, Enum):
    """Role within a household."""

    PARENT = "parent"
    CHILD = "child"
    GUARDIAN = "guardian"


class HouseholdMember(BaseModel):
    """Member of a household with role and metadata."""

    user_id: str = Field(..., description="User ID of household member")
    role: HouseholdRole = Field(..., description="Role within household")
    joined_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="When member joined household"
    )
    invited_by: Optional[str] = Field(
        None, description="User ID of member who sent invitation"
    )


class PendingInvitation(BaseModel):
    """Pending invitation to join household."""

    invitation_id: str = Field(..., description="Unique invitation ID (UUID)")
    email: str = Field(..., description="Email address of invitee")
    role: HouseholdRole = Field(..., description="Role being offered")
    invited_by: str = Field(..., description="User ID of inviter")
    invited_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="When invitation was sent"
    )
    expires_at: datetime = Field(..., description="Invitation expiration timestamp")


class Household(Document):
    """
    Household model for family account linking.

    Enables multiple user accounts to share family controls through household membership.
    Parents can invite children/guardians and manage shared controls that apply to all members.
    """

    household_id: Indexed(str, unique=True) = Field(
        ..., description="Unique household ID (UUID)"
    )
    name: str = Field(..., description="Household name (e.g., 'Smith Family')")
    owner_id: str = Field(..., description="User ID of household owner (primary parent)")

    # Members
    members: List[HouseholdMember] = Field(
        default_factory=list, description="List of household members with roles"
    )

    # Shared family controls (inherited by all child accounts)
    shared_controls_id: Optional[str] = Field(
        None, description="FamilyControls ID for shared controls"
    )

    # Invitations
    pending_invitations: List[PendingInvitation] = Field(
        default_factory=list, description="Pending invitations to join household"
    )

    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="Household creation timestamp"
    )
    updated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc), description="Last update timestamp"
    )

    class Settings:
        name = "households"
        indexes = [
            "owner_id",
            "household_id",
            [("members.user_id", pymongo.ASCENDING)],
            [("pending_invitations.email", pymongo.ASCENDING)],
        ]

    def is_owner(self, user_id: str) -> bool:
        """Check if user is household owner."""
        return self.owner_id == user_id

    def is_parent(self, user_id: str) -> bool:
        """Check if user has parent role in household."""
        if self.is_owner(user_id):
            return True
        return any(
            member.user_id == user_id and member.role == HouseholdRole.PARENT
            for member in self.members
        )

    def is_member(self, user_id: str) -> bool:
        """Check if user is member of household."""
        return any(member.user_id == user_id for member in self.members)

    def get_member(self, user_id: str) -> Optional[HouseholdMember]:
        """Get member by user ID."""
        return next(
            (member for member in self.members if member.user_id == user_id), None
        )

    def add_member(
        self, user_id: str, role: HouseholdRole, invited_by: Optional[str] = None
    ) -> None:
        """Add new member to household."""
        if not self.is_member(user_id):
            self.members.append(
                HouseholdMember(user_id=user_id, role=role, invited_by=invited_by)
            )
            self.updated_at = datetime.now(timezone.utc)

    def remove_member(self, user_id: str) -> bool:
        """Remove member from household. Returns True if removed."""
        if user_id == self.owner_id:
            return False  # Cannot remove owner
        initial_count = len(self.members)
        self.members = [m for m in self.members if m.user_id != user_id]
        if len(self.members) < initial_count:
            self.updated_at = datetime.now(timezone.utc)
            return True
        return False

    def get_invitation_by_code(self, invitation_id: str) -> Optional[PendingInvitation]:
        """Get pending invitation by code."""
        return next(
            (
                inv
                for inv in self.pending_invitations
                if inv.invitation_id == invitation_id
            ),
            None,
        )

    def get_invitation_by_email(self, email: str) -> Optional[PendingInvitation]:
        """Get pending invitation by email."""
        return next(
            (inv for inv in self.pending_invitations if inv.email.lower() == email.lower()),
            None,
        )

    def remove_invitation(self, invitation_id: str) -> bool:
        """Remove invitation by ID. Returns True if removed."""
        initial_count = len(self.pending_invitations)
        self.pending_invitations = [
            inv for inv in self.pending_invitations if inv.invitation_id != invitation_id
        ]
        if len(self.pending_invitations) < initial_count:
            self.updated_at = datetime.now(timezone.utc)
            return True
        return False

    def clean_expired_invitations(self) -> int:
        """Remove expired invitations. Returns count of removed invitations."""
        now = datetime.now(timezone.utc)
        initial_count = len(self.pending_invitations)
        self.pending_invitations = [
            inv for inv in self.pending_invitations if inv.expires_at > now
        ]
        removed_count = initial_count - len(self.pending_invitations)
        if removed_count > 0:
            self.updated_at = datetime.now(timezone.utc)
        return removed_count
