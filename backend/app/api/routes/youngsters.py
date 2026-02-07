from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.core.family_controls_dependencies import check_youngsters_section_allowed
from app.core.security import (get_current_active_user, get_password_hash)
from app.models.family_controls import FamilyControls
from app.models.user import User
from app.models.youngsters_content import (YoungstersAgeGroupsResponse,
                                           YoungstersContentAggregatedResponse,
                                           YoungstersFeaturedResponse,
                                           YoungstersSubcategoriesResponse)
from app.services.youngsters_content_service import YoungstersContentService


class CategoriesResponse(BaseModel):
    """Response model for youngsters categories."""

    data: list


class ParentalControlsUpdate(BaseModel):
    youngsters_pin: Optional[str] = None
    default_age_limit: Optional[int] = None


router = APIRouter()

# Initialize service
youngsters_content_service = YoungstersContentService()


@router.get("/categories", response_model=CategoriesResponse)
async def get_youngsters_categories(
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get youngsters-specific content categories.

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    """
    categories = await youngsters_content_service.get_categories()
    return CategoriesResponse(data=categories)


@router.get("/content", response_model=YoungstersContentAggregatedResponse)
async def get_youngsters_content(
    age_max: Optional[int] = Query(None, description="Maximum age rating (12-17)"),
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get youngsters content filtered by age and category.

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    - Age limit from family controls overrides age_max parameter
    - Content rating restrictions apply (PG-13 Filter: G, PG, PG-13, TV-G, TV-PG, TV-14)
    """
    effective_age_limit = (
        family_controls.youngsters_age_limit if family_controls else age_max
    )

    return await youngsters_content_service.fetch_all_content(
        category=category,
        age_max=effective_age_limit,
        family_controls=family_controls,
        page=page,
        limit=limit,
    )


@router.get("/featured", response_model=YoungstersFeaturedResponse)
async def get_youngsters_featured(
    age_max: Optional[int] = Query(None, description="Maximum age rating"),
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get featured youngsters content for homepage.

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    - Age limit and content rating restrictions apply
    """
    effective_age_limit = (
        family_controls.youngsters_age_limit if family_controls else age_max
    )

    return await youngsters_content_service.get_featured_content(
        age_max=effective_age_limit,
        family_controls=family_controls,
    )


@router.get(
    "/by-category/{category_id}", response_model=YoungstersContentAggregatedResponse
)
async def get_youngsters_by_category(
    category_id: str,
    age_max: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get youngsters content by specific category.

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    - Age limit and content rating restrictions apply
    """
    effective_age_limit = (
        family_controls.youngsters_age_limit if family_controls else age_max
    )

    return await youngsters_content_service.get_content_by_category(
        category=category_id,
        age_max=effective_age_limit,
        family_controls=family_controls,
        page=page,
        limit=limit,
    )


@router.get("/subcategories", response_model=YoungstersSubcategoriesResponse)
async def get_youngsters_subcategories(
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get all youngsters subcategories with metadata.

    Returns 23 subcategories organized by parent category:
    - Trending: tiktok-trends, viral-videos, memes
    - News: israel-news, world-news, science-news, sports-news
    - Culture: music-culture, film-culture, art-culture, food-culture
    - Educational: study-help, career-prep, life-skills
    - Entertainment: teen-movies, teen-series
    - Tech: gaming, coding, gadgets
    - Judaism: bar-bat-mitzvah, teen-torah, jewish-history

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    """
    return await youngsters_content_service.get_subcategories()


@router.get("/subcategory/{slug}", response_model=YoungstersContentAggregatedResponse)
async def get_youngsters_by_subcategory(
    slug: str,
    age_max: Optional[int] = Query(None, description="Maximum age rating"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get youngsters content by specific subcategory.

    Available subcategories:
    - tiktok-trends, viral-videos, memes (Trending)
    - israel-news, world-news, science-news, sports-news (News)
    - music-culture, film-culture, art-culture, food-culture (Culture)
    - study-help, career-prep, life-skills (Educational)
    - teen-movies, teen-series (Entertainment)
    - gaming, coding, gadgets (Tech)
    - bar-bat-mitzvah, teen-torah, jewish-history (Judaism)

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    - Age limit and content rating restrictions apply
    """
    effective_age_limit = (
        family_controls.youngsters_age_limit if family_controls else age_max
    )

    return await youngsters_content_service.get_content_by_subcategory(
        subcategory_slug=slug,
        age_max=effective_age_limit,
        family_controls=family_controls,
        page=page,
        limit=limit,
    )


@router.get("/age-groups", response_model=YoungstersAgeGroupsResponse)
async def get_youngsters_age_groups(
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get all youngsters age groups.

    Returns:
    - middle-school: Ages 12-14
    - high-school: Ages 15-17

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    """
    return await youngsters_content_service.get_age_groups()


@router.get("/age-group/{group}", response_model=YoungstersContentAggregatedResponse)
async def get_youngsters_by_age_group(
    group: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get youngsters content by age group.

    Valid age groups:
    - middle-school (12-14 years)
    - high-school (15-17 years)

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    - Content rating restrictions apply
    """
    return await youngsters_content_service.get_content_by_age_group(
        age_group=group,
        family_controls=family_controls,
        page=page,
        limit=limit,
    )


@router.get("/trending")
async def get_youngsters_trending(
    age_group: Optional[str] = Query(
        None, description="Age group filter (middle_school, high_school)"
    ),
    limit: int = Query(10, ge=1, le=20),
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get AI-filtered trending topics appropriate for youngsters.

    Filters trending topics from Israeli news for youth appropriateness,
    excluding violence, mature themes, and inappropriate content.

    Age group filtering:
    - middle_school (12-14): Stricter filtering
    - high_school (15-17): Moderate filtering
    - None: General youth filtering

    Returns trending topics with:
    - Topic title in Hebrew and English
    - Category (sports, tech, culture, entertainment)
    - Sentiment and importance scores
    - Brief summary in Hebrew
    - Relevant keywords

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    - Age-appropriate content filtering applies
    """
    return await youngsters_content_service.get_trending_for_youth(
        age_group=age_group,
        family_controls=family_controls,
        limit=limit,
    )


@router.get("/news")
async def get_youngsters_news(
    limit: int = Query(10, ge=1, le=20),
    age_group: Optional[str] = Query(None, description="Age group filter"),
    family_controls: Optional[FamilyControls] = Depends(check_youngsters_section_allowed),
):
    """
    Get age-appropriate news items for youngsters.

    Fetches breaking news from Israeli sources and filters for youth appropriateness.
    Excludes news with:
    - Graphic violence or terror attacks
    - Mature political controversies
    - Crime details
    - Sexual content

    Includes news about:
    - Sports achievements
    - Technology and innovation
    - Cultural events
    - Educational topics
    - Positive community stories

    Returns:
    - News title
    - Link to full article
    - Publication timestamp
    - Brief summary
    - Source (e.g., ynet)

    Family controls enforced:
    - Youngsters section must be enabled
    - Viewing hours restrictions apply
    - Age-appropriate content filtering applies
    """
    return await youngsters_content_service.get_news_for_youth(
        limit=limit,
        age_group=age_group,
        family_controls=family_controls,
    )


@router.post("/admin/refresh")
async def refresh_youngsters_cache(
    current_user: User = Depends(get_current_active_user),
):
    """
    Clear youngsters content cache to force refresh.

    Requires authentication.
    """
    # Check if user is admin (you may want to add admin role check)
    youngsters_content_service.clear_cache()
    return {"status": "success", "message": "Youngsters content cache cleared"}


@router.post("/parental-controls")
async def update_parental_controls(
    controls: ParentalControlsUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """
    DEPRECATED: Update parental control settings for youngsters content.

    This endpoint is deprecated and will be removed in a future version.
    Please use the unified family controls API at /api/v1/family/controls

    Migration: Legacy PINs are automatically migrated to the unified system
    on first access to any family controls endpoint.
    """
    import warnings

    warnings.warn(
        "POST /youngsters/parental-controls is deprecated. Use /api/v1/family/controls instead.",
        DeprecationWarning,
        stacklevel=2,
    )

    # Update user's parental control settings (legacy support)
    if controls.youngsters_pin is not None:
        current_user.youngsters_pin_hash = get_password_hash(controls.youngsters_pin)

    if controls.default_age_limit is not None:
        if not (12 <= controls.default_age_limit <= 17):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Age limit must be between 12 and 17",
            )
        current_user.youngsters_age_limit = controls.default_age_limit

    await current_user.save()

    return {
        "status": "success",
        "message": "Parental controls updated",
        "age_limit": getattr(current_user, "youngsters_age_limit", 17),
        "warning": "This endpoint is deprecated. Please use /api/v1/family/controls for unified family controls.",
        "migration_url": "/api/v1/family/controls",
    }


