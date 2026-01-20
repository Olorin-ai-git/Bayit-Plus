"""
Family Controls API Routes.

Unified parental control endpoints for kids and youngsters content.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from app.models.user import User
from app.models.family_controls import FamilyControls
from app.services.family_controls_service import family_controls_service
from app.core.security import get_current_active_user


router = APIRouter()


class FamilyControlsSetupRequest(BaseModel):
    """Request model for initial family controls setup."""
    pin: str = Field(..., min_length=4, max_length=6, description="Family PIN (4-6 digits)")
    kids_age_limit: int = Field(12, ge=0, le=12, description="Maximum age for kids content")
    youngsters_age_limit: int = Field(17, ge=12, le=17, description="Maximum age for youngsters content")


class FamilyControlsUpdateRequest(BaseModel):
    """Request model for updating family controls settings."""
    kids_age_limit: Optional[int] = Field(None, ge=0, le=12)
    youngsters_age_limit: Optional[int] = Field(None, ge=12, le=17)
    kids_enabled: Optional[bool] = None
    youngsters_enabled: Optional[bool] = None
    max_content_rating: Optional[str] = Field(
        None,
        pattern="^(G|PG|PG-13)$",
        description="Maximum content rating (G, PG, or PG-13)"
    )
    viewing_hours_enabled: Optional[bool] = None
    viewing_start_hour: Optional[int] = Field(None, ge=0, le=23)
    viewing_end_hour: Optional[int] = Field(None, ge=0, le=23)


class PINVerificationRequest(BaseModel):
    """Request model for PIN verification."""
    pin: str = Field(..., min_length=4, max_length=6)


class PINUpdateRequest(BaseModel):
    """Request model for updating family PIN."""
    old_pin: str = Field(..., min_length=4, max_length=6)
    new_pin: str = Field(..., min_length=4, max_length=6)


@router.get("/controls")
async def get_family_controls(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get current family control settings.

    Returns all family control settings including:
    - Age limits for kids and youngsters
    - Section enable/disable status
    - Content rating restrictions
    - Time-based viewing restrictions

    Returns 404 if family controls not set up.
    """
    controls = await family_controls_service.get_controls(str(current_user.id))

    if not controls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family controls not set up. Use /setup to create controls.",
        )

    return family_controls_service.format_response(controls)


@router.post("/controls/setup")
async def setup_family_controls(
    request: FamilyControlsSetupRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Initial setup of family controls.

    Creates unified parental controls with a family PIN.
    This PIN will be required to:
    - Modify control settings
    - Access restricted content
    - Change age limits

    Requires:
    - PIN (4-6 digits)
    - Optional age limits for kids and youngsters

    Returns 400 if controls already exist.
    """
    # Check if controls already exist
    existing = await family_controls_service.get_controls(str(current_user.id))
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Family controls already set up. Use /controls to update settings.",
        )

    # Create controls
    controls = await family_controls_service.setup_family_controls(
        user_id=str(current_user.id),
        pin=request.pin,
        kids_age_limit=request.kids_age_limit,
        youngsters_age_limit=request.youngsters_age_limit,
    )

    return {
        "status": "success",
        "message": "Family controls created successfully",
        "controls": family_controls_service.format_response(controls),
    }


@router.patch("/controls")
async def update_family_controls(
    request: FamilyControlsUpdateRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update family control settings.

    Updates one or more family control settings:
    - kids_age_limit: Maximum age for kids content (0-12)
    - youngsters_age_limit: Maximum age for youngsters content (12-17)
    - kids_enabled: Enable/disable kids content access
    - youngsters_enabled: Enable/disable youngsters content access
    - max_content_rating: Maximum allowed rating (G, PG, PG-13)
    - viewing_hours_enabled: Enable/disable time restrictions
    - viewing_start_hour: Start hour for allowed viewing (0-23)
    - viewing_end_hour: End hour for allowed viewing (0-23)

    Only provided fields are updated.
    Returns 404 if family controls not set up.
    """
    controls = await family_controls_service.update_settings(
        user_id=str(current_user.id),
        kids_age_limit=request.kids_age_limit,
        youngsters_age_limit=request.youngsters_age_limit,
        kids_enabled=request.kids_enabled,
        youngsters_enabled=request.youngsters_enabled,
        max_content_rating=request.max_content_rating,
        viewing_hours_enabled=request.viewing_hours_enabled,
        viewing_start_hour=request.viewing_start_hour,
        viewing_end_hour=request.viewing_end_hour,
    )

    if not controls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family controls not set up. Use /setup to create controls.",
        )

    return {
        "status": "success",
        "message": "Family controls updated successfully",
        "controls": family_controls_service.format_response(controls),
    }


