"""
Jewish Calendar Service - Integrates with HebCal and Sefaria APIs.

Provides:
- Hebrew dates
- Shabbat times for US cities
- Jewish holidays
- Weekly parasha
- Daf Yomi (daily Talmud page)
"""

import logging
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any

import httpx

from app.core.config import settings
from app.models.jewish_calendar import (
    JewishCalendarCache,
    HebrewDate,
    Holiday,
    Parasha,
    ShabbatTimes,
    DafYomi,
    JewishCalendarDay,
    US_JEWISH_CITIES,
    USCity,
    ShabbatTimesResponse,
    CalendarTodayResponse,
    DafYomiResponse,
    UpcomingHolidaysResponse,
)

logger = logging.getLogger(__name__)

# Hebrew day of week names
HEBREW_DAYS = {
    0: ("Sunday", "יום ראשון"),
    1: ("Monday", "יום שני"),
    2: ("Tuesday", "יום שלישי"),
    3: ("Wednesday", "יום רביעי"),
    4: ("Thursday", "יום חמישי"),
    5: ("Friday", "יום שישי"),
    6: ("Saturday", "שבת"),
}


class JewishCalendarService:
    """Service for Jewish calendar data from HebCal and Sefaria APIs."""

    def __init__(self):
        self._http_client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._http_client is None or self._http_client.is_closed:
            self._http_client = httpx.AsyncClient(
                timeout=10.0,
                headers={"User-Agent": "Bayit+ Jewish Calendar/1.0"},
            )
        return self._http_client

    async def _get_cached(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached data if not expired."""
        cached = await JewishCalendarCache.find_one(
            JewishCalendarCache.cache_key == cache_key
        )

        if cached and cached.expires_at > datetime.utcnow():
            return cached.data

        if cached:
            await cached.delete()

        return None

    async def _set_cache(
        self, cache_key: str, data: Dict[str, Any], api_source: str
    ) -> None:
        """Cache API response."""
        expires_at = datetime.utcnow() + timedelta(
            hours=settings.JEWISH_CALENDAR_CACHE_TTL_HOURS
        )

        # Upsert cache entry
        existing = await JewishCalendarCache.find_one(
            JewishCalendarCache.cache_key == cache_key
        )

        if existing:
            existing.data = data
            existing.expires_at = expires_at
            await existing.save()
        else:
            cache_entry = JewishCalendarCache(
                cache_key=cache_key,
                data=data,
                api_source=api_source,
                expires_at=expires_at,
            )
            await cache_entry.insert()

    async def get_hebrew_date(self, gregorian_date: Optional[date] = None) -> HebrewDate:
        """
        Get Hebrew date for a given Gregorian date.

        Uses HebCal converter API.
        """
        target_date = gregorian_date or date.today()
        cache_key = f"hebrew_date_{target_date.isoformat()}"

        # Check cache
        cached = await self._get_cached(cache_key)
        if cached:
            return HebrewDate(**cached)

        try:
            client = await self._get_client()
            url = f"{settings.HEBCAL_API_BASE_URL}/converter"

            response = await client.get(
                url,
                params={
                    "cfg": "json",
                    "gy": target_date.year,
                    "gm": target_date.month,
                    "gd": target_date.day,
                    "g2h": "1",
                },
            )
            response.raise_for_status()
            data = response.json()

            hebrew_date = HebrewDate(
                hebrew=data.get("hebrew", ""),
                day=data.get("hd", 1),
                month=data.get("hm", ""),
                month_num=data.get("hmn", 1),
                year=data.get("hy", 5786),
                is_shabbat=target_date.weekday() == 5,  # Saturday
            )

            await self._set_cache(cache_key, hebrew_date.model_dump(), "hebcal")
            return hebrew_date

        except Exception as e:
            logger.error(f"Error fetching Hebrew date: {e}")
            # Return a basic fallback
            return HebrewDate(
                hebrew="",
                day=1,
                month="",
                month_num=1,
                year=5786,
                is_shabbat=target_date.weekday() == 5,
            )

    async def get_shabbat_times(
        self,
        city: Optional[str] = None,
        state: Optional[str] = None,
        geoname_id: Optional[int] = None,
    ) -> ShabbatTimesResponse:
        """
        Get Shabbat candle lighting and havdalah times for a US city.

        Can specify city/state or HebCal geoname_id.
        """
        # Find the city configuration
        target_city: Optional[USCity] = None

        if geoname_id:
            for c in US_JEWISH_CITIES:
                if c.geoname_id == geoname_id:
                    target_city = c
                    break
        elif city and state:
            city_lower = city.lower()
            state_upper = state.upper()
            for c in US_JEWISH_CITIES:
                if c.name.lower() == city_lower and c.state.upper() == state_upper:
                    target_city = c
                    break

        if not target_city:
            # Default to New York
            target_city = US_JEWISH_CITIES[0]
            logger.info(f"City not found, defaulting to {target_city.name}")

        cache_key = f"shabbat_{target_city.geoname_id}_{date.today().isoformat()}"

        # Check cache
        cached = await self._get_cached(cache_key)
        if cached:
            return ShabbatTimesResponse(**cached)

        try:
            client = await self._get_client()
            url = f"{settings.HEBCAL_API_BASE_URL}/shabbat"

            response = await client.get(
                url,
                params={
                    "cfg": "json",
                    "geonameid": target_city.geoname_id,
                    "M": "on",  # Include havdalah
                },
            )
            response.raise_for_status()
            data = response.json()

            # Parse response
            candle_lighting = ""
            havdalah = ""
            parasha_name = None
            parasha_he = None
            hebrew_date = None

            for item in data.get("items", []):
                category = item.get("category", "")
                if category == "candles":
                    candle_lighting = item.get("date", "")
                elif category == "havdalah":
                    havdalah = item.get("date", "")
                elif category == "parashat":
                    parasha_name = item.get("title", "").replace("Parashat ", "")
                    parasha_he = item.get("hebrew", "")

            # Get Hebrew date from the response
            hebrew_date = data.get("date", "")

            result = ShabbatTimesResponse(
                city=target_city.name,
                state=target_city.state,
                candle_lighting=candle_lighting,
                havdalah=havdalah,
                parasha=parasha_name,
                parasha_he=parasha_he,
                hebrew_date=hebrew_date,
                timezone=target_city.timezone,
            )

            await self._set_cache(cache_key, result.model_dump(), "hebcal")
            return result

        except Exception as e:
            logger.error(f"Error fetching Shabbat times: {e}")
            return ShabbatTimesResponse(
                city=target_city.name,
                state=target_city.state,
                candle_lighting="",
                havdalah="",
                timezone=target_city.timezone,
            )

    async def get_today(self) -> CalendarTodayResponse:
        """Get comprehensive calendar information for today."""
        today = date.today()
        cache_key = f"calendar_today_{today.isoformat()}"

        # Check cache
        cached = await self._get_cached(cache_key)
        if cached:
            return CalendarTodayResponse(**cached)

        try:
            client = await self._get_client()

            # Fetch calendar data from HebCal
            url = f"{settings.HEBCAL_API_BASE_URL}/hebcal"

            response = await client.get(
                url,
                params={
                    "cfg": "json",
                    "v": "1",
                    "maj": "on",  # Major holidays
                    "min": "on",  # Minor holidays
                    "mod": "on",  # Modern holidays
                    "nx": "on",   # Rosh Chodesh
                    "ss": "on",   # Special Shabbatot
                    "s": "on",    # Parasha
                    "o": "on",    # Omer
                    "start": today.isoformat(),
                    "end": today.isoformat(),
                },
            )
            response.raise_for_status()
            data = response.json()

            # Get Hebrew date
            hebrew_date = await self.get_hebrew_date(today)

            # Parse items
            holidays = []
            parasha = None
            parasha_he = None
            omer_count = None
            is_holiday = False

            for item in data.get("items", []):
                category = item.get("category", "")

                if category == "parashat":
                    parasha = item.get("title", "").replace("Parashat ", "")
                    parasha_he = item.get("hebrew", "")
                elif category == "omer":
                    # Parse omer count from title like "19th day of the Omer"
                    title = item.get("title", "")
                    try:
                        omer_count = int(title.split()[0].rstrip("stndrdth"))
                    except (ValueError, IndexError):
                        pass
                elif category in ["holiday", "roshchodesh"]:
                    holidays.append({
                        "title": item.get("title", ""),
                        "title_he": item.get("hebrew", ""),
                        "category": category,
                        "yomtov": item.get("yomtov", False),
                    })
                    if item.get("yomtov"):
                        is_holiday = True

            day_of_week_num = today.weekday()
            day_en, day_he = HEBREW_DAYS.get(day_of_week_num, ("", ""))

            result = CalendarTodayResponse(
                gregorian_date=today.isoformat(),
                hebrew_date=hebrew_date.hebrew,
                hebrew_date_full=f"{hebrew_date.hebrew} {hebrew_date.year}",
                day_of_week=day_en,
                day_of_week_he=day_he,
                is_shabbat=day_of_week_num == 5,  # Saturday (Python weekday 5 = Saturday)
                is_holiday=is_holiday,
                parasha=parasha,
                parasha_he=parasha_he,
                holidays=holidays,
                omer_count=omer_count,
            )

            await self._set_cache(cache_key, result.model_dump(), "hebcal")
            return result

        except Exception as e:
            logger.error(f"Error fetching calendar today: {e}")
            hebrew_date = await self.get_hebrew_date(today)
            day_of_week_num = today.weekday()
            day_en, day_he = HEBREW_DAYS.get(day_of_week_num, ("", ""))

            return CalendarTodayResponse(
                gregorian_date=today.isoformat(),
                hebrew_date=hebrew_date.hebrew,
                hebrew_date_full=f"{hebrew_date.hebrew} {hebrew_date.year}",
                day_of_week=day_en,
                day_of_week_he=day_he,
                is_shabbat=day_of_week_num == 5,
                is_holiday=False,
                holidays=[],
            )

    async def get_daf_yomi(self, target_date: Optional[date] = None) -> DafYomiResponse:
        """
        Get today's Daf Yomi (daily Talmud page) from Sefaria API.
        """
        target = target_date or date.today()
        cache_key = f"daf_yomi_{target.isoformat()}"

        # Check cache
        cached = await self._get_cached(cache_key)
        if cached:
            return DafYomiResponse(**cached)

        try:
            client = await self._get_client()
            url = f"{settings.SEFARIA_API_BASE_URL}/calendars"

            response = await client.get(url)
            response.raise_for_status()
            data = response.json()

            # Find Daf Yomi in calendar items
            daf_yomi = None
            for item in data.get("calendar_items", []):
                if item.get("title", {}).get("en") == "Daf Yomi":
                    daf_yomi = item
                    break

            if not daf_yomi:
                raise ValueError("Daf Yomi not found in Sefaria calendar")

            # Parse Daf Yomi info
            display_value = daf_yomi.get("displayValue", {})
            tractate_en = display_value.get("en", "").split()[0]  # e.g., "Berakhot 2"
            tractate_he = display_value.get("he", "").split()[0] if display_value.get("he") else ""
            page = display_value.get("en", "").split()[-1] if display_value.get("en") else "2a"

            # Build Sefaria URL
            ref = daf_yomi.get("ref", "")
            sefaria_url = f"https://www.sefaria.org/{ref.replace(' ', '_')}"

            result = DafYomiResponse(
                tractate=tractate_en,
                tractate_he=tractate_he,
                page=page,
                date=target.isoformat(),
                sefaria_url=sefaria_url,
            )

            await self._set_cache(cache_key, result.model_dump(), "sefaria")
            return result

        except Exception as e:
            logger.error(f"Error fetching Daf Yomi: {e}")
            return DafYomiResponse(
                tractate="",
                tractate_he="",
                page="",
                date=target.isoformat(),
                sefaria_url="https://www.sefaria.org/",
            )

    async def get_upcoming_holidays(self, days: int = 30) -> UpcomingHolidaysResponse:
        """Get upcoming Jewish holidays within the specified number of days."""
        today = date.today()
        end_date = today + timedelta(days=days)
        cache_key = f"holidays_{today.isoformat()}_{days}"

        # Check cache
        cached = await self._get_cached(cache_key)
        if cached:
            return UpcomingHolidaysResponse(**cached)

        try:
            client = await self._get_client()
            url = f"{settings.HEBCAL_API_BASE_URL}/hebcal"

            response = await client.get(
                url,
                params={
                    "cfg": "json",
                    "v": "1",
                    "maj": "on",  # Major holidays
                    "min": "on",  # Minor holidays
                    "mod": "on",  # Modern holidays
                    "nx": "on",   # Rosh Chodesh
                    "start": today.isoformat(),
                    "end": end_date.isoformat(),
                },
            )
            response.raise_for_status()
            data = response.json()

            holidays = []
            next_major = None

            for item in data.get("items", []):
                category = item.get("category", "")
                if category in ["holiday", "roshchodesh"]:
                    holiday_date = item.get("date", "")
                    holiday_info = {
                        "title": item.get("title", ""),
                        "title_he": item.get("hebrew", ""),
                        "date": holiday_date,
                        "category": category,
                        "yomtov": item.get("yomtov", False),
                        "memo": item.get("memo", ""),
                    }
                    holidays.append(holiday_info)

                    # Track next major holiday
                    if item.get("yomtov") and not next_major:
                        next_major = holiday_info

            # Calculate days until next major holiday
            days_until = None
            if next_major and next_major.get("date"):
                try:
                    next_date = datetime.fromisoformat(next_major["date"]).date()
                    days_until = (next_date - today).days
                except Exception:
                    pass

            result = UpcomingHolidaysResponse(
                holidays=holidays,
                next_major_holiday=next_major,
                days_until_next=days_until,
            )

            await self._set_cache(cache_key, result.model_dump(), "hebcal")
            return result

        except Exception as e:
            logger.error(f"Error fetching upcoming holidays: {e}")
            return UpcomingHolidaysResponse(holidays=[])

    async def get_available_cities(self) -> List[Dict[str, Any]]:
        """Get list of available US cities for Shabbat times."""
        return [
            {
                "name": city.name,
                "state": city.state,
                "geoname_id": city.geoname_id,
                "timezone": city.timezone,
            }
            for city in US_JEWISH_CITIES
        ]

    async def close(self) -> None:
        """Close HTTP client."""
        if self._http_client and not self._http_client.is_closed:
            await self._http_client.aclose()


# Global service instance
jewish_calendar_service = JewishCalendarService()
