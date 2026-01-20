"""
Category endpoints.
"""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.api.routes.content.utils import convert_to_proxy_url, is_series_by_category
from app.models.content import Category, Content
from app.services.subtitle_enrichment import enrich_content_items_with_subtitles

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/categories")
async def get_categories():
    """
    Get all content categories with localized names.

    BACKWARD COMPATIBILITY: Returns both legacy categories AND new sections merged.
    """
    from app.models.content_taxonomy import ContentSection

    categories = await Category.find(Category.is_active == True).sort("order").to_list()
    sections = await ContentSection.find(ContentSection.is_active == True).sort("order").to_list()

    result_items = []

    for section in sections:
        result_items.append({
            "id": str(section.id),
            "name": section.name,
            "name_en": section.name_en,
            "name_es": section.name_es,
            "slug": section.slug,
            "thumbnail": section.thumbnail,
            "icon": section.icon,
            "is_section": True,
        })

    existing_slugs = {s.slug for s in sections}
    for cat in categories:
        if cat.slug not in existing_slugs:
            result_items.append({
                "id": str(cat.id),
                "name": cat.name,
                "name_en": cat.name_en,
                "name_es": cat.name_es,
                "slug": cat.slug,
                "thumbnail": cat.thumbnail,
                "is_section": False,
            })

    return {"categories": result_items}


@router.get("/category/{category_id}")
async def get_by_category(
    category_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Get content by category (accepts ID or slug)."""
    skip = (page - 1) * limit

    category = None
    try:
        category = await Category.get(category_id)
    except Exception:
        pass

    if not category:
        category = await Category.find_one(Category.slug == category_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category_obj_id = str(category.id)

    content_filter = {
        "category_id": category_obj_id,
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

    result_items = []
    for item in items:
        is_series = item.is_series or is_series_by_category(category.name)

        item_data = {
            "id": str(item.id),
            "title": item.title,
            "thumbnail": item.thumbnail_data or item.thumbnail or item.poster_url,
            "duration": item.duration,
            "year": item.year,
            "category": category.name,
            "category_name_en": category.name_en,
            "category_name_es": category.name_es,
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
            "id": str(category.id),
            "name": category.name,
            "name_en": category.name_en,
            "name_es": category.name_es,
        },
        "items": result_items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }
