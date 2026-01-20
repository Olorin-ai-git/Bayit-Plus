"""
Content discovery endpoints.

Handles all content listing, search, and sync.
"""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Query

from app.api.routes.content.utils import convert_to_proxy_url, is_series_by_category
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.services.subtitle_enrichment import enrich_content_items_with_subtitles

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/all")
async def get_all_content(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
):
    """Get all published content (movies and series, excluding episodes)."""
    skip = (page - 1) * limit

    content_filter = {
        "is_published": True,
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ],
        "is_quality_variant": {"$ne": True},
    }

    async def get_content():
        return await Content.find(content_filter).skip(skip).limit(limit).to_list()

    async def get_total():
        return await Content.find(content_filter).count()

    async def get_all_categories():
        return await ContentSection.find().to_list()

    items, total, categories = await asyncio.gather(
        get_content(), get_total(), get_all_categories()
    )

    category_map = {
        str(cat.id): {
            "name": cat.name,
            "name_en": cat.name_en,
            "name_es": cat.name_es,
        }
        for cat in categories
    }

    def is_series_content(item) -> bool:
        return item.is_series or is_series_by_category(item.category_name)

    content_items = []
    for item in items:
        cat_info = category_map.get(item.category_id, {})
        is_series = is_series_content(item)
        item_data = {
            "id": str(item.id),
            "title": item.title,
            "description": item.description,
            "thumbnail": item.thumbnail_data or convert_to_proxy_url(item.thumbnail or item.poster_url) if (item.thumbnail_data or item.thumbnail or item.poster_url) else None,
            "backdrop": item.backdrop_data or convert_to_proxy_url(item.backdrop) if (item.backdrop_data or item.backdrop) else None,
            "category": item.category_name,
            "category_name_en": cat_info.get("name_en"),
            "category_name_es": cat_info.get("name_es"),
            "year": item.year,
            "duration": item.duration,
            "is_series": is_series,
            "type": "series" if is_series else "movie",
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

        content_items.append(item_data)

    def availability_sort_key(item):
        is_series = item.get("is_series", False)
        total_episodes = item.get("total_episodes", 0) or 0
        if not is_series:
            return (0, 0)
        elif total_episodes > 0:
            return (1, -total_episodes)
        else:
            return (2, 0)

    content_items.sort(key=availability_sort_key)
    content_items = await enrich_content_items_with_subtitles(content_items)

    return {
        "items": content_items,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/sync")
async def sync_all_content():
    """
    Sync all content: podcasts, live channels, and trending data.
    Podcast syncing is now background-only (scheduled task).
    """
    logger.info("📻 Full content sync requested (podcasts sync in background)")

    return {
        "status": "background_only",
        "message": "Podcast syncing runs as a scheduled background task only. Changes will appear automatically.",
        "podcasts": {
            "total": 0,
            "synced": 0,
            "episodes_added": 0,
        },
    }


@router.post("/search")
async def search_content(
    query: str,
    type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Search across all content."""
    skip = (page - 1) * limit
    results = []

    if not type or type == "vod":
        vod_items = await Content.find(
            {"$text": {"$search": query}},
            Content.is_published == True,
        ).limit(limit).to_list()

        for item in vod_items:
            results.append({
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "duration": item.duration,
                "year": item.year,
                "category": item.category_name,
                "type": "series" if item.is_series else "movie",
            })

    return {
        "query": query,
        "results": results,
        "total": len(results),
    }
