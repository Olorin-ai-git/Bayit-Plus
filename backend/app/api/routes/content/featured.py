"""
Featured content endpoint for homepage.
"""

import asyncio
import logging
import time

from fastapi import APIRouter, Depends
from typing import Optional

from app.api.routes.content.utils import is_series_by_category
from app.core.security import get_optional_user
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/featured")
async def get_featured(current_user: Optional[User] = Depends(get_optional_user)):
    """Get featured content for homepage - OPTIMIZED for performance."""
    start_time = time.time()

    async def get_hero():
        pipeline = [
            {"$match": {"is_featured": True, "is_published": True}},
            {"$project": {"thumbnail_data": 0, "backdrop_data": 0}},
            {"$limit": 1}
        ]
        collection = Content.get_settings().pymongo_collection
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        return results[0] if results else None

    async def get_featured_content():
        pipeline = [
            {"$match": {
                "is_featured": True,
                "is_published": True,
                "$or": [
                    {"series_id": None},
                    {"series_id": {"$exists": False}},
                    {"series_id": ""},
                ],
                "is_quality_variant": {"$ne": True},
            }},
            {"$project": {"thumbnail_data": 0, "backdrop_data": 0}},
            {"$limit": 10}
        ]
        collection = Content.get_settings().pymongo_collection
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None)

    async def get_categories():
        return await ContentSection.find(
            ContentSection.is_active == True,
            ContentSection.show_on_homepage == True
        ).sort("order").limit(6).to_list()

    hero_content, featured_content, categories = await asyncio.gather(
        get_hero(), get_featured_content(), get_categories()
    )
    logger.info(f"⏱️ Featured: Initial queries took {time.time() - start_time:.2f}s")

    spotlight_items = []
    for item in featured_content:
        category_name = item.get("category_name")
        is_series = item.get("is_series", False) or is_series_by_category(category_name)
        spotlight_items.append({
            "id": str(item.get("_id")),
            "title": item.get("title"),
            "description": item.get("description"),
            "backdrop": item.get("backdrop") or item.get("thumbnail") or item.get("poster_url"),
            "thumbnail": item.get("thumbnail") or item.get("poster_url"),
            "category": category_name,
            "year": item.get("year"),
            "duration": item.get("duration"),
            "rating": item.get("rating"),
            "is_series": is_series,
            "total_episodes": item.get("total_episodes") if is_series else None,
        })

    cat_query_start = time.time()
    category_ids = [str(cat.id) for cat in categories]
    category_info_map = {
        str(cat.id): {
            "name": cat.name,
            "name_en": cat.name_en,
            "name_es": cat.name_es,
        }
        for cat in categories
    }

    pipeline = [
        {"$match": {
            "category_id": {"$in": category_ids},
            "is_published": True,
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""},
            ],
            "is_quality_variant": {"$ne": True},
        }},
        {"$project": {
            "_id": 1, "title": 1, "thumbnail": 1, "thumbnail_data": 1,
            "poster_url": 1, "duration": 1, "year": 1, "category_id": 1,
            "is_series": 1, "total_episodes": 1,
        }},
        {"$sort": {"_id": -1}},
        {"$group": {
            "_id": "$category_id",
            "items": {"$push": {
                "_id": "$_id", "title": "$title", "thumbnail": "$thumbnail",
                "thumbnail_data": "$thumbnail_data", "poster_url": "$poster_url",
                "duration": "$duration", "year": "$year",
                "is_series": "$is_series", "total_episodes": "$total_episodes",
            }}
        }},
        {"$project": {"_id": 1, "items": {"$slice": ["$items", 10]}}}
    ]
    cursor = Content.get_settings().pymongo_collection.aggregate(pipeline)
    grouped_content = await cursor.to_list(length=None)
    logger.info(f"⏱️ Featured: Category content query took {time.time() - cat_query_start:.2f}s")

    category_items_map = {}
    for group in grouped_content:
        cat_id = group["_id"]
        cat_info = category_info_map.get(cat_id, {})
        cat_name = cat_info.get("name", "")
        category_items = []
        for item in group["items"]:
            is_series = item.get("is_series", False) or is_series_by_category(cat_name)
            thumbnail = item.get("thumbnail_data") or item.get("thumbnail") or item.get("poster_url")
            item_data = {
                "id": str(item["_id"]),
                "title": item.get("title"),
                "thumbnail": thumbnail,
                "duration": item.get("duration"),
                "year": item.get("year"),
                "category": cat_name,
                "category_name_en": cat_info.get("name_en"),
                "category_name_es": cat_info.get("name_es"),
                "type": "series" if is_series else "movie",
                "is_series": is_series,
            }
            if is_series:
                item_data["total_episodes"] = item.get("total_episodes") or 0
            category_items.append(item_data)

        def availability_sort_key(item):
            is_series = item.get("is_series", False)
            total_episodes = item.get("total_episodes", 0) or 0
            if not is_series:
                return (0, 0)
            elif total_episodes > 0:
                return (1, -total_episodes)
            else:
                return (2, 0)

        category_items.sort(key=availability_sort_key)
        category_items_map[cat_id] = category_items

    category_data = [
        {
            "id": str(cat.id),
            "name": cat.name,
            "name_en": cat.name_en,
            "name_es": cat.name_es,
            "items": category_items_map.get(str(cat.id), []),
        }
        for cat in categories
    ]

    logger.info(f"⏱️ Featured: TOTAL took {time.time() - start_time:.2f}s")

    return {
        "hero": {
            "id": str(hero_content.get("_id")) if hero_content else None,
            "title": hero_content.get("title") if hero_content else None,
            "description": hero_content.get("description") if hero_content else None,
            "backdrop": hero_content.get("backdrop") if hero_content else None,
            "thumbnail": hero_content.get("thumbnail") if hero_content else None,
            "category": hero_content.get("category_name") if hero_content else None,
            "year": hero_content.get("year") if hero_content else None,
            "duration": hero_content.get("duration") if hero_content else None,
            "rating": hero_content.get("rating") if hero_content else None,
        } if hero_content else None,
        "spotlight": spotlight_items,
        "categories": category_data,
    }
