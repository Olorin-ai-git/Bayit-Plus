"""
Content Taxonomy Migration Service

This service handles:
1. Seeding initial sections, genres, audiences, and subcategories
2. Migrating existing content from legacy categories to new taxonomy
3. Verifying migration status

The migration is designed to be idempotent - can be run multiple times safely.
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple

from app.models.content import Content, Category
from app.models.content_taxonomy import (
    ContentSection,
    SectionSubcategory,
    Genre,
    Audience,
)

logger = logging.getLogger(__name__)


# ============================================================================
# SEED DATA DEFINITIONS
# ============================================================================

SECTIONS_SEED_DATA = [
    {
        "slug": "movies",
        "name": "סרטים",
        "name_en": "Movies",
        "name_es": "Películas",
        "description": "צפו בסרטים מובחרים",
        "description_en": "Watch premium movies",
        "description_es": "Ver películas premium",
        "icon": "film",
        "color": "#E50914",
        "order": 1,
        "show_on_homepage": True,
        "show_on_nav": True,
        "supports_subcategories": False,
        "default_content_format": "movie",
    },
    {
        "slug": "series",
        "name": "סדרות",
        "name_en": "Series",
        "name_es": "Series",
        "description": "צפו בסדרות טלוויזיה",
        "description_en": "Watch TV series",
        "description_es": "Ver series de televisión",
        "icon": "tv",
        "color": "#1DB954",
        "order": 2,
        "show_on_homepage": True,
        "show_on_nav": True,
        "supports_subcategories": False,
        "default_content_format": "series",
    },
    {
        "slug": "kids",
        "name": "ילדים",
        "name_en": "Kids",
        "name_es": "Niños",
        "description": "תוכן בטוח לילדים",
        "description_en": "Safe content for children",
        "description_es": "Contenido seguro para niños",
        "icon": "child",
        "color": "#FFD700",
        "order": 3,
        "show_on_homepage": True,
        "show_on_nav": True,
        "supports_subcategories": True,
        "default_content_format": None,
    },
    {
        "slug": "judaism",
        "name": "יהדות",
        "name_en": "Judaism",
        "name_es": "Judaísmo",
        "description": "תוכן יהודי ותורני",
        "description_en": "Jewish and Torah content",
        "description_es": "Contenido judío y de la Torá",
        "icon": "star-of-david",
        "color": "#0066CC",
        "order": 4,
        "show_on_homepage": True,
        "show_on_nav": True,
        "supports_subcategories": True,
        "default_content_format": None,
    },
    {
        "slug": "documentaries",
        "name": "דוקומנטרי",
        "name_en": "Documentaries",
        "name_es": "Documentales",
        "description": "סרטים תיעודיים",
        "description_en": "Documentary films",
        "description_es": "Películas documentales",
        "icon": "book-open",
        "color": "#8B4513",
        "order": 5,
        "show_on_homepage": True,
        "show_on_nav": True,
        "supports_subcategories": False,
        "default_content_format": "documentary",
    },
    {
        "slug": "live",
        "name": "שידור חי",
        "name_en": "Live TV",
        "name_es": "TV en Vivo",
        "description": "ערוצי טלוויזיה בשידור חי",
        "description_en": "Live television channels",
        "description_es": "Canales de televisión en vivo",
        "icon": "broadcast",
        "color": "#FF0000",
        "order": 6,
        "show_on_homepage": False,
        "show_on_nav": True,
        "supports_subcategories": False,
        "default_content_format": None,
    },
]

KIDS_SUBCATEGORIES_SEED_DATA = [
    {
        "slug": "cartoons",
        "name": "קריקטורות",
        "name_en": "Cartoons",
        "name_es": "Dibujos Animados",
        "order": 1,
    },
    {
        "slug": "educational",
        "name": "לימודי",
        "name_en": "Educational",
        "name_es": "Educativo",
        "order": 2,
    },
    {
        "slug": "music",
        "name": "מוזיקה",
        "name_en": "Music",
        "name_es": "Música",
        "order": 3,
    },
    {
        "slug": "hebrew-learning",
        "name": "לימוד עברית",
        "name_en": "Hebrew Learning",
        "name_es": "Aprendizaje de Hebreo",
        "order": 4,
    },
    {
        "slug": "stories",
        "name": "סיפורים",
        "name_en": "Stories",
        "name_es": "Historias",
        "order": 5,
    },
    {
        "slug": "jewish-kids",
        "name": "יהדות לילדים",
        "name_en": "Jewish Kids",
        "name_es": "Judaísmo para Niños",
        "order": 6,
    },
]

JUDAISM_SUBCATEGORIES_SEED_DATA = [
    {
        "slug": "shiurim",
        "name": "שיעורים",
        "name_en": "Torah Classes",
        "name_es": "Clases de Torá",
        "order": 1,
    },
    {
        "slug": "tefila",
        "name": "תפילה",
        "name_en": "Prayer",
        "name_es": "Oración",
        "order": 2,
    },
    {
        "slug": "jewish-music",
        "name": "מוזיקה יהודית",
        "name_en": "Jewish Music",
        "name_es": "Música Judía",
        "order": 3,
    },
    {
        "slug": "holidays",
        "name": "חגים",
        "name_en": "Holidays",
        "name_es": "Festividades",
        "order": 4,
    },
    {
        "slug": "jewish-docs",
        "name": "דוקומנטרים",
        "name_en": "Documentaries",
        "name_es": "Documentales",
        "order": 5,
    },
]

GENRES_SEED_DATA = [
    {"slug": "drama", "name": "דרמה", "name_en": "Drama", "name_es": "Drama", "tmdb_id": 18, "order": 1},
    {"slug": "comedy", "name": "קומדיה", "name_en": "Comedy", "name_es": "Comedia", "tmdb_id": 35, "order": 2},
    {"slug": "action", "name": "אקשן", "name_en": "Action", "name_es": "Acción", "tmdb_id": 28, "order": 3},
    {"slug": "thriller", "name": "מתח", "name_en": "Thriller", "name_es": "Suspenso", "tmdb_id": 53, "order": 4},
    {"slug": "horror", "name": "אימה", "name_en": "Horror", "name_es": "Terror", "tmdb_id": 27, "order": 5},
    {"slug": "romance", "name": "רומנטי", "name_en": "Romance", "name_es": "Romance", "tmdb_id": 10749, "order": 6},
    {"slug": "animation", "name": "אנימציה", "name_en": "Animation", "name_es": "Animación", "tmdb_id": 16, "order": 7},
    {"slug": "documentary", "name": "דוקומנטרי", "name_en": "Documentary", "name_es": "Documental", "tmdb_id": 99, "order": 8},
    {"slug": "family", "name": "משפחה", "name_en": "Family", "name_es": "Familia", "tmdb_id": 10751, "order": 9},
    {"slug": "adventure", "name": "הרפתקאות", "name_en": "Adventure", "name_es": "Aventura", "tmdb_id": 12, "order": 10},
    {"slug": "sci-fi", "name": "מדע בדיוני", "name_en": "Sci-Fi", "name_es": "Ciencia Ficción", "tmdb_id": 878, "order": 11},
    {"slug": "fantasy", "name": "פנטזיה", "name_en": "Fantasy", "name_es": "Fantasía", "tmdb_id": 14, "order": 12},
    {"slug": "crime", "name": "פשע", "name_en": "Crime", "name_es": "Crimen", "tmdb_id": 80, "order": 13},
    {"slug": "mystery", "name": "מסתורין", "name_en": "Mystery", "name_es": "Misterio", "tmdb_id": 9648, "order": 14},
    {"slug": "war", "name": "מלחמה", "name_en": "War", "name_es": "Guerra", "tmdb_id": 10752, "order": 15},
    {"slug": "history", "name": "היסטוריה", "name_en": "History", "name_es": "Historia", "tmdb_id": 36, "order": 16},
    {"slug": "music", "name": "מוזיקה", "name_en": "Music", "name_es": "Música", "tmdb_id": 10402, "order": 17},
    {"slug": "western", "name": "מערבון", "name_en": "Western", "name_es": "Western", "tmdb_id": 37, "order": 18},
]

AUDIENCES_SEED_DATA = [
    {
        "slug": "general",
        "name": "כללי",
        "name_en": "General",
        "name_es": "General",
        "description": "מתאים לכל הגילאים",
        "description_en": "Suitable for all ages",
        "description_es": "Apto para todas las edades",
        "min_age": None,
        "max_age": None,
        "content_ratings": ["G", "PG"],
        "order": 1,
    },
    {
        "slug": "kids",
        "name": "ילדים",
        "name_en": "Kids",
        "name_es": "Niños",
        "description": "תוכן לילדים עד גיל 12",
        "description_en": "Content for children up to age 12",
        "description_es": "Contenido para niños hasta 12 años",
        "min_age": None,
        "max_age": 12,
        "content_ratings": ["G", "TV-Y", "TV-Y7"],
        "order": 2,
    },
    {
        "slug": "family",
        "name": "משפחה",
        "name_en": "Family",
        "name_es": "Familia",
        "description": "מתאים לצפייה משפחתית",
        "description_en": "Suitable for family viewing",
        "description_es": "Apto para ver en familia",
        "min_age": None,
        "max_age": None,
        "content_ratings": ["G", "PG", "PG-13", "TV-G", "TV-PG"],
        "order": 3,
    },
    {
        "slug": "mature",
        "name": "בוגרים",
        "name_en": "Mature",
        "name_es": "Adultos",
        "description": "תוכן לבוגרים בלבד",
        "description_en": "Content for adults only",
        "description_es": "Contenido solo para adultos",
        "min_age": 18,
        "max_age": None,
        "content_ratings": ["R", "NC-17", "TV-MA"],
        "order": 4,
    },
]

# ============================================================================
# LEGACY CATEGORY MAPPINGS
# ============================================================================

LEGACY_CATEGORY_TO_SECTION_MAP: Dict[str, str] = {
    # Hebrew category names -> section slug
    "סרטים": "movies",
    "קומדיה": "movies",
    "דרמה": "movies",
    "אקשן": "movies",
    "מתח": "movies",
    "רומנטי": "movies",
    "סדרות": "series",
    "ילדים": "kids",
    "לילדים": "kids",
    "לנוער": "kids",
    "יהדות": "judaism",
    "תורה": "judaism",
    "שיעורים": "judaism",
    "תפילה": "judaism",
    "דוקומנטרי": "documentaries",
    "דוקומנטרים": "documentaries",
    # English category names -> section slug
    "Movies": "movies",
    "movies": "movies",
    "Comedy": "movies",
    "Drama": "movies",
    "Action": "movies",
    "Thriller": "movies",
    "Romance": "movies",
    "Series": "series",
    "series": "series",
    "tv shows": "series",
    "shows": "series",
    "Kids": "kids",
    "kids": "kids",
    "Judaism": "judaism",
    "judaism": "judaism",
    "Documentaries": "documentaries",
    "documentaries": "documentaries",
}

LEGACY_CATEGORY_TO_GENRE_MAP: Dict[str, str] = {
    # Hebrew category names that are actually genres -> genre slug
    "קומדיה": "comedy",
    "דרמה": "drama",
    "אקשן": "action",
    "מתח": "thriller",
    "רומנטי": "romance",
    "אנימציה": "animation",
    "מדע בדיוני": "sci-fi",
    # English
    "Comedy": "comedy",
    "Drama": "drama",
    "Action": "action",
    "Thriller": "thriller",
    "Romance": "romance",
    "Animation": "animation",
    "Sci-Fi": "sci-fi",
}


# ============================================================================
# SEEDING FUNCTIONS
# ============================================================================

async def seed_sections() -> Dict[str, str]:
    """
    Seed content sections.
    Returns mapping of slug -> section_id.
    """
    section_map = {}

    for data in SECTIONS_SEED_DATA:
        existing = await ContentSection.find_one(ContentSection.slug == data["slug"])

        if existing:
            section_map[data["slug"]] = str(existing.id)
            logger.info(f"Section '{data['slug']}' already exists")
            continue

        section = ContentSection(**data)
        await section.insert()
        section_map[data["slug"]] = str(section.id)
        logger.info(f"Created section '{data['slug']}'")

    return section_map


async def seed_subcategories(section_map: Dict[str, str]) -> Dict[str, str]:
    """
    Seed section subcategories.
    Returns mapping of "{section_slug}:{subcategory_slug}" -> subcategory_id.
    """
    subcategory_map = {}

    # Kids subcategories
    kids_section_id = section_map.get("kids")
    if kids_section_id:
        for data in KIDS_SUBCATEGORIES_SEED_DATA:
            key = f"kids:{data['slug']}"
            existing = await SectionSubcategory.find_one(
                SectionSubcategory.section_id == kids_section_id,
                SectionSubcategory.slug == data["slug"],
            )

            if existing:
                subcategory_map[key] = str(existing.id)
                logger.info(f"Subcategory '{key}' already exists")
                continue

            subcategory = SectionSubcategory(section_id=kids_section_id, **data)
            await subcategory.insert()
            subcategory_map[key] = str(subcategory.id)
            logger.info(f"Created subcategory '{key}'")

    # Judaism subcategories
    judaism_section_id = section_map.get("judaism")
    if judaism_section_id:
        for data in JUDAISM_SUBCATEGORIES_SEED_DATA:
            key = f"judaism:{data['slug']}"
            existing = await SectionSubcategory.find_one(
                SectionSubcategory.section_id == judaism_section_id,
                SectionSubcategory.slug == data["slug"],
            )

            if existing:
                subcategory_map[key] = str(existing.id)
                logger.info(f"Subcategory '{key}' already exists")
                continue

            subcategory = SectionSubcategory(section_id=judaism_section_id, **data)
            await subcategory.insert()
            subcategory_map[key] = str(subcategory.id)
            logger.info(f"Created subcategory '{key}'")

    return subcategory_map


async def seed_genres() -> Dict[str, str]:
    """
    Seed genres.
    Returns mapping of slug -> genre_id.
    """
    genre_map = {}

    for data in GENRES_SEED_DATA:
        existing = await Genre.find_one(Genre.slug == data["slug"])

        if existing:
            genre_map[data["slug"]] = str(existing.id)
            logger.info(f"Genre '{data['slug']}' already exists")
            continue

        genre = Genre(**data)
        await genre.insert()
        genre_map[data["slug"]] = str(genre.id)
        logger.info(f"Created genre '{data['slug']}'")

    return genre_map


async def seed_audiences() -> Dict[str, str]:
    """
    Seed audience classifications.
    Returns mapping of slug -> audience_id.
    """
    audience_map = {}

    for data in AUDIENCES_SEED_DATA:
        existing = await Audience.find_one(Audience.slug == data["slug"])

        if existing:
            audience_map[data["slug"]] = str(existing.id)
            logger.info(f"Audience '{data['slug']}' already exists")
            continue

        audience = Audience(**data)
        await audience.insert()
        audience_map[data["slug"]] = str(audience.id)
        logger.info(f"Created audience '{data['slug']}'")

    return audience_map


async def seed_all_taxonomy() -> Tuple[Dict[str, str], Dict[str, str], Dict[str, str], Dict[str, str]]:
    """
    Seed all taxonomy data.
    Returns (section_map, subcategory_map, genre_map, audience_map).
    """
    logger.info("Starting taxonomy seed...")

    section_map = await seed_sections()
    subcategory_map = await seed_subcategories(section_map)
    genre_map = await seed_genres()
    audience_map = await seed_audiences()

    logger.info("Taxonomy seed complete")
    return section_map, subcategory_map, genre_map, audience_map


# ============================================================================
# MIGRATION FUNCTIONS
# ============================================================================

async def migrate_content_to_new_taxonomy(
    section_map: Dict[str, str],
    genre_map: Dict[str, str],
    audience_map: Dict[str, str],
    batch_size: int = 100,
    dry_run: bool = False,
) -> Dict[str, int]:
    """
    Migrate existing content from legacy categories to new taxonomy.

    Args:
        section_map: Mapping of section slug -> section_id
        genre_map: Mapping of genre slug -> genre_id
        audience_map: Mapping of audience slug -> audience_id
        batch_size: Number of items to process at a time
        dry_run: If True, only log changes without saving

    Returns:
        Migration statistics
    """
    stats = {
        "total": 0,
        "migrated": 0,
        "already_migrated": 0,
        "skipped": 0,
        "errors": 0,
    }

    # Get all content without new taxonomy fields populated
    skip = 0

    while True:
        # Find content that hasn't been migrated yet
        content_items = await Content.find(
            {"$or": [
                {"section_ids": {"$exists": False}},
                {"section_ids": {"$size": 0}},
                {"primary_section_id": None},
                {"primary_section_id": {"$exists": False}},
            ]}
        ).skip(skip).limit(batch_size).to_list()

        if not content_items:
            break

        for item in content_items:
            stats["total"] += 1

            try:
                # Check if already migrated
                existing_sections = getattr(item, "section_ids", []) or []
                if existing_sections and getattr(item, "primary_section_id", None):
                    stats["already_migrated"] += 1
                    continue

                # Determine section from legacy category
                category_name = item.category_name or ""
                section_slug = _determine_section_from_category(item)

                if not section_slug:
                    logger.warning(f"Could not determine section for content {item.id}: {category_name}")
                    stats["skipped"] += 1
                    continue

                section_id = section_map.get(section_slug)
                if not section_id:
                    logger.warning(f"Section '{section_slug}' not found for content {item.id}")
                    stats["skipped"] += 1
                    continue

                # Build update data
                update_data = {
                    "section_ids": [section_id],
                    "primary_section_id": section_id,
                    "updated_at": datetime.utcnow(),
                }

                # Determine content format
                content_format = _determine_content_format(item)
                if content_format:
                    update_data["content_format"] = content_format

                # Determine audience
                audience_slug = _determine_audience(item)
                if audience_slug and audience_slug in audience_map:
                    update_data["audience_id"] = audience_map[audience_slug]

                # Map genres
                genre_ids = _map_genres_to_ids(item, genre_map)
                if genre_ids:
                    update_data["genre_ids"] = genre_ids

                # Determine topic tags
                topic_tags = _determine_topic_tags(item)
                if topic_tags:
                    update_data["topic_tags"] = topic_tags

                if dry_run:
                    logger.info(f"[DRY RUN] Would update content {item.id}: {update_data}")
                else:
                    await item.set(update_data)
                    logger.debug(f"Migrated content {item.id} to section '{section_slug}'")

                stats["migrated"] += 1

            except Exception as e:
                logger.error(f"Error migrating content {item.id}: {e}")
                stats["errors"] += 1

        skip += batch_size
        logger.info(f"Processed {skip} items...")

    return stats


def _determine_section_from_category(item: Content) -> Optional[str]:
    """Determine section slug from legacy category data."""
    category_name = item.category_name or ""

    # Direct mapping
    if category_name in LEGACY_CATEGORY_TO_SECTION_MAP:
        return LEGACY_CATEGORY_TO_SECTION_MAP[category_name]

    # Check is_series flag
    if getattr(item, "is_series", False):
        return "series"

    # Check is_kids_content flag
    if getattr(item, "is_kids_content", False):
        return "kids"

    # Check content_type
    content_type = getattr(item, "content_type", "") or ""
    if content_type == "documentary":
        return "documentaries"
    if content_type == "series":
        return "series"
    if content_type == "movie":
        return "movies"

    # Default to movies for unknown categories
    return "movies"


def _determine_content_format(item: Content) -> Optional[str]:
    """Determine content format from item data."""
    # Check existing content_type
    content_type = getattr(item, "content_type", None)
    if content_type in ["movie", "series", "documentary", "short", "clip"]:
        return content_type

    # Check is_series flag
    if getattr(item, "is_series", False):
        return "series"

    # Check category name for documentary
    category_name = (item.category_name or "").lower()
    if "דוקומנטרי" in category_name or "documentary" in category_name:
        return "documentary"

    # Default to movie
    return "movie"


def _determine_audience(item: Content) -> Optional[str]:
    """Determine audience slug from item data."""
    # Check is_kids_content
    if getattr(item, "is_kids_content", False):
        return "kids"

    # Check content_rating
    content_rating = getattr(item, "content_rating", "") or ""
    if content_rating in ["G", "TV-Y", "TV-Y7"]:
        return "kids"
    if content_rating in ["PG", "TV-G", "TV-PG"]:
        return "family"
    if content_rating in ["R", "NC-17", "TV-MA"]:
        return "mature"

    # Check age_rating
    age_rating = getattr(item, "age_rating", None)
    if age_rating is not None:
        if age_rating <= 7:
            return "kids"
        if age_rating <= 13:
            return "family"
        if age_rating >= 18:
            return "mature"

    return "general"


def _map_genres_to_ids(item: Content, genre_map: Dict[str, str]) -> List[str]:
    """Map item's genre data to genre IDs."""
    genre_ids = []

    # Check genres list (from TMDB)
    genres = getattr(item, "genres", None) or []
    for genre_name in genres:
        genre_name_lower = genre_name.lower()
        for slug, genre_id in genre_map.items():
            if slug == genre_name_lower or genre_name_lower in slug:
                genre_ids.append(genre_id)
                break

    # Check legacy genre field
    genre = getattr(item, "genre", None)
    if genre:
        genre_slug = LEGACY_CATEGORY_TO_GENRE_MAP.get(genre)
        if genre_slug and genre_slug in genre_map:
            genre_id = genre_map[genre_slug]
            if genre_id not in genre_ids:
                genre_ids.append(genre_id)

    # Check category name for genre hints
    category_name = item.category_name or ""
    if category_name in LEGACY_CATEGORY_TO_GENRE_MAP:
        genre_slug = LEGACY_CATEGORY_TO_GENRE_MAP[category_name]
        if genre_slug in genre_map:
            genre_id = genre_map[genre_slug]
            if genre_id not in genre_ids:
                genre_ids.append(genre_id)

    return genre_ids


