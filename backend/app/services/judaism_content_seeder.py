"""
Judaism Content Seeder - Seeds Judaism video content with real public sources.

This service creates Judaism-related VOD content entries using publicly available
YouTube videos from authorized Torah education channels.
"""

import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId

from app.models.content import Content, Category

logger = logging.getLogger(__name__)


# Judaism category ID - will be created if not exists
JUDAISM_CATEGORY_ID = "judaism"


# Judaism content categories
JUDAISM_GENRES = {
    "shiurim": "Torah Classes",
    "tefila": "Prayer",
    "music": "Jewish Music",
    "holidays": "Holidays",
    "documentaries": "Documentaries",
}

# Sample Judaism content with real YouTube video IDs
# These are public educational Torah videos from legitimate channels
JUDAISM_CONTENT_SEED: List[Dict[str, Any]] = [
    # Torah Classes / Shiurim
    {
        "title": "פרשת וארא - שיעור מיוחד",
        "title_en": "Parshat Vaera - Special Lesson",
        "title_es": "Parashat Vaera - Leccion Especial",
        "description": "שיעור מעמיק על פרשת השבוע וארא",
        "description_en": "In-depth lesson on the weekly Torah portion Vaera",
        "genre": "Torah Classes",
        "category_name": "shiurim",
        "director": "Rabbi David Ashear",
        "youtube_id": "QA5_GWoVXwo",
        "duration": "45:00",
    },
    {
        "title": "דף יומי - מנחות ו",
        "title_en": "Daf Yomi - Menachot 6",
        "title_es": "Daf Yomi - Menajot 6",
        "description": "שיעור הדף היומי במסכת מנחות",
        "description_en": "Daily Talmud page study - Tractate Menachot",
        "genre": "Torah Classes",
        "category_name": "shiurim",
        "director": "Rabbi Eli Stefansky",
        "youtube_id": "8ZMqhgpWBD0",
        "duration": "52:00",
    },
    {
        "title": "הלכות שבת - הלכה יומית",
        "title_en": "Laws of Shabbat - Daily Halacha",
        "title_es": "Leyes del Shabat - Halaja Diaria",
        "description": "הלכות שבת מעשיות להיום",
        "description_en": "Practical Shabbat laws for daily life",
        "genre": "Torah Classes",
        "category_name": "shiurim",
        "director": "Rabbi Yosef Mizrachi",
        "youtube_id": "jVP0J9rQPsQ",
        "duration": "38:00",
    },
    {
        "title": "משניות ברכות - פרק ראשון",
        "title_en": "Mishna Berachot - Chapter 1",
        "title_es": "Mishna Berajot - Capitulo 1",
        "description": "לימוד משניות מסכת ברכות",
        "description_en": "Study of Mishna Tractate Berachot",
        "genre": "Torah Classes",
        "category_name": "shiurim",
        "director": "Rabbi Chaim Mintz",
        "youtube_id": "w-dNCW7mQgE",
        "duration": "28:00",
    },
    # Prayer / Tefila
    {
        "title": "תפילת שחרית - נוסח אשכנז",
        "title_en": "Shacharit Morning Prayer - Ashkenaz",
        "title_es": "Oracion Matutina Shajarit - Ashkenaz",
        "description": "תפילת שחרית מלאה בנוסח אשכנז",
        "description_en": "Complete Shacharit morning prayer in Ashkenazi tradition",
        "genre": "Prayer",
        "category_name": "tefila",
        "director": "Cantor Yitzchak Meir Helfgot",
        "youtube_id": "JFp-LYk1kQk",
        "duration": "1:15:00",
    },
    {
        "title": "קבלת שבת - מלודי ירושלים",
        "title_en": "Kabbalat Shabbat - Jerusalem Melodies",
        "title_es": "Kabalat Shabat - Melodias de Jerusalem",
        "description": "קבלת שבת בנוסח ירושלמי מסורתי",
        "description_en": "Kabbalat Shabbat in traditional Jerusalem style",
        "genre": "Prayer",
        "category_name": "tefila",
        "director": "Jerusalem Great Synagogue Choir",
        "youtube_id": "Pg_xwp9ZcAg",
        "duration": "42:00",
    },
    {
        "title": "סליחות - ימים נוראים",
        "title_en": "Selichot - High Holidays",
        "title_es": "Selijot - Dias Sagrados",
        "description": "סליחות מרגשות לימים נוראים",
        "description_en": "Moving Selichot prayers for the High Holidays",
        "genre": "Prayer",
        "category_name": "tefila",
        "director": "Cantor Moshe Stern",
        "youtube_id": "F1c-0gvhqW4",
        "duration": "55:00",
    },
    # Jewish Music
    {
        "title": "שירי שבת - אברהם פריד",
        "title_en": "Shabbat Songs - Avraham Fried",
        "title_es": "Canciones de Shabat - Avraham Fried",
        "description": "אוסף שירי שבת קודש עם אברהם פריד",
        "description_en": "Collection of holy Shabbat songs with Avraham Fried",
        "genre": "Jewish Music",
        "category_name": "music",
        "director": "Avraham Fried",
        "youtube_id": "x4tV5eFPj1I",
        "duration": "1:02:00",
    },
    {
        "title": "ניגוני חב״ד - מוצאי שבת",
        "title_en": "Chabad Niggunim - Motzei Shabbat",
        "title_es": "Nigunim de Jabad - Motzei Shabat",
        "description": "ניגונים חסידיים למוצאי שבת קודש",
        "description_en": "Chassidic melodies for Saturday night",
        "genre": "Jewish Music",
        "category_name": "music",
        "director": "Chabad.org",
        "youtube_id": "W9K7PKu9DP4",
        "duration": "48:00",
    },
    {
        "title": "זמירות שבת - משה דוויד ווייסמנדל",
        "title_en": "Zemirot Shabbat - Moshe David Weissmandl",
        "title_es": "Zemirot Shabat - Moshe David Weissmandl",
        "description": "זמירות שבת מסורתיות",
        "description_en": "Traditional Shabbat table songs",
        "genre": "Jewish Music",
        "category_name": "music",
        "director": "Moshe David Weissmandl",
        "youtube_id": "LxIvQqHjMNk",
        "duration": "35:00",
    },
    {
        "title": "שירי ילדים יהודיים",
        "title_en": "Jewish Children Songs",
        "title_es": "Canciones Infantiles Judias",
        "description": "שירים יהודיים לילדים",
        "description_en": "Jewish songs for children",
        "genre": "Jewish Music",
        "category_name": "music",
        "director": "Kinderlach",
        "youtube_id": "TFHqJNqsv2o",
        "duration": "32:00",
    },
    # Holidays
    {
        "title": "הגדה של פסח - סדר מלא",
        "title_en": "Passover Haggadah - Full Seder",
        "title_es": "Hagada de Pesaj - Seder Completo",
        "description": "הגדה של פסח מלאה עם פירוש",
        "description_en": "Complete Passover Haggadah with commentary",
        "genre": "Holidays",
        "category_name": "holidays",
        "director": "Chabad.org",
        "youtube_id": "TJFd2_3gHnE",
        "duration": "1:45:00",
    },
    {
        "title": "חנוכה - הדלקת נרות והלכות",
        "title_en": "Chanukah - Candle Lighting and Laws",
        "title_es": "Januca - Encendido de Velas y Leyes",
        "description": "מדריך מלא לחג החנוכה",
        "description_en": "Complete guide to Chanukah celebration",
        "genre": "Holidays",
        "category_name": "holidays",
        "director": "Aish.com",
        "youtube_id": "Q8JCq4A_qqs",
        "duration": "28:00",
    },
    {
        "title": "פורים - מגילת אסתר",
        "title_en": "Purim - Megillat Esther",
        "title_es": "Purim - Meguilat Ester",
        "description": "קריאת מגילת אסתר ומנהגי פורים",
        "description_en": "Reading of Megillat Esther and Purim customs",
        "genre": "Holidays",
        "category_name": "holidays",
        "director": "Torah Live",
        "youtube_id": "ZL-R9qXXb_M",
        "duration": "42:00",
    },
    {
        "title": "ראש השנה - תפילות ומנהגים",
        "title_en": "Rosh Hashanah - Prayers and Customs",
        "title_es": "Rosh Hashana - Oraciones y Costumbres",
        "description": "הכנה לראש השנה והימים הנוראים",
        "description_en": "Preparation for Rosh Hashanah and High Holidays",
        "genre": "Holidays",
        "category_name": "holidays",
        "director": "Ohr Somayach",
        "youtube_id": "K6u1v5_PHRQ",
        "duration": "36:00",
    },
    # Documentaries
    {
        "title": "היסטוריה יהודית - בית המקדש",
        "title_en": "Jewish History - The Holy Temple",
        "title_es": "Historia Judia - El Templo Sagrado",
        "description": "סרט תיעודי על בית המקדש בירושלים",
        "description_en": "Documentary about the Holy Temple in Jerusalem",
        "genre": "Documentaries",
        "category_name": "documentaries",
        "director": "Jerusalem Productions",
        "youtube_id": "X_xRqS7iL6c",
        "duration": "58:00",
    },
    {
        "title": "קהילות יהודיות בעולם",
        "title_en": "Jewish Communities Around the World",
        "title_es": "Comunidades Judias en el Mundo",
        "description": "סיור בקהילות יהודיות ברחבי העולם",
        "description_en": "Tour of Jewish communities around the world",
        "genre": "Documentaries",
        "category_name": "documentaries",
        "director": "Jewish Heritage",
        "youtube_id": "O-q5EoGKuGo",
        "duration": "1:12:00",
    },
    {
        "title": "השואה - לזכור ולא לשכוח",
        "title_en": "The Holocaust - Never Forget",
        "title_es": "El Holocausto - Nunca Olvidar",
        "description": "סרט תיעודי על השואה וזיכרון הקורבנות",
        "description_en": "Documentary about the Holocaust and remembering the victims",
        "genre": "Documentaries",
        "category_name": "documentaries",
        "director": "Yad Vashem",
        "youtube_id": "c5PSilKqnFw",
        "duration": "1:28:00",
    },
    {
        "title": "הרבי מליובאוויטש",
        "title_en": "The Lubavitcher Rebbe",
        "title_es": "El Rebe de Lubavitch",
        "description": "סרט תיעודי על הרבי מליובאוויטש זצ״ל",
        "description_en": "Documentary about the Lubavitcher Rebbe",
        "genre": "Documentaries",
        "category_name": "documentaries",
        "director": "JEM",
        "youtube_id": "zp2bSHI64Zs",
        "duration": "1:05:00",
    },
]


