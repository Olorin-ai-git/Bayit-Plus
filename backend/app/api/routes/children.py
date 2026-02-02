from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.family_controls_dependencies import check_kids_section_allowed
from app.core.security import (get_current_active_user, get_optional_user,
                               get_password_hash, verify_password)
from app.models.family_controls import FamilyControls
from app.models.kids_content import (KidsAgeGroupsResponse,
                                     KidsContentAggregatedResponse,
                                     KidsFeaturedResponse,
                                     KidsSubcategoriesResponse)
from app.models.user import User
from app.services.kids_content_service import kids_content_service


class CategoriesResponse(BaseModel):
    """Response model for kids categories."""

    data: list


class ParentalControlsUpdate(BaseModel):
    kids_pin: Optional[str] = None
    default_age_limit: Optional[int] = None


router = APIRouter()


@router.get("/categories", response_model=CategoriesResponse)
async def get_children_categories(
    family_controls: Optional[FamilyControls] = Depends(check_kids_section_allowed),
):
    """
    Get kids-specific content categories.

    Family controls enforced:
    - Kids section must be enabled
    - Viewing hours restrictions apply
    """
    categories = await kids_content_service.get_categories()
    return CategoriesResponse(data=categories)


@router.get("/content", response_model=KidsContentAggregatedResponse)
async def get_children_content(
    age_max: Optional[int] = Query(None, description="Maximum age rating"),
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    family_controls: Optional[FamilyControls] = Depends(check_kids_section_allowed),
):
    """
    Get children's content filtered by age and category.

    Family controls enforced:
    - Kids section must be enabled
    - Viewing hours restrictions apply
    - Age limit from family controls overrides age_max parameter
    - Content rating restrictions apply
    """
    # Use family controls age limit if set, otherwise use query parameter
    effective_age_limit = (
        family_controls.kids_age_limit if family_controls else age_max
    )

    return await kids_content_service.fetch_all_content(
        category=category,
        age_max=effective_age_limit,
        family_controls=family_controls,
        page=page,
        limit=limit,
    )


@router.get("/featured", response_model=KidsFeaturedResponse)
async def get_children_featured(
    age_max: Optional[int] = Query(None, description="Maximum age rating"),
    family_controls: Optional[FamilyControls] = Depends(check_kids_section_allowed),
):
    """
    Get featured children's content for homepage.

    Family controls enforced:
    - Kids section must be enabled
    - Viewing hours restrictions apply
    - Age limit and content rating restrictions apply
    """
    effective_age_limit = (
        family_controls.kids_age_limit if family_controls else age_max
    )

    return await kids_content_service.get_featured_content(
        age_max=effective_age_limit,
        family_controls=family_controls,
    )


@router.get("/by-category/{category_id}", response_model=KidsContentAggregatedResponse)
async def get_children_by_category(
    category_id: str,
    age_max: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    family_controls: Optional[FamilyControls] = Depends(check_kids_section_allowed),
):
    """
    Get children's content by specific category.

    Family controls enforced:
    - Kids section must be enabled
    - Viewing hours restrictions apply
    - Age limit and content rating restrictions apply
    """
    effective_age_limit = (
        family_controls.kids_age_limit if family_controls else age_max
    )

    return await kids_content_service.get_content_by_category(
        category=category_id,
        age_max=effective_age_limit,
        family_controls=family_controls,
        page=page,
        limit=limit,
    )


@router.get("/subcategories", response_model=KidsSubcategoriesResponse)
async def get_children_subcategories(
    family_controls: Optional[FamilyControls] = Depends(check_kids_section_allowed),
):
    """
    Get all kids subcategories with metadata.

    Returns 12 subcategories organized by parent category:
    - Educational: learning-hebrew, young-science, math-fun, nature-animals, interactive
    - Music: hebrew-songs, nursery-rhymes
    - Cartoons: kids-movies, kids-series
    - Jewish: jewish-holidays, torah-stories
    - Stories: bedtime-stories

    Family controls enforced:
    - Kids section must be enabled
    - Viewing hours restrictions apply
    """
    return await kids_content_service.get_subcategories()


@router.get("/subcategory/{slug}", response_model=KidsContentAggregatedResponse)
async def get_children_by_subcategory(
    slug: str,
    age_max: Optional[int] = Query(None, description="Maximum age rating"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    family_controls: Optional[FamilyControls] = Depends(check_kids_section_allowed),
):
    """
    Get children's content by specific subcategory.

    Family controls enforced:
    - Kids section must be enabled
    - Viewing hours restrictions apply
    - Age limit and content rating restrictions apply
    """
    effective_age_limit = (
        family_controls.kids_age_limit if family_controls else age_max
    )

    return await kids_content_service.get_content_by_subcategory(
        subcategory_slug=slug,
        age_max=effective_age_limit,
        family_controls=family_controls,
        page=page,
        limit=limit,
    )


@router.get("/age-groups", response_model=KidsAgeGroupsResponse)
async def get_children_age_groups(
    family_controls: Optional[FamilyControls] = Depends(check_kids_section_allowed),
):
    """
    Get all age groups for kids content filtering.

    Age groups:
    - toddlers: 0-3 years
    - preschool: 3-5 years
    - elementary: 5-10 years
    - preteen: 10-12 years

    Family controls enforced:
    - Kids section must be enabled
    - Viewing hours restrictions apply
    """
    return await kids_content_service.get_age_groups()


@router.get("/age-group/{group}", response_model=KidsContentAggregatedResponse)
async def get_children_by_age_group(
    group: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    family_controls: Optional[FamilyControls] = Depends(check_kids_section_allowed),
):
    """
    Get children's content by specific age group.

    Family controls enforced:
    - Kids section must be enabled
    - Viewing hours restrictions apply
    - Content rating restrictions apply
    """
    return await kids_content_service.get_content_by_age_group(
        age_group_slug=group,
        family_controls=family_controls,
        page=page,
        limit=limit,
    )


@router.post("/admin/refresh")
async def refresh_cache(
    current_user: User = Depends(get_current_active_user),
):
    """Clear the kids content cache to force refresh."""
    # Check if user has admin permissions
    if not getattr(current_user, "is_admin", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    kids_content_service.clear_cache()
    return {"message": "Kids content cache cleared successfully"}


@router.post("/parental-controls")
async def update_parental_controls(
    controls: ParentalControlsUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """
    DEPRECATED: Update parental control settings.

    This endpoint is deprecated and will be removed in a future version.
    Please use the unified family controls API at /api/v1/family/controls

    Migration: Legacy PINs are automatically migrated to the unified system
    on first access to any family controls endpoint.
    """
    import warnings

    warnings.warn(
        "POST /children/parental-controls is deprecated. Use /api/v1/family/controls instead.",
        DeprecationWarning,
        stacklevel=2,
    )

    if controls.kids_pin is not None:
        current_user.kids_pin = get_password_hash(controls.kids_pin)

    if controls.default_age_limit is not None:
        current_user.preferences["default_kids_age_limit"] = controls.default_age_limit

    await current_user.save()

    return {
        "message": "Parental controls updated successfully",
        "warning": "This endpoint is deprecated. Please use /api/v1/family/controls for unified family controls.",
        "migration_url": "/api/v1/family/controls",
    }


