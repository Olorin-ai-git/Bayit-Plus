"""
Constants and configuration for Judaism routes.

All configurable values are loaded from settings where appropriate.
Static category definitions are kept here for consistency.
"""

from typing import List, Dict

# Judaism content categories (matching TV app)
# These are static UI categories that map to content taxonomy
JUDAISM_CATEGORIES: List[Dict[str, str]] = [
    {"id": "all", "name": "\u05d4\u05db\u05dc", "name_en": "All", "name_es": "Todo", "icon": ""},
    {"id": "news", "name": "\u05d7\u05d3\u05e9\u05d5\u05ea", "name_en": "Jewish News", "name_es": "Noticias Jud\u00edas", "icon": ""},
    {"id": "calendar", "name": "\u05dc\u05d5\u05d7 \u05e9\u05e0\u05d4", "name_en": "Calendar", "name_es": "Calendario", "icon": ""},
    {"id": "community", "name": "\u05e7\u05d4\u05d9\u05dc\u05d4", "name_en": "Community", "name_es": "Comunidad", "icon": ""},
    {"id": "shiurim", "name": "\u05e9\u05d9\u05e2\u05d5\u05e8\u05d9\u05dd", "name_en": "Torah Classes", "name_es": "Clases de Tora", "icon": ""},
    {"id": "tefila", "name": "\u05ea\u05e4\u05d9\u05dc\u05d4", "name_en": "Prayer", "name_es": "Oracion", "icon": ""},
    {"id": "music", "name": "\u05de\u05d5\u05d6\u05d9\u05e7\u05d4 \u05d9\u05d4\u05d5\u05d3\u05d9\u05ea", "name_en": "Jewish Music", "name_es": "Musica Judia", "icon": ""},
    {"id": "holidays", "name": "\u05d7\u05d2\u05d9\u05dd", "name_en": "Holidays", "name_es": "Festividades", "icon": ""},
    {"id": "documentaries", "name": "\u05e1\u05e8\u05d8\u05d9\u05dd \u05ea\u05d9\u05e2\u05d5\u05d3\u05d9\u05d9\u05dd", "name_en": "Documentaries", "name_es": "Documentales", "icon": ""},
]


# Regex patterns for content matching
JUDAISM_CONTENT_REGEX = r"shiurim|tefila|jewish|holidays|judaism|jewish-music|jewish-docs"
JUDAISM_TITLE_REGEX = r"torah|shabbat|\u05e9\u05d1\u05ea|\u05e4\u05e8\u05e9\u05ea|\u05d3\u05e3 \u05d9\u05d5\u05de\u05d9|\u05ea\u05e4\u05d9\u05dc\u05d4|\u05d4\u05dc\u05db\u05d5\u05ea|\u05de\u05e9\u05e0\u05d9\u05d5\u05ea|\u05d7\u05e0\u05d5\u05db\u05d4|\u05e4\u05d5\u05e8\u05d9\u05dd|\u05e4\u05e1\u05d7|\u05e8\u05d0\u05e9 \u05d4\u05e9\u05e0\u05d4|\u05d9\u05d4\u05d5\u05d3"
JUDAISM_FEATURED_REGEX = r"jewish|judaism|torah"

# Live channels matching patterns
LIVE_CHANNEL_NAME_REGEX = r"torah|jewish|\u05ea\u05d5\u05e8\u05d4|\u05d9\u05d4\u05d3\u05d5\u05ea"
LIVE_CHANNEL_CATEGORY_REGEX = r"religious|jewish"

# Shiur genre matching
SHIUR_GENRE_REGEX = r"shiur|class|lesson"

# Shabbat content matching patterns
SHABBAT_KEYWORDS_REGEX = r"shabbat|\u05e9\u05d1\u05ea|shabbos|sabbath"
SHABBAT_ACTIVITIES_REGEX = r"candle|\u05e0\u05e8\u05d5\u05ea|kiddush|\u05e7\u05d9\u05d3\u05d5\u05e9|challah|\u05d7\u05dc\u05d4"
SHABBAT_END_ACTIVITIES_REGEX = r"havdalah|\u05d4\u05d1\u05d3\u05dc\u05d4|zmiros|\u05d6\u05de\u05d9\u05e8\u05d5\u05ea"
JEWISH_MUSIC_REGEX = r"jewish.*music|\u05de\u05d5\u05d6\u05d9\u05e7\u05d4.*\u05d9\u05d4\u05d5\u05d3\u05d9\u05ea"

# Erev Shabbat detection (hours before candle lighting)
EREV_SHABBAT_HOURS_BEFORE = 6
