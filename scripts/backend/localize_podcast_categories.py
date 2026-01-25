"""
Migrate podcast categories to support all 10 languages.

This script populates category translations for all existing podcasts
based on a predefined mapping of common Hebrew/English category names
to all supported languages: he, en, es, fr, it, hi, ta, bn, ja, zh.
"""

import asyncio
import logging
from typing import Dict, Optional

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient

from app.core.config import settings
from app.models.content import Podcast

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Category translation mapping
# Keys are in Hebrew (primary language), values are translations
CATEGORY_TRANSLATIONS: Dict[str, Dict[str, str]] = {
    "כללי": {
        "he": "כללי",
        "en": "General",
        "es": "General",
        "fr": "Général",
        "it": "Generale",
        "hi": "सामान्य",
        "ta": "பொது",
        "bn": "সাধারণ",
        "ja": "一般",
        "zh": "综合",
    },
    "חדשות": {
        "he": "חדשות",
        "en": "News",
        "es": "Noticias",
        "fr": "Actualités",
        "it": "Notizie",
        "hi": "समाचार",
        "ta": "செய்திகள்",
        "bn": "সংবাদ",
        "ja": "ニュース",
        "zh": "新闻",
    },
    "חדשות ואקטואליה": {
        "he": "חדשות ואקטואליה",
        "en": "News",
        "es": "Noticias",
        "fr": "Actualités",
        "it": "Notizie",
        "hi": "समाचार",
        "ta": "செய்திகள்",
        "bn": "সংবাদ",
        "ja": "ニュース",
        "zh": "新闻",
    },
    "פוליטיקה": {
        "he": "פוליטיקה",
        "en": "Politics",
        "es": "Política",
        "fr": "Politique",
        "it": "Politica",
        "hi": "राजनीति",
        "ta": "அரசியல்",
        "bn": "রাজনীতি",
        "ja": "政治",
        "zh": "政治",
    },
    "טכנולוגיה": {
        "he": "טכנולוגיה",
        "en": "Tech",
        "es": "Tecnología",
        "fr": "Tech",
        "it": "Tecnologia",
        "hi": "तकनीक",
        "ta": "தொழில்நுட்பம்",
        "bn": "প্রযুক্তি",
        "ja": "テクノロジー",
        "zh": "科技",
    },
    "עסקים": {
        "he": "עסקים",
        "en": "Business",
        "es": "Negocios",
        "fr": "Business",
        "it": "Business",
        "hi": "व्यापार",
        "ta": "வணிகம்",
        "bn": "ব্যবসা",
        "ja": "ビジネス",
        "zh": "商业",
    },
    "יהדות": {
        "he": "יהדות",
        "en": "Jewish",
        "es": "Judaísmo",
        "fr": "Juif",
        "it": "Ebraico",
        "hi": "यहूदी",
        "ta": "யூத",
        "bn": "ইহুদি",
        "ja": "ユダヤ",
        "zh": "犹太",
    },
    "בידור": {
        "he": "בידור",
        "en": "Entertainment",
        "es": "Entretenimiento",
        "fr": "Divertissement",
        "it": "Intrattenimento",
        "hi": "मनोरंजन",
        "ta": "பொழுதுபோக்கு",
        "bn": "বিনোদন",
        "ja": "エンターテイメント",
        "zh": "娱乐",
    },
    "ספורט": {
        "he": "ספורט",
        "en": "Sports",
        "es": "Deportes",
        "fr": "Sports",
        "it": "Sport",
        "hi": "खेल",
        "ta": "விளையாட்டு",
        "bn": "খেলাধুলা",
        "ja": "スポーツ",
        "zh": "体育",
    },
    "היסטוריה": {
        "he": "היסטוריה",
        "en": "History",
        "es": "Historia",
        "fr": "Histoire",
        "it": "Storia",
        "hi": "इतिहास",
        "ta": "வரலாறு",
        "bn": "ইতিহাস",
        "ja": "歴史",
        "zh": "历史",
    },
    "חינוכי": {
        "he": "חינוכי",
        "en": "Educational",
        "es": "Educativo",
        "fr": "Éducatif",
        "it": "Educativo",
        "hi": "शैक्षिक",
        "ta": "கல்வி",
        "bn": "শিক্ষামূলক",
        "ja": "教育",
        "zh": "教育",
    },
    "קומי": {
        "he": "קומי",
        "en": "Comedy",
        "es": "Comedia",
        "fr": "Comédie",
        "it": "Commedia",
        "hi": "कॉमेडी",
        "ta": "நகைச்சுவை",
        "bn": "কমেডি",
        "ja": "コメディ",
        "zh": "喜剧",
    },
    "פסיכולוגיה": {
        "he": "פסיכולוגיה",
        "en": "Psychology",
        "es": "Psicología",
        "fr": "Psychologie",
        "it": "Psicologia",
        "hi": "मनोविज्ञान",
        "ta": "உளவியல்",
        "bn": "মনোবিজ্ঞান",
        "ja": "心理学",
        "zh": "心理学",
    },
    "מדע": {
        "he": "מדע",
        "en": "Science",
        "es": "Ciencia",
        "fr": "Science",
        "it": "Scienza",
        "hi": "विज्ञान",
        "ta": "அறிவியல்",
        "bn": "বিজ্ঞান",
        "ja": "科学",
        "zh": "科学",
    },
    "Science": {
        "he": "מדע",
        "en": "Science",
        "es": "Ciencia",
        "fr": "Science",
        "it": "Scienza",
        "hi": "विज्ञान",
        "ta": "அறிவியல்",
        "bn": "বিজ্ঞান",
        "ja": "科学",
        "zh": "科学",
    },
    "כלכלה": {
        "he": "כלכלה",
        "en": "Economy",
        "es": "Economía",
        "fr": "Économie",
        "it": "Economia",
        "hi": "अर्थव्यवस्था",
        "ta": "பொருளாதாரம்",
        "bn": "অর্থনীতি",
        "ja": "経済",
        "zh": "经济",
    },
    "קומדיה": {
        "he": "קומדיה",
        "en": "Comedy",
        "es": "Comedia",
        "fr": "Comédie",
        "it": "Commedia",
        "hi": "कॉमेडी",
        "ta": "நகைச்சுவை",
        "bn": "কমেডি",
        "ja": "コメディ",
        "zh": "喜剧",
    },
    "ראיונות": {
        "he": "ראיונות",
        "en": "Interviews",
        "es": "Entrevistas",
        "fr": "Interviews",
        "it": "Interviste",
        "hi": "साक्षात्कार",
        "ta": "நேர்காணல்கள்",
        "bn": "সাক্ষাত্কার",
        "ja": "インタビュー",
        "zh": "访谈",
    },
    "Daily News": {
        "he": "חדשות יומיות",
        "en": "Daily News",
        "es": "Noticias Diarias",
        "fr": "Actualités Quotidiennes",
        "it": "Notizie Quotidiane",
        "hi": "दैनिक समाचार",
        "ta": "தினசரி செய்திகள்",
        "bn": "দৈনিক সংবাদ",
        "ja": "デイリーニュース",
        "zh": "每日新闻",
    },
    "News & Politics": {
        "he": "חדשות ופוליטיקה",
        "en": "News & Politics",
        "es": "Noticias y Política",
        "fr": "Actualités et Politique",
        "it": "Notizie e Politica",
        "hi": "समाचार और राजनीति",
        "ta": "செய்திகள் மற்றும் அரசியல்",
        "bn": "সংবাদ এবং রাজনীতি",
        "ja": "ニュースと政治",
        "zh": "新闻与政治",
    },
}


