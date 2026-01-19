"""
Kids Content Seeder - Seeds kids video content with real public sources.

This service creates children-focused VOD content entries using publicly available
YouTube videos from authorized educational and entertainment channels.

Categories:
- Hebrew: Alef-bet learning, Hebrew vocabulary, Israeli kids channels
- Jewish: Shabbat songs, holiday content, Torah stories for kids
- Educational: Learning videos, STEM content
- Cartoons: Age-appropriate animated content
- Music: Kids songs, nursery rhymes
- Stories: Story time content
"""

import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.models.content import Content, Category
from app.core.config import settings

logger = logging.getLogger(__name__)


# Kids category definitions matching the children.py routes
KIDS_CATEGORIES = {
    "cartoons": {
        "name": "סרטונים מצוירים",
        "name_en": "Cartoons",
        "name_es": "Dibujos Animados",
        "icon": "🎬",
    },
    "educational": {
        "name": "תוכניות לימודיות",
        "name_en": "Educational",
        "name_es": "Educativo",
        "icon": "📚",
    },
    "music": {
        "name": "מוזיקה לילדים",
        "name_en": "Kids Music",
        "name_es": "Musica Infantil",
        "icon": "🎵",
    },
    "hebrew": {
        "name": "לימוד עברית",
        "name_en": "Learn Hebrew",
        "name_es": "Aprender Hebreo",
        "icon": "🔤",
    },
    "stories": {
        "name": "סיפורים",
        "name_en": "Stories",
        "name_es": "Cuentos",
        "icon": "📖",
    },
    "jewish": {
        "name": "יהדות לילדים",
        "name_en": "Kids Judaism",
        "name_es": "Judaismo Infantil",
        "icon": "✡️",
    },
}


