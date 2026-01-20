"""
Calendar endpoints for Judaism section.

Handles:
- GET /calendar/today - Get today's Jewish calendar information
- GET /calendar/shabbat - Get Shabbat times for a city
- GET /calendar/daf-yomi - Get today's Daf Yomi
- GET /calendar/holidays - Get upcoming Jewish holidays
- GET /calendar/cities - Get available cities for Shabbat times
"""

from typing import Optional

from fastapi import APIRouter, Query

from app.services.jewish_calendar_service import jewish_calendar_service

router = APIRouter()


@router.get("/calendar/today")
async def get_calendar_today() -> dict:
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
) -> dict:
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
async def get_daf_yomi() -> dict:
    """
    Get today's Daf Yomi (daily Talmud page).

    Returns tractate, page number, and link to Sefaria.
    """
    return await jewish_calendar_service.get_daf_yomi()


@router.get("/calendar/holidays")
async def get_upcoming_holidays(
    days: int = Query(30, ge=1, le=365, description="Number of days to look ahead"),
) -> dict:
    """
    Get upcoming Jewish holidays.

    Returns list of holidays within the specified number of days.
    """
    return await jewish_calendar_service.get_upcoming_holidays(days=days)


@router.get("/calendar/cities")
async def get_available_cities() -> dict:
    """Get list of US cities available for Shabbat times lookup."""
    cities = await jewish_calendar_service.get_available_cities()
    return {"cities": cities}
