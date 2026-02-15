"""
Culture Seeder - Initialize all cultures on startup.

Creates cultures if they don't exist:
- Israeli (default)
- Chinese
- Japanese
- Korean
- Indian
- USA (American)

This ensures all culture endpoints work on startup.
For full seed with news sources, run: python -m scripts.seed_cultures
"""

import logging

from app.models.culture import Culture, CultureCity, CultureCityCategory

logger = logging.getLogger(__name__)


# =============================================================================
# ISRAELI CULTURE
# =============================================================================
ISRAELI_CULTURE_DATA = {
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

ISRAELI_CITIES_DATA = [
    {
        "city_id": "jerusalem",
        "culture_id": "israeli",
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
                name_localized={
                    "he": "הכותל המערבי",
                    "en": "Western Wall",
                    "es": "Muro Occidental",
                },
                icon_emoji="🕎",
                keywords_native=["כותל", "הכותל המערבי"],
                keywords_english=["kotel", "western wall"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="idf-ceremony",
                name="IDF Ceremonies",
                name_localized={
                    "he": 'טקסי צה"ל',
                    "en": "IDF Ceremonies",
                    "es": "Ceremonias de las FDI",
                },
                icon_emoji="🎖️",
                keywords_native=['טקס צה"ל', "השבעה"],
                keywords_english=["idf ceremony", "swearing in"],
                display_order=1,
                is_active=True,
            ),
            CultureCityCategory(
                id="holy-sites",
                name="Holy Sites",
                name_localized={
                    "he": "מקומות קדושים",
                    "en": "Holy Sites",
                    "es": "Lugares Sagrados",
                },
                icon_emoji="✡️",
                keywords_native=["מקומות קדושים", "עיר דוד"],
                keywords_english=["holy sites", "city of david"],
                display_order=2,
                is_active=True,
            ),
        ],
        "display_order": 0,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/israeli/jerusalem.jpg",
        "accent_color": "#C5A03A",
    },
    {
        "city_id": "tel-aviv",
        "culture_id": "israeli",
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
                id="tech",
                name="Tech",
                name_localized={"he": "הייטק", "en": "Tech", "es": "Tecnología"},
                icon_emoji="💻",
                keywords_native=["הייטק", "סטארטאפ"],
                keywords_english=["tech", "startup"],
                display_order=1,
                is_active=True,
            ),
            CultureCityCategory(
                id="culture",
                name="Culture",
                name_localized={"he": "תרבות", "en": "Culture", "es": "Cultura"},
                icon_emoji="🎭",
                keywords_native=["תרבות", "אמנות"],
                keywords_english=["culture", "art"],
                display_order=2,
                is_active=True,
            ),
        ],
        "display_order": 1,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/israeli/tel_aviv.jpg",
        "accent_color": "#F97316",
    },
]