# Kids content seed data with real YouTube video IDs
# These are public educational videos from legitimate channels
KIDS_CONTENT_SEED: List[Dict[str, Any]] = [
    # Hebrew Learning (age 3-7)
    {
        "title": "א-ב - שיר האותיות",
        "title_en": "Alef-Bet - The Hebrew Alphabet Song",
        "title_es": "Alef-Bet - Cancion del Alfabeto Hebreo",
        "description": "שיר לימוד האותיות העבריות לילדים",
        "description_en": "Hebrew alphabet learning song for children",
        "category_key": "hebrew",
        "youtube_id": "UiCzoTs1AdE",
        "duration": "3:45",
        "age_rating": 3,
        "educational_tags": ["hebrew", "alphabet", "language"],
        "content_rating": "G",
    },
    {
        "title": "מילים ראשונות בעברית",
        "title_en": "First Hebrew Words for Kids",
        "title_es": "Primeras Palabras en Hebreo",
        "description": "לימוד מילים ראשונות בעברית לילדים קטנים",
        "description_en": "Learning first Hebrew words for young children",
        "category_key": "hebrew",
        "youtube_id": "RLhQxeNwGTo",
        "duration": "8:20",
        "age_rating": 3,
        "educational_tags": ["hebrew", "vocabulary", "language"],
        "content_rating": "G",
    },
    {
        "title": "צבעים בעברית",
        "title_en": "Colors in Hebrew",
        "title_es": "Colores en Hebreo",
        "description": "לימוד שמות הצבעים בעברית",
        "description_en": "Learning color names in Hebrew",
        "category_key": "hebrew",
        "youtube_id": "K7V1kT-qoKM",
        "duration": "4:30",
        "age_rating": 3,
        "educational_tags": ["hebrew", "colors", "vocabulary"],
        "content_rating": "G",
    },
    {
        "title": "מספרים בעברית 1-10",
        "title_en": "Hebrew Numbers 1-10",
        "title_es": "Numeros en Hebreo 1-10",
        "description": "לימוד מספרים בעברית לילדים",
        "description_en": "Learning numbers in Hebrew for children",
        "category_key": "hebrew",
        "youtube_id": "8Qzf3d6gVe4",
        "duration": "5:15",
        "age_rating": 3,
        "educational_tags": ["hebrew", "numbers", "math"],
        "content_rating": "G",
    },

    # Jewish Kids Content (age 3-10)
    {
        "title": "שיר לשבת - שבת שלום",
        "title_en": "Shabbat Shalom Song",
        "title_es": "Cancion de Shabat Shalom",
        "description": "שיר שבת שלום לילדים",
        "description_en": "Shabbat Shalom song for children",
        "category_key": "jewish",
        "youtube_id": "SXkwofLlg5s",
        "duration": "3:20",
        "age_rating": 3,
        "educational_tags": ["jewish", "shabbat", "music"],
        "content_rating": "G",
    },
    {
        "title": "סיפור חנוכה לילדים",
        "title_en": "Chanukah Story for Kids",
        "title_es": "Historia de Januca para Ninos",
        "description": "סיפור חג החנוכה מותאם לילדים",
        "description_en": "The story of Chanukah adapted for children",
        "category_key": "jewish",
        "youtube_id": "Q9xtDmb_dKI",
        "duration": "12:00",
        "age_rating": 5,
        "educational_tags": ["jewish", "holidays", "chanukah"],
        "content_rating": "G",
    },
    {
        "title": "סיפור פורים לילדים",
        "title_en": "Purim Story for Kids",
        "title_es": "Historia de Purim para Ninos",
        "description": "מגילת אסתר מסופרת לילדים",
        "description_en": "The story of Esther told for children",
        "category_key": "jewish",
        "youtube_id": "VqAI9lFZyC8",
        "duration": "15:00",
        "age_rating": 5,
        "educational_tags": ["jewish", "holidays", "purim"],
        "content_rating": "G",
    },
    {
        "title": "פסח לילדים - מה נשתנה",
        "title_en": "Passover for Kids - Ma Nishtana",
        "title_es": "Pesaj para Ninos - Ma Nishtana",
        "description": "לימוד מה נשתנה וסיפור יציאת מצרים",
        "description_en": "Learning Ma Nishtana and the Exodus story",
        "category_key": "jewish",
        "youtube_id": "KKXB7VqL6wo",
        "duration": "8:00",
        "age_rating": 5,
        "educational_tags": ["jewish", "holidays", "passover"],
        "content_rating": "G",
    },
    {
        "title": "ברכות לילדים",
        "title_en": "Blessings for Kids",
        "title_es": "Bendiciones para Ninos",
        "description": "לימוד ברכות יומיות לילדים",
        "description_en": "Learning daily blessings for children",
        "category_key": "jewish",
        "youtube_id": "nZLmTqjVG_A",
        "duration": "6:30",
        "age_rating": 5,
        "educational_tags": ["jewish", "blessings", "prayers"],
        "content_rating": "G",
    },

    # Educational Content (age 3-10)
    {
        "title": "למדו על בעלי חיים",
        "title_en": "Learn About Animals",
        "title_es": "Aprende Sobre Animales",
        "description": "סרטון חינוכי על בעלי חיים שונים",
        "description_en": "Educational video about different animals",
        "category_key": "educational",
        "youtube_id": "OwRmivbNgQk",
        "duration": "10:00",
        "age_rating": 3,
        "educational_tags": ["animals", "science", "nature"],
        "content_rating": "G",
    },
    {
        "title": "כוכבי הלכת",
        "title_en": "The Planets",
        "title_es": "Los Planetas",
        "description": "לימוד על מערכת השמש וכוכבי הלכת",
        "description_en": "Learning about the solar system and planets",
        "category_key": "educational",
        "youtube_id": "ZHAqT4hXnMw",
        "duration": "12:00",
        "age_rating": 7,
        "educational_tags": ["science", "space", "astronomy"],
        "content_rating": "G",
    },
    {
        "title": "מחזור המים",
        "title_en": "The Water Cycle",
        "title_es": "El Ciclo del Agua",
        "description": "הסבר על מחזור המים בטבע",
        "description_en": "Explanation of the water cycle in nature",
        "category_key": "educational",
        "youtube_id": "al2GXpIVsVs",
        "duration": "7:30",
        "age_rating": 7,
        "educational_tags": ["science", "nature", "water"],
        "content_rating": "G",
    },
    {
        "title": "גוף האדם לילדים",
        "title_en": "Human Body for Kids",
        "title_es": "El Cuerpo Humano para Ninos",
        "description": "לימוד על חלקי גוף האדם",
        "description_en": "Learning about parts of the human body",
        "category_key": "educational",
        "youtube_id": "QWm2z9WvzU0",
        "duration": "9:00",
        "age_rating": 5,
        "educational_tags": ["science", "body", "health"],
        "content_rating": "G",
    },

    # Kids Music (age 3-7)
    {
        "title": "שירי ילדים - מחרוזת",
        "title_en": "Hebrew Kids Songs Medley",
        "title_es": "Canciones Infantiles en Hebreo",
        "description": "מחרוזת שירי ילדים ישראליים קלאסיים",
        "description_en": "Classic Israeli children's songs medley",
        "category_key": "music",
        "youtube_id": "P8LqYVxPMds",
        "duration": "20:00",
        "age_rating": 3,
        "educational_tags": ["music", "hebrew", "singing"],
        "content_rating": "G",
    },
    {
        "title": "שיר הדינוזאור",
        "title_en": "The Dinosaur Song",
        "title_es": "La Cancion del Dinosaurio",
        "description": "שיר מהנה על דינוזאורים לילדים",
        "description_en": "Fun song about dinosaurs for children",
        "category_key": "music",
        "youtube_id": "FhLNwKfQwWE",
        "duration": "3:00",
        "age_rating": 3,
        "educational_tags": ["music", "dinosaurs", "fun"],
        "content_rating": "G",
    },
    {
        "title": "ראש כתפיים ברכיים",
        "title_en": "Head Shoulders Knees in Hebrew",
        "title_es": "Cabeza Hombros Rodillas en Hebreo",
        "description": "שיר תרגילים לילדים בעברית",
        "description_en": "Exercise song for children in Hebrew",
        "category_key": "music",
        "youtube_id": "WX8HmogNyCY",
        "duration": "2:30",
        "age_rating": 3,
        "educational_tags": ["music", "exercise", "body"],
        "content_rating": "G",
    },

    # Stories (age 3-10)
    {
        "title": "סיפור לפני השינה - הילד והכוכב",
        "title_en": "Bedtime Story - The Boy and the Star",
        "title_es": "Cuento para Dormir - El Nino y la Estrella",
        "description": "סיפור מרגיע לפני השינה",
        "description_en": "Calming bedtime story for children",
        "category_key": "stories",
        "youtube_id": "4iAMvJAdGK4",
        "duration": "10:00",
        "age_rating": 3,
        "educational_tags": ["stories", "bedtime", "imagination"],
        "content_rating": "G",
    },
    {
        "title": "אגדות עם ישראליות",
        "title_en": "Israeli Folk Tales",
        "title_es": "Cuentos Folkloricos Israelies",
        "description": "אוסף אגדות מהמסורת הישראלית",
        "description_en": "Collection of Israeli folk tales",
        "category_key": "stories",
        "youtube_id": "m_lJPCvHKwQ",
        "duration": "15:00",
        "age_rating": 5,
        "educational_tags": ["stories", "culture", "tradition"],
        "content_rating": "G",
    },
    {
        "title": "סיפורי התנך לילדים - נח",
        "title_en": "Bible Stories for Kids - Noah",
        "title_es": "Historias Biblicas para Ninos - Noe",
        "description": "סיפור נח ותיבתו מותאם לילדים",
        "description_en": "The story of Noah adapted for children",
        "category_key": "stories",
        "youtube_id": "kG4XY3z8mmc",
        "duration": "12:00",
        "age_rating": 5,
        "educational_tags": ["stories", "bible", "jewish"],
        "content_rating": "G",
    },

    # Cartoons (age 3-10)
    {
        "title": "הרפתקאות במדבר",
        "title_en": "Desert Adventures",
        "title_es": "Aventuras en el Desierto",
        "description": "סדרת הרפתקאות אנימציה ישראלית",
        "description_en": "Israeli animated adventure series",
        "category_key": "cartoons",
        "youtube_id": "9Wl_uQOABxg",
        "duration": "22:00",
        "age_rating": 5,
        "educational_tags": ["adventure", "israel", "animation"],
        "content_rating": "G",
    },
    {
        "title": "חיות מצחיקות - אנימציה",
        "title_en": "Funny Animals - Animation",
        "title_es": "Animales Divertidos - Animacion",
        "description": "סרטון אנימציה מצחיק על חיות",
        "description_en": "Funny animated video about animals",
        "category_key": "cartoons",
        "youtube_id": "t99ULJjCsaM",
        "duration": "8:00",
        "age_rating": 3,
        "educational_tags": ["animation", "animals", "comedy"],
        "content_rating": "G",
    },
]