@router.post("/controls/verify-pin")
async def verify_family_pin(
    request: PINVerificationRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Verify family PIN.

    Used to:
    - Unlock restricted content
    - Verify identity before changing settings
    - Access parental control features

    Returns 401 if PIN is incorrect.
    Returns 404 if family controls not set up.
    """
    controls = await family_controls_service.get_controls(str(current_user.id))
    if not controls:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family controls not set up.",
        )

    is_valid = await family_controls_service.verify_pin(
        str(current_user.id),
        request.pin,
    )

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN",
        )

    return {
        "status": "success",
        "message": "PIN verified successfully",
    }


@router.post("/controls/reset-pin")
async def reset_family_pin(
    request: PINUpdateRequest,
    current_user: User = Depends(get_current_active_user),
):
    """
    Update family PIN.

    Requires:
    - old_pin: Current PIN for verification
    - new_pin: New PIN to set (4-6 digits)

    Returns 401 if old PIN is incorrect.
    Returns 404 if family controls not set up.
    """
    success = await family_controls_service.update_pin(
        user_id=str(current_user.id),
        old_pin=request.old_pin,
        new_pin=request.new_pin,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid old PIN",
        )

    return {
        "status": "success",
        "message": "PIN updated successfully",
    }


@router.get("/controls/sections")
async def get_enabled_sections(
    current_user: User = Depends(get_current_active_user),
):
    """
    Get enabled content sections based on family controls.

    Returns which sections are currently accessible:
    - kids: Kids content (ages 0-12)
    - youngsters: Youngsters content (ages 12-17)

    Also returns age limits and content rating restrictions.
    """
    controls = await family_controls_service.get_controls(str(current_user.id))

    if not controls:
        # No controls set up - all sections enabled by default
        return {
            "kids": {
                "enabled": True,
                "age_limit": 12,
            },
            "youngsters": {
                "enabled": True,
                "age_limit": 17,
            },
            "max_content_rating": "PG-13",
            "viewing_hours_enabled": False,
        }

    # Check if viewing is currently allowed
    viewing_allowed, block_reason = await family_controls_service.check_viewing_allowed(
        str(current_user.id)
    )

    return {
        "kids": {
            "enabled": controls.kids_enabled,
            "age_limit": controls.kids_age_limit,
        },
        "youngsters": {
            "enabled": controls.youngsters_enabled,
            "age_limit": controls.youngsters_age_limit,
        },
        "max_content_rating": controls.max_content_rating,
        "viewing_hours_enabled": controls.viewing_hours_enabled,
        "viewing_allowed": viewing_allowed,
        "viewing_hours": {
            "start": controls.viewing_start_hour,
            "end": controls.viewing_end_hour,
        } if controls.viewing_hours_enabled else None,
        "block_reason": block_reason,
    }


@router.post("/controls/migrate")
async def migrate_legacy_controls(
    current_user: User = Depends(get_current_active_user),
):
    """
    Migrate from legacy kids/youngsters PIN systems to unified family controls.

    Automatically detects existing kids_pin or youngsters_pin and creates
    unified family controls using the existing PIN.

    Returns 400 if:
    - No legacy controls found
    - Unified controls already exist

    Returns created family controls on success.
    """
    controls = await family_controls_service.migrate_from_legacy_controls(current_user)

    if not controls:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No legacy controls found to migrate, or unified controls already exist.",
        )

    return {
        "status": "success",
        "message": "Legacy controls migrated to unified family controls",
        "controls": family_controls_service.format_response(controls),
    }
