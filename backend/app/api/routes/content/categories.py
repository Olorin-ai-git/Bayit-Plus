"""
Category/Section endpoints.

Migrated to use ContentSection taxonomy system.
Legacy Category model is deprecated.
"""

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.api.routes.content.utils import convert_to_proxy_url, is_series_by_category
from app.models.content import Content
from app.models.content_taxonomy import ContentSection, SectionSubcategory
from app.services.subtitle_enrichment import enrich_content_items_with_subtitles
from app.utils.i18n import get_multilingual_names

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/categories")
async def get_categories():
    """
    Get all content sections (categories).

    Returns sections from the new taxonomy system.
    """
    sections = await ContentSection.find(
        ContentSection.is_active == True
    ).sort("order").to_list()

    result_items = []
    for section in sections:
        # Resolve multilingual names from i18n
        names = get_multilingual_names(section.name_key, slug=section.slug, taxonomy_type="sections")

        result_items.append({
            "id": str(section.id),
            "name": names["he"],  # Hebrew as default
            "name_en": names["en"],
            "name_es": names["es"],
            "slug": section.slug,
            "thumbnail": section.thumbnail,
            "icon": section.icon,
            "color": section.color,
            "show_on_homepage": section.show_on_homepage,
            "show_on_nav": section.show_on_nav,
            "supports_subcategories": section.supports_subcategories,
        })

    return {"categories": result_items}


@router.get("/sections")
async def get_sections():
    """
    Get all content sections with subcategories.
    """
    sections = await ContentSection.find(
        ContentSection.is_active == True
    ).sort("order").to_list()

    result = []
    for section in sections:
        section_id = str(section.id)
        subcategories = []

        if section.supports_subcategories:
            subcats = await SectionSubcategory.find(
                SectionSubcategory.section_id == section_id,
                SectionSubcategory.is_active == True
            ).sort("order").to_list()

            subcategories = []
            for sub in subcats:
                sub_names = get_multilingual_names(sub.name_key, slug=sub.slug, taxonomy_type="subcategories")
                subcategories.append({
                    "id": str(sub.id),
                    "slug": sub.slug,
                    "name": sub_names["he"],
                    "name_en": sub_names["en"],
                    "name_es": sub_names["es"],
                })

        content_count = await Content.find({
            "section_ids": section_id,
            "is_published": True,
        }).count()

        # Resolve multilingual names from i18n
        section_names = get_multilingual_names(section.name_key, slug=section.slug, taxonomy_type="sections")

        result.append({
            "id": section_id,
            "slug": section.slug,
            "name": section_names["he"],
            "name_en": section_names["en"],
            "name_es": section_names["es"],
            "icon": section.icon,
            "color": section.color,
            "thumbnail": section.thumbnail,
            "show_on_homepage": section.show_on_homepage,
            "show_on_nav": section.show_on_nav,
            "supports_subcategories": section.supports_subcategories,
            "subcategories": subcategories,
            "content_count": content_count,
        })

    return {"sections": result}


@router.get("/category/{category_id}")
async def get_by_category(
    category_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get content by section (accepts ID or slug).

    Uses new taxonomy system with section_ids field.
    """
    skip = (page - 1) * limit

    section = None
    try:
        section = await ContentSection.get(category_id)
    except Exception:
        pass

    if not section:
        section = await ContentSection.find_one(ContentSection.slug == category_id)

    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    section_id = str(section.id)

    content_filter = {
        "section_ids": section_id,
        "is_published": True,
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ],
        "is_quality_variant": {"$ne": True},
    }

    items = await Content.find(content_filter).skip(skip).limit(limit).to_list()
    total = await Content.find(content_filter).count()

    # Resolve section names
    section_names = get_multilingual_names(section.name_key, slug=section.slug, taxonomy_type="sections")

    result_items = []
    for item in items:
        is_series = item.is_series or is_series_by_category(section_names["he"])

        item_data = {
            "id": str(item.id),
            "title": item.title,
            "thumbnail": item.thumbnail_data or item.thumbnail or item.poster_url,
            "duration": item.duration,
            "year": item.year,
            "category": section_names["he"],
            "category_name_en": section_names["en"],
            "category_name_es": section_names["es"],
            "type": "series" if is_series else "movie",
            "is_series": is_series,
        }

        if is_series:
            if item.total_episodes:
                item_data["total_episodes"] = item.total_episodes
            else:
                episode_count = await Content.find(
                    Content.series_id == str(item.id),
                    Content.is_published == True,
                ).count()
                item_data["total_episodes"] = episode_count

        result_items.append(item_data)

    def availability_sort_key(item):
        is_series = item.get("is_series", False)
        total_episodes = item.get("total_episodes", 0) or 0
        if not is_series:
            return (0, 0)
        elif total_episodes > 0:
            return (1, -total_episodes)
        else:
            return (2, 0)

    result_items.sort(key=availability_sort_key)
    result_items = await enrich_content_items_with_subtitles(result_items)

    return {
        "category": {
            "id": str(section.id),
            "name": section_names["he"],
            "name_en": section_names["en"],
            "name_es": section_names["es"],
            "slug": section.slug,
        },
        "items": result_items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/section/{slug}")
async def get_section_content(
    slug: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get content for a specific section by slug.
    """
    return await get_by_category(slug, page, limit)


@router.get("/section/{section_slug}/subcategory/{subcategory_slug}")
async def get_subcategory_content(
    section_slug: str,
    subcategory_slug: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """
    Get content for a specific subcategory.
    """
    skip = (page - 1) * limit

    section = await ContentSection.find_one(ContentSection.slug == section_slug)
    if not section:
        raise HTTPException(status_code=404, detail="Section not found")

    subcategory = await SectionSubcategory.find_one(
        SectionSubcategory.section_id == str(section.id),
        SectionSubcategory.slug == subcategory_slug,
    )
    if not subcategory:
        raise HTTPException(status_code=404, detail="Subcategory not found")

    subcategory_id = str(subcategory.id)

    content_filter = {
        "subcategory_ids": subcategory_id,
        "is_published": True,
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ],
    }

    items = await Content.find(content_filter).skip(skip).limit(limit).to_list()
    total = await Content.find(content_filter).count()

    result_items = []
    for item in items:
        result_items.append({
            "id": str(item.id),
            "title": item.title,
            "thumbnail": item.thumbnail_data or item.thumbnail or item.poster_url,
            "duration": item.duration,
            "year": item.year,
            "type": "series" if item.is_series else "movie",
            "is_series": item.is_series,
        })

    result_items = await enrich_content_items_with_subtitles(result_items)

    # Resolve multilingual names
    section_names = get_multilingual_names(section.name_key, slug=section.slug, taxonomy_type="sections")
    subcategory_names = get_multilingual_names(subcategory.name_key, slug=subcategory.slug, taxonomy_type="subcategories")

    return {
        "section": {
            "id": str(section.id),
            "name": section_names["he"],
            "name_en": section_names["en"],
            "slug": section.slug,
        },
        "subcategory": {
            "id": subcategory_id,
            "name": subcategory_names["he"],
            "name_en": subcategory_names["en"],
            "slug": subcategory.slug,
        },
        "items": result_items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }
