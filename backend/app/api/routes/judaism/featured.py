"""
Featured content endpoints for Judaism section.

Handles:
- GET /featured - Get featured Judaism content for hero section
- GET /daily-shiur - Get the daily Torah class recommendation
"""

from fastapi import APIRouter

from app.models.content import Content
from app.api.routes.judaism.schemas import JudaismContentResponse
from app.api.routes.judaism.constants import (
    JUDAISM_FEATURED_REGEX,
    SHIUR_GENRE_REGEX,
)

router = APIRouter()


@router.get("/featured")
async def get_judaism_featured() -> dict:
    """Get featured Judaism content for hero section."""
    from app.models.content_taxonomy import ContentSection

    # Get Judaism section ID from taxonomy
    judaism_section = await ContentSection.find_one(ContentSection.slug == "judaism")
    judaism_section_id = str(judaism_section.id) if judaism_section else None

    if judaism_section_id:
        query = {
            "is_published": True,
            "$or": [
                {"section_ids": judaism_section_id},
                {"category_name": {"$regex": JUDAISM_FEATURED_REGEX, "$options": "i"}},
            ],
        }
    else:
        query = {
            "is_published": True,
            "$or": [
                {"category_name": {"$regex": JUDAISM_FEATURED_REGEX, "$options": "i"}},
            ],
        }

    featured = await Content.find(query).limit(5).to_list()

    return {
        "featured": [
            JudaismContentResponse(
                id=str(c.id),
                title=c.title,
                description=c.description,
                thumbnail=c.thumbnail or c.backdrop,
                duration=c.duration,
                rabbi=c.director,
                category="featured",
            )
            for c in featured
        ]
    }


@router.get("/daily-shiur")
async def get_daily_shiur() -> dict:
    """Get the daily Torah class recommendation."""
    # Get a random featured shiur
    shiur = await Content.find_one({
        "is_published": True,
        "genre": {"$regex": SHIUR_GENRE_REGEX, "$options": "i"},
    })

    if not shiur:
        return {"daily_shiur": None}

    return {
        "daily_shiur": JudaismContentResponse(
            id=str(shiur.id),
            title=shiur.title,
            description=shiur.description,
            thumbnail=shiur.thumbnail,
            duration=shiur.duration,
            rabbi=shiur.director,
            category="shiurim",
        )
    }
