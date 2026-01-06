from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, Query
from pydantic import BaseModel
from app.models.user import User
from app.models.content import Content
from app.core.security import get_current_active_user, get_password_hash, verify_password


# Children content categories
CHILDREN_CATEGORIES = [
    {"id": "all", "name": "הכל", "name_en": "All", "icon": ""},
    {"id": "cartoons", "name": "סרטונים מצוירים", "name_en": "Cartoons", "icon": ""},
    {"id": "educational", "name": "תוכניות לימודיות", "name_en": "Educational", "icon": ""},
    {"id": "music", "name": "מוזיקה לילדים", "name_en": "Kids Music", "icon": ""},
    {"id": "hebrew", "name": "לימוד עברית", "name_en": "Learn Hebrew", "icon": "א"},
    {"id": "stories", "name": "סיפורים", "name_en": "Stories", "icon": ""},
    {"id": "jewish", "name": "יהדות לילדים", "name_en": "Kids Judaism", "icon": ""},
]


class ParentalControlsUpdate(BaseModel):
    kids_pin: Optional[str] = None
    default_age_limit: Optional[int] = None


class ContentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    age_rating: Optional[int] = None
    content_rating: Optional[str] = None
    educational_tags: List[str] = []
    type: str = "vod"


router = APIRouter()


@router.get("/categories")
async def get_children_categories():
    """Get kids-specific content categories."""
    return {"categories": CHILDREN_CATEGORIES}


@router.get("/content")
async def get_children_content(
    age_max: Optional[int] = Query(None, description="Maximum age rating"),
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
):
    """Get children's content filtered by age and category."""
    query = {
        "is_kids_content": True,
        "is_published": True,
    }

    # Filter by age rating if specified
    if age_max is not None:
        query["age_rating"] = {"$lte": age_max}

    # Filter by category/educational tags
    if category and category != "all":
        if category in ["hebrew", "jewish"]:
            query["educational_tags"] = category
        else:
            query["genre"] = {"$regex": category, "$options": "i"}

    # Get content with pagination
    skip = (page - 1) * limit
    content = await Content.find(query).skip(skip).limit(limit).to_list()

    # Get total count for pagination
    total = await Content.find(query).count()

    return {
        "content": [
            ContentResponse(
                id=str(c.id),
                title=c.title,
                description=c.description,
                thumbnail=c.thumbnail,
                duration=c.duration,
                age_rating=c.age_rating,
                content_rating=c.content_rating,
                educational_tags=c.educational_tags,
            )
            for c in content
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        },
    }


@router.get("/featured")
async def get_children_featured(
    age_max: Optional[int] = Query(None, description="Maximum age rating"),
    current_user: User = Depends(get_current_active_user),
):
    """Get featured children's content for homepage."""
    query = {
        "is_kids_content": True,
        "is_published": True,
        "is_featured": True,
    }

    if age_max is not None:
        query["age_rating"] = {"$lte": age_max}

    featured = await Content.find(query).limit(10).to_list()

    return {
        "featured": [
            ContentResponse(
                id=str(c.id),
                title=c.title,
                description=c.description,
                thumbnail=c.thumbnail,
                duration=c.duration,
                age_rating=c.age_rating,
                content_rating=c.content_rating,
                educational_tags=c.educational_tags,
            )
            for c in featured
        ]
    }


@router.get("/by-category/{category_id}")
async def get_children_by_category(
    category_id: str,
    age_max: Optional[int] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_active_user),
):
    """Get children's content by specific category."""
    query = {
        "is_kids_content": True,
        "is_published": True,
    }

    if age_max is not None:
        query["age_rating"] = {"$lte": age_max}

    # Map category to query
    if category_id == "cartoons":
        query["genre"] = {"$regex": "cartoon|animation", "$options": "i"}
    elif category_id == "educational":
        query["educational_tags"] = {"$exists": True, "$ne": []}
    elif category_id == "music":
        query["genre"] = {"$regex": "music|song", "$options": "i"}
    elif category_id == "hebrew":
        query["educational_tags"] = "hebrew"
    elif category_id == "stories":
        query["genre"] = {"$regex": "story|tale", "$options": "i"}
    elif category_id == "jewish":
        query["educational_tags"] = "jewish"

    skip = (page - 1) * limit
    content = await Content.find(query).skip(skip).limit(limit).to_list()
    total = await Content.find(query).count()

    return {
        "category": next((c for c in CHILDREN_CATEGORIES if c["id"] == category_id), None),
        "content": [
            ContentResponse(
                id=str(c.id),
                title=c.title,
                description=c.description,
                thumbnail=c.thumbnail,
                duration=c.duration,
                age_rating=c.age_rating,
                content_rating=c.content_rating,
                educational_tags=c.educational_tags,
            )
            for c in content
        ],
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        },
    }


@router.post("/parental-controls")
async def update_parental_controls(
    controls: ParentalControlsUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update parental control settings."""
    if controls.kids_pin is not None:
        current_user.kids_pin = get_password_hash(controls.kids_pin)

    if controls.default_age_limit is not None:
        current_user.preferences["default_kids_age_limit"] = controls.default_age_limit

    await current_user.save()
    return {"message": "Parental controls updated successfully"}


@router.post("/verify-parent-pin")
async def verify_parent_pin(
    pin: str,
    current_user: User = Depends(get_current_active_user),
):
    """Verify parent PIN to exit kids mode."""
    if not current_user.kids_pin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No parental PIN set",
        )

    is_valid = verify_password(pin, current_user.kids_pin)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect PIN",
        )

    return {"valid": True}
