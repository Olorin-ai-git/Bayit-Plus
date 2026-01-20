"""
Shabbat-related endpoints for Judaism section.

Handles:
- GET /shabbat/featured - Get featured Shabbat content for Erev Shabbat display
- GET /shabbat/status - Get current Shabbat status (erev, during, regular)
"""

from datetime import datetime, timedelta
from typing import Any

import pytz
from fastapi import APIRouter, Query

from app.models.content import Content
from app.models.jewish_calendar import US_JEWISH_CITIES
from app.services.jewish_calendar_service import jewish_calendar_service
from app.api.routes.judaism.schemas import JudaismContentResponse
from app.api.routes.judaism.constants import (
    SHABBAT_KEYWORDS_REGEX,
    SHABBAT_ACTIVITIES_REGEX,
    SHABBAT_END_ACTIVITIES_REGEX,
    JEWISH_MUSIC_REGEX,
    EREV_SHABBAT_HOURS_BEFORE,
)

router = APIRouter()


@router.get("/shabbat/featured")
async def get_shabbat_featured() -> dict:
    """
    Get featured Shabbat content for Erev Shabbat display.

    Returns content related to: parasha, Shabbat songs, candle lighting,
    kiddush, challah, Shabbat preparation, and related Torah content.
    """
    # Get calendar info for current parasha
    calendar = await jewish_calendar_service.get_today()
    parasha = calendar.get("parasha", "")
    parasha_he = calendar.get("parasha_he", "")

    # Build parasha-specific matchers
    parasha_matchers: list[dict[str, Any]] = []
    if parasha:
        parasha_matchers.append({"title": {"$regex": parasha, "$options": "i"}})
    if parasha_he:
        parasha_matchers.append({"title": {"$regex": parasha_he, "$options": "i"}})

    # Query for Shabbat-related content
    or_conditions = [
        # Shabbat keywords
        {"title": {"$regex": SHABBAT_KEYWORDS_REGEX, "$options": "i"}},
        {"genre": {"$regex": SHABBAT_KEYWORDS_REGEX, "$options": "i"}},
        # Shabbat activities
        {"title": {"$regex": SHABBAT_ACTIVITIES_REGEX, "$options": "i"}},
        {"title": {"$regex": SHABBAT_END_ACTIVITIES_REGEX, "$options": "i"}},
        # Jewish music for Shabbat
        {"genre": {"$regex": JEWISH_MUSIC_REGEX, "$options": "i"}},
    ]

    # Add parasha matchers if available
    or_conditions.extend(parasha_matchers)

    shabbat_query = {
        "is_published": True,
        "$or": or_conditions,
    }

    content = await Content.find(shabbat_query).limit(12).to_list()

    # Build response with categories
    featured_items: list[JudaismContentResponse] = []
    parasha_content: list[JudaismContentResponse] = []
    music_content: list[JudaismContentResponse] = []
    preparation_content: list[JudaismContentResponse] = []

    for c in content:
        item = JudaismContentResponse(
            id=str(c.id),
            title=c.title,
            title_en=c.title_en,
            description=c.description,
            thumbnail=c.thumbnail or c.backdrop,
            duration=c.duration,
            rabbi=c.director,
            category="shabbat",
            type=c.content_type or "vod",
        )

        # Categorize content
        title_lower = (c.title or "").lower()
        genre_lower = (c.genre or "").lower()

        if parasha and parasha.lower() in title_lower:
            parasha_content.append(item)
        elif "music" in genre_lower or "song" in title_lower or "\u05d6\u05de\u05d9\u05e8\u05d5\u05ea" in title_lower:
            music_content.append(item)
        elif any(kw in title_lower for kw in ["candle", "\u05e0\u05e8\u05d5\u05ea", "challah", "\u05d7\u05dc\u05d4", "prep"]):
            preparation_content.append(item)
        else:
            featured_items.append(item)

    return {
        "parasha": parasha,
        "parasha_he": parasha_he,
        "is_shabbat": calendar.get("is_shabbat", False),
        "sections": {
            "parasha_content": parasha_content[:4],
            "shabbat_music": music_content[:4],
            "preparation": preparation_content[:4],
            "featured": featured_items[:4],
        },
        "all_content": [*parasha_content, *music_content, *preparation_content, *featured_items][:12],
    }


@router.get("/shabbat/status")
async def get_shabbat_status(
    city: str = Query("New York", description="City name"),
    state: str = Query("NY", description="State code"),
) -> dict:
    """
    Get current Shabbat status - whether it's Erev Shabbat, Shabbat, or regular day.

    Returns timing information for Shabbat mode detection on frontend.
    """
    # Get Shabbat times
    shabbat_times = await jewish_calendar_service.get_shabbat_times(city=city, state=state)
    calendar = await jewish_calendar_service.get_today()

    now = datetime.now(pytz.UTC)

    # Parse times
    candle_lighting = None
    havdalah = None

    if shabbat_times.candle_lighting:
        try:
            candle_lighting = datetime.fromisoformat(
                shabbat_times.candle_lighting.replace("Z", "+00:00")
            )
        except (ValueError, TypeError):
            pass

    if shabbat_times.havdalah:
        try:
            havdalah = datetime.fromisoformat(
                shabbat_times.havdalah.replace("Z", "+00:00")
            )
        except (ValueError, TypeError):
            pass

    # Determine status
    status = "regular"
    if candle_lighting and havdalah:
        # Erev Shabbat: Friday, before candle lighting (within configured hours)
        erev_start = candle_lighting - timedelta(hours=EREV_SHABBAT_HOURS_BEFORE)
        if erev_start <= now < candle_lighting:
            status = "erev_shabbat"
        # During Shabbat
        elif candle_lighting <= now <= havdalah:
            status = "shabbat"

    # Look up timezone from city config
    timezone = "America/New_York"  # Default
    city_lower = city.lower()
    state_upper = state.upper()
    for c in US_JEWISH_CITIES:
        if c.name.lower() == city_lower and c.state.upper() == state_upper:
            timezone = c.timezone
            break

    return {
        "status": status,
        "is_erev_shabbat": status == "erev_shabbat",
        "is_shabbat": status == "shabbat",
        "candle_lighting": shabbat_times.candle_lighting,
        "havdalah": shabbat_times.havdalah,
        "parasha": calendar.parasha,
        "parasha_he": calendar.parasha_he,
        "city": city,
        "state": state,
        "timezone": timezone,
    }
