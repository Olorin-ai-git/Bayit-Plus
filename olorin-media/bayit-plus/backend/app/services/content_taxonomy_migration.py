"""
Content Taxonomy Migration Service

Handles seeding taxonomy and migrating existing content from legacy categories.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional

from app.models.content import Content
from app.models.content_taxonomy import ContentSection, SectionSubcategory

logger = logging.getLogger(__name__)


# Kids subcategory seed data using i18n translation keys
# Translations are in shared/i18n/locales/{lang}.json under taxonomy.subcategories.*
KIDS_SUBCATEGORIES_SEED_DATA = [
    # Educational subcategories
    {
        "slug": "learning-hebrew",
        "name_key": "taxonomy.subcategories.learning-hebrew",
        "description_key": "taxonomy.subcategories.learning-hebrew.description",
        "icon": "book-open",
        "parent_section_slug": "kids",
        "parent_category": "educational",
        "min_age": 3,
        "max_age": 12,
        "order": 1,
    },
    {
        "slug": "young-science",
        "name_key": "taxonomy.subcategories.young-science",
        "description_key": "taxonomy.subcategories.young-science.description",
        "icon": "flask",
        "parent_section_slug": "kids",
        "parent_category": "educational",
        "min_age": 5,
        "max_age": 12,
        "order": 2,
    },
    {
        "slug": "math-fun",
        "name_key": "taxonomy.subcategories.math-fun",
        "description_key": "taxonomy.subcategories.math-fun.description",
        "icon": "calculator",
        "parent_section_slug": "kids",
        "parent_category": "educational",
        "min_age": 5,
        "max_age": 10,
        "order": 3,
    },
    {
        "slug": "nature-animals",
        "name_key": "taxonomy.subcategories.nature-animals",
        "description_key": "taxonomy.subcategories.nature-animals.description",
        "icon": "paw-print",
        "parent_section_slug": "kids",
        "parent_category": "educational",
        "min_age": 3,
        "max_age": 10,
        "order": 4,
    },
    {
        "slug": "interactive",
        "name_key": "taxonomy.subcategories.interactive",
        "description_key": "taxonomy.subcategories.interactive.description",
        "icon": "hand-pointing",
        "parent_section_slug": "kids",
        "parent_category": "educational",
        "min_age": 3,
        "max_age": 10,
        "order": 5,
    },
    # Music subcategories
    {
        "slug": "hebrew-songs",
        "name_key": "taxonomy.subcategories.hebrew-songs",
        "description_key": "taxonomy.subcategories.hebrew-songs.description",
        "icon": "music",
        "parent_section_slug": "kids",
        "parent_category": "music",
        "min_age": 3,
        "max_age": 10,
        "order": 6,
    },
    {
        "slug": "nursery-rhymes",
        "name_key": "taxonomy.subcategories.nursery-rhymes",
        "description_key": "taxonomy.subcategories.nursery-rhymes.description",
        "icon": "baby",
        "parent_section_slug": "kids",
        "parent_category": "music",
        "min_age": 0,
        "max_age": 5,
        "order": 7,
    },
    # Video/Cartoon subcategories
    {
        "slug": "kids-movies",
        "name_key": "taxonomy.subcategories.kids-movies",
        "description_key": "taxonomy.subcategories.kids-movies.description",
        "icon": "film",
        "parent_section_slug": "kids",
        "parent_category": "cartoons",
        "min_age": 5,
        "max_age": 12,
        "order": 8,
    },
    {
        "slug": "kids-series",
        "name_key": "taxonomy.subcategories.kids-series",
        "description_key": "taxonomy.subcategories.kids-series.description",
        "icon": "tv",
        "parent_section_slug": "kids",
        "parent_category": "cartoons",
        "min_age": 5,
        "max_age": 12,
        "order": 9,
    },
    # Jewish subcategories
    {
        "slug": "jewish-holidays",
        "name_key": "taxonomy.subcategories.jewish-holidays",
        "description_key": "taxonomy.subcategories.jewish-holidays.description",
        "icon": "star-of-david",
        "parent_section_slug": "kids",
        "parent_category": "jewish",
        "min_age": 3,
        "max_age": 12,
        "order": 10,
    },
    {
        "slug": "torah-stories",
        "name_key": "taxonomy.subcategories.torah-stories",
        "description_key": "taxonomy.subcategories.torah-stories.description",
        "icon": "scroll",
        "parent_section_slug": "kids",
        "parent_category": "jewish",
        "min_age": 5,
        "max_age": 12,
        "order": 11,
    },
    # Stories subcategory
    {
        "slug": "bedtime-stories",
        "name_key": "taxonomy.subcategories.bedtime-stories",
        "description_key": "taxonomy.subcategories.bedtime-stories.description",
        "icon": "moon",
        "parent_section_slug": "kids",
        "parent_category": "stories",
        "min_age": 3,
        "max_age": 7,
        "order": 12,
    },
]


# Youngsters subcategory seed data using i18n translation keys - 23 subcategories for ages 12-17
# Translations are in shared/i18n/locales/{lang}.json under taxonomy.subcategories.*
YOUNGSTERS_SUBCATEGORIES_SEED_DATA = [
    # Trending subcategories (3)
    {
        "slug": "tiktok-trends",
        "name_key": "taxonomy.subcategories.tiktok-trends",
        "description_key": "taxonomy.subcategories.tiktok-trends.description",
        "icon": "trending-up",
        "parent_section_slug": "youngsters",
        "parent_category": "trending",
        "min_age": 13,
        "max_age": 17,
        "order": 1,
    },
    {
        "slug": "viral-videos",
        "name_key": "taxonomy.subcategories.viral-videos",
        "description_key": "taxonomy.subcategories.viral-videos.description",
        "icon": "zap",
        "parent_section_slug": "youngsters",
        "parent_category": "trending",
        "min_age": 13,
        "max_age": 17,
        "order": 2,
    },
    {
        "slug": "memes",
        "name_key": "taxonomy.subcategories.memes",
        "description_key": "taxonomy.subcategories.memes.description",
        "icon": "smile",
        "parent_section_slug": "youngsters",
        "parent_category": "trending",
        "min_age": 13,
        "max_age": 17,
        "order": 3,
    },
    # News subcategories (4)
    {
        "slug": "israel-news",
        "name_key": "taxonomy.subcategories.israel-news",
        "description_key": "taxonomy.subcategories.israel-news.description",
        "icon": "newspaper",
        "parent_section_slug": "youngsters",
        "parent_category": "news",
        "min_age": 12,
        "max_age": 17,
        "order": 4,
    },
    {
        "slug": "world-news",
        "name_key": "taxonomy.subcategories.world-news",
        "description_key": "taxonomy.subcategories.world-news.description",
        "icon": "globe",
        "parent_section_slug": "youngsters",
        "parent_category": "news",
        "min_age": 14,
        "max_age": 17,
        "order": 5,
    },
    {
        "slug": "science-news",
        "name_key": "taxonomy.subcategories.science-news",
        "description_key": "taxonomy.subcategories.science-news.description",
        "icon": "atom",
        "parent_section_slug": "youngsters",
        "parent_category": "news",
        "min_age": 13,
        "max_age": 17,
        "order": 6,
    },
    {
        "slug": "sports-news",
        "name_key": "taxonomy.subcategories.sports-news",
        "description_key": "taxonomy.subcategories.sports-news.description",
        "icon": "trophy",
        "parent_section_slug": "youngsters",
        "parent_category": "news",
        "min_age": 12,
        "max_age": 17,
        "order": 7,
    },
    # Culture subcategories (4)
    {
        "slug": "music-culture",
        "name_key": "taxonomy.subcategories.music-culture",
        "description_key": "taxonomy.subcategories.music-culture.description",
        "icon": "headphones",
        "parent_section_slug": "youngsters",
        "parent_category": "culture",
        "min_age": 13,
        "max_age": 17,
        "order": 8,
    },
    {
        "slug": "film-culture",
        "name_key": "taxonomy.subcategories.film-culture",
        "description_key": "taxonomy.subcategories.film-culture.description",
        "icon": "film",
        "parent_section_slug": "youngsters",
        "parent_category": "culture",
        "min_age": 13,
        "max_age": 17,
        "order": 9,
    },
    {
        "slug": "art-culture",
        "name_key": "taxonomy.subcategories.art-culture",
        "description_key": "taxonomy.subcategories.art-culture.description",
        "icon": "palette",
        "parent_section_slug": "youngsters",
        "parent_category": "culture",
        "min_age": 13,
        "max_age": 17,
        "order": 10,
    },
    {
        "slug": "food-culture",
        "name_key": "taxonomy.subcategories.food-culture",
        "description_key": "taxonomy.subcategories.food-culture.description",
        "icon": "utensils",
        "parent_section_slug": "youngsters",
        "parent_category": "culture",
        "min_age": 13,
        "max_age": 17,
        "order": 11,
    },
    # Educational subcategories (3)
    {
        "slug": "study-help",
        "name_key": "taxonomy.subcategories.study-help",
        "description_key": "taxonomy.subcategories.study-help.description",
        "icon": "book",
        "parent_section_slug": "youngsters",
        "parent_category": "educational",
        "min_age": 14,
        "max_age": 17,
        "order": 12,
    },
    {
        "slug": "career-prep",
        "name_key": "taxonomy.subcategories.career-prep",
        "description_key": "taxonomy.subcategories.career-prep.description",
        "icon": "briefcase",
        "parent_section_slug": "youngsters",
        "parent_category": "educational",
        "min_age": 15,
        "max_age": 17,
        "order": 13,
    },
    {
        "slug": "life-skills",
        "name_key": "taxonomy.subcategories.life-skills",
        "description_key": "taxonomy.subcategories.life-skills.description",
        "icon": "lightbulb",
        "parent_section_slug": "youngsters",
        "parent_category": "educational",
        "min_age": 14,
        "max_age": 17,
        "order": 14,
    },
    # Entertainment subcategories (2)
    {
        "slug": "teen-movies",
        "name_key": "taxonomy.subcategories.teen-movies",
        "description_key": "taxonomy.subcategories.teen-movies.description",
        "icon": "film",
        "parent_section_slug": "youngsters",
        "parent_category": "entertainment",
        "min_age": 13,
        "max_age": 17,
        "order": 15,
    },
    {
        "slug": "teen-series",
        "name_key": "taxonomy.subcategories.teen-series",
        "description_key": "taxonomy.subcategories.teen-series.description",
        "icon": "tv",
        "parent_section_slug": "youngsters",
        "parent_category": "entertainment",
        "min_age": 13,
        "max_age": 17,
        "order": 16,
    },
    # Tech subcategories (3)
    {
        "slug": "gaming",
        "name_key": "taxonomy.subcategories.gaming",
        "description_key": "taxonomy.subcategories.gaming.description",
        "icon": "gamepad",
        "parent_section_slug": "youngsters",
        "parent_category": "tech",
        "min_age": 13,
        "max_age": 17,
        "order": 17,
    },
    {
        "slug": "coding",
        "name_key": "taxonomy.subcategories.coding",
        "description_key": "taxonomy.subcategories.coding.description",
        "icon": "code",
        "parent_section_slug": "youngsters",
        "parent_category": "tech",
        "min_age": 13,
        "max_age": 17,
        "order": 18,
    },
    {
        "slug": "gadgets",
        "name_key": "taxonomy.subcategories.gadgets",
        "description_key": "taxonomy.subcategories.gadgets.description",
        "icon": "smartphone",
        "parent_section_slug": "youngsters",
        "parent_category": "tech",
        "min_age": 12,
        "max_age": 17,
        "order": 19,
    },
    # Judaism subcategories (3)
    {
        "slug": "bar-bat-mitzvah",
        "name_key": "taxonomy.subcategories.bar-bat-mitzvah",
        "description_key": "taxonomy.subcategories.bar-bat-mitzvah.description",
        "icon": "star",
        "parent_section_slug": "youngsters",
        "parent_category": "judaism",
        "min_age": 12,
        "max_age": 13,
        "order": 20,
    },
    {
        "slug": "teen-torah",
        "name_key": "taxonomy.subcategories.teen-torah",
        "description_key": "taxonomy.subcategories.teen-torah.description",
        "icon": "book-open",
        "parent_section_slug": "youngsters",
        "parent_category": "judaism",
        "min_age": 13,
        "max_age": 17,
        "order": 21,
    },
    {
        "slug": "jewish-history",
        "name_key": "taxonomy.subcategories.jewish-history",
        "description_key": "taxonomy.subcategories.jewish-history.description",
        "icon": "scroll",
        "parent_section_slug": "youngsters",
        "parent_category": "judaism",
        "min_age": 14,
        "max_age": 17,
        "order": 22,
    },
]


# Taxonomy seed data using i18n translation keys
# Translations are in shared/i18n/locales/{lang}.json under taxonomy.sections.*
SECTIONS_SEED_DATA = [
    {
        "slug": "movies",
        "name_key": "taxonomy.sections.movies",
        "icon": "film",
        "color": "#E50914",
        "order": 1,
        "show_on_homepage": True,
    },
    {
        "slug": "series",
        "name_key": "taxonomy.sections.series",
        "icon": "tv",
        "color": "#0080FF",
        "order": 2,
        "show_on_homepage": True,
    },
    {
        "slug": "kids",
        "name_key": "taxonomy.sections.kids",
        "icon": "baby",
        "color": "#FF6B35",
        "order": 3,
        "show_on_homepage": True,
    },
    {
        "slug": "youngsters",
        "name_key": "taxonomy.sections.youngsters",
        "icon": "users",
        "color": "#8B5CF6",
        "order": 4,
        "show_on_homepage": True,
    },
    {
        "slug": "music",
        "name_key": "taxonomy.sections.music",
        "icon": "music",
        "color": "#1DB954",
        "order": 5,
        "show_on_homepage": True,
    },
    {
        "slug": "documentaries",
        "name_key": "taxonomy.sections.documentaries",
        "icon": "video",
        "color": "#FF9500",
        "order": 6,
        "show_on_homepage": True,
    },
    {
        "slug": "podcasts",
        "name_key": "taxonomy.sections.podcasts",
        "icon": "microphone",
        "color": "#9C27B0",
        "order": 7,
        "show_on_homepage": True,
    },
    {
        "slug": "live",
        "name_key": "taxonomy.sections.live",
        "icon": "broadcast",
        "color": "#FF3B30",
        "order": 8,
        "show_on_homepage": True,
    },
    {
        "slug": "audiobooks",
        "name_key": "taxonomy.sections.audiobooks",
        "icon": "headphones",
        "color": "#34C759",
        "order": 9,
        "show_on_homepage": True,
        "default_content_format": "audiobook",
    },
]


async def seed_sections() -> Dict[str, str]:
    """Seed ContentSection taxonomy."""
    section_map = {}

    for section_data in SECTIONS_SEED_DATA:
        existing = await ContentSection.find_one({"slug": section_data["slug"]})

        if existing:
            section_map[section_data["slug"]] = str(existing.id)
            logger.info(f"Section '{section_data['slug']}' already exists")
        else:
            section = ContentSection(
                slug=section_data["slug"],
                name_key=section_data["name_key"],
                description_key=section_data.get("description_key"),
                icon=section_data.get("icon", "folder"),
                color=section_data.get("color", "#000000"),
                order=section_data.get("order", 99),
                show_on_homepage=section_data.get("show_on_homepage", False),
                show_on_nav=section_data.get("show_on_nav", True),
                is_active=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )
            await section.insert()
            section_map[section_data["slug"]] = str(section.id)
            logger.info(f"Created section: {section_data['slug']}")

    return section_map


async def seed_kids_subcategories(section_map: Dict[str, str]) -> Dict[str, str]:
    """Seed kids section subcategories."""
    subcategory_map = {}

    kids_section_id = section_map.get("kids")
    if not kids_section_id:
        logger.warning("Kids section not found, skipping subcategory seeding")
        return subcategory_map

    for subcat_data in KIDS_SUBCATEGORIES_SEED_DATA:
        slug = subcat_data["slug"]
        existing = await SectionSubcategory.find_one(
            {"section_id": kids_section_id, "slug": slug}
        )

        if existing:
            subcategory_map[slug] = str(existing.id)
            logger.info(f"Kids subcategory '{slug}' already exists")
        else:
            subcategory = SectionSubcategory(
                section_id=kids_section_id,
                slug=slug,
                name_key=subcat_data["name_key"],
                description_key=subcat_data.get("description_key"),
                icon=subcat_data.get("icon"),
                order=subcat_data.get("order", 99),
                is_active=True,
            )
            await subcategory.insert()
            subcategory_map[slug] = str(subcategory.id)
            logger.info(f"Created kids subcategory: {slug}")

    return subcategory_map


async def seed_youngsters_subcategories(section_map: Dict[str, str]) -> Dict[str, str]:
    """Seed youngsters section subcategories using i18n translation keys."""
    subcategory_map = {}

    youngsters_section_id = section_map.get("youngsters")
    if not youngsters_section_id:
        logger.warning("Youngsters section not found, skipping subcategory seeding")
        return subcategory_map

    for subcat_data in YOUNGSTERS_SUBCATEGORIES_SEED_DATA:
        slug = subcat_data["slug"]
        existing = await SectionSubcategory.find_one(
            {"section_id": youngsters_section_id, "slug": slug}
        )

        if existing:
            subcategory_map[slug] = str(existing.id)
            logger.info(f"Youngsters subcategory '{slug}' already exists")
        else:
            subcategory = SectionSubcategory(
                section_id=youngsters_section_id,
                slug=slug,
                name_key=subcat_data["name_key"],
                description_key=subcat_data.get("description_key"),
                icon=subcat_data.get("icon"),
                order=subcat_data.get("order", 99),
                is_active=True,
            )
            await subcategory.insert()
            subcategory_map[slug] = str(subcategory.id)
            logger.info(f"Created youngsters subcategory: {slug}")

    return subcategory_map


async def seed_all_taxonomy() -> Dict[str, any]:
    """Seed all taxonomy components using i18n translation keys."""
    logger.info("🌱 Starting taxonomy seeding...")

    section_map = await seed_sections()
    logger.info(f"✅ Seeded {len(section_map)} sections")

    kids_subcategory_map = await seed_kids_subcategories(section_map)
    logger.info(f"✅ Seeded {len(kids_subcategory_map)} kids subcategories")

    youngsters_subcategory_map = await seed_youngsters_subcategories(section_map)
    logger.info(f"✅ Seeded {len(youngsters_subcategory_map)} youngsters subcategories")

    return {
        "sections": section_map,
        "kids_subcategories": kids_subcategory_map,
        "youngsters_subcategories": youngsters_subcategory_map,
    }


async def migrate_content_to_new_taxonomy(
    section_map: Dict[str, str], dry_run: bool = False
) -> Dict:
    """Migrate existing content from legacy category to new taxonomy."""
    logger.info("🔄 Starting content migration to new taxonomy...")

    migrated_count = 0
    skipped_count = 0
    error_count = 0

    all_content = await Content.find({}).to_list()
    logger.info(f"Found {len(all_content)} content items to migrate")

    for item in all_content:
        try:
            # Determine target section
            section_slug = _determine_section_from_category(item)
            if not section_slug or section_slug not in section_map:
                logger.warning(f"Could not determine section for: {item.title}")
                skipped_count += 1
                continue

            # Skip if already migrated
            if item.category_id == section_map[section_slug]:
                skipped_count += 1
                continue

            # Update content item
            if not dry_run:
                item.category_id = section_map[section_slug]
                item.updated_at = datetime.now(timezone.utc)
                await item.save()

            migrated_count += 1

        except Exception as e:
            logger.error(f"Error migrating {item.id}: {e}")
            error_count += 1

    return {
        "total_items": len(all_content),
        "migrated": migrated_count,
        "skipped": skipped_count,
        "errors": error_count,
        "dry_run": dry_run,
    }


def _determine_section_from_category(item: Content) -> Optional[str]:
    """Determine target section from legacy category."""
    category_name = (item.category_name or "").lower()

    # Simple mapping based on category name
    if "movie" in category_name or "film" in category_name:
        return "movies"
    elif "series" in category_name or "show" in category_name:
        return "series"
    elif "kid" in category_name or "child" in category_name:
        return "kids"
    elif "music" in category_name or "song" in category_name:
        return "music"
    elif "document" in category_name:
        return "documentaries"
    elif "podcast" in category_name:
        return "podcasts"
    elif "live" in category_name or "channel" in category_name:
        return "live"

    # Check content type
    if item.content_type == "movie" or item.content_type == "vod":
        return "movies"
    elif item.content_type == "series" or item.content_type == "episode":
        return "series"
    elif item.content_type == "live" or item.content_type == "channel":
        return "live"
    elif item.content_type == "podcast":
        return "podcasts"

    # Check is_kids_content flag
    if getattr(item, "is_kids_content", False):
        return "kids"

    return "movies"  # Default fallback


def _determine_content_format(item: Content) -> Optional[str]:
    """Determine content format (movie, episode, etc)."""
    if item.content_type:
        return item.content_type
    if item.is_series:
        return "series"
    return "movie"


def _determine_audience(item: Content) -> Optional[str]:
    """Determine target audience."""
    if getattr(item, "is_kids_content", False):
        return "kids"
    return "general"


def _map_genres_to_ids(item: Content, genre_map: Dict[str, str]) -> List[str]:
    """Map genre names to IDs."""
    if not item.genre:
        return []
    return [genre_map.get(item.genre, "")] if item.genre in genre_map else []


def _determine_topic_tags(item: Content) -> List[str]:
    """Determine topic tags."""
    return getattr(item, "tags", [])


# Legacy mapping constants for backward compatibility
LEGACY_CATEGORY_TO_SECTION_MAP = {
    "movies": "movies",
    "series": "series",
    "kids": "kids",
    "music": "music",
    "documentaries": "documentaries",
    "podcasts": "podcasts",
    "live": "live",
}

LEGACY_CATEGORY_TO_GENRE_MAP = {}


async def get_migration_status() -> Dict:
    """Get current migration status."""
    total_content = await Content.find({}).count()
    sections = await ContentSection.find({}).to_list()

    section_counts = {}
    for section in sections:
        count = await Content.find({"category_id": str(section.id)}).count()
        section_counts[section.slug] = count

    unmigrated = await Content.find(
        {
            "$or": [
                {"category_id": {"$exists": False}},
                {"category_id": None},
                {"category_id": ""},
            ]
        }
    ).count()

    return {
        "total_sections": len(sections),
        "total_content": total_content,
        "section_distribution": section_counts,
        "unmigrated_content": unmigrated,
        "migration_complete": unmigrated == 0,
    }


async def run_full_migration(dry_run: bool = False) -> Dict:
    """Run complete taxonomy migration."""
    logger.info("=" * 80)
    logger.info("CONTENT TAXONOMY MIGRATION")
    logger.info("=" * 80)

    # Seed taxonomy
    taxonomy_result = await seed_all_taxonomy()
    section_map = taxonomy_result.get("sections", {})
    subcategory_map = taxonomy_result.get("subcategories", {})

    # Migrate content
    migration_results = await migrate_content_to_new_taxonomy(section_map, dry_run)

    # Get final status
    status = await get_migration_status()

    return {
        "seed_results": {
            "sections": len(section_map),
            "subcategories": len(subcategory_map),
            "genres": 0,
            "audiences": 0,
        },
        "migration_stats": {
            "total": migration_results.get("total_items", 0),
            "migrated": migration_results.get("migrated", 0),
            "already_migrated": migration_results.get("skipped", 0),
            "skipped": migration_results.get("skipped", 0),
            "errors": migration_results.get("errors", 0),
        },
        "final_status": {
            "total_content": status.get("total_content", 0),
            "migrated_content": status.get("total_content", 0)
            - status.get("unmigrated_content", 0),
            "migration_percentage": round(
                (
                    1
                    - status.get("unmigrated_content", 0)
                    / max(status.get("total_content", 1), 1)
                )
                * 100,
                1,
            ),
            "content_by_section": status.get("section_distribution", {}),
        },
        "dry_run": dry_run,
    }
