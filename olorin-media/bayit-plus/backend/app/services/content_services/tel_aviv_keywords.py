"""
Tel Aviv Content Keywords Module - Keyword definitions for Tel Aviv-focused content filtering.

Contains bilingual (Hebrew/English) keyword sets for:
- Content categorization (beaches, nightlife, culture, music, food, tech, events)
- UI labels (trilingual: he, en, es)

Focuses on Tel Aviv-specific locations and culture.
"""

from datetime import datetime

from app.models.tel_aviv_content import TelAvivContentCategory

# Tel Aviv keyword filters (Hebrew)
TEL_AVIV_KEYWORDS_HE = {
    "beaches": [
        "תל אביב חוף",
        "חוף גורדון",
        "חוף הילטון",
        "חוף פרישמן",
        "טיילת",
        "ים תל אביב",
        "חוף הים",
        "חוף בננה",
        "חוף מציצים",
    ],
    "nightlife": [
        "רוטשילד",
        "פלורנטין",
        "ברים תל אביב",
        "מועדונים",
        "חיי לילה",
        "לילה תל אביב",
        "פאבים",
        "דיזנגוף",
    ],
    "culture": [
        "מוזיאון תל אביב",
        "גלריות",
        "באוהאוס",
        "העיר הלבנה",
        "תיאטרון",
        "הבימה",
        "בית אריאלה",
        "בית התפוצות",
        "אמנות",
    ],
    "music": [
        "הופעות תל אביב",
        "פסטיבל",
        "ברבי",
        "רידינג 3",
        "זאפה",
        "מוסיקה חיה",
        "קונצרט",
        "הפארק",
    ],
    "food": [
        "שוק הכרמל",
        "שרונה",
        "מסעדות תל אביב",
        "בתי קפה",
        "אוכל רחוב",
        "שוק לוינסקי",
        "נמל תל אביב",
    ],
    "tech": [
        "סטארטאפ",
        "הייטק",
        "רוטשילד בוליבארד",
        "יזמות",
        "חברות טכנולוגיה",
        "תעשיית ההייטק",
    ],
    "events": [
        "אירועים תל אביב",
        "פסטיבל תל אביב",
        "מצעד הגאווה",
        "פריד",
        "תל אביב לבן",
        "לילה לבן",
    ],
}

# Tel Aviv keyword filters (English)
TEL_AVIV_KEYWORDS_EN = {
    "beaches": [
        "tel aviv beach",
        "gordon beach",
        "hilton beach",
        "frishman beach",
        "promenade",
        "tayelet",
        "banana beach",
        "metzitzim beach",
    ],
    "nightlife": [
        "rothschild",
        "florentin",
        "bars tel aviv",
        "clubs",
        "rooftop",
        "party",
        "nightlife",
        "dizengoff",
    ],
    "culture": [
        "tel aviv museum",
        "galleries",
        "bauhaus",
        "white city",
        "theater",
        "habima",
        "art scene",
        "beit ariela",
    ],
    "music": [
        "concert tel aviv",
        "festival",
        "barby club",
        "reading 3",
        "zappa",
        "live music",
        "hayarkon park",
    ],
    "food": [
        "carmel market",
        "sarona market",
        "restaurant tel aviv",
        "cafe",
        "street food",
        "levinsky market",
        "tel aviv port",
    ],
    "tech": [
        "startup",
        "high-tech",
        "startup nation",
        "innovation",
        "entrepreneur",
        "tech companies",
    ],
    "events": [
        "tel aviv events",
        "pride parade",
        "white night",
        "city festival",
        "tlv events",
    ],
}

# Category labels for UI
TEL_AVIV_CATEGORY_LABELS = {
    TelAvivContentCategory.BEACHES: {"he": "חופים", "en": "Beaches", "es": "Playas"},
    TelAvivContentCategory.NIGHTLIFE: {
        "he": "חיי לילה",
        "en": "Nightlife",
        "es": "Vida Nocturna",
    },
    TelAvivContentCategory.CULTURE: {
        "he": "תרבות ואמנות",
        "en": "Culture & Art",
        "es": "Cultura y Arte",
    },
    TelAvivContentCategory.MUSIC: {
        "he": "מוזיקה",
        "en": "Music Scene",
        "es": "Escena Musical",
    },
    TelAvivContentCategory.FOOD: {
        "he": "אוכל ומסעדות",
        "en": "Food & Dining",
        "es": "Gastronomia",
    },
    TelAvivContentCategory.TECH: {
        "he": "סטארטאפים והייטק",
        "en": "Tech & Startups",
        "es": "Tecnologia",
    },
    TelAvivContentCategory.EVENTS: {"he": "אירועים", "en": "Events", "es": "Eventos"},
    TelAvivContentCategory.GENERAL: {
        "he": "תל אביב",
        "en": "Tel Aviv",
        "es": "Tel Aviv",
    },
}