def _determine_topic_tags(item: Content) -> List[str]:
    """Determine topic tags from item data."""
    tags = []

    # Check educational_tags
    educational_tags = getattr(item, "educational_tags", []) or []
    if educational_tags:
        tags.extend(educational_tags)

    # Check category for Jewish content
    category_name = (item.category_name or "").lower()
    if any(kw in category_name for kw in ["יהדות", "judaism", "תורה", "torah"]):
        if "jewish" not in tags:
            tags.append("jewish")

    # Check is_kids_content for educational
    if getattr(item, "is_kids_content", False):
        if "educational" not in tags and educational_tags:
            tags.append("educational")

    return tags


# ============================================================================
# VERIFICATION FUNCTIONS
# ============================================================================

async def get_migration_status() -> Dict:
    """Get current migration status."""
    total_content = await Content.count()

    # Count migrated content
    migrated = await Content.find(
        {"section_ids": {"$exists": True, "$ne": []}}
    ).count()

    # Count by section
    sections = await ContentSection.find().to_list()
    section_counts = {}
    for section in sections:
        section_id = str(section.id)
        count = await Content.find({"section_ids": section_id}).count()
        section_counts[section.slug] = count

    return {
        "total_content": total_content,
        "migrated_content": migrated,
        "pending_migration": total_content - migrated,
        "migration_percentage": round((migrated / total_content * 100) if total_content > 0 else 0, 2),
        "content_by_section": section_counts,
    }


async def run_full_migration(dry_run: bool = False) -> Dict:
    """
    Run complete migration: seed taxonomy and migrate content.

    Args:
        dry_run: If True, only log changes without saving

    Returns:
        Migration results
    """
    logger.info(f"Starting full migration (dry_run={dry_run})...")

    # Seed taxonomy
    section_map, subcategory_map, genre_map, audience_map = await seed_all_taxonomy()

    # Migrate content
    migration_stats = await migrate_content_to_new_taxonomy(
        section_map=section_map,
        genre_map=genre_map,
        audience_map=audience_map,
        dry_run=dry_run,
    )

    # Get final status
    status = await get_migration_status()

    return {
        "seed_results": {
            "sections": len(section_map),
            "subcategories": len(subcategory_map),
            "genres": len(genre_map),
            "audiences": len(audience_map),
        },
        "migration_stats": migration_stats,
        "final_status": status,
    }
