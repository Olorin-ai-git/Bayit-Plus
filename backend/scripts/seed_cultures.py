"""
Seed script to populate Bayit+ database with culture configurations.

Creates:
- Israeli culture (default) - Jerusalem, Tel Aviv
- Chinese culture - Beijing, Shanghai
- Japanese culture - Tokyo, Kyoto, Osaka
- Korean culture - Seoul, Busan
- Indian culture - Mumbai, Delhi, Bangalore
- News sources for each culture

Run with: python -m scripts.seed_cultures
"""

import asyncio
import sys
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

sys.path.append(".")

from app.models.culture import (
    Culture,
    CultureCity,
    CultureNewsSource,
    CultureCityCategory,
)
from app.core.config import settings


# Israeli culture configuration
ISRAELI_CULTURE = {
    "culture_id": "israeli",
    "name": "Israeli",
    "name_localized": {
        "he": "ישראלי",
        "en": "Israeli",
        "es": "Israelí",
    },
    "flag_emoji": "🇮🇱",
    "country_code": "IL",
    "primary_timezone": "Asia/Jerusalem",
    "primary_language": "he",
    "supported_languages": ["he", "en", "es"],
    "keyword_weight_native": 2.0,
    "keyword_weight_english": 1.0,
    "has_shabbat_mode": True,
    "has_lunar_calendar": False,
    "has_special_holidays": True,
    "display_order": 0,
    "is_active": True,
    "is_default": True,
    "background_image_key": "cultures/israeli/background.jpg",
    "accent_color": "#0038B8",
}

