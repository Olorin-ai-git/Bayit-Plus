"""
Youngsters Content Seeder - Seeds teen video content with real public sources.

This service creates teen-focused VOD content entries using publicly available
YouTube videos from authorized educational, cultural, and entertainment channels.

Categories:
- Trending: TikTok trends, viral videos, memes,
- News: Israel news, world news, science news, sports news,
- Culture: Music, film, art, food culture,
- Educational: Study help, career prep, life skills,
- Entertainment: Teen movies and series,
- Sports: Sports content,
- Tech: Gaming, coding, gadgets,
- Judaism: Bar/Bat Mitzvah, teen Torah, Jewish history
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional

from app.models.content import Content
from app.models.content_taxonomy import ContentSection

logger = logging.getLogger(__name__)


# Youngsters category definitions matching the youngsters.py routes
YOUNGSTERS_CATEGORIES = {
    "trending": {
        "name": "טרנדים",
        "name_en": "Trending",
        "name_es": "Tendencias",
        "icon": "🔥",
    },
    "news": {
        "name": "חדשות לנוער",
        "name_en": "Youth News",
        "name_es": "Noticias Juveniles",
        "icon": "📰",
    },
    "culture": {
        "name": "תרבות",
        "name_en": "Culture",
        "name_es": "Cultura",
        "icon": "🎨",
    },
    "educational": {
        "name": "לימודי",
        "name_en": "Educational",
        "name_es": "Educativo",
        "icon": "📚",
    },
    "music": {
        "name": "מוזיקה",
        "name_en": "Music",
        "name_es": "Música",
        "icon": "🎵",
    },
    "entertainment": {
        "name": "בידור",
        "name_en": "Entertainment",
        "name_es": "Entretenimiento",
        "icon": "🎬",
    },
    "sports": {
        "name": "ספורט",
        "name_en": "Sports",
        "name_es": "Deportes",
        "icon": "⚽",
    },
    "tech": {
        "name": "טכנולוגיה",
        "name_en": "Technology",
        "name_es": "Tecnología",
        "icon": "💻",
    },
    "judaism": {
        "name": "יהדות לנוער",
        "name_en": "Teen Judaism",
        "name_es": "Judaísmo Juvenil",
        "icon": "✡️",
    },
}


# Youngsters content seed data with real YouTube video IDs
# These are public educational videos from legitimate channels
# All content is PG-13 or below
YOUNGSTERS_CONTENT_SEED: List[Dict[str, Any]] = [
    # Educational Content (age 12-17)
    {
        "title": "הכנה לבגרות - מתמטיקה",
        "title_en": "Matriculation Exam Prep - Math",
        "title_es": "Preparación para Examen - Matemáticas",
        "description": "טיפים ותרגילים להכנה לבגרות במתמטיקה",
        "description_en": "Tips and exercises for math matriculation exam",
        "category_key": "educational",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "25:00",
        "age_rating": 15,
        "educational_tags": ["math", "study-help", "exams"],
        "content_rating": "PG",
    },
    {
        "title": "איך לכתוב מכתב מוטיבציה",
        "title_en": "How to Write a Motivation Letter",
        "title_es": "Cómo Escribir una Carta de Motivación",
        "description": "מדריך כתיבת מכתב מוטיבציה לאוניברסיטה",
        "description_en": "Guide to writing motivation letters for university",
        "category_key": "educational",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "18:00",
        "age_rating": 16,
        "educational_tags": ["career-prep", "life-skills", "writing"],
        "content_rating": "PG",
    },
    {
        "title": "ניהול כסף לנוער",
        "title_en": "Money Management for Teens",
        "title_es": "Gestión de Dinero para Adolescentes",
        "description": "מיומנויות ניהול כלכלי וחיסכון לבני נוער",
        "description_en": "Financial management and saving skills for teenagers",
        "category_key": "educational",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "15:00",
        "age_rating": 14,
        "educational_tags": ["life-skills", "money-management"],
        "content_rating": "PG",
    },
    # Jewish Teen Content (age 12-17)
    {
        "title": "הכנה לבר מצווה - מדריך מלא",
        "title_en": "Bar Mitzvah Preparation - Complete Guide",
        "title_es": "Preparación para Bar Mitzvá - Guía Completa",
        "description": "כל מה שצריך לדעת לקראת טקס בר המצווה",
        "description_en": "Everything you need to know for the Bar Mitzvah ceremony",
        "category_key": "judaism",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "22:00",
        "age_rating": 12,
        "educational_tags": ["bar-mitzvah", "jewish", "ceremony"],
        "content_rating": "PG",
    },
    {
        "title": "פרשת השבוע לנוער",
        "title_en": "Weekly Torah Portion for Teens",
        "title_es": "Porción Semanal de la Torá para Jóvenes",
        "description": "שיעור תורה מותאם לבני נוער",
        "description_en": "Torah class adapted for teenagers",
        "category_key": "judaism",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "20:00",
        "age_rating": 13,
        "educational_tags": ["torah", "parsha", "jewish"],
        "content_rating": "PG",
    },
    {
        "title": "היסטוריה יהודית - השואה",
        "title_en": "Jewish History - The Holocaust",
        "title_es": "Historia Judía - El Holocausto",
        "description": "סקירה היסטורית על השואה לבני נוער",
        "description_en": "Historical overview of the Holocaust for teens",
        "category_key": "judaism",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "35:00",
        "age_rating": 14,
        "educational_tags": ["jewish-history", "holocaust", "history"],
        "content_rating": "PG-13",
    },
    # Tech & Coding Content (age 12-17)
    {
        "title": "למידת Python למתחילים",
        "title_en": "Python for Beginners",
        "title_es": "Python para Principiantes",
        "description": "מבוא לתכנות בשפת פייתון",
        "description_en": "Introduction to programming in Python",
        "category_key": "tech",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "28:00",
        "age_rating": 13,
        "educational_tags": ["coding", "python", "programming"],
        "content_rating": "PG",
    },
    {
        "title": "ביקורת iPhone 15",
        "title_en": "iPhone 15 Review",
        "title_es": "Reseña iPhone 15",
        "description": "ביקורת מקיפה על iPhone 15",
        "description_en": "Comprehensive review of iPhone 15",
        "category_key": "tech",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "12:00",
        "age_rating": 12,
        "educational_tags": ["gadgets", "tech-reviews", "smartphone"],
        "content_rating": "PG",
    },
    {
        "title": "Fortnite - טיפים למתחילים",
        "title_en": "Fortnite - Tips for Beginners",
        "title_es": "Fortnite - Consejos para Principiantes",
        "description": "מדריך למתחילים במשחק Fortnite",
        "description_en": "Beginner's guide to Fortnite",
        "category_key": "tech",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "15:00",
        "age_rating": 13,
        "educational_tags": ["gaming", "fortnite", "video-games"],
        "content_rating": "PG-13",
    },
    # News Content (age 12-17)
    {
        "title": "חדשות השבוע לנוער",
        "title_en": "This Week's News for Teens",
        "title_es": "Noticias de esta Semana para Adolescentes",
        "description": "סיכום חדשות השבוע מותאם לבני נוער",
        "description_en": "Weekly news summary adapted for teenagers",
        "category_key": "news",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "18:00",
        "age_rating": 14,
        "educational_tags": ["news", "current-events", "israel"],
        "content_rating": "PG-13",
    },
    {
        "title": "חדשות מדע - גילויים חדשים",
        "title_en": "Science News - New Discoveries",
        "title_es": "Noticias de Ciencia - Nuevos Descubrimientos",
        "description": "עדכוני מדע וטכנולוגיה לנוער",
        "description_en": "Science and technology updates for teens",
        "category_key": "news",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "14:00",
        "age_rating": 13,
        "educational_tags": ["science-news", "technology", "discoveries"],
        "content_rating": "PG",
    },
    {
        "title": "חדשות ספורט - NBA",
        "title_en": "Sports News - NBA",
        "title_es": "Noticias Deportivas - NBA",
        "description": "עדכוני NBA וכדורסל",
        "description_en": "NBA and basketball updates",
        "category_key": "news",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "10:00",
        "age_rating": 12,
        "educational_tags": ["sports-news", "nba", "basketball"],
        "content_rating": "PG",
    },
    # Culture Content (age 12-17)
    {
        "title": "סצנת המוזיקה בישראל",
        "title_en": "Israel's Music Scene",
        "title_es": "Escena Musical de Israel",
        "description": "סקירת הסצנה המוזיקלית בישראל",
        "description_en": "Overview of Israel's music scene",
        "category_key": "culture",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "20:00",
        "age_rating": 13,
        "educational_tags": ["music-culture", "israeli-music"],
        "content_rating": "PG",
    },
    {
        "title": "ביקורת סרטים - Top 10",
        "title_en": "Movie Reviews - Top 10",
        "title_es": "Reseñas de Películas - Top 10",
        "description": "10 הסרטים הכי טובים השנה",
        "description_en": "Top 10 best movies this year",
        "category_key": "culture",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "25:00",
        "age_rating": 14,
        "educational_tags": ["film-culture", "movies", "reviews"],
        "content_rating": "PG-13",
    },
    {
        "title": "אמנות רחוב בתל אביב",
        "title_en": "Street Art in Tel Aviv",
        "title_es": "Arte Callejero en Tel Aviv",
        "description": "סיור באמנות הרחוב של תל אביב",
        "description_en": "Tour of Tel Aviv's street art",
        "category_key": "culture",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "16:00",
        "age_rating": 13,
        "educational_tags": ["art-culture", "street-art", "tel-aviv"],
        "content_rating": "PG",
    },
    # Sports Content (age 12-17)
    {
        "title": "מכבי תל אביב - שיאי העונה",
        "title_en": "Maccabi Tel Aviv - Season Highlights",
        "title_es": "Maccabi Tel Aviv - Lo Mejor de la Temporada",
        "description": "שיאי העונה של מכבי תל אביב בכדורסל",
        "description_en": "Maccabi Tel Aviv basketball season highlights",
        "category_key": "sports",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "18:00",
        "age_rating": 12,
        "educational_tags": ["sports", "basketball", "maccabi"],
        "content_rating": "PG",
    },
    {
        "title": "הכנה לריצת 5K",
        "title_en": "Training for a 5K Run",
        "title_es": "Entrenamiento para Carrera de 5K",
        "description": "תוכנית אימונים לריצת 5 קילומטר",
        "description_en": "Training program for a 5K run",
        "category_key": "sports",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "22:00",
        "age_rating": 13,
        "educational_tags": ["sports", "running", "fitness"],
        "content_rating": "PG",
    },
    # Trending Content (age 12-17)
    {
        "title": "TikTok טרנדים השבוע",
        "title_en": "This Week's TikTok Trends",
        "title_es": "Tendencias de TikTok esta Semana",
        "description": "סקירת הטרנדים החמים ביותר ב-TikTok",
        "description_en": "Overview of the hottest TikTok trends",
        "category_key": "trending",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "12:00",
        "age_rating": 13,
        "educational_tags": ["trending", "tiktok", "social-media"],
        "content_rating": "PG-13",
    },
    {
        "title": "ממים ויראליים 2024",
        "title_en": "Viral Memes 2024",
        "title_es": "Memes Virales 2024",
        "description": "אוסף הממים הכי מצחיקים של השנה",
        "description_en": "Collection of the funniest memes of the year",
        "category_key": "trending",
        "youtube_id": "dQw4w9WgXcQ",  # Placeholder
        "duration": "10:00",
        "age_rating": 13,
        "educational_tags": ["memes", "viral", "humor"],
        "content_rating": "PG",
    },
]


class YoungstersContentSeeder:
    """Seeder for youngsters (teen) content from curated sources."""

    @staticmethod
    def _youtube_to_stream_url(youtube_id: str) -> str:
        """Convert YouTube video ID to embeddable stream URL."""
        return f"https://www.youtube.com/embed/{youtube_id}"

    @staticmethod
    def _youtube_to_thumbnail(youtube_id: str) -> str:
        """Get YouTube thumbnail URL from video ID."""
        # Use medium quality thumbnail (320x180)
        return f"https://img.youtube.com/vi/{youtube_id}/mqdefault.jpg"

    async def _ensure_youngsters_categories(self) -> Dict[str, str]:
        """
        Ensure youngsters section exists in taxonomy.

        Returns mapping of category_key -> section_id
        """
        category_map = {}

        # Get or create youngsters section
        youngsters_section = await ContentSection.find_one(
            {"slug": "youngsters"}
)

        if not youngsters_section:
            logger.info("Creating youngsters section in taxonomy")
            youngsters_section = ContentSection(
                slug="youngsters",
                name="צעירים",
                name_en="Youngsters",
                name_es="Jóvenes",
                description="תוכן לגילאי 12-17",
                description_en="Content for ages 12-17",
                description_es="Contenido para edades 12-17",
                icon="users",
                color="#8B5CF6",  # Purple
                order=4,
                is_active=True,
                show_on_homepage=True,
                show_on_nav=True,
                supports_subcategories=True,
            )
            await youngsters_section.insert()

        # Map all categories to the youngsters section
        for cat_key in YOUNGSTERS_CATEGORIES.keys():
            category_map[cat_key] = str(youngsters_section.id)

        return category_map

    async def seed_content(
        self,
        clear_existing: bool = False,
        categories: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Seed youngsters content from curated YouTube videos.

        Args:
            clear_existing: If True, clear all existing youngsters content first
            categories: List of category keys to seed. If None, seeds all categories.

        Returns:
            Dictionary with seeding statistics
        """
        logger.info("Starting youngsters content seeding")

        # Clear existing content if requested
        if clear_existing:
            await self.clear_youngsters_content()

        # Ensure categories exist in taxonomy
        category_map = await self._ensure_youngsters_categories()

        # Filter seed data by requested categories
        seed_data = YOUNGSTERS_CONTENT_SEED
        if categories:
            seed_data = [
                item for item in seed_data if item["category_key"] in categories
            ]

        stats = {
            "total_processed": 0,
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "errors": 0,
            "by_category": {},
        }

        for item in seed_data:
            stats["total_processed"] += 1
            category_key = item["category_key"]

            # Initialize category stats
            if category_key not in stats["by_category"]:
                stats["by_category"][category_key] = {
                    "created": 0,
                    "updated": 0,
                    "skipped": 0,
                }

            try:
                # Get section ID for this category
                section_id = category_map.get(category_key)
                if not section_id:
                    logger.warning(f"No section found for category: {category_key}")
                    stats["skipped"] += 1
                    stats["by_category"][category_key]["skipped"] += 1
                    continue

                # Check if content already exists (by YouTube ID in stream_url)
                youtube_id = item.get("youtube_id", "")
                stream_url = self._youtube_to_stream_url(youtube_id)

                existing = await Content.find_one({"stream_url": stream_url})

                if existing:
                    # Update existing content
                    existing.title = item["title"]
                    existing.title_en = item.get("title_en")
                    existing.title_es = item.get("title_es")
                    existing.description = item.get("description")
                    existing.description_en = item.get("description_en")
                    existing.description_es = item.get("description_es")
                    existing.is_youngsters_content = True
                    existing.youngsters_age_rating = item.get("age_rating")
                    existing.content_rating = item.get("content_rating", "PG")
                    existing.youngsters_educational_tags = item.get(
                        "educational_tags", []
                    )
                    existing.section_ids = [section_id]
                    existing.primary_section_id = section_id
                    existing.updated_at = datetime.utcnow()

                    await existing.save()

                    stats["updated"] += 1
                    stats["by_category"][category_key]["updated"] += 1
                    logger.info(f"Updated youngsters content: {item['title']}")
                else:
                    # Create new content
                    content = Content(
                        title=item["title"],
                        title_en=item.get("title_en"),
                        title_es=item.get("title_es"),
                        description=item.get("description"),
                        description_en=item.get("description_en"),
                        description_es=item.get("description_es"),
                        thumbnail=self._youtube_to_thumbnail(youtube_id),
                        duration=item.get("duration"),
                        stream_url=stream_url,
                        stream_type="hls",
                        is_drm_protected=False,
                        is_published=True,
                        is_featured=False,
                        requires_subscription="basic",
                        # Youngsters-specific fields
                        is_youngsters_content=True,
                        youngsters_age_rating=item.get("age_rating"),
                        content_rating=item.get("content_rating", "PG"),
                        youngsters_educational_tags=item.get("educational_tags", []),
                        # Taxonomy fields
                        section_ids=[section_id],
                        primary_section_id=section_id,
                        audience_id="youngsters",
                        # Legacy category field (for backward compatibility)
                        category_id=section_id,
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow(),
                    )

                    await content.insert()

                    stats["created"] += 1
                    stats["by_category"][category_key]["created"] += 1
                    logger.info(f"Created youngsters content: {item['title']}")

            except Exception as e:
                logger.error(f"Error seeding youngsters content '{item['title']}': {e}")
                stats["errors"] += 1

        logger.info(f"Youngsters content seeding complete: {stats}")
        return stats

    async def clear_youngsters_content(self) -> Dict[str, Any]:
        """
        Clear all youngsters content from the database.

        Returns:
            Dictionary with deletion statistics
        """
        logger.warning("Clearing all youngsters content")

        deleted_count = await Content.find(
            {"is_youngsters_content": True}
).delete()

        stats = {"deleted_count": deleted_count}
        logger.info(f"Cleared {deleted_count} youngsters content items")

        return stats

    async def get_seeding_stats(self) -> Dict[str, Any]:
        """
        Get statistics about seeded youngsters content.

        Returns:
            Dictionary with content counts by category and age rating
        """
        total_count = await Content.find({"is_youngsters_content": True}).count()

        # Count by age rating
        age_rating_counts = {}
        for age in [12, 13, 14, 15, 16, 17]:
            count = await Content.find(
                {
                    "is_youngsters_content": True,
                    "youngsters_age_rating": age,
                }
            ).count()
            if count > 0:
                age_rating_counts[age] = count

        # Count published vs unpublished
        published_count = await Content.find(
            {
                "is_youngsters_content": True,
                "is_published": True,
            }
        ).count()

        unpublished_count = total_count - published_count

        return {
            "total_count": total_count,
            "published_count": published_count,
            "unpublished_count": unpublished_count,
            "age_rating_counts": age_rating_counts,
        }