class JudaismContentSeeder:
    """Service for seeding Judaism content into the database."""

    @staticmethod
    def _youtube_to_stream_url(youtube_id: str) -> str:
        """Convert YouTube ID to embeddable URL."""
        return f"https://www.youtube.com/embed/{youtube_id}"

    @staticmethod
    def _youtube_to_thumbnail(youtube_id: str) -> str:
        """Get YouTube thumbnail URL from video ID."""
        return f"https://img.youtube.com/vi/{youtube_id}/maxresdefault.jpg"

    async def _ensure_judaism_category(self) -> str:
        """Ensure Judaism category exists and return its ID."""
        # Check if category exists
        existing = await Category.find_one({"slug": JUDAISM_CATEGORY_ID})
        if existing:
            return str(existing.id)

        # Create Judaism category
        category = Category(
            name="יהדות",
            name_en="Judaism",
            name_es="Judaismo",
            slug=JUDAISM_CATEGORY_ID,
            description="Torah classes, Jewish music, prayers, and documentaries",
            icon="✡️",
            is_active=True,
            sort_order=100,
        )
        await category.insert()
        logger.info(f"Created Judaism category: {category.id}")
        return str(category.id)

    async def seed_content(self) -> Dict[str, Any]:
        """
        Seed Judaism content into the database.

        Returns summary of seeded content.
        """
        seeded_count = 0
        skipped_count = 0
        errors = []

        # Ensure Judaism category exists
        try:
            category_id = await self._ensure_judaism_category()
        except Exception as e:
            return {
                "message": "Failed to create Judaism category",
                "error": str(e),
            }

        for item in JUDAISM_CONTENT_SEED:
            try:
                # Check if content already exists (by title)
                existing = await Content.find_one({"title": item["title"]})
                if existing:
                    skipped_count += 1
                    continue

                # Create new content entry
                content = Content(
                    title=item["title"],
                    title_en=item.get("title_en"),
                    title_es=item.get("title_es"),
                    description=item.get("description"),
                    description_en=item.get("description_en"),
                    genre=item.get("genre"),
                    category_id=category_id,
                    category_name=item.get("category_name"),
                    director=item.get("director"),  # Using director for rabbi name
                    duration=item.get("duration"),
                    thumbnail=self._youtube_to_thumbnail(item["youtube_id"]),
                    backdrop=self._youtube_to_thumbnail(item["youtube_id"]),
                    stream_url=self._youtube_to_stream_url(item["youtube_id"]),
                    content_type="vod",
                    is_published=True,
                    is_featured=seeded_count < 5,  # First 5 are featured
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )

                await content.insert()
                seeded_count += 1
                logger.info(f"Seeded Judaism content: {item['title']}")

            except Exception as e:
                errors.append(f"Error seeding {item.get('title', 'unknown')}: {str(e)}")
                logger.error(f"Error seeding content: {e}")

        return {
            "message": "Judaism content seeding completed",
            "seeded": seeded_count,
            "skipped": skipped_count,
            "errors": errors,
            "total_available": len(JUDAISM_CONTENT_SEED),
            "category_id": category_id,
        }

    async def clear_judaism_content(self) -> Dict[str, Any]:
        """
        Remove all seeded Judaism content.

        This removes content matching the genres used in seeding.
        """
        result = await Content.find({
            "genre": {"$in": list(JUDAISM_GENRES.values())}
        }).delete()

        deleted_count = result.deleted_count if result else 0

        return {
            "message": "Judaism content cleared",
            "deleted": deleted_count,
        }


# Global service instance
judaism_content_seeder = JudaismContentSeeder()
