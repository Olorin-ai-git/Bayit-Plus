"""
Jewish Calendar models for Hebrew dates, holidays, and Shabbat times.

Integrates with:
- HebCal API for Hebrew dates, holidays, parasha
- Sefaria API for Daf Yomi, daily learning schedules
"""

from datetime import date, datetime
from typing import List, Optional

from beanie import Document
from pydantic import BaseModel, Field


class HebrewDate(BaseModel):
    """Hebrew date representation."""

    hebrew: str  # Full Hebrew date string (e.g., "י"ז טבת תשפ"ו")
    day: int  # Hebrew day (1-30)
    month: str  # Hebrew month name
    month_num: int  # Hebrew month number (1-13 for leap years)
    year: int  # Hebrew year
    is_shabbat: bool = False
    is_holiday: bool = False
    is_rosh_chodesh: bool = False


class Holiday(BaseModel):
    """Jewish holiday or special day."""

    title: str
    title_he: Optional[str] = None
    date: date
    hebrew_date: str
    category: str  # major, minor, fast, modern, shabbat, roshchodesh
    yomtov: bool = False  # Is work prohibited?
    memo: Optional[str] = None  # Additional info about the holiday


class Parasha(BaseModel):
    """Weekly Torah portion."""

    name: str
    name_he: Optional[str] = None
    book: str  # Genesis, Exodus, etc.
    aliyot: Optional[List[str]] = None  # Aliyah references


class ShabbatTimes(BaseModel):
    """Shabbat candle lighting and havdalah times for a specific location."""

    city: str
    state: str
    country: str = "US"
    candle_lighting: datetime  # Friday candle lighting time
    havdalah: datetime  # Saturday night havdalah time
    parasha: Optional[Parasha] = None
    hebrew_date: Optional[str] = None
    geoname_id: Optional[int] = None  # HebCal GeoName ID


class DafYomi(BaseModel):
    """Daily Daf Yomi (Talmud page)."""

    tractate: str  # Masechet name
    tractate_he: Optional[str] = None
    page: str  # Daf number (e.g., "2a")
    date: date
    sefaria_url: Optional[str] = None  # Link to Sefaria text


class DailyLearning(BaseModel):
    """Daily learning schedules from various sources."""

    date: date
    hebrew_date: str
    daf_yomi: Optional[DafYomi] = None
    daily_mishnah: Optional[str] = None
    daily_rambam: Optional[str] = None
    daily_halacha: Optional[str] = None


class JewishCalendarDay(BaseModel):
    """Complete Jewish calendar information for a specific day."""

    gregorian_date: date
    hebrew_date: HebrewDate
    holidays: List[Holiday] = Field(default_factory=list)
    parasha: Optional[Parasha] = None
    daf_yomi: Optional[DafYomi] = None
    is_shabbat: bool = False
    is_erev_shabbat: bool = False  # Friday
    is_motzei_shabbat: bool = False  # Saturday night
    omer_count: Optional[int] = None  # Day of the Omer (1-49)


class JewishCalendarCache(Document):
    """
    Cached calendar data from HebCal/Sefaria APIs.

    Caches responses to reduce API calls and improve performance.
    """

    cache_key: str  # Unique key: "calendar_{date}" or "shabbat_{geoname_id}_{date}"
    data: dict  # Cached response data
    api_source: str  # "hebcal" or "sefaria"
    expires_at: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "jewish_calendar_cache"
        indexes = [
            "cache_key",
            "api_source",
            "expires_at",
        ]


class USCity(BaseModel):
    """US city configuration for Shabbat times lookups."""

    name: str
    state: str
    geoname_id: int  # HebCal GeoName ID
    latitude: float
    longitude: float
    timezone: str


