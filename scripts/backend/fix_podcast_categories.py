#!/usr/bin/env python3
"""
Fix podcast category inconsistencies.

Problem:
  Podcasts have mixed Hebrew and English category values as IDs.
  e.g., "News" (3 podcasts) should be "חדשות ואקטואליה" (the Hebrew canonical),
  "Technology" (3) should be "טכנולוגיה", etc.

Fix:
  Normalize all category fields to use Hebrew as the canonical ID (matching
  the existing convention), and ensure localized fields are consistent.
"""

import asyncio
import logging
import sys
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorDatabase

backend_dir = Path(__file__).parent.parent.parent / "backend"
sys.path.insert(0, str(backend_dir))

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
)

# Map of incorrect category values -> canonical Hebrew category + translations
CATEGORY_NORMALIZATION = {
    # News variants -> canonical Hebrew "news" category
    "News": {
        "category": "חדשות ואקטואליה",
        "category_en": "News and Current Affairs",
        "category_es": "Noticias y Actualidad",
        "category_fr": "Actualités",
        "category_it": "Notizie e Attualità",
        "category_hi": "समाचार और सामयिकी",
        "category_ta": "செய்திகள் மற்றும் நடப்பு நிகழ்வுகள்",
        "category_bn": "সংবাদ ও সাম্প্রতিক বিষয়",
        "category_ja": "ニュースと時事",
        "category_zh": "新闻与时事",
    },
    "Daily News": {
        "category": "חדשות ואקטואליה",
        "category_en": "News and Current Affairs",
        "category_es": "Noticias y Actualidad",
        "category_fr": "Actualités",
        "category_it": "Notizie e Attualità",
        "category_hi": "समाचार और सामयिकी",
        "category_ta": "செய்திகள் மற்றும் நடப்பு நிகழ்வுகள்",
        "category_bn": "সংবাদ ও সাম্প্রতিক বিষয়",
        "category_ja": "ニュースと時事",
        "category_zh": "新闻与时事",
    },
    "News & Politics": {
        "category": "חדשות ואקטואליה",
        "category_en": "News and Current Affairs",
        "category_es": "Noticias y Actualidad",
        "category_fr": "Actualités",
        "category_it": "Notizie e Attualità",
        "category_hi": "समाचार और सामयिकी",
        "category_ta": "செய்திகள் மற்றும் நடப்பு நிகழ்வுகள்",
        "category_bn": "সংবাদ ও সাম্প্রতিক বিষয়",
        "category_ja": "ニュースと時事",
        "category_zh": "新闻与时事",
    },
    "חדשות ופוליטיקה": {
        "category": "חדשות ואקטואליה",
        "category_en": "News and Current Affairs",
        "category_es": "Noticias y Actualidad",
        "category_fr": "Actualités",
        "category_it": "Notizie e Attualità",
        "category_hi": "समाचार और सामयिकी",
        "category_ta": "செய்திகள் மற்றும் நடப்பு நிகழ்வுகள்",
        "category_bn": "সংবাদ ও সাম্প্রতিক বিষয়",
        "category_ja": "ニュースと時事",
        "category_zh": "新闻与时事",
    },
    # Technology variants -> canonical Hebrew
    "Technology": {
        "category": "טכנולוגיה",
        "category_en": "Technology",
        "category_es": "Tecnología",
        "category_fr": "Technologie",
        "category_it": "Tecnologia",
        "category_hi": "प्रौद्योगिकी",
        "category_ta": "தொழில்நுட்பம்",
        "category_bn": "প্রযুক্তি",
        "category_ja": "テクノロジー",
        "category_zh": "科技",
    },
    # Science -> Hebrew
    "Science": {
        "category": "מדע",
        "category_en": "Science",
        "category_es": "Ciencia",
        "category_fr": "Science",
        "category_it": "Scienza",
        "category_hi": "विज्ञान",
        "category_ta": "அறிவியல்",
        "category_bn": "বিজ্ঞান",
        "category_ja": "科学",
        "category_zh": "科学",
    },
}

