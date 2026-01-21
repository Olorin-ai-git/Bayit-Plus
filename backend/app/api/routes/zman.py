"""
Zman Yisrael API routes.
Provides Israel time, Shabbat information, and curated Shabbat content.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_active_user, get_optional_user
from app.models.content import Content, RadioStation
from app.models.user import User
from app.services.israel_time import (HEBREW_DAYS, calculate_shabbat_status,
                                      fetch_shabbat_times, format_time,
                                      get_israel_time, get_israel_time_info,
                                      timedelta_to_str)

router = APIRouter()


@router.get("/time")
async def get_time(
    timezone: str = Query(default="America/New_York"),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get current Israel time with Shabbat status.
    Uses user's preferred timezone if authenticated.
    """
    # Use user's timezone preference if available
    if current_user and current_user.preferences:
        timezone = current_user.preferences.get("local_timezone", timezone)

    info = await get_israel_time_info(timezone)

    response = {
        "israel": {
            "time": info.israel_time_formatted,
            "datetime": info.israel_time.isoformat(),
            "day": info.day_of_week_hebrew,
        },
        "local": {
            "time": info.local_time_formatted,
            "datetime": info.local_time.isoformat(),
            "timezone": info.local_timezone,
        },
        "shabbat": {
            "is_shabbat": info.shabbat_status.is_shabbat,
            "is_erev_shabbat": info.shabbat_status.is_erev_shabbat,
        },
    }

    # Add countdown information
    if info.shabbat_status.time_until_shabbat:
        response["shabbat"]["countdown"] = timedelta_to_str(
            info.shabbat_status.time_until_shabbat
        )
        response["shabbat"]["countdown_label"] = "עד כניסת שבת"

    if info.shabbat_status.time_until_havdalah:
        response["shabbat"]["countdown"] = timedelta_to_str(
            info.shabbat_status.time_until_havdalah
        )
        response["shabbat"]["countdown_label"] = "עד מוצאי שבת"

    # Add Shabbat times if available
    if info.shabbat_status.shabbat_times:
        times = info.shabbat_status.shabbat_times
        response["shabbat"]["candle_lighting"] = format_time(times.candle_lighting)
        response["shabbat"]["havdalah"] = format_time(times.havdalah)
        if times.parasha:
            response["shabbat"]["parasha"] = times.parasha
        if times.parasha_hebrew:
            response["shabbat"]["parasha_hebrew"] = times.parasha_hebrew

    return response


@router.get("/shabbat")
async def get_shabbat_times(
    latitude: float = Query(
        default=32.0853, description="Latitude (default: Tel Aviv)"
    ),
    longitude: float = Query(
        default=34.7818, description="Longitude (default: Tel Aviv)"
    ),
):
    """
    Get Shabbat times for a specific location.
    Default location is Tel Aviv.
    """
    shabbat_times = await fetch_shabbat_times(latitude, longitude)

    if not shabbat_times:
        return {
            "error": "Could not fetch Shabbat times",
            "estimated": True,
            "candle_lighting": "18:00",
            "havdalah": "19:15",
        }

    return {
        "candle_lighting": format_time(shabbat_times.candle_lighting),
        "candle_lighting_datetime": shabbat_times.candle_lighting.isoformat(),
        "havdalah": format_time(shabbat_times.havdalah),
        "havdalah_datetime": shabbat_times.havdalah.isoformat(),
        "parasha": shabbat_times.parasha,
        "parasha_hebrew": shabbat_times.parasha_hebrew,
    }


