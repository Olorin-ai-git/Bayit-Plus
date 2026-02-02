"""
Household API Routes

Core household management endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional

from app.core.security import get_current_active_user
from app.models.user import User
from app.models.household import Household, HouseholdRole
from app.services.household_service import household_service

router = APIRouter()


class HouseholdCreate(BaseModel):
    name: str = Field(..., description="Household name")


class HouseholdUpdate(BaseModel):
    name: Optional[str] = Field(None, description="Updated household name")


class InviteMemberRequest(BaseModel):
    email: EmailStr = Field(..., description="Email of person to invite")
    role: HouseholdRole = Field(..., description="Role to assign (CHILD or GUARDIAN)")


class AcceptInvitationRequest(BaseModel):
    invitation_code: str = Field(..., description="Invitation code (UUID)")


class HouseholdResponse(BaseModel):
    household_id: str
    name: str
    owner_id: str
    members: List[dict]
    shared_controls_id: Optional[str]
    created_at: str
    updated_at: str


class InvitationResponse(BaseModel):
    invitation_id: str
    expires_at: str


def _format_household_response(household: Household) -> HouseholdResponse:
    """Format household for API response."""
    return HouseholdResponse(
        household_id=household.household_id,
        name=household.name,
        owner_id=household.owner_id,
        members=[m.dict() for m in household.members],
        shared_controls_id=household.shared_controls_id,
        created_at=household.created_at.isoformat(),
        updated_at=household.updated_at.isoformat(),
    )


@router.post("/create", response_model=HouseholdResponse, status_code=status.HTTP_201_CREATED)
async def create_household(
    data: HouseholdCreate,
    current_user: User = Depends(get_current_active_user),
):
    """Create new household with current user as owner."""
    try:
        household = await household_service.create_household(
            owner_id=str(current_user.id), name=data.name
        )
        return _format_household_response(household)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/", response_model=HouseholdResponse)
async def get_household(
    current_user: User = Depends(get_current_active_user),
):
    """Get household that current user belongs to."""
    household = await household_service.get_household_for_user(str(current_user.id))
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User does not belong to any household",
        )

    return _format_household_response(household)


@router.patch("/{household_id}", response_model=HouseholdResponse)
async def update_household(
    household_id: str,
    data: HouseholdUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update household settings (owner only)."""
    household = await Household.find_one(Household.household_id == household_id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Household not found"
        )

    if not household.is_owner(str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only household owner can update household",
        )

    if data.name:
        household.name = data.name
        await household.save()

    return _format_household_response(household)


@router.delete("/{household_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_household(
    household_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Delete household (owner only)."""
    try:
        await household_service.delete_household(household_id, str(current_user.id))
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get("/{household_id}/controls")
async def get_shared_controls(
    household_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get shared family controls for household."""
    household = await Household.find_one(Household.household_id == household_id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Household not found"
        )

    if not household.is_member(str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not member of this household",
        )

    controls = await household_service.get_shared_controls(str(current_user.id))
    if not controls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Household has no shared controls",
        )

    return controls


@router.patch("/{household_id}/controls")
async def update_shared_controls(
    household_id: str,
    controls_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Update household's shared family controls (parents only)."""
    try:
        household = await household_service.update_shared_controls(
            household_id=household_id,
            requester_id=str(current_user.id),
            controls_id=controls_id,
        )
        return _format_household_response(household)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/{household_id}/invite", response_model=InvitationResponse, status_code=status.HTTP_201_CREATED)
async def invite_member(
    household_id: str,
    data: InviteMemberRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Send invitation to join household (parents only)."""
    try:
        result = await household_service.invite_member(
            household_id=household_id,
            inviter_id=str(current_user.id),
            invitee_email=data.email,
            role=data.role,
        )
        return InvitationResponse(**result)
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/accept-invitation", response_model=HouseholdResponse)
async def accept_invitation(
    data: AcceptInvitationRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Accept household invitation and join as member."""
    try:
        household = await household_service.accept_invitation(
            user_id=str(current_user.id), invitation_code=data.invitation_code
        )
        return _format_household_response(household)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/{household_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    household_id: str,
    user_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Remove member from household (parents only)."""
    try:
        await household_service.remove_member(
            household_id=household_id,
            requester_id=str(current_user.id),
            member_id=user_id,
        )
    except PermissionError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/{household_id}/members", response_model=List[dict])
async def list_members(
    household_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """List all members of household."""
    household = await Household.find_one(Household.household_id == household_id)
    if not household:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Household not found"
        )

    if not household.is_member(str(current_user.id)):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not member of this household",
        )

    return [m.dict() for m in household.members]
