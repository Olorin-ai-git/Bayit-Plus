"""
Seed script to populate Bayit+ database with culture configurations.

Creates:
- Israeli culture (default, with Jerusalem and Tel Aviv cities)
- Chinese culture (with Beijing and Shanghai cities)
- Default news sources for each culture

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