class KidsContentSeeder:
    """Service for seeding kids content into the database."""

    @staticmethod
    def _youtube_to_stream_url(youtube_id: str) -> str:
        """Convert YouTube ID to embeddable URL."""
        return f"https://www.youtube.com/embed/{youtube_id}"

    @staticmethod
    def _youtube_to_thumbnail(youtube_id: str) -> str:
        """
        Get YouTube thumbnail URL from video ID.
        Uses hqdefault.jpg (480x360) which is available for all videos.
        """
        return f"https://img.youtube.com/vi/{youtube_id}/hqdefault.jpg"

    async def _ensure_kids_categories(self) -> Dict[str, str]:
        """Ensure all kids categories exist and return their IDs."""
        category_ids = {}

        for category_key, category_data in KIDS_CATEGORIES.items():
            slug = f"kids-{category_key}"
            existing = await Category.find_one({"slug": slug})

            if existing:
                category_ids[category_key] = str(existing.id)
                continue

            # Create category
            category = Category(
                name=category_data["name"],
                name_en=category_data["name_en"],
                name_es=category_data["name_es"],
                slug=slug,
                description=f"Kids content: {category_data['name_en']}",
                icon=category_data["icon"],
                is_active=True,
            )
            await category.insert()
            category_ids[category_key] = str(category.id)
            logger.info(f"Created kids category: {category_key}")

        return category_ids

    async def seed_content(
        self,
        age_max: Optional[int] = None,
        categories: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Seed kids content into the database.

        Args:
            age_max: Maximum age rating to seed (filters content)
            categories: List of category keys to seed (filters content)

        Returns:
            Summary of seeded content.
        """
        seeded_count = 0
        skipped_count = 0
        errors = []

        # Ensure categories exist
        try:
            category_ids = await self._ensure_kids_categories()
        except Exception as e:
            return {
                "message": "Failed to create kids categories",
                "error": str(e),
            }

        for item in KIDS_CONTENT_SEED:
            try:
                # Apply filters
                if age_max and item.get("age_rating", 0) > age_max:
                    skipped_count += 1
                    continue

                if categories and item.get("category_key") not in categories:
                    skipped_count += 1
                    continue

                # Check if content already exists (by title)
                existing = await Content.find_one({"title": item["title"]})
                if existing:
                    skipped_count += 1
                    continue

                category_key = item.get("category_key", "educational")
                category_id = category_ids.get(category_key)

                if not category_id:
                    errors.append(f"Unknown category: {category_key}")
                    continue

                # Create new content entry
                content = Content(
                    title=item["title"],
                    title_en=item.get("title_en"),
                    title_es=item.get("title_es"),
                    description=item.get("description"),
                    description_en=item.get("description_en"),
                    category_id=category_id,
                    category_name=category_key,
                    duration=item.get("duration"),
                    thumbnail=self._youtube_to_thumbnail(item["youtube_id"]),
                    backdrop=self._youtube_to_thumbnail(item["youtube_id"]),
                    stream_url=self._youtube_to_stream_url(item["youtube_id"]),
                    content_type="vod",
                    # Kids-specific fields
                    is_kids_content=True,
                    age_rating=item.get("age_rating", 3),
                    content_rating=item.get("content_rating", "G"),
                    educational_tags=item.get("educational_tags", []),
                    # Visibility
                    is_published=True,
                    is_featured=seeded_count < 6,  # First 6 are featured
                    requires_subscription="basic",  # Kids content on basic tier
                    # Timestamps
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow(),
                )

                await content.insert()
                seeded_count += 1
                logger.info(f"Seeded kids content: {item['title']}")

            except Exception as e:
                errors.append(f"Error seeding {item.get('title', 'unknown')}: {str(e)}")
                logger.error(f"Error seeding content: {e}")

        return {
            "message": "Kids content seeding completed",
            "seeded": seeded_count,
            "skipped": skipped_count,
            "errors": errors,
            "total_available": len(KIDS_CONTENT_SEED),
            "categories_created": list(category_ids.keys()),
        }

    async def clear_kids_content(self) -> Dict[str, Any]:
        """
        Remove all seeded kids content.

        This removes content marked as is_kids_content=True.
        """
        result = await Content.find({"is_kids_content": True}).delete()
        deleted_count = result.deleted_count if result else 0

        return {
            "message": "Kids content cleared",
            "deleted": deleted_count,
        }

    async def get_seeding_stats(self) -> Dict[str, Any]:
        """Get current kids content statistics."""
        total = await Content.find({"is_kids_content": True}).count()

        by_category = {}
        for category_key in KIDS_CATEGORIES.keys():
            count = await Content.find({
                "is_kids_content": True,
                "category_name": category_key,
            }).count()
            by_category[category_key] = count

        by_age = {}
        for age in [3, 5, 7, 10, 12]:
            count = await Content.find({
                "is_kids_content": True,
                "age_rating": {"$lte": age},
            }).count()
            by_age[f"age_{age}_and_under"] = count

        return {
            "total_kids_content": total,
            "by_category": by_category,
            "by_age_rating": by_age,
            "seed_data_available": len(KIDS_CONTENT_SEED),
        }


# Global service instance
kids_content_seeder = KidsContentSeeder()
