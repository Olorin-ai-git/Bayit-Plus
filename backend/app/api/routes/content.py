from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models.content import Content, Category
from app.models.user import User
from app.core.security import get_optional_user, get_current_active_user

router = APIRouter()


@router.get("/featured")
async def get_featured(current_user: Optional[User] = Depends(get_optional_user)):
    """Get featured content for homepage."""
    # Get featured content for hero
    hero_content = await Content.find_one(
        Content.is_featured == True,
        Content.is_published == True,
    )

    # Get categories with their content
    categories = await Category.find(Category.is_active == True).sort("order").to_list()
    category_data = []

    for cat in categories:
        items = await Content.find(
            Content.category_id == str(cat.id),
            Content.is_published == True,
        ).limit(10).to_list()

        category_data.append({
            "id": str(cat.id),
            "name": cat.name,
            "items": [
                {
                    "id": str(item.id),
                    "title": item.title,
                    "thumbnail": item.thumbnail,
                    "duration": item.duration,
                    "year": item.year,
                    "category": cat.name,
                    "type": "vod",
                }
                for item in items
            ],
        })

    return {
        "hero": {
            "id": str(hero_content.id) if hero_content else None,
            "title": hero_content.title if hero_content else None,
            "description": hero_content.description if hero_content else None,
            "backdrop": hero_content.backdrop if hero_content else None,
            "thumbnail": hero_content.thumbnail if hero_content else None,
            "category": hero_content.category_name if hero_content else None,
            "year": hero_content.year if hero_content else None,
            "duration": hero_content.duration if hero_content else None,
            "rating": hero_content.rating if hero_content else None,
        } if hero_content else None,
        "categories": category_data,
    }


@router.get("/categories")
async def get_categories():
    """Get all content categories."""
    categories = await Category.find(Category.is_active == True).sort("order").to_list()
    return {
        "categories": [
            {
                "id": str(cat.id),
                "name": cat.name,
                "slug": cat.slug,
                "thumbnail": cat.thumbnail,
            }
            for cat in categories
        ]
    }


@router.get("/category/{category_id}")
async def get_by_category(
    category_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Get content by category (accepts ID or slug)."""
    skip = (page - 1) * limit

    # Try to get category by ID first, then by slug
    category = None
    try:
        category = await Category.get(category_id)
    except Exception:
        # ID parsing failed, try slug lookup
        pass

    if not category:
        # Try to get by slug (e.g., "movies" -> Category with slug="movies")
        category = await Category.find_one(Category.slug == category_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Use the actual category ID from the found category object
    category_obj_id = str(category.id)

    items = await Content.find(
        Content.category_id == category_obj_id,
        Content.is_published == True,
    ).skip(skip).limit(limit).to_list()

    total = await Content.find(
        Content.category_id == category_obj_id,
        Content.is_published == True,
    ).count()

    return {
        "category": {
            "id": str(category.id),
            "name": category.name,
        },
        "items": [
            {
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "duration": item.duration,
                "year": item.year,
                "category": category.name,
                "type": "vod",
            }
            for item in items
        ],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{content_id}")
async def get_content(
    content_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get content details."""
    content = await Content.get(content_id)
    if not content or not content.is_published:
        raise HTTPException(status_code=404, detail="Content not found")

    # Get related content
    related = await Content.find(
        Content.category_id == content.category_id,
        Content.id != content.id,
        Content.is_published == True,
    ).limit(6).to_list()

    return {
        "id": str(content.id),
        "title": content.title,
        "description": content.description,
        "thumbnail": content.thumbnail,
        "backdrop": content.backdrop,
        "category": content.category_name,
        "duration": content.duration,
        "year": content.year,
        "rating": content.rating,
        "genre": content.genre,
        "cast": content.cast,
        "director": content.director,
        "is_series": content.is_series,
        "type": "vod",
        "related": [
            {
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "duration": item.duration,
                "year": item.year,
                "type": "vod",
            }
            for item in related
        ],
    }


@router.get("/{content_id}/stream")
async def get_stream_url(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get stream URL for content (requires authentication)."""
    content = await Content.get(content_id)
    if not content or not content.is_published:
        raise HTTPException(status_code=404, detail="Content not found")

    # Check subscription
    required_tier = content.requires_subscription
    user_tier = current_user.subscription_tier

    tier_levels = {"basic": 1, "premium": 2, "family": 3}
    if not user_tier or tier_levels.get(user_tier, 0) < tier_levels.get(required_tier, 1):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Subscription upgrade required",
        )

    return {
        "url": content.stream_url,
        "type": content.stream_type,
        "is_drm_protected": content.is_drm_protected,
        "drm_key_id": content.drm_key_id if content.is_drm_protected else None,
    }


@router.post("/search")
async def search_content(
    query: str,
    type: Optional[str] = None,  # vod, live, radio, podcast
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Search across all content."""
    skip = (page - 1) * limit
    results = []

    # Search in VOD content
    if not type or type == "vod":
        vod_items = await Content.find(
            {"$text": {"$search": query}},
            Content.is_published == True,
        ).limit(limit).to_list()

        for item in vod_items:
            results.append({
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "duration": item.duration,
                "year": item.year,
                "category": item.category_name,
                "type": "vod",
            })

    # Note: In production, also search live channels, radio, podcasts
    # This is a simplified version

    return {
        "query": query,
        "results": results,
        "total": len(results),
    }
