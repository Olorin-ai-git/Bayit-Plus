"""
Judaism Routes - Comprehensive Judaism section for US Jewish communities.

Endpoints:
- Content: Torah classes, music, prayer, holidays, documentaries
- News: Aggregated Jewish news from major US publications
- Calendar: Hebrew dates, Shabbat times, holidays, Daf Yomi
- Community: Synagogues, JCCs, kosher restaurants, mikvaot, events
- Shiurim: Torah classes from YU Torah, Chabad, TorahAnytime
"""

from typing import Optional
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel

from app.models.content import Content, LiveChannel
from app.models.jewish_community import (
    OrganizationType,
    Denomination,
    KosherCertification,
)
from app.services.jewish_news_service import jewish_news_service
from app.services.jewish_calendar_service import jewish_calendar_service
from app.services.community_directory_service import community_directory_service
from app.services.torah_content_service import torah_content_service


# Judaism content categories (matching TV app)
JUDAISM_CATEGORIES = [
    {"id": "all", "name": "הכל", "name_en": "All", "name_es": "Todo", "icon": ""},
    {"id": "news", "name": "חדשות", "name_en": "Jewish News", "name_es": "Noticias Judías", "icon": ""},
    {"id": "calendar", "name": "לוח שנה", "name_en": "Calendar", "name_es": "Calendario", "icon": ""},
    {"id": "community", "name": "קהילה", "name_en": "Community", "name_es": "Comunidad", "icon": ""},
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


# =============================================================================
# CATEGORIES
# =============================================================================

@router.get("/categories")
async def get_judaism_categories():
    """Get Judaism content categories."""
    return {"categories": JUDAISM_CATEGORIES}


# =============================================================================
# CONTENT (VOD)
# =============================================================================

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
                "current_program": ch.current_show,
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


# =============================================================================
# NEWS AGGREGATION
# =============================================================================

@router.get("/news")
async def get_jewish_news(
    category: Optional[str] = Query(None, description="Filter by category: news, culture, opinion, torah, community"),
    source: Optional[str] = Query(None, description="Filter by source name"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get aggregated Jewish news from major US publications.

    Sources include JTA, Times of Israel, Forward, Tablet, Aish, Chabad, Jewish Week, and Yeshiva World.
    """
    return await jewish_news_service.fetch_all_news(
        category=category,
        source_name=source,
        page=page,
        limit=limit,
    )


@router.get("/news/sources")
async def get_news_sources():
    """Get list of available Jewish news sources."""
    sources = await jewish_news_service.get_sources()
    return {"sources": sources}


# =============================================================================
# JEWISH CALENDAR
# =============================================================================

@router.get("/calendar/today")
async def get_calendar_today():
    """
    Get comprehensive Jewish calendar information for today.

    Returns Hebrew date, holidays, parasha, and omer count.
    """
    return await jewish_calendar_service.get_today()


@router.get("/calendar/shabbat")
async def get_shabbat_times(
    city: Optional[str] = Query(None, description="City name (e.g., 'New York')"),
    state: Optional[str] = Query(None, description="State code (e.g., 'NY')"),
    geoname_id: Optional[int] = Query(None, description="HebCal GeoName ID"),
):
    """
    Get Shabbat candle lighting and havdalah times for a US city.

    Supported cities: New York, Los Angeles, Chicago, Miami, Boston, Philadelphia,
    Atlanta, Dallas, Denver, Seattle, Baltimore, Cleveland, Detroit.
    """
    return await jewish_calendar_service.get_shabbat_times(
        city=city,
        state=state,
        geoname_id=geoname_id,
    )


@router.get("/calendar/daf-yomi")
async def get_daf_yomi():
    """
    Get today's Daf Yomi (daily Talmud page).

    Returns tractate, page number, and link to Sefaria.
    """
    return await jewish_calendar_service.get_daf_yomi()


@router.get("/calendar/holidays")
async def get_upcoming_holidays(
    days: int = Query(30, ge=1, le=365, description="Number of days to look ahead"),
):
    """
    Get upcoming Jewish holidays.

    Returns list of holidays within the specified number of days.
    """
    return await jewish_calendar_service.get_upcoming_holidays(days=days)


@router.get("/calendar/cities")
async def get_available_cities():
    """Get list of US cities available for Shabbat times lookup."""
    cities = await jewish_calendar_service.get_available_cities()
    return {"cities": cities}


# =============================================================================
# COMMUNITY DIRECTORY
# =============================================================================

@router.get("/community/regions")
async def get_regions():
    """Get list of supported US regions with organization counts."""
    return await community_directory_service.get_regions()


@router.get("/community/synagogues")
async def get_synagogues(
    region: Optional[str] = Query(None, description="Region filter (e.g., 'nyc', 'la')"),
    denomination: Optional[str] = Query(None, description="Denomination filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get synagogues in the US Jewish community directory.

    Supports filtering by region and denomination.
    """
    denom = None
    if denomination:
        try:
            denom = Denomination(denomination)
        except ValueError:
            pass

    return await community_directory_service.get_synagogues(
        region=region,
        denomination=denom,
        page=page,
        limit=limit,
    )


@router.get("/community/kosher")
async def get_kosher_restaurants(
    region: Optional[str] = Query(None, description="Region filter"),
    city: Optional[str] = Query(None, description="City name"),
    state: Optional[str] = Query(None, description="State code"),
    certification: Optional[str] = Query(None, description="Kosher certification"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get kosher restaurants in the US.

    Supports filtering by region, city, state, and kosher certification.
    """
    cert = None
    if certification:
        try:
            cert = KosherCertification(certification)
        except ValueError:
            pass

    return await community_directory_service.get_kosher_restaurants(
        region=region,
        city=city,
        state=state,
        kosher_certification=cert,
        page=page,
        limit=limit,
    )


@router.get("/community/jcc")
async def get_jccs(
    region: Optional[str] = Query(None, description="Region filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Get JCC locations in the US."""
    return await community_directory_service.get_jccs(
        region=region,
        page=page,
        limit=limit,
    )


@router.get("/community/mikvaot")
async def get_mikvaot(
    region: Optional[str] = Query(None, description="Region filter"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Get mikvah locations in the US."""
    return await community_directory_service.get_mikvaot(
        region=region,
        page=page,
        limit=limit,
    )


@router.get("/community/events")
async def get_community_events(
    region: Optional[str] = Query(None, description="Region filter"),
    event_type: Optional[str] = Query(None, description="Event type filter"),
    days: int = Query(14, ge=1, le=90, description="Days to look ahead"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get upcoming community events.

    Supports filtering by region and event type (shiur, shabbaton, holiday, community, youth, singles).
    """
    return await community_directory_service.get_events(
        region=region,
        event_type=event_type,
        days=days,
        page=page,
        limit=limit,
    )


@router.get("/community/organization/{org_id}")
async def get_organization(org_id: str):
    """Get details for a specific organization."""
    org = await community_directory_service.get_organization_by_id(org_id)
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.get("/community/search")
async def search_community(
    organization_type: Optional[str] = Query(None, description="Organization type"),
    region: Optional[str] = Query(None, description="Region filter"),
    denomination: Optional[str] = Query(None, description="Denomination filter"),
    city: Optional[str] = Query(None, description="City name"),
    state: Optional[str] = Query(None, description="State code"),
    latitude: Optional[float] = Query(None, description="Latitude for proximity search"),
    longitude: Optional[float] = Query(None, description="Longitude for proximity search"),
    radius_miles: Optional[int] = Query(None, description="Search radius in miles"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Search the community directory with various filters.

    Supports both region-based and geolocation-based proximity searches.
    """
    org_type = None
    if organization_type:
        try:
            org_type = OrganizationType(organization_type)
        except ValueError:
            pass

    denom = None
    if denomination:
        try:
            denom = Denomination(denomination)
        except ValueError:
            pass

    return await community_directory_service.search_organizations(
        organization_type=org_type,
        region=region,
        denomination=denom,
        city=city,
        state=state,
        latitude=latitude,
        longitude=longitude,
        radius_miles=radius_miles,
        page=page,
        limit=limit,
    )


# =============================================================================
# TORAH SHIURIM (RSS)
# =============================================================================

@router.get("/shiurim")
async def get_shiurim(
    category: Optional[str] = Query(None, description="Category filter (e.g., 'parasha')"),
    rabbi: Optional[str] = Query(None, description="Filter by rabbi name"),
    source: Optional[str] = Query(None, description="Filter by source (e.g., 'YU Torah')"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get Torah shiurim aggregated from public RSS feeds.

    Sources include YU Torah, Chabad Multimedia, and TorahAnytime.
    """
    return await torah_content_service.get_shiurim(
        category=category,
        rabbi=rabbi,
        source=source,
        page=page,
        limit=limit,
    )


@router.get("/shiurim/live")
async def get_live_torah_classes():
    """Get currently streaming Torah classes."""
    return {"live": await torah_content_service.get_live_shiurim()}


@router.get("/shiurim/daily")
async def get_daily_shiur_recommendation():
    """Get daily Torah class recommendation."""
    result = await torah_content_service.get_daily_shiur()
    if not result:
        return {"daily_shiur": None, "message": "No shiurim available"}
    return result


# =============================================================================
# ADMIN ENDPOINTS (for data management)
# =============================================================================

@router.post("/admin/community/seed")
async def seed_community_data():
    """
    Seed sample community data for development/testing.

    Admin endpoint - requires authentication in production.
    """
    result = await community_directory_service.seed_sample_data()
    return result


@router.post("/admin/news/refresh")
async def refresh_news_cache():
    """
    Clear news cache to force refresh on next request.

    Admin endpoint - requires authentication in production.
    """
    jewish_news_service.clear_cache()
    return {"message": "News cache cleared"}


@router.post("/admin/shiurim/refresh")
async def refresh_shiurim_cache():
    """
    Clear Torah content cache to force refresh on next request.

    Admin endpoint - requires authentication in production.
    """
    torah_content_service.clear_cache()
    return {"message": "Shiurim cache cleared"}
