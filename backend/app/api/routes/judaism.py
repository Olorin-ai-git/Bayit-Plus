from typing import Optional, List
from fastapi import APIRouter, Query
from pydantic import BaseModel
from app.models.content import Content, LiveChannel


# Judaism content categories (matching TV app)
JUDAISM_CATEGORIES = [
    {"id": "all", "name": "הכל", "name_en": "All", "name_es": "Todo", "icon": ""},
    {"id": "shiurim", "name": "שיעורים", "name_en": "Torah Classes", "name_es": "Clases de Tora", "icon": ""},
    {"id": "tefila", "name": "תפילה", "name_en": "Prayer", "name_es": "Oracion", "icon": ""},
    {"id": "music", "name": "מוזיקה יהודית", "name_en": "Jewish Music", "name_es": "Musica Judia", "icon": ""},
    {"id": "holidays", "name": "חגים", "name_en": "Holidays", "name_es": "Festividades", "icon": ""},
    {"id": "documentaries", "name": "סרטים תיעודיים", "name_en": "Documentaries", "name_es": "Documentales", "icon": ""},
]


class JudaismContentResponse(BaseModel):
    id: str
    title: str
    title_en: Optional[str] = None
    title_es: Optional[str] = None
    description: Optional[str] = None
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    rabbi: Optional[str] = None
    category: str
    type: str = "vod"


router = APIRouter()


@router.get("/categories")
async def get_judaism_categories():
    """Get Judaism content categories."""
    return {"categories": JUDAISM_CATEGORIES}


@router.get("/content")
async def get_judaism_content(
    category: Optional[str] = Query(None, description="Category filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Get Judaism-related content with optional category filter."""
    # Build query for Jewish/religious content
    query = {
        "is_published": True,
        "$or": [
            {"genre": {"$regex": "jewish|torah|religious|prayer", "$options": "i"}},
            {"category_name": {"$regex": "jewish|judaism|torah|שיעור|תפילה|יהדות", "$options": "i"}},
        ],
    }

    # Filter by specific category
    if category and category != "all":
        category_queries = {
            "shiurim": {"genre": {"$regex": "shiur|class|lesson|lecture", "$options": "i"}},
            "tefila": {"genre": {"$regex": "prayer|tefila|תפילה", "$options": "i"}},
            "music": {"genre": {"$regex": "music|song|מוזיקה", "$options": "i"}},
            "holidays": {"genre": {"$regex": "holiday|חג", "$options": "i"}},
            "documentaries": {"genre": {"$regex": "documentary|doc", "$options": "i"}},
        }
        if category in category_queries:
            query.update(category_queries[category])

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


@router.get("/featured")
async def get_judaism_featured():
    """Get featured Judaism content for hero section."""
    query = {
        "is_published": True,
        "is_featured": True,
        "$or": [
            {"genre": {"$regex": "jewish|torah|religious|prayer", "$options": "i"}},
            {"category_name": {"$regex": "jewish|judaism|torah", "$options": "i"}},
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


@router.get("/live")
async def get_live_shiurim():
    """Get currently live Torah classes and prayers."""
    # Get channels that are religious/Jewish content
    channels = await LiveChannel.find({
        "is_active": True,
        "$or": [
            {"name": {"$regex": "torah|jewish|תורה|יהדות", "$options": "i"}},
            {"category": {"$regex": "religious|jewish", "$options": "i"}},
        ],
    }).to_list()

    return {
        "live": [
            {
                "id": str(ch.id),
                "name": ch.name,
                "description": ch.description,
                "thumbnail": ch.thumbnail,
                "is_live": True,
                "current_program": ch.current_program,
            }
            for ch in channels
        ]
    }


@router.get("/daily-shiur")
async def get_daily_shiur():
    """Get the daily Torah class recommendation."""
    # Get a random featured shiur
    shiur = await Content.find_one({
        "is_published": True,
        "genre": {"$regex": "shiur|class|lesson", "$options": "i"},
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
