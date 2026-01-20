"""
Content and categories endpoints for Judaism section.

Handles:
- GET /categories - List Judaism content categories
- GET /content - Get Judaism-related VOD content
"""

from typing import Optional

from app.api.routes.judaism.constants import (
    JUDAISM_CATEGORIES,
    JUDAISM_CONTENT_REGEX,
    JUDAISM_TITLE_REGEX,
)
from app.api.routes.judaism.schemas import JudaismContentResponse
from app.models.content import Content
from fastapi import APIRouter, Query

router = APIRouter()


@router.get("/categories")
async def get_judaism_categories() -> dict:
    """Get Judaism content categories."""
    return {"categories": JUDAISM_CATEGORIES}


@router.get("/content")
async def get_judaism_content(
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    """Get Judaism-related content with optional category filter."""
    from app.models.content_taxonomy import ContentSection, SectionSubcategory

    # Get Judaism section ID from taxonomy
    judaism_section = await ContentSection.find_one(ContentSection.slug == "judaism")
    judaism_section_id = str(judaism_section.id) if judaism_section else None

    # Build base query using taxonomy
    if judaism_section_id:
        base_filter = {
            "$or": [
                {"section_ids": judaism_section_id},
                # Fallback to legacy matching
                {"category_name": {"$regex": JUDAISM_CONTENT_REGEX, "$options": "i"}},
                {"title": {"$regex": JUDAISM_TITLE_REGEX, "$options": "i"}},
            ]
        }
    else:
        # Fallback if taxonomy not set up
        base_filter = {
            "$or": [
                {"category_name": {"$regex": JUDAISM_CONTENT_REGEX, "$options": "i"}},
                {"title": {"$regex": JUDAISM_TITLE_REGEX, "$options": "i"}},
            ]
        }

    query = {
        "is_published": True,
        "$and": [
            base_filter,
            # Exclude episodes
            {
                "$or": [
                    {"series_id": None},
                    {"series_id": {"$exists": False}},
                    {"series_id": ""},
                ]
            },
        ],
    }

    # Filter by specific subcategory
    if category and category != "all" and judaism_section_id:
        subcategory = await SectionSubcategory.find_one(
            SectionSubcategory.section_id == judaism_section_id,
            SectionSubcategory.slug == category,
        )
        if subcategory:
            query["subcategory_ids"] = str(subcategory.id)

    skip = (page - 1) * limit
    content = await Content.find(query).skip(skip).limit(limit).to_list()
    total = await Content.find(query).count()

    return {
        "content": [
            JudaismContentResponse(
                id=str(c.id),
                title=c.title,
                description=c.description,
                thumbnail=c.thumbnail,
                duration=c.duration,
                rabbi=c.director,  # Using director field for rabbi name
                category=category or "all",
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