# Default Tel Aviv news sources
DEFAULT_TEL_AVIV_SOURCES = [
    {
        "name": "Ynet Tel Aviv",
        "name_he": "ynet תל אביב",
        "website_url": "https://www.ynet.co.il/home/0,7340,L-4269,00.html",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Time Out Tel Aviv",
        "name_he": "טיים אאוט תל אביב",
        "website_url": "https://www.timeout.co.il/tel-aviv",
        "content_type": "lifestyle",
        "language": "he",
    },
    {
        "name": "Mako Tel Aviv",
        "name_he": "mako תל אביב",
        "website_url": "https://www.mako.co.il/news",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Walla Tel Aviv",
        "name_he": "וואלה תל אביב",
        "website_url": "https://news.walla.co.il",
        "content_type": "news",
        "language": "he",
    },
    {
        "name": "Geektime",
        "name_he": "גיקטיים",
        "website_url": "https://www.geektime.co.il",
        "content_type": "tech",
        "language": "he",
    },
]

# Seed content - always available when no scraped content found
SEED_TEL_AVIV_CONTENT = [
    {
        "source_name": "Tel Aviv Municipality",
        "title": "חופי תל אביב - נופש וים",
        "title_he": "חופי תל אביב - נופש וים",
        "title_en": "Tel Aviv Beaches - Sun and Sea",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "חופי תל אביב מציעים חוויית רחצה מושלמת עם שמש, חול וים תכלת",
        "summary_he": "חופי תל אביב מציעים חוויית רחצה מושלמת",
        "summary_en": "Tel Aviv beaches offer a perfect swimming experience",
        "image_url": None,
        "category": TelAvivContentCategory.BEACHES,
        "tags": ["חוף", "תל אביב", "ים"],
        "relevance_score": 10.0,
    },
    {
        "source_name": "Tel Aviv Nightlife",
        "title": "חיי הלילה של תל אביב - העיר שלא ישנה",
        "title_he": "חיי הלילה של תל אביב - העיר שלא ישנה",
        "title_en": "Tel Aviv Nightlife - The City That Never Sleeps",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "תל אביב מציעה חיי לילה תוססים עם ברים, מועדונים והופעות חיות",
        "summary_he": "תל אביב מציעה חיי לילה תוססים",
        "summary_en": "Tel Aviv offers vibrant nightlife with bars and clubs",
        "image_url": None,
        "category": TelAvivContentCategory.NIGHTLIFE,
        "tags": ["לילה", "ברים", "מועדונים"],
        "relevance_score": 9.5,
    },
    {
        "source_name": "Tel Aviv Culture",
        "title": "העיר הלבנה - אדריכלות באוהאוס בתל אביב",
        "title_he": "העיר הלבנה - אדריכלות באוהאוס בתל אביב",
        "title_en": "The White City - Bauhaus Architecture in Tel Aviv",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "תל אביב מוכרת כאתר מורשת עולמית בזכות אוסף מבני הבאוהאוס הגדול בעולם",
        "summary_he": "תל אביב מוכרת כאתר מורשת עולמית בזכות הבאוהאוס",
        "summary_en": "Tel Aviv is a UNESCO World Heritage Site for Bauhaus architecture",
        "image_url": None,
        "category": TelAvivContentCategory.CULTURE,
        "tags": ["באוהאוס", "תרבות", "אדריכלות"],
        "relevance_score": 9.0,
    },
    {
        "source_name": "Tel Aviv Music",
        "title": "הופעות ופסטיבלים בתל אביב",
        "title_he": "הופעות ופסטיבלים בתל אביב",
        "title_en": "Concerts and Festivals in Tel Aviv",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "תל אביב היא מרכז המוסיקה של ישראל עם מועדונים, במות והופעות חיות",
        "summary_he": "תל אביב היא מרכז המוסיקה של ישראל",
        "summary_en": "Tel Aviv is Israel's music hub with venues and live shows",
        "image_url": None,
        "category": TelAvivContentCategory.MUSIC,
        "tags": ["מוסיקה", "הופעות", "פסטיבל"],
        "relevance_score": 8.5,
    },
    {
        "source_name": "Startup Nation",
        "title": "תל אביב - עיר הסטארטאפים",
        "title_he": "תל אביב - עיר הסטארטאפים",
        "title_en": "Tel Aviv - The Startup City",
        "url": "https://www.tel-aviv.gov.il/",
        "published_at": datetime.utcnow(),
        "summary": "תל אביב היא אחת מערי ההייטק המובילות בעולם עם אלפי סטארטאפים",
        "summary_he": "תל אביב היא אחת מערי ההייטק המובילות בעולם",
        "summary_en": "Tel Aviv is a leading tech hub with thousands of startups",
        "image_url": None,
        "category": TelAvivContentCategory.TECH,
        "tags": ["סטארטאפ", "הייטק", "יזמות"],
        "relevance_score": 8.0,
    },
]
