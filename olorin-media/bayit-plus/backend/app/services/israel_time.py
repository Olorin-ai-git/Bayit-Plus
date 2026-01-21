"""
Israel Time Service.
Handles Israel timezone, Shabbat detection, and Jewish calendar integration.
"""

from dataclasses import dataclass
from datetime import date, datetime, timedelta
from functools import lru_cache
from typing import Optional, Tuple

import httpx
import pytz

# Israel timezone
ISRAEL_TZ = pytz.timezone("Asia/Jerusalem")

# Major US timezones for expats
US_TIMEZONES = {
    "America/New_York": "Eastern",
    "America/Chicago": "Central",
    "America/Denver": "Mountain",
    "America/Los_Angeles": "Pacific",
}


@dataclass
class ShabbatTimes:
    """Shabbat candle lighting and havdalah times"""

    candle_lighting: datetime
    havdalah: datetime
    parasha: Optional[str] = None
    parasha_hebrew: Optional[str] = None


@dataclass
class ShabbatStatus:
    """Current Shabbat status"""

    is_shabbat: bool
    is_erev_shabbat: bool  # Friday before candle lighting
    time_until_shabbat: Optional[timedelta] = None
    time_until_havdalah: Optional[timedelta] = None
    shabbat_times: Optional[ShabbatTimes] = None


@dataclass
class IsraelTimeInfo:
    """Complete Israel time information"""

    israel_time: datetime
    israel_time_formatted: str
    local_time: datetime
    local_time_formatted: str
    local_timezone: str
    day_of_week_hebrew: str
    shabbat_status: ShabbatStatus


# Hebrew day names
HEBREW_DAYS = {
    0: "יום ראשון",
    1: "יום שני",
    2: "יום שלישי",
    3: "יום רביעי",
    4: "יום חמישי",
    5: "יום שישי",
    6: "שבת",
}


def get_israel_time() -> datetime:
    """Get current time in Israel"""
    return datetime.now(ISRAEL_TZ)


def get_local_time(timezone: str) -> datetime:
    """Get current time in specified timezone"""
    try:
        tz = pytz.timezone(timezone)
        return datetime.now(tz)
    except pytz.exceptions.UnknownTimeZoneError:
        # Default to New York if invalid timezone
        return datetime.now(pytz.timezone("America/New_York"))


def format_time(dt: datetime, include_seconds: bool = False) -> str:
    """Format datetime for display"""
    if include_seconds:
        return dt.strftime("%H:%M:%S")
    return dt.strftime("%H:%M")


def format_date_hebrew(dt: datetime) -> str:
    """Format date with Hebrew day name"""
    day_name = HEBREW_DAYS.get(dt.weekday(), "")
    return f"{day_name}, {dt.strftime('%d/%m/%Y')}"