# =============================================================================
# CHINESE CULTURE
# =============================================================================
CHINESE_CULTURE_DATA = {
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

CHINESE_CITIES_DATA = [
    {
        "city_id": "beijing",
        "culture_id": "chinese",
        "name": "Beijing",
        "name_localized": {
            "zh": "北京",
            "he": "בייג'ינג",
            "en": "Beijing",
            "es": "Pekín",
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
        "accent_color": "#FFD700",
    },
    {
        "city_id": "shanghai",
        "culture_id": "chinese",
        "name": "Shanghai",
        "name_localized": {
            "zh": "上海",
            "he": "שנגחאי",
            "en": "Shanghai",
            "es": "Shanghái",
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
        ],
        "display_order": 1,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/chinese/shanghai.jpg",
        "accent_color": "#00BFFF",
    },
]

# =============================================================================
# JAPANESE CULTURE
# =============================================================================
JAPANESE_CULTURE_DATA = {
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

JAPANESE_CITIES_DATA = [
    {
        "city_id": "tokyo",
        "culture_id": "japanese",
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
                name_localized={
                    "ja": "テクノロジー",
                    "en": "Technology",
                    "he": "טכנולוגיה",
                },
                icon_emoji="🤖",
                keywords_native=["テクノロジー", "技術", "ロボット"],
                keywords_english=["technology", "tech", "robotics"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="anime",
                name="Anime & Manga",
                name_localized={
                    "ja": "アニメ・漫画",
                    "en": "Anime & Manga",
                    "he": "אנימה ומנגה",
                },
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
        "accent_color": "#FF1493",
    },
    {
        "city_id": "kyoto",
        "culture_id": "japanese",
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
                name_localized={
                    "ja": "寺社仏閣",
                    "en": "Temples & Shrines",
                    "he": "מקדשים",
                },
                icon_emoji="⛩️",
                keywords_native=["寺", "神社", "仏閣"],
                keywords_english=["temple", "shrine", "spiritual"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="tradition",
                name="Traditional Culture",
                name_localized={
                    "ja": "伝統文化",
                    "en": "Traditional Culture",
                    "he": "תרבות מסורתית",
                },
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
        "accent_color": "#8B4513",
    },
    {
        "city_id": "osaka",
        "culture_id": "japanese",
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
                name_localized={
                    "ja": "屋台グルメ",
                    "en": "Street Food",
                    "he": "אוכל רחוב",
                },
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
        "accent_color": "#FF6347",
    },
]

# =============================================================================
# KOREAN CULTURE
# =============================================================================
KOREAN_CULTURE_DATA = {
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

KOREAN_CITIES_DATA = [
    {
        "city_id": "seoul",
        "culture_id": "korean",
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
                name_localized={
                    "ko": "K-Pop & 엔터테인먼트",
                    "en": "K-Pop & Entertainment",
                    "he": "קיי-פופ ובידור",
                },
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
                name_localized={
                    "ko": "한식",
                    "en": "Korean Food",
                    "he": "אוכל קוריאני",
                },
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
        "accent_color": "#FF69B4",
    },
    {
        "city_id": "busan",
        "culture_id": "korean",
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
                name_localized={
                    "ko": "영화 & 축제",
                    "en": "Film & Festivals",
                    "he": "קולנוע ופסטיבלים",
                },
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
        "accent_color": "#00CED1",
    },
]

# =============================================================================
# INDIAN CULTURE
# =============================================================================
INDIAN_CULTURE_DATA = {
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

INDIAN_CITIES_DATA = [
    {
        "city_id": "mumbai",
        "culture_id": "indian",
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
                name_localized={
                    "hi": "स्ट्रीट फूड",
                    "en": "Street Food",
                    "he": "אוכל רחוב",
                },
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
        "accent_color": "#FFD700",
    },
    {
        "city_id": "delhi",
        "culture_id": "indian",
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
                name_localized={
                    "hi": "इतिहास और विरासत",
                    "en": "History & Heritage",
                    "he": "היסטוריה ומורשת",
                },
                icon_emoji="🏛️",
                keywords_native=["लाल किला", "कुतुब मीनार", "इतिहास"],
                keywords_english=["red fort", "qutub minar", "history"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="politics",
                name="Politics & Government",
                name_localized={
                    "hi": "राजनीति और सरकार",
                    "en": "Politics & Government",
                    "he": "פוליטיקה וממשל",
                },
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
        "accent_color": "#228B22",
    },
    {
        "city_id": "bangalore",
        "culture_id": "indian",
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
                name_localized={
                    "hi": "प्रौद्योगिकी और स्टार्टअप",
                    "en": "Technology & Startups",
                    "he": "טכנולוגיה וסטארטאפים",
                },
                icon_emoji="💻",
                keywords_native=["आईटी", "स्टार्टअप", "टेक"],
                keywords_english=["it", "startup", "tech"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="gardens",
                name="Gardens & Parks",
                name_localized={
                    "hi": "उद्यान और पार्क",
                    "en": "Gardens & Parks",
                    "he": "גנים ופארקים",
                },
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
        "accent_color": "#9370DB",
    },
]

# =============================================================================
# USA CULTURE
# =============================================================================
USA_CULTURE_DATA = {
    "culture_id": "usa",
    "name": "American",
    "name_localized": {
        "en": "American",
        "he": "אמריקאי",
        "es": "Americano",
    },
    "flag_emoji": "🇺🇸",
    "country_code": "US",
    "primary_timezone": "America/New_York",
    "primary_language": "en",
    "supported_languages": ["en", "es"],
    "keyword_weight_native": 1.5,
    "keyword_weight_english": 2.0,
    "has_shabbat_mode": False,
    "has_lunar_calendar": False,
    "has_special_holidays": True,
    "display_order": 5,
    "is_active": True,
    "is_default": False,
    "background_image_key": "cultures/usa/background.jpg",
    "accent_color": "#B22234",
}

USA_CITIES_DATA = [
    {
        "city_id": "new-york",
        "culture_id": "usa",
        "name": "New York",
        "name_localized": {
            "en": "New York",
            "he": "ניו יורק",
            "es": "Nueva York",
        },
        "name_native": "New York",
        "timezone": "America/New_York",
        "coordinates": {"lat": 40.7128, "lng": -74.0060},
        "country_code": "US",
        "categories": [
            CultureCityCategory(
                id="finance",
                name="Finance & Business",
                name_localized={
                    "en": "Finance & Business",
                    "he": "פיננסים ועסקים",
                    "es": "Finanzas y Negocios",
                },
                icon_emoji="💼",
                keywords_native=["wall street", "finance", "business"],
                keywords_english=["wall street", "finance", "business"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="culture",
                name="Arts & Culture",
                name_localized={
                    "en": "Arts & Culture",
                    "he": "אמנות ותרבות",
                    "es": "Arte y Cultura",
                },
                icon_emoji="🎭",
                keywords_native=["broadway", "museum", "art"],
                keywords_english=["broadway", "museum", "art"],
                display_order=1,
                is_active=True,
            ),
        ],
        "display_order": 0,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/usa/new_york.jpg",
        "accent_color": "#00BFFF",
    },
    {
        "city_id": "los-angeles",
        "culture_id": "usa",
        "name": "Los Angeles",
        "name_localized": {
            "en": "Los Angeles",
            "he": "לוס אנג'לס",
            "es": "Los Ángeles",
        },
        "name_native": "Los Angeles",
        "timezone": "America/Los_Angeles",
        "coordinates": {"lat": 34.0522, "lng": -118.2437},
        "country_code": "US",
        "categories": [
            CultureCityCategory(
                id="entertainment",
                name="Entertainment & Media",
                name_localized={
                    "en": "Entertainment & Media",
                    "he": "בידור ומדיה",
                    "es": "Entretenimiento y Medios",
                },
                icon_emoji="🎬",
                keywords_native=["hollywood", "entertainment", "movies"],
                keywords_english=["hollywood", "entertainment", "movies"],
                display_order=0,
                is_active=True,
            ),
            CultureCityCategory(
                id="tech",
                name="Technology",
                name_localized={
                    "en": "Technology",
                    "he": "טכנולוגיה",
                    "es": "Tecnología",
                },
                icon_emoji="💻",
                keywords_native=["silicon beach", "tech", "startups"],
                keywords_english=["silicon beach", "tech", "startups"],
                display_order=1,
                is_active=True,
            ),
        ],
        "display_order": 1,
        "is_active": True,
        "is_featured": True,
        "background_image_key": "cultures/usa/los_angeles.jpg",
        "accent_color": "#FFD700",
    },
]

# =============================================================================
# ALL CULTURES DATA
# =============================================================================
ALL_CULTURES = [
    {"culture": ISRAELI_CULTURE_DATA, "cities": ISRAELI_CITIES_DATA},
    {"culture": CHINESE_CULTURE_DATA, "cities": CHINESE_CITIES_DATA},
    {"culture": JAPANESE_CULTURE_DATA, "cities": JAPANESE_CITIES_DATA},
    {"culture": KOREAN_CULTURE_DATA, "cities": KOREAN_CITIES_DATA},
    {"culture": INDIAN_CULTURE_DATA, "cities": INDIAN_CITIES_DATA},
    {"culture": USA_CULTURE_DATA, "cities": USA_CITIES_DATA},
]


async def init_default_cultures() -> None:
    """
    Initialize all cultures if they don't exist.

    This ensures all culture endpoints work on startup.
    For full seed with news sources, run: python -m scripts.seed_cultures
    """
    try:
        cultures_created = 0
        cities_created = 0

        for culture_data in ALL_CULTURES:
            culture_info = culture_data["culture"]
            cities_info = culture_data["cities"]
            culture_id = culture_info["culture_id"]

            # Check if culture exists
            existing = await Culture.find_one({"culture_id": culture_id})

            if not existing:
                logger.info(f"Creating {culture_info['name']} culture...")

                # Create the culture
                culture = Culture(**culture_info)
                await culture.insert()
                cultures_created += 1
                logger.info(f"  ✓ Created {culture_info['name']} culture")

                # Create cities for this culture
                for city_data in cities_info:
                    city = CultureCity(**city_data)
                    await city.insert()
                    cities_created += 1
                    logger.info(f"    ✓ Created city: {city_data['name']}")
            else:
                logger.debug(
                    f"{culture_info['name']} culture already exists - skipping"
                )

        if cultures_created > 0 or cities_created > 0:
            logger.info(
                f"Culture seeding complete: {cultures_created} cultures, {cities_created} cities created"
            )
        else:
            logger.debug("All cultures already exist - no seeding required")

    except Exception as e:
        logger.warning(f"Failed to initialize default cultures: {e}")
        # Don't raise - this is non-critical for server startup