# Also ensure existing Hebrew categories have proper translations
TRANSLATION_FILL = {
    "חדשות ואקטואליה": {
        "category_en": "News and Current Affairs",
        "category_es": "Noticias y Actualidad",
        "category_fr": "Actualités",
        "category_it": "Notizie e Attualità",
        "category_hi": "समाचार और सामयिकी",
        "category_ta": "செய்திகள் மற்றும் நடப்பு நிகழ்வுகள்",
        "category_bn": "সংবাদ ও সাম্প্রতিক বিষয়",
        "category_ja": "ニュースと時事",
        "category_zh": "新闻与时事",
    },
    "היסטוריה": {
        "category_en": "History",
        "category_es": "Historia",
        "category_fr": "Histoire",
        "category_it": "Storia",
        "category_hi": "इतिहास",
        "category_ta": "வரலாறு",
        "category_bn": "ইতিহাস",
        "category_ja": "歴史",
        "category_zh": "历史",
    },
    "כלכלה": {
        "category_en": "Economy",
        "category_es": "Economía",
        "category_fr": "Économie",
        "category_it": "Economia",
        "category_hi": "अर्थव्यवस्था",
        "category_ta": "பொருளாதாரம்",
        "category_bn": "অর্থনীতি",
        "category_ja": "経済",
        "category_zh": "经济",
    },
    "טכנולוגיה": {
        "category_en": "Technology",
        "category_es": "Tecnología",
        "category_fr": "Technologie",
        "category_it": "Tecnologia",
        "category_hi": "प्रौद्योगिकी",
        "category_ta": "தொழில்நுட்பம்",
        "category_bn": "প্রযুক্তি",
        "category_ja": "テクノロジー",
        "category_zh": "科技",
    },
    "קומדיה": {
        "category_en": "Comedy",
        "category_es": "Comedia",
        "category_fr": "Comédie",
        "category_it": "Commedia",
        "category_hi": "कॉमेडी",
        "category_ta": "நகைச்சுவை",
        "category_bn": "কমেডি",
        "category_ja": "コメディ",
        "category_zh": "喜剧",
    },
    "ראיונות": {
        "category_en": "Interviews",
        "category_es": "Entrevistas",
        "category_fr": "Entretiens",
        "category_it": "Interviste",
        "category_hi": "साक्षात्कार",
        "category_ta": "நேர்காணல்கள்",
        "category_bn": "সাক্ষাৎকার",
        "category_ja": "インタビュー",
        "category_zh": "访谈",
    },
    "פסיכולוגיה": {
        "category_en": "Psychology",
        "category_es": "Psicología",
        "category_fr": "Psychologie",
        "category_it": "Psicologia",
        "category_hi": "मनोविज्ञान",
        "category_ta": "உளவியல்",
        "category_bn": "মনোবিজ্ঞান",
        "category_ja": "心理学",
        "category_zh": "心理学",
    },
    "מדע": {
        "category_en": "Science",
        "category_es": "Ciencia",
        "category_fr": "Science",
        "category_it": "Scienza",
        "category_hi": "विज्ञान",
        "category_ta": "அறிவியல்",
        "category_bn": "বিজ্ঞান",
        "category_ja": "科学",
        "category_zh": "科学",
    },
}


async def get_database() -> AsyncIOMotorDatabase:
    """Get MongoDB connection."""
    from app.core.database import connect_to_mongo, get_database

    try:
        return get_database()
    except Exception:
        await connect_to_mongo()
        return get_database()


async def fix_podcast_categories(dry_run: bool = False):
    """Fix podcast category inconsistencies."""
    try:
        db = await get_database()
        col = db.get_collection("podcasts")

        total_normalized = 0
        total_translations_filled = 0

        # Step 1: Normalize mismatched categories
        for wrong_category, correct_fields in CATEGORY_NORMALIZATION.items():
            count = await col.count_documents({"category": wrong_category})
            if count > 0:
                logger.info(
                    f"Normalizing '{wrong_category}' -> "
                    f"'{correct_fields['category']}' ({count} podcasts)"
                )
                if not dry_run:
                    await col.update_many(
                        {"category": wrong_category},
                        {"$set": correct_fields},
                    )
                total_normalized += count

        # Step 2: Fill missing translations on existing Hebrew categories
        for hebrew_cat, translations in TRANSLATION_FILL.items():
            # Find podcasts with this Hebrew category that are missing translations
            for field, value in translations.items():
                missing_filter = {
                    "category": hebrew_cat,
                    "$or": [
                        {field: None},
                        {field: {"$exists": False}},
                        {field: ""},
                    ],
                }
                count = await col.count_documents(missing_filter)
                if count > 0:
                    logger.info(
                        f"Filling {field} for '{hebrew_cat}': "
                        f"'{value}' ({count} podcasts)"
                    )
                    if not dry_run:
                        await col.update_many(
                            missing_filter,
                            {"$set": {field: value}},
                        )
                    total_translations_filled += count

        # Summary
        logger.info(f"\n{'='*60}")
        logger.info("SUMMARY")
        logger.info(f"{'='*60}")
        logger.info(f"  Categories normalized: {total_normalized}")
        logger.info(f"  Translation fields filled: {total_translations_filled}")
        logger.info(f"  Mode: {'DRY RUN' if dry_run else 'APPLIED'}")

        # Verify final state
        if not dry_run:
            podcasts = await col.find({"is_active": True}).to_list(None)
            categories = {}
            for p in podcasts:
                cat = p.get("category", "NONE")
                if cat not in categories:
                    categories[cat] = {
                        "count": 0,
                        "en": p.get("category_en", "N/A"),
                    }
                categories[cat]["count"] += 1

            logger.info(f"\n  Final unique categories: {len(categories)}")
            for cat, info in sorted(
                categories.items(), key=lambda x: -x[1]["count"]
            ):
                logger.info(
                    f"    '{cat}' (EN: '{info['en']}'): "
                    f"{info['count']} podcasts"
                )

    except Exception as e:
        logger.error(f"Error: {e}", exc_info=True)
    finally:
        from app.core.database import close_mongo_connection

        await close_mongo_connection()


if __name__ == "__main__":
    dry_run = "--dry-run" in sys.argv
    if dry_run:
        logger.info("Running in DRY RUN mode")
    asyncio.run(fix_podcast_categories(dry_run=dry_run))