# Pre-configured major US Jewish communities with HebCal GeoName IDs
US_JEWISH_CITIES = [
    USCity(
        name="New York",
        state="NY",
        geoname_id=5128581,
        latitude=40.7128,
        longitude=-74.0060,
        timezone="America/New_York",
    ),
    USCity(
        name="Los Angeles",
        state="CA",
        geoname_id=5368361,
        latitude=34.0522,
        longitude=-118.2437,
        timezone="America/Los_Angeles",
    ),
    USCity(
        name="Chicago",
        state="IL",
        geoname_id=4887398,
        latitude=41.8781,
        longitude=-87.6298,
        timezone="America/Chicago",
    ),
    USCity(
        name="Miami",
        state="FL",
        geoname_id=4164138,
        latitude=25.7617,
        longitude=-80.1918,
        timezone="America/New_York",
    ),
    USCity(
        name="Boston",
        state="MA",
        geoname_id=4930956,
        latitude=42.3601,
        longitude=-71.0589,
        timezone="America/New_York",
    ),
    USCity(
        name="Philadelphia",
        state="PA",
        geoname_id=4560349,
        latitude=39.9526,
        longitude=-75.1652,
        timezone="America/New_York",
    ),
    USCity(
        name="Atlanta",
        state="GA",
        geoname_id=4180439,
        latitude=33.7490,
        longitude=-84.3880,
        timezone="America/New_York",
    ),
    USCity(
        name="Dallas",
        state="TX",
        geoname_id=4684888,
        latitude=32.7767,
        longitude=-96.7970,
        timezone="America/Chicago",
    ),
    USCity(
        name="Denver",
        state="CO",
        geoname_id=5419384,
        latitude=39.7392,
        longitude=-104.9903,
        timezone="America/Denver",
    ),
    USCity(
        name="Seattle",
        state="WA",
        geoname_id=5809844,
        latitude=47.6062,
        longitude=-122.3321,
        timezone="America/Los_Angeles",
    ),
    USCity(
        name="Baltimore",
        state="MD",
        geoname_id=4347778,
        latitude=39.2904,
        longitude=-76.6122,
        timezone="America/New_York",
    ),
    USCity(
        name="Cleveland",
        state="OH",
        geoname_id=5150529,
        latitude=41.4993,
        longitude=-81.6944,
        timezone="America/New_York",
    ),
    USCity(
        name="Detroit",
        state="MI",
        geoname_id=4990729,
        latitude=42.3314,
        longitude=-83.0458,
        timezone="America/Detroit",
    ),
    USCity(
        name="Phoenix",
        state="AZ",
        geoname_id=5308655,
        latitude=33.4484,
        longitude=-112.0740,
        timezone="America/Phoenix",
    ),
    USCity(
        name="San Diego",
        state="CA",
        geoname_id=5391811,
        latitude=32.7157,
        longitude=-117.1611,
        timezone="America/Los_Angeles",
    ),
]


class ShabbatTimesResponse(BaseModel):
    """Response model for Shabbat times endpoint."""

    city: str
    state: str
    candle_lighting: str  # ISO format time
    havdalah: str  # ISO format time
    parasha: Optional[str] = None
    parasha_he: Optional[str] = None
    hebrew_date: Optional[str] = None
    timezone: Optional[str] = None  # IANA timezone (e.g., "America/New_York")


class CalendarTodayResponse(BaseModel):
    """Response model for today's calendar information."""

    gregorian_date: str  # ISO format date
    hebrew_date: str
    hebrew_date_full: str  # Full Hebrew date with year
    day_of_week: str
    day_of_week_he: str
    is_shabbat: bool
    is_holiday: bool
    parasha: Optional[str] = None
    parasha_he: Optional[str] = None
    holidays: List[dict] = Field(default_factory=list)
    omer_count: Optional[int] = None


class DafYomiResponse(BaseModel):
    """Response model for Daf Yomi endpoint."""

    tractate: str
    tractate_he: str
    page: str
    date: str  # ISO format date
    sefaria_url: str


class UpcomingHolidaysResponse(BaseModel):
    """Response model for upcoming holidays endpoint."""

    holidays: List[dict]
    next_major_holiday: Optional[dict] = None
    days_until_next: Optional[int] = None
