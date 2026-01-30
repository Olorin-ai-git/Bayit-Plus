"""
Morning Ritual Service.
Provides personalized morning content experience for Israeli expats.
Auto-plays curated content during morning hours (configurable 7-9 AM local time).
"""

from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional

import anthropic
import pytz

from app.core.config import settings
from app.models.content import Content, LiveChannel, RadioStation
from app.models.user import User

# Initialize Claude client
client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)


def get_user_local_time(user: User) -> datetime:
    """Get current time in user's local timezone."""
    timezone_str = user.preferences.get("local_timezone", "America/New_York")
    try:
        tz = pytz.timezone(timezone_str)
    except pytz.exceptions.UnknownTimeZoneError:
        tz = pytz.timezone("America/New_York")

    return datetime.now(tz)


def is_ritual_time(user: User) -> bool:
    """
    Check if current time is within user's morning ritual window.
    Default: 7:00 AM - 9:00 AM local time.
    """
    if not user.preferences.get("morning_ritual_enabled", False):
        return False

    local_time = get_user_local_time(user)
    current_time = local_time.time()

    # Get ritual time window from preferences
    start_hour = user.preferences.get("morning_ritual_start", 7)
    end_hour = user.preferences.get("morning_ritual_end", 9)

    start_time = time(hour=start_hour, minute=0)
    end_time = time(hour=end_hour, minute=0)

    return start_time <= current_time < end_time


def get_israel_morning_context() -> Dict[str, Any]:
    """
    Get context about the morning in Israel.
    Israel is typically 7-10 hours ahead of US timezones.
    """
    israel_tz = pytz.timezone("Asia/Jerusalem")
    israel_now = datetime.now(israel_tz)

    # Determine what's happening in Israel
    israel_hour = israel_now.hour

    if 6 <= israel_hour < 12:
        time_of_day = "morning"
        activity = "בוקר טוב! בישראל עכשיו בוקר"
    elif 12 <= israel_hour < 17:
        time_of_day = "afternoon"
        activity = "בישראל עכשיו אחר הצהריים"
    elif 17 <= israel_hour < 21:
        time_of_day = "evening"
        activity = "בישראל עכשיו ערב"
    else:
        time_of_day = "night"
        activity = "בישראל עכשיו לילה"

    # Check if it's a weekend in Israel (Friday evening to Saturday evening)
    is_shabbat = (israel_now.weekday() == 4 and israel_hour >= 18) or (
        israel_now.weekday() == 5 and israel_hour < 20
    )

    return {
        "israel_time": israel_now.strftime("%H:%M"),
        "israel_date": israel_now.strftime("%d/%m/%Y"),
        "time_of_day": time_of_day,
        "activity_message": activity,
        "is_shabbat": is_shabbat,
        "day_name_he": ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"][
            israel_now.weekday()
        ],
    }


async def get_morning_playlist(user: User) -> List[Dict[str, Any]]:
    """
    Generate personalized morning playlist based on user preferences.
    Includes news, weather brief, and favorite content.
    """
    playlist = []
    ritual_content = user.preferences.get(
        "morning_ritual_content", ["news", "weather", "radio"]
    )

    # 1. Start with news channel if requested
    if "news" in ritual_content:
        news_channels = (
            await LiveChannel.find(
                LiveChannel.is_active == True, LiveChannel.category == "news"
            )
            .limit(3)
            .to_list()
        )

        if news_channels:
            # Prefer Kan News or Reshet 13
            preferred = next(
                (ch for ch in news_channels if "כאן" in ch.name or "13" in ch.name),
                news_channels[0],
            )
            playlist.append(
                {
                    "id": str(preferred.id),
                    "title": f"חדשות הבוקר - {preferred.name}",
                    "type": "live",
                    "stream_url": preferred.stream_url,
                    "thumbnail": preferred.logo,
                    "duration_hint": 300,  # 5 minutes suggested
                    "category": "news",
                }
            )

    # 2. Add radio if requested (background audio option)
    if "radio" in ritual_content:
        radio_stations = (
            await RadioStation.find(RadioStation.is_active == True).limit(5).to_list()
        )

        if radio_stations:
            # Prefer Galei Zahal or Kan Bet
            preferred = next(
                (
                    st
                    for st in radio_stations
                    if "גלצ" in st.name or 'גלי צה"ל' in st.name or "כאן ב" in st.name
                ),
                radio_stations[0],
            )
            playlist.append(
                {
                    "id": str(preferred.id),
                    "title": f"רדיו בוקר - {preferred.name}",
                    "type": "radio",
                    "stream_url": preferred.stream_url,
                    "thumbnail": preferred.logo,
                    "duration_hint": 600,  # 10 minutes suggested
                    "category": "radio",
                }
            )

    # 3. Add VOD content (short clips, morning shows)
    if "clips" in ritual_content:
        morning_content = (
            await Content.find(
                Content.is_published == True,
                Content.duration <= 600,  # Under 10 minutes
            )
            .limit(3)
            .to_list()
        )

        for item in morning_content:
            playlist.append(
                {
                    "id": str(item.id),
                    "title": item.title,
                    "type": "vod",
                    "thumbnail": item.thumbnail,
                    "duration": item.duration,
                    "category": "clips",
                }
            )

    return playlist