ISRAELI_CITIES = [
    {
        "city_id": "jerusalem",
        "name": "Jerusalem",
        "name_localized": {
            "he": "ירושלים",
            "en": "Jerusalem",
            "es": "Jerusalén",
        },
        "name_native": "ירושלים",
        "timezone": "Asia/Jerusalem",
        "coordinates": {"lat": 31.7683, "lng": 35.2137},
        "country_code": "IL",
        "categories": [
            CultureCityCategory(
                id="kotel",
                name="Western Wall",
                name_localized={"he": "הכותל המערבי", "en": "Western Wall", "es": "Muro Occidental"},
                icon_emoji="🕎",
                keywords_native=["כותל", "הכותל המערבי"],
                keywords_english=["kotel", "western wall"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="idf-ceremony",
                name="IDF Ceremonies",
                name_localized={"he": "טקסי צה\"ל", "en": "IDF Ceremonies", "es": "Ceremonias de las FDI"},
                icon_emoji="🎖️",
                keywords_native=["טקס צה\"ל", "השבעה"],
                keywords_english=["idf ceremony", "swearing in"],
                display_order=1,
                is_active=True,
            ),
            CultureCityCategory(
                id="diaspora",
                name="Diaspora Connection",
                name_localized={"he": "קשר לתפוצות", "en": "Diaspora Connection", "es": "Conexion con la Diaspora"},
                icon_emoji="🌍",
                keywords_native=["תפוצות", "עלייה"],
                keywords_english=["diaspora", "aliyah"],
                display_order=2,
                is_active=True,
            ),
            CultureCityCategory(
                id="holy-sites",
                name="Holy Sites",
                name_localized={"he": "מקומות קדושים", "en": "Holy Sites", "es": "Lugares Sagrados"},
                icon_emoji="✡️",
                keywords_native=["מקומות קדושים", "עיר דוד"],
                keywords_english=["holy sites", "city of david"],
                display_order=3,
                is_active=True,
            ),
            CultureCityCategory(
                id="jerusalem-events",
                name="Jerusalem Events",
                name_localized={"he": "אירועים בירושלים", "en": "Jerusalem Events", "es": "Eventos en Jerusalen"},
                icon_emoji="🇮🇱",
                keywords_native=["ירושלים", "אירוע"],
                keywords_english=["jerusalem", "event"],
                display_order=4,
                is_active=True,
            ),
        ],
        "display_order": 0,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/israeli/jerusalem.jpg",
        "thumbnail_image_key": "cultures/israeli/jerusalem_thumb.jpg",
        "accent_color": "#C5A03A",
    },
    {
        "city_id": "tel-aviv",
        "name": "Tel Aviv",
        "name_localized": {
            "he": "תל אביב",
            "en": "Tel Aviv",
            "es": "Tel Aviv",
        },
        "name_native": "תל אביב",
        "timezone": "Asia/Jerusalem",
        "coordinates": {"lat": 32.0853, "lng": 34.7818},
        "country_code": "IL",
        "categories": [
            CultureCityCategory(
                id="beaches",
                name="Beaches",
                name_localized={"he": "חופים", "en": "Beaches", "es": "Playas"},
                icon_emoji="🏖️",
                keywords_native=["חוף", "ים"],
                keywords_english=["beach", "sea"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="nightlife",
                name="Nightlife",
                name_localized={"he": "חיי לילה", "en": "Nightlife", "es": "Vida Nocturna"},
                icon_emoji="🌃",
                keywords_native=["מועדון", "בילוי"],
                keywords_english=["club", "nightlife"],
                display_order=1,
                is_active=True,
            ),
            CultureCityCategory(
                id="tech",
                name="Tech",
                name_localized={"he": "הייטק", "en": "Tech", "es": "Tecnologia"},
                icon_emoji="💻",
                keywords_native=["הייטק", "סטארטאפ"],
                keywords_english=["tech", "startup"],
                display_order=2,
                is_active=True,
            ),
            CultureCityCategory(
                id="culture",
                name="Culture",
                name_localized={"he": "תרבות", "en": "Culture", "es": "Cultura"},
                icon_emoji="🎭",
                keywords_native=["תרבות", "אמנות"],
                keywords_english=["culture", "art"],
                display_order=3,
                is_active=True,
            ),
            CultureCityCategory(
                id="food",
                name="Food",
                name_localized={"he": "אוכל", "en": "Food", "es": "Comida"},
                icon_emoji="🍽️",
                keywords_native=["אוכל", "מסעדה"],
                keywords_english=["food", "restaurant"],
                display_order=4,
                is_active=True,
            ),
        ],
        "display_order": 1,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/israeli/tel_aviv.jpg",
        "thumbnail_image_key": "cultures/israeli/tel_aviv_thumb.jpg",
        "accent_color": "#F97316",
    },
]

ISRAELI_SOURCES = [
    {
        "source_id": "ynet-news",
        "culture_id": "israeli",
        "city_id": None,
        "name": "Ynet News",
        "name_localized": {"he": "ynet חדשות", "en": "Ynet News"},
        "name_native": "ynet",
        "source_type": "scrape",
        "website_url": "https://www.ynet.co.il",
        "content_type": "news",
        "language": "he",
        "categories": ["general"],
        "is_active": True,
        "priority": 10,
    },
    {
        "source_id": "walla-news",
        "culture_id": "israeli",
        "city_id": None,
        "name": "Walla News",
        "name_localized": {"he": "וואלה חדשות", "en": "Walla News"},
        "name_native": "וואלה",
        "source_type": "scrape",
        "website_url": "https://news.walla.co.il",
        "content_type": "news",
        "language": "he",
        "categories": ["general"],
        "is_active": True,
        "priority": 9,
    },
    {
        "source_id": "mako-news",
        "culture_id": "israeli",
        "city_id": None,
        "name": "Mako News",
        "name_localized": {"he": "mako חדשות", "en": "Mako News"},
        "name_native": "mako",
        "source_type": "scrape",
        "website_url": "https://www.mako.co.il/news",
        "content_type": "news",
        "language": "he",
        "categories": ["general"],
        "is_active": True,
        "priority": 8,
    },
]

# Chinese culture configuration
CHINESE_CULTURE = {
    "culture_id": "chinese",
    "name": "Chinese",
    "name_localized": {
        "zh": "中国",
        "he": "סיני",
        "en": "Chinese",
        "es": "Chino",
    },
    "flag_emoji": "🇨🇳",
    "country_code": "CN",
    "primary_timezone": "Asia/Shanghai",
    "primary_language": "zh",
    "supported_languages": ["zh", "en"],
    "keyword_weight_native": 2.0,
    "keyword_weight_english": 1.0,
    "has_shabbat_mode": False,
    "has_lunar_calendar": True,
    "has_special_holidays": True,
    "display_order": 1,
    "is_active": True,
    "is_default": False,
    "background_image_key": "cultures/chinese/background.jpg",
    "accent_color": "#DE2910",
}

CHINESE_CITIES = [
    {
        "city_id": "beijing",
        "name": "Beijing",
        "name_localized": {
            "zh": "北京",
            "he": "בייג'ינג",
            "en": "Beijing",
            "es": "Beijing",
        },
        "name_native": "北京",
        "timezone": "Asia/Shanghai",
        "coordinates": {"lat": 39.9042, "lng": 116.4074},
        "country_code": "CN",
        "categories": [
            CultureCityCategory(
                id="history",
                name="History",
                name_localized={"zh": "历史", "en": "History", "he": "היסטוריה"},
                icon_emoji="🏛️",
                keywords_native=["历史", "故宫", "长城"],
                keywords_english=["history", "forbidden city", "great wall"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="culture",
                name="Culture",
                name_localized={"zh": "文化", "en": "Culture", "he": "תרבות"},
                icon_emoji="🎭",
                keywords_native=["文化", "艺术", "京剧"],
                keywords_english=["culture", "art", "opera"],
                display_order=1,
                is_active=True,
            ),
            CultureCityCategory(
                id="food",
                name="Food",
                name_localized={"zh": "美食", "en": "Food", "he": "אוכל"},
                icon_emoji="🥟",
                keywords_native=["美食", "餐厅", "小吃"],
                keywords_english=["food", "restaurant", "cuisine"],
                display_order=2,
                is_active=True,
            ),
        ],
        "display_order": 0,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/chinese/beijing.jpg",
        "thumbnail_image_key": "cultures/chinese/beijing_thumb.jpg",
        "accent_color": "#FFD700",
    },
    {
        "city_id": "shanghai",
        "name": "Shanghai",
        "name_localized": {
            "zh": "上海",
            "he": "שנגחאי",
            "en": "Shanghai",
            "es": "Shanghai",
        },
        "name_native": "上海",
        "timezone": "Asia/Shanghai",
        "coordinates": {"lat": 31.2304, "lng": 121.4737},
        "country_code": "CN",
        "categories": [
            CultureCityCategory(
                id="finance",
                name="Finance",
                name_localized={"zh": "金融", "en": "Finance", "he": "פיננסים"},
                icon_emoji="💹",
                keywords_native=["金融", "股市", "经济"],
                keywords_english=["finance", "stock market", "economy"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="tech",
                name="Tech",
                name_localized={"zh": "科技", "en": "Tech", "he": "טכנולוגיה"},
                icon_emoji="💻",
                keywords_native=["科技", "创新", "互联网"],
                keywords_english=["tech", "innovation", "internet"],
                display_order=1,
                is_active=True,
            ),
            CultureCityCategory(
                id="food",
                name="Food",
                name_localized={"zh": "美食", "en": "Food", "he": "אוכל"},
                icon_emoji="🍜",
                keywords_native=["美食", "餐厅"],
                keywords_english=["food", "restaurant"],
                display_order=2,
                is_active=True,
            ),
        ],
        "display_order": 1,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/chinese/shanghai.jpg",
        "thumbnail_image_key": "cultures/chinese/shanghai_thumb.jpg",
        "accent_color": "#00BFFF",
    },
]

CHINESE_SOURCES = [
    {
        "source_id": "scmp-news",
        "culture_id": "chinese",
        "city_id": None,
        "name": "South China Morning Post",
        "name_localized": {"zh": "南华早报", "en": "South China Morning Post"},
        "name_native": "南华早报",
        "source_type": "rss",
        "rss_url": "https://www.scmp.com/rss/91/feed",
        "website_url": "https://www.scmp.com",
        "content_type": "news",
        "language": "en",
        "categories": ["general"],
        "is_active": True,
        "priority": 10,
    },
    {
        "source_id": "china-daily",
        "culture_id": "chinese",
        "city_id": None,
        "name": "China Daily",
        "name_localized": {"zh": "中国日报", "en": "China Daily"},
        "name_native": "中国日报",
        "source_type": "rss",
        "rss_url": "https://www.chinadaily.com.cn/rss/china_rss.xml",
        "website_url": "https://www.chinadaily.com.cn",
        "content_type": "news",
        "language": "en",
        "categories": ["general"],
        "is_active": True,
        "priority": 9,
    },
]

# Japanese culture configuration
JAPANESE_CULTURE = {
    "culture_id": "japanese",
    "name": "Japanese",
    "name_localized": {
        "ja": "日本",
        "he": "יפני",
        "en": "Japanese",
        "es": "Japonés",
    },
    "flag_emoji": "🇯🇵",
    "country_code": "JP",
    "primary_timezone": "Asia/Tokyo",
    "primary_language": "ja",
    "supported_languages": ["ja", "en"],
    "keyword_weight_native": 2.0,
    "keyword_weight_english": 1.0,
    "has_shabbat_mode": False,
    "has_lunar_calendar": False,
    "has_special_holidays": True,
    "display_order": 2,
    "is_active": True,
    "is_default": False,
    "background_image_key": "cultures/japanese/background.jpg",
    "accent_color": "#BC002D",
}

JAPANESE_CITIES = [
    {
        "city_id": "tokyo",
        "name": "Tokyo",
        "name_localized": {
            "ja": "東京",
            "he": "טוקיו",
            "en": "Tokyo",
            "es": "Tokio",
        },
        "name_native": "東京",
        "timezone": "Asia/Tokyo",
        "coordinates": {"lat": 35.6762, "lng": 139.6503},
        "country_code": "JP",
        "categories": [
            CultureCityCategory(
                id="tech",
                name="Technology",
                name_localized={"ja": "テクノロジー", "en": "Technology", "he": "טכנולוגיה"},
                icon_emoji="🤖",
                keywords_native=["テクノロジー", "技術", "ロボット"],
                keywords_english=["technology", "tech", "robotics"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="anime",
                name="Anime & Manga",
                name_localized={"ja": "アニメ・漫画", "en": "Anime & Manga", "he": "אנימה ומנגה"},
                icon_emoji="🎌",
                keywords_native=["アニメ", "漫画", "秋葉原"],
                keywords_english=["anime", "manga", "akihabara"],
                display_order=1,
                is_active=True,
            ),
            CultureCityCategory(
                id="food",
                name="Food",
                name_localized={"ja": "グルメ", "en": "Food", "he": "אוכל"},
                icon_emoji="🍣",
                keywords_native=["グルメ", "寿司", "ラーメン"],
                keywords_english=["food", "sushi", "ramen"],
                display_order=2,
                is_active=True,
            ),
        ],
        "display_order": 0,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/japanese/tokyo.jpg",
        "thumbnail_image_key": "cultures/japanese/tokyo_thumb.jpg",
        "accent_color": "#FF1493",
    },
    {
        "city_id": "kyoto",
        "name": "Kyoto",
        "name_localized": {
            "ja": "京都",
            "he": "קיוטו",
            "en": "Kyoto",
            "es": "Kioto",
        },
        "name_native": "京都",
        "timezone": "Asia/Tokyo",
        "coordinates": {"lat": 35.0116, "lng": 135.7681},
        "country_code": "JP",
        "categories": [
            CultureCityCategory(
                id="temples",
                name="Temples & Shrines",
                name_localized={"ja": "寺社仏閣", "en": "Temples & Shrines", "he": "מקדשים"},
                icon_emoji="⛩️",
                keywords_native=["寺", "神社", "仏閣"],
                keywords_english=["temple", "shrine", "spiritual"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="tradition",
                name="Traditional Culture",
                name_localized={"ja": "伝統文化", "en": "Traditional Culture", "he": "תרבות מסורתית"},
                icon_emoji="🎎",
                keywords_native=["伝統", "着物", "芸者"],
                keywords_english=["tradition", "kimono", "geisha"],
                display_order=1,
                is_active=True,
            ),
        ],
        "display_order": 1,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/japanese/kyoto.jpg",
        "thumbnail_image_key": "cultures/japanese/kyoto_thumb.jpg",
        "accent_color": "#8B4513",
    },
    {
        "city_id": "osaka",
        "name": "Osaka",
        "name_localized": {
            "ja": "大阪",
            "he": "אוסקה",
            "en": "Osaka",
            "es": "Osaka",
        },
        "name_native": "大阪",
        "timezone": "Asia/Tokyo",
        "coordinates": {"lat": 34.6937, "lng": 135.5023},
        "country_code": "JP",
        "categories": [
            CultureCityCategory(
                id="street-food",
                name="Street Food",
                name_localized={"ja": "屋台グルメ", "en": "Street Food", "he": "אוכל רחוב"},
                icon_emoji="🍢",
                keywords_native=["たこ焼き", "お好み焼き", "屋台"],
                keywords_english=["takoyaki", "okonomiyaki", "street food"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="entertainment",
                name="Entertainment",
                name_localized={"ja": "エンタメ", "en": "Entertainment", "he": "בידור"},
                icon_emoji="🎪",
                keywords_native=["お笑い", "USJ", "エンタメ"],
                keywords_english=["comedy", "universal studios", "entertainment"],
                display_order=1,
                is_active=True,
            ),
        ],
        "display_order": 2,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/japanese/osaka.jpg",
        "thumbnail_image_key": "cultures/japanese/osaka_thumb.jpg",
        "accent_color": "#FF6347",
    },
]

JAPANESE_SOURCES = [
    {
        "source_id": "nhk-world",
        "culture_id": "japanese",
        "city_id": None,
        "name": "NHK World",
        "name_localized": {"ja": "NHKワールド", "en": "NHK World"},
        "name_native": "NHKワールド",
        "source_type": "rss",
        "rss_url": "https://www3.nhk.or.jp/rss/news/cat0.xml",
        "website_url": "https://www3.nhk.or.jp/nhkworld/",
        "content_type": "news",
        "language": "en",
        "categories": ["general"],
        "is_active": True,
        "priority": 10,
    },
    {
        "source_id": "japan-times",
        "culture_id": "japanese",
        "city_id": None,
        "name": "The Japan Times",
        "name_localized": {"ja": "ジャパンタイムズ", "en": "The Japan Times"},
        "name_native": "ジャパンタイムズ",
        "source_type": "rss",
        "rss_url": "https://www.japantimes.co.jp/feed/",
        "website_url": "https://www.japantimes.co.jp",
        "content_type": "news",
        "language": "en",
        "categories": ["general"],
        "is_active": True,
        "priority": 9,
    },
]

# Korean culture configuration
KOREAN_CULTURE = {
    "culture_id": "korean",
    "name": "Korean",
    "name_localized": {
        "ko": "한국",
        "he": "קוריאני",
        "en": "Korean",
        "es": "Coreano",
    },
    "flag_emoji": "🇰🇷",
    "country_code": "KR",
    "primary_timezone": "Asia/Seoul",
    "primary_language": "ko",
    "supported_languages": ["ko", "en"],
    "keyword_weight_native": 2.0,
    "keyword_weight_english": 1.0,
    "has_shabbat_mode": False,
    "has_lunar_calendar": True,
    "has_special_holidays": True,
    "display_order": 3,
    "is_active": True,
    "is_default": False,
    "background_image_key": "cultures/korean/background.jpg",
    "accent_color": "#003478",
}

KOREAN_CITIES = [
    {
        "city_id": "seoul",
        "name": "Seoul",
        "name_localized": {
            "ko": "서울",
            "he": "סיאול",
            "en": "Seoul",
            "es": "Seúl",
        },
        "name_native": "서울",
        "timezone": "Asia/Seoul",
        "coordinates": {"lat": 37.5665, "lng": 126.9780},
        "country_code": "KR",
        "categories": [
            CultureCityCategory(
                id="kpop",
                name="K-Pop & Entertainment",
                name_localized={"ko": "K-Pop & 엔터테인먼트", "en": "K-Pop & Entertainment", "he": "קיי-פופ ובידור"},
                icon_emoji="🎤",
                keywords_native=["케이팝", "아이돌", "강남"],
                keywords_english=["kpop", "idol", "gangnam"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="tech",
                name="Technology",
                name_localized={"ko": "기술", "en": "Technology", "he": "טכנולוגיה"},
                icon_emoji="📱",
                keywords_native=["삼성", "기술", "스타트업"],
                keywords_english=["samsung", "tech", "startup"],
                display_order=1,
                is_active=True,
            ),
            CultureCityCategory(
                id="food",
                name="Korean Food",
                name_localized={"ko": "한식", "en": "Korean Food", "he": "אוכל קוריאני"},
                icon_emoji="🍜",
                keywords_native=["한식", "김치", "삼겹살"],
                keywords_english=["korean food", "kimchi", "bbq"],
                display_order=2,
                is_active=True,
            ),
        ],
        "display_order": 0,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/korean/seoul.jpg",
        "thumbnail_image_key": "cultures/korean/seoul_thumb.jpg",
        "accent_color": "#FF69B4",
    },
    {
        "city_id": "busan",
        "name": "Busan",
        "name_localized": {
            "ko": "부산",
            "he": "בוסאן",
            "en": "Busan",
            "es": "Busan",
        },
        "name_native": "부산",
        "timezone": "Asia/Seoul",
        "coordinates": {"lat": 35.1796, "lng": 129.0756},
        "country_code": "KR",
        "categories": [
            CultureCityCategory(
                id="beaches",
                name="Beaches",
                name_localized={"ko": "해변", "en": "Beaches", "he": "חופים"},
                icon_emoji="🏖️",
                keywords_native=["해운대", "광안리", "해변"],
                keywords_english=["haeundae", "gwangalli", "beach"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="film",
                name="Film & Festivals",
                name_localized={"ko": "영화 & 축제", "en": "Film & Festivals", "he": "קולנוע ופסטיבלים"},
                icon_emoji="🎬",
                keywords_native=["부산국제영화제", "영화", "축제"],
                keywords_english=["biff", "film festival", "cinema"],
                display_order=1,
                is_active=True,
            ),
        ],
        "display_order": 1,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/korean/busan.jpg",
        "thumbnail_image_key": "cultures/korean/busan_thumb.jpg",
        "accent_color": "#00CED1",
    },
]

KOREAN_SOURCES = [
    {
        "source_id": "korea-herald",
        "culture_id": "korean",
        "city_id": None,
        "name": "The Korea Herald",
        "name_localized": {"ko": "코리아헤럴드", "en": "The Korea Herald"},
        "name_native": "코리아헤럴드",
        "source_type": "rss",
        "rss_url": "http://www.koreaherald.com/rss/020100000000.xml",
        "website_url": "http://www.koreaherald.com",
        "content_type": "news",
        "language": "en",
        "categories": ["general"],
        "is_active": True,
        "priority": 10,
    },
    {
        "source_id": "yonhap-news",
        "culture_id": "korean",
        "city_id": None,
        "name": "Yonhap News Agency",
        "name_localized": {"ko": "연합뉴스", "en": "Yonhap News Agency"},
        "name_native": "연합뉴스",
        "source_type": "rss",
        "rss_url": "https://en.yna.co.kr/RSS/news.xml",
        "website_url": "https://en.yna.co.kr",
        "content_type": "news",
        "language": "en",
        "categories": ["general"],
        "is_active": True,
        "priority": 9,
    },
]

# Indian culture configuration
INDIAN_CULTURE = {
    "culture_id": "indian",
    "name": "Indian",
    "name_localized": {
        "hi": "भारतीय",
        "he": "הודי",
        "en": "Indian",
        "es": "Indio",
    },
    "flag_emoji": "🇮🇳",
    "country_code": "IN",
    "primary_timezone": "Asia/Kolkata",
    "primary_language": "hi",
    "supported_languages": ["hi", "en"],
    "keyword_weight_native": 2.0,
    "keyword_weight_english": 1.0,
    "has_shabbat_mode": False,
    "has_lunar_calendar": False,
    "has_special_holidays": True,
    "display_order": 4,
    "is_active": True,
    "is_default": False,
    "background_image_key": "cultures/indian/background.jpg",
    "accent_color": "#FF9933",
}

INDIAN_CITIES = [
    {
        "city_id": "mumbai",
        "name": "Mumbai",
        "name_localized": {
            "hi": "मुंबई",
            "he": "מומבאי",
            "en": "Mumbai",
            "es": "Bombay",
        },
        "name_native": "मुंबई",
        "timezone": "Asia/Kolkata",
        "coordinates": {"lat": 19.0760, "lng": 72.8777},
        "country_code": "IN",
        "categories": [
            CultureCityCategory(
                id="bollywood",
                name="Bollywood",
                name_localized={"hi": "बॉलीवुड", "en": "Bollywood", "he": "בוליווד"},
                icon_emoji="🎬",
                keywords_native=["बॉलीवुड", "फिल्म", "सिनेमा"],
                keywords_english=["bollywood", "film", "cinema"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="finance",
                name="Finance",
                name_localized={"hi": "वित्त", "en": "Finance", "he": "פיננסים"},
                icon_emoji="💹",
                keywords_native=["शेयर बाजार", "वित्त", "व्यापार"],
                keywords_english=["stock market", "finance", "business"],
                display_order=1,
                is_active=True,
            ),
            CultureCityCategory(
                id="street-food",
                name="Street Food",
                name_localized={"hi": "स्ट्रीट फूड", "en": "Street Food", "he": "אוכל רחוב"},
                icon_emoji="🍛",
                keywords_native=["वड़ा पाव", "पाव भाजी", "स्ट्रीट फूड"],
                keywords_english=["vada pav", "pav bhaji", "street food"],
                display_order=2,
                is_active=True,
            ),
        ],
        "display_order": 0,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/indian/mumbai.jpg",
        "thumbnail_image_key": "cultures/indian/mumbai_thumb.jpg",
        "accent_color": "#FFD700",
    },
    {
        "city_id": "delhi",
        "name": "Delhi",
        "name_localized": {
            "hi": "दिल्ली",
            "he": "דלהי",
            "en": "Delhi",
            "es": "Delhi",
        },
        "name_native": "दिल्ली",
        "timezone": "Asia/Kolkata",
        "coordinates": {"lat": 28.7041, "lng": 77.1025},
        "country_code": "IN",
        "categories": [
            CultureCityCategory(
                id="history",
                name="History & Heritage",
                name_localized={"hi": "इतिहास और विरासत", "en": "History & Heritage", "he": "היסטוריה ומורשת"},
                icon_emoji="🏛️",
                keywords_native=["लाल किला", "कुतुब मीनार", "इतिहास"],
                keywords_english=["red fort", "qutub minar", "history"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="politics",
                name="Politics & Government",
                name_localized={"hi": "राजनीति और सरकार", "en": "Politics & Government", "he": "פוליטיקה וממשל"},
                icon_emoji="🏛️",
                keywords_native=["संसद", "सरकार", "राजनीति"],
                keywords_english=["parliament", "government", "politics"],
                display_order=1,
                is_active=True,
            ),
        ],
        "display_order": 1,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/indian/delhi.jpg",
        "thumbnail_image_key": "cultures/indian/delhi_thumb.jpg",
        "accent_color": "#228B22",
    },
    {
        "city_id": "bangalore",
        "name": "Bangalore",
        "name_localized": {
            "hi": "बेंगलुरु",
            "he": "בנגלור",
            "en": "Bangalore",
            "es": "Bangalore",
        },
        "name_native": "बेंगलुरु",
        "timezone": "Asia/Kolkata",
        "coordinates": {"lat": 12.9716, "lng": 77.5946},
        "country_code": "IN",
        "categories": [
            CultureCityCategory(
                id="tech",
                name="Technology & Startups",
                name_localized={"hi": "प्रौद्योगिकी और स्टार्टअप", "en": "Technology & Startups", "he": "טכנולוגיה וסטארטאפים"},
                icon_emoji="💻",
                keywords_native=["आईटी", "स्टार्टअप", "टेक"],
                keywords_english=["it", "startup", "tech"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="gardens",
                name="Gardens & Parks",
                name_localized={"hi": "उद्यान और पार्क", "en": "Gardens & Parks", "he": "גנים ופארקים"},
                icon_emoji="🌳",
                keywords_native=["लालबाग", "कब्बन पार्क", "उद्यान"],
                keywords_english=["lalbagh", "cubbon park", "gardens"],
                display_order=1,
                is_active=True,
            ),
        ],
        "display_order": 2,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/indian/bangalore.jpg",
        "thumbnail_image_key": "cultures/indian/bangalore_thumb.jpg",
        "accent_color": "#9370DB",
    },
]

INDIAN_SOURCES = [
    {
        "source_id": "times-of-india",
        "culture_id": "indian",
        "city_id": None,
        "name": "Times of India",
        "name_localized": {"hi": "टाइम्स ऑफ इंडिया", "en": "Times of India"},
        "name_native": "टाइम्स ऑफ इंडिया",
        "source_type": "rss",
        "rss_url": "https://timesofindia.indiatimes.com/rssfeedstopstories.cms",
        "website_url": "https://timesofindia.indiatimes.com",
        "content_type": "news",
        "language": "en",
        "categories": ["general"],
        "is_active": True,
        "priority": 10,
    },
    {
        "source_id": "hindustan-times",
        "culture_id": "indian",
        "city_id": None,
        "name": "Hindustan Times",
        "name_localized": {"hi": "हिंदुस्तान टाइम्स", "en": "Hindustan Times"},
        "name_native": "हिंदुस्तान टाइम्स",
        "source_type": "rss",
        "rss_url": "https://www.hindustantimes.com/rss/topnews/rssfeed.xml",
        "website_url": "https://www.hindustantimes.com",
        "content_type": "news",
        "language": "en",
        "categories": ["general"],
        "is_active": True,
        "priority": 9,
    },
]


async def seed_cultures(clear_existing: bool = False):
    """Seed the database with culture configurations."""

    # Connect to MongoDB
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    await init_beanie(
        database=client[settings.MONGODB_DB_NAME],
        document_models=[Culture, CultureCity, CultureNewsSource],
    )

    print("Connected to MongoDB. Starting culture seed...")

    # Clear existing data only if explicitly requested
    if clear_existing:
        print("\n⚠️  WARNING: Clearing all existing culture data...")
        response = input("Are you ABSOLUTELY sure? Type 'DELETE ALL' to confirm: ")
        if response == "DELETE ALL":
            await Culture.delete_all()
            await CultureCity.delete_all()
            await CultureNewsSource.delete_all()
            print("✓ Cleared existing culture data.")
        else:
            print("✗ Deletion cancelled. Proceeding with upsert operations...")
    else:
        print("Using upsert mode - existing data will be preserved.")

    # =====================
    # ISRAELI CULTURE
    # =====================
    print("\n📍 Seeding Israeli culture...")

    # Create or update Israeli culture
    israeli_culture = await Culture.find_one(Culture.culture_id == "israeli")
    if not israeli_culture:
        israeli_culture = Culture(**ISRAELI_CULTURE)
        await israeli_culture.insert()
        print("  ✓ Created Israeli culture")
    else:
        await israeli_culture.update({"$set": ISRAELI_CULTURE})
        print("  ⊙ Updated Israeli culture")

    # Create or update Israeli cities
    for city_data in ISRAELI_CITIES:
        city_data["culture_id"] = "israeli"
        city = await CultureCity.find_one(
            CultureCity.culture_id == "israeli",
            CultureCity.city_id == city_data["city_id"],
        )
        if not city:
            city = CultureCity(**city_data)
            await city.insert()
            print(f"  ✓ Created city: {city_data['name']}")
        else:
            await city.update({"$set": city_data})
            print(f"  ⊙ Updated city: {city_data['name']}")

    # Create or update Israeli sources
    for source_data in ISRAELI_SOURCES:
        source = await CultureNewsSource.find_one(
            CultureNewsSource.source_id == source_data["source_id"],
        )
        if not source:
            source = CultureNewsSource(**source_data)
            await source.insert()
            print(f"  ✓ Created source: {source_data['name']}")
        else:
            await source.update({"$set": source_data})
            print(f"  ⊙ Updated source: {source_data['name']}")

    # =====================
    # CHINESE CULTURE
    # =====================
    print("\n📍 Seeding Chinese culture...")

    # Create or update Chinese culture
    chinese_culture = await Culture.find_one(Culture.culture_id == "chinese")
    if not chinese_culture:
        chinese_culture = Culture(**CHINESE_CULTURE)
        await chinese_culture.insert()
        print("  ✓ Created Chinese culture")
    else:
        await chinese_culture.update({"$set": CHINESE_CULTURE})
        print("  ⊙ Updated Chinese culture")

    # Create or update Chinese cities
    for city_data in CHINESE_CITIES:
        city_data["culture_id"] = "chinese"
        city = await CultureCity.find_one(
            CultureCity.culture_id == "chinese",
            CultureCity.city_id == city_data["city_id"],
        )
        if not city:
            city = CultureCity(**city_data)
            await city.insert()
            print(f"  ✓ Created city: {city_data['name']}")
        else:
            await city.update({"$set": city_data})
            print(f"  ⊙ Updated city: {city_data['name']}")

    # Create or update Chinese sources
    for source_data in CHINESE_SOURCES:
        source = await CultureNewsSource.find_one(
            CultureNewsSource.source_id == source_data["source_id"],
        )
        if not source:
            source = CultureNewsSource(**source_data)
            await source.insert()
            print(f"  ✓ Created source: {source_data['name']}")
        else:
            await source.update({"$set": source_data})
            print(f"  ⊙ Updated source: {source_data['name']}")

    # =====================
    # JAPANESE CULTURE
    # =====================
    print("\n📍 Seeding Japanese culture...")

    # Create or update Japanese culture
    japanese_culture = await Culture.find_one(Culture.culture_id == "japanese")
    if not japanese_culture:
        japanese_culture = Culture(**JAPANESE_CULTURE)
        await japanese_culture.insert()
        print("  ✓ Created Japanese culture")
    else:
        await japanese_culture.update({"$set": JAPANESE_CULTURE})
        print("  ⊙ Updated Japanese culture")

    # Create or update Japanese cities
    for city_data in JAPANESE_CITIES:
        city_data["culture_id"] = "japanese"
        city = await CultureCity.find_one(
            CultureCity.culture_id == "japanese",
            CultureCity.city_id == city_data["city_id"],
        )
        if not city:
            city = CultureCity(**city_data)
            await city.insert()
            print(f"  ✓ Created city: {city_data['name']}")
        else:
            await city.update({"$set": city_data})
            print(f"  ⊙ Updated city: {city_data['name']}")

    # Create or update Japanese sources
    for source_data in JAPANESE_SOURCES:
        source = await CultureNewsSource.find_one(
            CultureNewsSource.source_id == source_data["source_id"],
        )
        if not source:
            source = CultureNewsSource(**source_data)
            await source.insert()
            print(f"  ✓ Created source: {source_data['name']}")
        else:
            await source.update({"$set": source_data})
            print(f"  ⊙ Updated source: {source_data['name']}")

    # =====================
    # KOREAN CULTURE
    # =====================
    print("\n📍 Seeding Korean culture...")

    # Create or update Korean culture
    korean_culture = await Culture.find_one(Culture.culture_id == "korean")
    if not korean_culture:
        korean_culture = Culture(**KOREAN_CULTURE)
        await korean_culture.insert()
        print("  ✓ Created Korean culture")
    else:
        await korean_culture.update({"$set": KOREAN_CULTURE})
        print("  ⊙ Updated Korean culture")

    # Create or update Korean cities
    for city_data in KOREAN_CITIES:
        city_data["culture_id"] = "korean"
        city = await CultureCity.find_one(
            CultureCity.culture_id == "korean",
            CultureCity.city_id == city_data["city_id"],
        )
        if not city:
            city = CultureCity(**city_data)
            await city.insert()
            print(f"  ✓ Created city: {city_data['name']}")
        else:
            await city.update({"$set": city_data})
            print(f"  ⊙ Updated city: {city_data['name']}")

    # Create or update Korean sources
    for source_data in KOREAN_SOURCES:
        source = await CultureNewsSource.find_one(
            CultureNewsSource.source_id == source_data["source_id"],
        )
        if not source:
            source = CultureNewsSource(**source_data)
            await source.insert()
            print(f"  ✓ Created source: {source_data['name']}")
        else:
            await source.update({"$set": source_data})
            print(f"  ⊙ Updated source: {source_data['name']}")

    # =====================
    # INDIAN CULTURE
    # =====================
    print("\n📍 Seeding Indian culture...")

    # Create or update Indian culture
    indian_culture = await Culture.find_one(Culture.culture_id == "indian")
    if not indian_culture:
        indian_culture = Culture(**INDIAN_CULTURE)
        await indian_culture.insert()
        print("  ✓ Created Indian culture")
    else:
        await indian_culture.update({"$set": INDIAN_CULTURE})
        print("  ⊙ Updated Indian culture")

    # Create or update Indian cities
    for city_data in INDIAN_CITIES:
        city_data["culture_id"] = "indian"
        city = await CultureCity.find_one(
            CultureCity.culture_id == "indian",
            CultureCity.city_id == city_data["city_id"],
        )
        if not city:
            city = CultureCity(**city_data)
            await city.insert()
            print(f"  ✓ Created city: {city_data['name']}")
        else:
            await city.update({"$set": city_data})
            print(f"  ⊙ Updated city: {city_data['name']}")

    # Create or update Indian sources
    for source_data in INDIAN_SOURCES:
        source = await CultureNewsSource.find_one(
            CultureNewsSource.source_id == source_data["source_id"],
        )
        if not source:
            source = CultureNewsSource(**source_data)
            await source.insert()
            print(f"  ✓ Created source: {source_data['name']}")
        else:
            await source.update({"$set": source_data})
            print(f"  ⊙ Updated source: {source_data['name']}")

    # =====================
    # SUMMARY
    # =====================
    print("\n" + "=" * 50)
    cultures_count = await Culture.count()
    cities_count = await CultureCity.count()
    sources_count = await CultureNewsSource.count()

    print(f"✅ Culture seeding complete!")
    print(f"   - Cultures: {cultures_count}")
    print(f"   - Cities: {cities_count}")
    print(f"   - News Sources: {sources_count}")
    print("=" * 50)

    # Close connection
    client.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Seed culture data")
    parser.add_argument(
        "--clear",
        action="store_true",
        help="Clear existing culture data before seeding",
    )
    args = parser.parse_args()

    asyncio.run(seed_cultures(clear_existing=args.clear))