@router.get("/shabbat-content")
async def get_shabbat_content(
    current_user: Optional[User] = Depends(get_optional_user),
):
    """
    Get curated Shabbat content.
    Returns family-friendly content, traditional music, and Shabbat programming.
    """
    # Shabbat-appropriate content categories
    shabbat_categories = ["family", "music", "documentary", "kids", "jewish"]

    # Get VOD content suitable for Shabbat
    vod_content = (
        await Content.find(
            {
                "$or": [
                    {"categories": {"$in": shabbat_categories}},
                    {"tags": {"$in": ["shabbat", "family", "jewish", "israeli"]}},
                ],
                "is_published": True,
            }
        )
        .limit(20)
        .to_list()
    )

    # Get radio stations (music for Shabbat atmosphere)
    radio_stations = (
        await RadioStation.find(RadioStation.is_active == True).limit(10).to_list()
    )

    # Format response
    return {
        "featured": {
            "title": "תוכן מומלץ לשבת",
            "title_en": "Recommended for Shabbat",
            "items": [
                {
                    "id": str(content.id),
                    "title": content.title,
                    "description": content.description,
                    "thumbnail": content.thumbnail,
                    "type": "vod",
                    "duration": content.duration,
                }
                for content in vod_content[:6]
            ],
        },
        "family": {
            "title": "לכל המשפחה",
            "title_en": "For the Whole Family",
            "items": [
                {
                    "id": str(content.id),
                    "title": content.title,
                    "thumbnail": content.thumbnail,
                    "type": "vod",
                }
                for content in vod_content
                if "family" in (content.categories or [])
                or "kids" in (content.categories or [])
            ][:8],
        },
        "music": {
            "title": "מוזיקה לשבת",
            "title_en": "Shabbat Music",
            "items": [
                {
                    "id": str(station.id),
                    "name": station.name,
                    "description": station.description,
                    "logo": station.logo,
                    "type": "radio",
                }
                for station in radio_stations
            ],
        },
        "atmosphere": {
            "message": "שבת שלום!",
            "message_en": "Shabbat Shalom!",
            "theme": "shabbat",
            "background_color": "#1a1a2e",
            "accent_color": "#ffd700",
        },
    }


@router.post("/preferences")
async def update_zman_preferences(
    show_israel_time: Optional[bool] = None,
    shabbat_mode_enabled: Optional[bool] = None,
    local_timezone: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
):
    """Update user's Zman Yisrael preferences"""
    preferences = current_user.preferences or {}

    if show_israel_time is not None:
        preferences["show_israel_time"] = show_israel_time

    if shabbat_mode_enabled is not None:
        preferences["shabbat_mode_enabled"] = shabbat_mode_enabled

    if local_timezone is not None:
        preferences["local_timezone"] = local_timezone

    current_user.preferences = preferences
    await current_user.save()

    return {
        "status": "updated",
        "preferences": {
            "show_israel_time": preferences.get("show_israel_time", True),
            "shabbat_mode_enabled": preferences.get("shabbat_mode_enabled", True),
            "local_timezone": preferences.get("local_timezone", "America/New_York"),
        },
    }


@router.get("/timezones")
async def get_supported_timezones():
    """Get list of supported timezones for user selection"""
    return {
        "timezones": [
            {"id": "America/New_York", "name": "Eastern Time (ET)", "offset": "-05:00"},
            {"id": "America/Chicago", "name": "Central Time (CT)", "offset": "-06:00"},
            {"id": "America/Denver", "name": "Mountain Time (MT)", "offset": "-07:00"},
            {
                "id": "America/Los_Angeles",
                "name": "Pacific Time (PT)",
                "offset": "-08:00",
            },
            {"id": "America/Phoenix", "name": "Arizona (MST)", "offset": "-07:00"},
            {
                "id": "America/Anchorage",
                "name": "Alaska Time (AKT)",
                "offset": "-09:00",
            },
            {"id": "Pacific/Honolulu", "name": "Hawaii Time (HST)", "offset": "-10:00"},
            {"id": "Europe/London", "name": "London (GMT)", "offset": "+00:00"},
            {"id": "Europe/Paris", "name": "Paris (CET)", "offset": "+01:00"},
            {"id": "Europe/Berlin", "name": "Berlin (CET)", "offset": "+01:00"},
            {"id": "Asia/Jerusalem", "name": "Israel (IST)", "offset": "+02:00"},
        ],
        "default": "America/New_York",
    }