def get_translations_for_category(category: Optional[str]) -> Dict[str, Optional[str]]:
    """Get translations for a given category name."""
    if not category:
        return {
            "en": None,
            "es": None,
            "fr": None,
            "it": None,
            "hi": None,
            "ta": None,
            "bn": None,
            "ja": None,
            "zh": None,
        }

    # Try exact match first
    if category in CATEGORY_TRANSLATIONS:
        translations = CATEGORY_TRANSLATIONS[category]
        return {
            "en": translations.get("en"),
            "es": translations.get("es"),
            "fr": translations.get("fr"),
            "it": translations.get("it"),
            "hi": translations.get("hi"),
            "ta": translations.get("ta"),
            "bn": translations.get("bn"),
            "ja": translations.get("ja"),
            "zh": translations.get("zh"),
        }

    # Try case-insensitive match for English categories
    category_lower = category.lower()
    for key, translations in CATEGORY_TRANSLATIONS.items():
        if translations.get("en", "").lower() == category_lower:
            return {
                "en": translations.get("en"),
                "es": translations.get("es"),
                "fr": translations.get("fr"),
                "it": translations.get("it"),
                "hi": translations.get("hi"),
                "ta": translations.get("ta"),
                "bn": translations.get("bn"),
                "ja": translations.get("ja"),
                "zh": translations.get("zh"),
            }

    # No match found - return None for all languages
    logger.warning(f"No translation found for category: {category}")
    return {
        "en": None,
        "es": None,
        "fr": None,
        "it": None,
        "hi": None,
        "ta": None,
        "bn": None,
        "ja": None,
        "zh": None,
    }


async def migrate_podcast_categories():
    """Migrate all podcast categories to include all language translations."""
    logger.info("Starting podcast category localization migration...")

    # Initialize database connection
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    await init_beanie(database=client[settings.MONGODB_DB_NAME], document_models=[Podcast])

    # Get all active podcasts
    podcasts = await Podcast.find(Podcast.is_active == True).to_list()
    logger.info(f"Found {len(podcasts)} active podcasts to migrate")

    updated_count = 0
    skipped_count = 0

    for podcast in podcasts:
        # Skip if no category
        if not podcast.category:
            skipped_count += 1
            continue

        # Get translations for this category
        translations = get_translations_for_category(podcast.category)

        # Update podcast with translations
        update_data = {}

        # Only update if translation exists and field is empty
        if translations["en"] and not podcast.category_en:
            update_data["category_en"] = translations["en"]
        if translations["es"] and not podcast.category_es:
            update_data["category_es"] = translations["es"]
        if translations["fr"] and not podcast.category_fr:
            update_data["category_fr"] = translations["fr"]
        if translations["it"] and not podcast.category_it:
            update_data["category_it"] = translations["it"]
        if translations["hi"] and not podcast.category_hi:
            update_data["category_hi"] = translations["hi"]
        if translations["ta"] and not podcast.category_ta:
            update_data["category_ta"] = translations["ta"]
        if translations["bn"] and not podcast.category_bn:
            update_data["category_bn"] = translations["bn"]
        if translations["ja"] and not podcast.category_ja:
            update_data["category_ja"] = translations["ja"]
        if translations["zh"] and not podcast.category_zh:
            update_data["category_zh"] = translations["zh"]

        if update_data:
            # Update the podcast
            await podcast.set(update_data)
            updated_count += 1
            logger.info(
                f"Updated podcast '{podcast.title}' category '{podcast.category}' "
                f"with {len(update_data)} translations"
            )
        else:
            skipped_count += 1

    logger.info(
        f"Migration complete: {updated_count} podcasts updated, {skipped_count} skipped"
    )

    # Close database connection
    client.close()


if __name__ == "__main__":
    asyncio.run(migrate_podcast_categories())