async def fetch_shabbat_times(
    latitude: float = 32.0853,  # Tel Aviv default
    longitude: float = 34.7818,
    target_date: Optional[date] = None,
) -> Optional[ShabbatTimes]:
    """
    Fetch Shabbat times from HebCal API.
    Default location is Tel Aviv.
    """
    if target_date is None:
        target_date = get_israel_time().date()

    # Find the Friday of the week
    days_until_friday = (4 - target_date.weekday()) % 7
    if target_date.weekday() == 5:  # Saturday
        days_until_friday = 6  # Next Friday
    friday = target_date + timedelta(days=days_until_friday)

    # HebCal API parameters
    params = {
        "cfg": "json",
        "latitude": latitude,
        "longitude": longitude,
        "tzid": "Asia/Jerusalem",
        "M": "on",  # Include havdalah
        "b": "18",  # Candle lighting 18 minutes before sunset
        "start": friday.isoformat(),
        "end": (friday + timedelta(days=2)).isoformat(),
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://www.hebcal.com/shabbat", params=params, timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            candle_lighting = None
            havdalah = None
            parasha = None
            parasha_hebrew = None

            for item in data.get("items", []):
                category = item.get("category")

                if category == "candles":
                    candle_lighting = datetime.fromisoformat(
                        item["date"].replace("Z", "+00:00")
                    ).astimezone(ISRAEL_TZ)

                elif category == "havdalah":
                    havdalah = datetime.fromisoformat(
                        item["date"].replace("Z", "+00:00")
                    ).astimezone(ISRAEL_TZ)

                elif category == "parashat":
                    parasha = item.get("title", "").replace("Parashat ", "")
                    parasha_hebrew = item.get("hebrew")

            if candle_lighting and havdalah:
                return ShabbatTimes(
                    candle_lighting=candle_lighting,
                    havdalah=havdalah,
                    parasha=parasha,
                    parasha_hebrew=parasha_hebrew,
                )

    except Exception as e:
        print(f"Error fetching Shabbat times: {e}")

    return None


def calculate_shabbat_status(
    now: datetime, shabbat_times: Optional[ShabbatTimes]
) -> ShabbatStatus:
    """Calculate current Shabbat status"""
    if not shabbat_times:
        # Fallback: estimate based on day of week
        israel_now = (
            now.astimezone(ISRAEL_TZ) if now.tzinfo else ISRAEL_TZ.localize(now)
        )
        weekday = israel_now.weekday()

        # Friday after ~18:00 or Saturday before ~20:00
        is_friday_evening = weekday == 4 and israel_now.hour >= 18
        is_saturday = weekday == 5
        is_saturday_night = weekday == 5 and israel_now.hour >= 20

        return ShabbatStatus(
            is_shabbat=(is_friday_evening or is_saturday) and not is_saturday_night,
            is_erev_shabbat=weekday == 4 and israel_now.hour < 18,
        )

    israel_now = now.astimezone(ISRAEL_TZ) if now.tzinfo else ISRAEL_TZ.localize(now)

    is_shabbat = shabbat_times.candle_lighting <= israel_now < shabbat_times.havdalah
    is_erev_shabbat = (
        israel_now.date() == shabbat_times.candle_lighting.date()
        and israel_now < shabbat_times.candle_lighting
    )

    time_until_shabbat = None
    time_until_havdalah = None

    if is_erev_shabbat:
        time_until_shabbat = shabbat_times.candle_lighting - israel_now

    if is_shabbat:
        time_until_havdalah = shabbat_times.havdalah - israel_now

    return ShabbatStatus(
        is_shabbat=is_shabbat,
        is_erev_shabbat=is_erev_shabbat,
        time_until_shabbat=time_until_shabbat,
        time_until_havdalah=time_until_havdalah,
        shabbat_times=shabbat_times,
    )


async def get_israel_time_info(
    local_timezone: str = "America/New_York",
) -> IsraelTimeInfo:
    """Get complete Israel time information"""
    israel_time = get_israel_time()
    local_time = get_local_time(local_timezone)

    # Fetch Shabbat times
    shabbat_times = await fetch_shabbat_times()
    shabbat_status = calculate_shabbat_status(israel_time, shabbat_times)

    return IsraelTimeInfo(
        israel_time=israel_time,
        israel_time_formatted=format_time(israel_time),
        local_time=local_time,
        local_time_formatted=format_time(local_time),
        local_timezone=local_timezone,
        day_of_week_hebrew=HEBREW_DAYS.get(israel_time.weekday(), ""),
        shabbat_status=shabbat_status,
    )


def get_timezone_display_name(timezone: str) -> str:
    """Get display name for timezone"""
    return US_TIMEZONES.get(timezone, timezone.split("/")[-1])


def timedelta_to_str(td: timedelta) -> str:
    """Convert timedelta to readable string"""
    total_seconds = int(td.total_seconds())
    hours, remainder = divmod(total_seconds, 3600)
    minutes, _ = divmod(remainder, 60)

    if hours > 0:
        return f"{hours}:{minutes:02d}"
    return f"{minutes} דקות"
