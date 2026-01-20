"""
Content Taxonomy API Routes

New endpoints for the 5-axis content classification system:
- Sections: Platform navigation sections
- Genres: Mood/style classifications
- Audiences: Age appropriateness classifications
- Browse: Unified content browsing with filters
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from app.models.content import Content
from app.models.content_taxonomy import (
    ContentSection,
    SectionSubcategory,
    Genre,
    Audience,
)
from app.services.subtitle_enrichment import enrich_content_items_with_subtitles
import logging

router = APIRouter(prefix="/content", tags=["content-taxonomy"])
logger = logging.getLogger(__name__)


# ============================================================================
# SECTIONS ENDPOINTS
# ============================================================================

@router.get("/sections")
async def get_sections(
    show_on_nav: Optional[bool] = None,
    show_on_homepage: Optional[bool] = None,
):
    """
    Get all content sections for navigation.

    Query params:
    - show_on_nav: Filter to sections visible in navigation
    - show_on_homepage: Filter to sections that should appear on homepage
    """
    filters = {"is_active": True}

    if show_on_nav is not None:
        filters["show_on_nav"] = show_on_nav
    if show_on_homepage is not None:
        filters["show_on_homepage"] = show_on_homepage

    sections = await ContentSection.find(filters).sort("order").to_list()

    return {
        "sections": [
            {
                "id": str(section.id),
                "slug": section.slug,
                "name": section.name,
                "name_en": section.name_en,
                "name_es": section.name_es,
                "description": section.description,
                "description_en": section.description_en,
                "description_es": section.description_es,
                "icon": section.icon,
                "thumbnail": section.thumbnail,
                "color": section.color,
                "order": section.order,
                "show_on_homepage": section.show_on_homepage,
                "show_on_nav": section.show_on_nav,
                "supports_subcategories": section.supports_subcategories,
            }
            for section in sections
        ]
    }


@router.get("/sections/{section_id}")
async def get_section(section_id: str):
    """
    Get a single section by ID or slug.
    """
    # Try ID first, then slug
    section = None
    try:
        section = await ContentSection.get(section_id)
    except Exception:
        pass

    if not section:
        section = await ContentSection.find_one(ContentSection.slug == section_id)

    if not section or not section.is_active:
        raise HTTPException(status_code=404, detail="Section not found")

    return {
        "id": str(section.id),
        "slug": section.slug,
        "name": section.name,
        "name_en": section.name_en,
        "name_es": section.name_es,
        "description": section.description,
        "description_en": section.description_en,
        "description_es": section.description_es,
        "icon": section.icon,
        "thumbnail": section.thumbnail,
        "color": section.color,
        "order": section.order,
        "show_on_homepage": section.show_on_homepage,
        "show_on_nav": section.show_on_nav,
        "supports_subcategories": section.supports_subcategories,
    }


@router.get("/sections/{section_id}/subcategories")
async def get_section_subcategories(section_id: str):
    """
    Get subcategories for a section.
    """
    # Resolve section
    section = None
    try:
        section = await ContentSection.get(section_id)
    except Exception:
        pass

    if not section:
        section = await ContentSection.find_one(ContentSection.slug == section_id)

    if not section or not section.is_active:
        raise HTTPException(status_code=404, detail="Section not found")

    section_obj_id = str(section.id)

    subcategories = await SectionSubcategory.find(
        SectionSubcategory.section_id == section_obj_id,
        SectionSubcategory.is_active == True,
    ).sort("order").to_list()

    return {
        "section": {
            "id": section_obj_id,
            "slug": section.slug,
            "name": section.name,
            "name_en": section.name_en,
            "name_es": section.name_es,
        },
        "subcategories": [
            {
                "id": str(sub.id),
                "slug": sub.slug,
                "name": sub.name,
                "name_en": sub.name_en,
                "name_es": sub.name_es,
                "description": sub.description,
                "description_en": sub.description_en,
                "description_es": sub.description_es,
                "icon": sub.icon,
                "thumbnail": sub.thumbnail,
                "order": sub.order,
            }
            for sub in subcategories
        ]
    }


# ============================================================================
# GENRES ENDPOINTS
# ============================================================================

@router.get("/genres")
async def get_genres(
    show_in_filter: Optional[bool] = None,
):
    """
    Get all genres.

    Query params:
    - show_in_filter: Filter to genres that appear in browse filters
    """
    filters = {"is_active": True}

    if show_in_filter is not None:
        filters["show_in_filter"] = show_in_filter

    genres = await Genre.find(filters).sort("order").to_list()

    return {
        "genres": [
            {
                "id": str(genre.id),
                "slug": genre.slug,
                "name": genre.name,
                "name_en": genre.name_en,
                "name_es": genre.name_es,
                "tmdb_id": genre.tmdb_id,
                "icon": genre.icon,
                "color": genre.color,
                "order": genre.order,
            }
            for genre in genres
        ]
    }


# ============================================================================
# AUDIENCES ENDPOINTS
# ============================================================================

@router.get("/audiences")
async def get_audiences():
    """
    Get all audience classifications.
    """
    audiences = await Audience.find(Audience.is_active == True).sort("order").to_list()

    return {
        "audiences": [
            {
                "id": str(aud.id),
                "slug": aud.slug,
                "name": aud.name,
                "name_en": aud.name_en,
                "name_es": aud.name_es,
                "description": aud.description,
                "description_en": aud.description_en,
                "description_es": aud.description_es,
                "min_age": aud.min_age,
                "max_age": aud.max_age,
                "content_ratings": aud.content_ratings,
                "icon": aud.icon,
                "color": aud.color,
                "order": aud.order,
            }
            for aud in audiences
        ]
    }


# ============================================================================
# UNIFIED BROWSE ENDPOINT
# ============================================================================

@router.get("/browse")
async def browse_content(
    # Section filter
    section: Optional[str] = Query(None, description="Section slug (e.g., movies, kids, judaism)"),
    # Subcategory filter
    subcategory: Optional[str] = Query(None, description="Subcategory slug (e.g., shiurim, cartoons)"),
    # Genre filter (comma-separated for multiple)
    genres: Optional[str] = Query(None, description="Comma-separated genre slugs (e.g., drama,comedy)"),
    # Audience filter
    audience: Optional[str] = Query(None, description="Audience slug (e.g., kids, family)"),
    # Topic tags filter (comma-separated for multiple)
    topics: Optional[str] = Query(None, description="Comma-separated topic tags (e.g., jewish,educational)"),
    # Format filter
    content_format: Optional[str] = Query(None, description="Content format (movie, series, documentary)"),
    # Pagination
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    # Sorting
    sort_by: str = Query("created_at", description="Sort field (created_at, year, title, view_count)"),
    sort_order: str = Query("desc", description="Sort order (asc, desc)"),
):
    """
    Unified content browse endpoint with multiple filter options.

    This endpoint supports the new 5-axis classification system while
    maintaining compatibility with existing content.

    Filters:
    - section: Platform section (movies, series, kids, judaism, documentaries)
    - subcategory: Section-specific sub-category
    - genres: One or more genre slugs (comma-separated)
    - audience: Audience classification
    - topics: One or more topic tags (comma-separated)
    - content_format: Content format type

    Cross-listing: Content with multiple section_ids will appear in each
    relevant section query.
    """
    skip = (page - 1) * limit

    # Build MongoDB filter
    content_filter = {
        "is_published": True,
        # Exclude episodes (series_id set) and quality variants
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ],
        "is_quality_variant": {"$ne": True},
    }

    # Resolve section slug to ID if provided
    section_id = None
    section_obj = None
    if section:
        section_obj = await ContentSection.find_one(ContentSection.slug == section)
        if section_obj:
            section_id = str(section_obj.id)
            # Use $in for section_ids array OR fallback to legacy category_id
            content_filter["$or"] = [
                {"section_ids": section_id},
                {"primary_section_id": section_id},
            ]

            # If no new taxonomy data exists, try legacy mapping
            # This enables gradual migration
            legacy_category_map = _get_legacy_category_mapping()
            if section in legacy_category_map:
                legacy_slugs = legacy_category_map[section]
                content_filter["$or"].append({"category_name": {"$in": legacy_slugs}})

    # Resolve subcategory
    if subcategory and section_id:
        sub_obj = await SectionSubcategory.find_one(
            SectionSubcategory.section_id == section_id,
            SectionSubcategory.slug == subcategory,
        )
        if sub_obj:
            content_filter["subcategory_ids"] = str(sub_obj.id)

    # Parse and apply genre filter
    if genres:
        genre_slugs = [g.strip() for g in genres.split(",") if g.strip()]
        if genre_slugs:
            genre_objs = await Genre.find(Genre.slug.in_(genre_slugs)).to_list()
            genre_ids = [str(g.id) for g in genre_objs]
            if genre_ids:
                # Match any of the genres (OR logic)
                content_filter["genre_ids"] = {"$in": genre_ids}

    # Resolve audience
    if audience:
        aud_obj = await Audience.find_one(Audience.slug == audience)
        if aud_obj:
            content_filter["audience_id"] = str(aud_obj.id)
        # Fallback to legacy kids content field for "kids" audience
        elif audience == "kids":
            content_filter["is_kids_content"] = True

    # Parse and apply topic tags filter
    if topics:
        topic_list = [t.strip() for t in topics.split(",") if t.strip()]
        if topic_list:
            # Match any of the topics (OR logic)
            content_filter["topic_tags"] = {"$in": topic_list}

    # Apply content format filter
    if content_format:
        # Try new field first, fallback to legacy
        content_filter["$or"] = content_filter.get("$or", [])
        content_filter["$or"].extend([
            {"content_format": content_format},
            {"content_type": content_format},
        ])
        # Handle series format specially
        if content_format == "series":
            content_filter["$or"].append({"is_series": True})

    # Determine sort
    sort_direction = -1 if sort_order == "desc" else 1
    sort_field_map = {
        "created_at": "created_at",
        "year": "year",
        "title": "title",
        "view_count": "view_count",
        "updated_at": "updated_at",
    }
    sort_field = sort_field_map.get(sort_by, "created_at")

    # Execute query
    items = await Content.find(content_filter).sort(
        [(sort_field, sort_direction)]
    ).skip(skip).limit(limit).to_list()

    total = await Content.find(content_filter).count()

    # Build response items
    result_items = []
    for item in items:
        is_series = getattr(item, "is_series", False) or getattr(item, "content_format", None) == "series"

        item_data = {
            "id": str(item.id),
            "title": item.title,
            "title_en": item.title_en,
            "title_es": item.title_es,
            "description": item.description,
            "thumbnail": item.thumbnail_data or item.thumbnail or item.poster_url,
            "backdrop": item.backdrop_data or item.backdrop,
            "year": item.year,
            "duration": item.duration,
            "rating": item.rating,
            # New taxonomy fields
            "section_ids": getattr(item, "section_ids", []),
            "primary_section_id": getattr(item, "primary_section_id", None),
            "content_format": getattr(item, "content_format", None) or item.content_type,
            "audience_id": getattr(item, "audience_id", None),
            "genre_ids": getattr(item, "genre_ids", []),
            "topic_tags": getattr(item, "topic_tags", []),
            "subcategory_ids": getattr(item, "subcategory_ids", []),
            # Legacy fields for backward compatibility
            "category_id": item.category_id,
            "category_name": item.category_name,
            "type": "series" if is_series else "movie",
            "is_series": is_series,
        }

        # Add episode count for series
        if is_series:
            item_data["total_episodes"] = item.total_episodes or 0

        result_items.append(item_data)

    # Enrich with subtitle languages
    result_items = await enrich_content_items_with_subtitles(result_items)

    return {
        "items": result_items,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
        "filters": {
            "section": section,
            "subcategory": subcategory,
            "genres": genres,
            "audience": audience,
            "topics": topics,
            "content_format": content_format,
        },
    }


@router.get("/section/{section_slug}/content")
async def get_section_content(
    section_slug: str,
    subcategory: Optional[str] = Query(None, description="Subcategory slug"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get content for a specific section.

    This endpoint retrieves content that belongs to the specified section,
    using either the new section_ids field or falling back to legacy category mapping.
    """
    # Resolve section
    section = await ContentSection.find_one(ContentSection.slug == section_slug)

    if not section or not section.is_active:
        raise HTTPException(status_code=404, detail="Section not found")

    section_id = str(section.id)
    skip = (page - 1) * limit

    # Build filter with both new and legacy support
    content_filter = {
        "is_published": True,
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ],
        "is_quality_variant": {"$ne": True},
    }

    # Add section filter with legacy fallback
    section_filters = [
        {"section_ids": section_id},
        {"primary_section_id": section_id},
    ]

    # Add legacy category mapping
    legacy_map = _get_legacy_category_mapping()
    if section_slug in legacy_map:
        section_filters.append({"category_name": {"$in": legacy_map[section_slug]}})

    content_filter["$or"] = section_filters

    # Add subcategory filter if provided
    if subcategory:
        sub_obj = await SectionSubcategory.find_one(
            SectionSubcategory.section_id == section_id,
            SectionSubcategory.slug == subcategory,
        )
        if sub_obj:
            content_filter["subcategory_ids"] = str(sub_obj.id)

    items = await Content.find(content_filter).sort("created_at", -1).skip(skip).limit(limit).to_list()
    total = await Content.find(content_filter).count()

    # Build response
    result_items = []
    for item in items:
        is_series = getattr(item, "is_series", False)

        result_items.append({
            "id": str(item.id),
            "title": item.title,
            "title_en": item.title_en,
            "title_es": item.title_es,
            "description": item.description,
            "thumbnail": item.thumbnail_data or item.thumbnail or item.poster_url,
            "year": item.year,
            "duration": item.duration,
            "type": "series" if is_series else "movie",
            "is_series": is_series,
            "total_episodes": item.total_episodes if is_series else None,
        })

    # Enrich with subtitles
    result_items = await enrich_content_items_with_subtitles(result_items)

    return {
        "section": {
            "id": section_id,
            "slug": section.slug,
            "name": section.name,
            "name_en": section.name_en,
            "name_es": section.name_es,
        },
        "items": result_items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


def _get_legacy_category_mapping() -> dict:
    """
    Returns mapping from new section slugs to legacy category names.

    This enables the browse endpoint to work with existing content
    during the migration period.
    """
    return {
        "movies": ["סרטים", "Movies", "movies", "קומדיה", "דרמה", "אקשן", "מתח", "רומנטי"],
        "series": ["סדרות", "Series", "series", "tv shows", "shows"],
        "kids": ["ילדים", "Kids", "kids", "לילדים", "לנוער"],
        "judaism": ["יהדות", "Judaism", "judaism", "תורה", "שיעורים", "תפילה"],
        "documentaries": ["דוקומנטרי", "Documentaries", "documentaries", "דוקומנטרים"],
    }
