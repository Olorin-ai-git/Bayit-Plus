from typing import Optional
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from app.models.user import User
from app.models.youngsters_content import (
    YoungstersContentAggregatedResponse,
    YoungstersFeaturedResponse,
    YoungstersSubcategoriesResponse,
    YoungstersAgeGroupsResponse,
)
from app.services.youngsters_content_service import YoungstersContentService


class CategoriesResponse(BaseModel):
    """Response model for youngsters categories."""
    data: list


from app.core.security import get_current_active_user, get_optional_user, get_password_hash, verify_password


class ParentalControlsUpdate(BaseModel):
    youngsters_pin: Optional[str] = None
    default_age_limit: Optional[int] = None


router = APIRouter()

# Initialize service
youngsters_content_service = YoungstersContentService()


@router.get("/categories", response_model=CategoriesResponse)
async def get_youngsters_categories():
    """Get youngsters-specific content categories."""
    categories = await youngsters_content_service.get_categories()
    return CategoriesResponse(data=categories)


@router.get("/content", response_model=YoungstersContentAggregatedResponse)
async def get_youngsters_content(
    age_max: Optional[int] = Query(None, description="Maximum age rating (12-17)"),
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get youngsters content filtered by age and category.

    PG-13 Filter: Only returns content rated G, PG, PG-13, TV-G, TV-PG, TV-14
    """
    return await youngsters_content_service.fetch_all_content(
        category=category,
        age_max=age_max,
        page=page,
        limit=limit,
    )


@router.get("/featured", response_model=YoungstersFeaturedResponse)
async def get_youngsters_featured(
    age_max: Optional[int] = Query(None, description="Maximum age rating"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get featured youngsters content for homepage."""
    return await youngsters_content_service.get_featured_content()


@router.get("/by-category/{category_id}", response_model=YoungstersContentAggregatedResponse)
async def get_youngsters_by_category(
    category_id: str,
    age_max: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
):
    """Get youngsters content by specific category."""
    return await youngsters_content_service.get_content_by_category(
        category=category_id,
        page=page,
        limit=limit,
    )


@router.get("/subcategories", response_model=YoungstersSubcategoriesResponse)
async def get_youngsters_subcategories(
    current_user: Optional[User] = Depends(get_optional_user),
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
    """
    return await youngsters_content_service.get_subcategories()


@router.get("/subcategory/{slug}", response_model=YoungstersContentAggregatedResponse)
async def get_youngsters_by_subcategory(
    slug: str,
    age_max: Optional[int] = Query(None, description="Maximum age rating"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
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
    """
    return await youngsters_content_service.get_content_by_subcategory(
        subcategory_slug=slug,
        page=page,
        limit=limit,
    )


@router.get("/age-groups", response_model=YoungstersAgeGroupsResponse)
async def get_youngsters_age_groups(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get all youngsters age groups.

    Returns:
    - middle-school: Ages 12-14
    - high-school: Ages 15-17
    """
    return await youngsters_content_service.get_age_groups()


@router.get("/age-group/{group}", response_model=YoungstersContentAggregatedResponse)
async def get_youngsters_by_age_group(
    group: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get youngsters content by age group.

    Valid age groups:
    - middle-school (12-14 years)
    - high-school (15-17 years)
    """
    return await youngsters_content_service.get_content_by_age_group(
        age_group=group,
        page=page,
        limit=limit,
    )


@router.get("/trending")
async def get_youngsters_trending(
    age_group: Optional[str] = Query(None, description="Age group filter (middle_school, high_school)"),
    limit: int = Query(10, ge=1, le=20),
    current_user: Optional[User] = Depends(get_optional_user),
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
    """
    return await youngsters_content_service.get_trending_for_youth(
        age_group=age_group,
        limit=limit,
    )


@router.get("/news")
async def get_youngsters_news(
    limit: int = Query(10, ge=1, le=20),
    age_group: Optional[str] = Query(None, description="Age group filter"),
    current_user: Optional[User] = Depends(get_optional_user),
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
    """
    return await youngsters_content_service.get_news_for_youth(
        limit=limit,
        age_group=age_group,
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
    Update parental control settings for youngsters content.

    Allows parents to set age limits and PIN protection.
    """
    # Update user's parental control settings
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
        "age_limit": current_user.youngsters_age_limit,
    }


@router.post("/verify-parent-pin")
async def verify_parent_pin(
    pin: str,
    current_user: User = Depends(get_current_active_user),
):
    """
    Verify parent PIN for accessing youngsters content settings.

    Returns success if PIN matches.
    """
    if not current_user.youngsters_pin_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No parent PIN set",
        )

    if not verify_password(pin, current_user.youngsters_pin_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid parent PIN",
        )

    return {"status": "success", "message": "PIN verified"}