async def generate_ai_brief(user: User) -> Dict[str, Any]:
    """
    Generate AI-powered personalized morning brief using Claude.
    Summarizes what's happening in Israel relevant to the user.
    """
    israel_context = get_israel_morning_context()
    local_time = get_user_local_time(user)

    # Get user's favorite categories/channels for personalization
    favorite_categories = user.preferences.get("favorite_categories", [])

    prompt = f"""צור תקציר בוקר קצר וידידותי לישראלי שגר בארה"ב.

פרטים:
- שעה מקומית אצל המשתמש: {local_time.strftime("%H:%M")}
- שעה בישראל: {israel_context['israel_time']}
- יום: {israel_context['day_name_he']}
- {"שבת שלום! היום שבת בישראל" if israel_context['is_shabbat'] else ""}
- קטגוריות אהובות: {', '.join(favorite_categories) if favorite_categories else 'כללי'}

כתוב תקציר של 2-3 משפטים שכולל:
1. ברכת בוקר חמה
2. מה קורה עכשיו בישראל (לפי השעה שם)
3. המלצה קצרה למה לצפות

החזר JSON בפורמט:
{{
    "greeting": "ברכת הבוקר",
    "israel_update": "מה קורה בישראל",
    "recommendation": "המלצה לצפייה",
    "mood": "uplifting|informative|relaxed"
}}"""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text.strip()

        # Parse JSON
        import json

        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        brief = json.loads(response_text)
        brief["israel_context"] = israel_context
        brief["generated_at"] = datetime.now(timezone.utc).isoformat()

        return brief

    except Exception as e:
        print(f"Error generating AI brief: {e}")
        return {
            "greeting": "בוקר טוב! ☀️",
            "israel_update": israel_context["activity_message"],
            "recommendation": "בוא נתחיל את היום עם חדשות מהארץ",
            "mood": "uplifting",
            "israel_context": israel_context,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }


async def get_ritual_status(user: User) -> Dict[str, Any]:
    """
    Get complete morning ritual status and content.
    """
    is_active = is_ritual_time(user)
    local_time = get_user_local_time(user)
    israel_context = get_israel_morning_context()

    result = {
        "is_ritual_time": is_active,
        "ritual_enabled": user.preferences.get("morning_ritual_enabled", False),
        "local_time": local_time.strftime("%H:%M"),
        "local_date": local_time.strftime("%Y-%m-%d"),
        "israel_context": israel_context,
    }

    if is_active:
        result["playlist"] = await get_morning_playlist(user)
        result["ai_brief"] = await generate_ai_brief(user)

    return result


def get_default_ritual_preferences() -> Dict[str, Any]:
    """Get default morning ritual preferences."""
    return {
        "morning_ritual_enabled": False,
        "morning_ritual_start": 7,
        "morning_ritual_end": 9,
        "morning_ritual_content": ["news", "radio"],
        "morning_ritual_auto_play": True,
        "morning_ritual_skip_weekends": False,
    }
