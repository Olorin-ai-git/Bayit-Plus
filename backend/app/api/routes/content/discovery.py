"""
Content discovery endpoints.

Handles all content listing, search, and sync.
"""

import asyncio
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, Request

from app.api.routes.content.utils import (convert_to_proxy_url,
                                          is_series_content)
from app.core.security import get_optional_user, get_passkey_session
from app.models.content import Content
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


def build_visibility_filter(has_passkey_access: bool) -> dict:
    """
    Build a MongoDB filter for content visibility based on passkey access.

    Content visibility rules:
    - "public": Always visible
    - "private": Hidden from discovery (direct link only)
    - "passkey_protected": Visible only with valid passkey session,
      OR if requires_subscription is "none" (free content)
    """
    if has_passkey_access:
        # User has passkey access - show public and passkey_protected content
        return {
            "$or": [
                {"visibility_mode": {"$in": ["public", None]}},
                {"visibility_mode": "passkey_protected"},
                # Null/missing visibility_mode treated as public
                {"visibility_mode": {"$exists": False}},
            ]
        }
    else:
        # No passkey access - show only public content and free content
        return {
            "$or": [
                {"visibility_mode": {"$in": ["public", None]}},
                {"visibility_mode": {"$exists": False}},
                # Free content is always visible regardless of visibility_mode
                {"requires_subscription": "none"},
            ]
        }


@router.get("/all")
async def get_all_content(
    request: Request,
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get all published content (movies and series, excluding episodes)."""
    skip = (page - 1) * limit

    # Check if user has passkey access for protected content
    passkey_session = await get_passkey_session(request)
    has_passkey = passkey_session is not None
    visibility_filter = build_visibility_filter(has_passkey)
    # Build filter combining series exclusion and visibility rules
    content_filter = {
        "$and": [
            {"is_published": True},
            {"is_quality_variant": {"$ne": True}},
            # Exclude episodes (only show movies and series)
            {
                "$or": [
                    {"series_id": None},
                    {"series_id": {"$exists": False}},
                    {"series_id": ""},
                ]
            },
            # Apply visibility filter
            visibility_filter,
        ]
    }

    # Use raw Motor queries to avoid Pydantic validation crashes on
    # malformed documents (Beanie deserializes every doc through the
    # Content model — a single bad field crashes the entire page).
    from app.core.database import get_database
    db = get_database()
    content_col = db["content"]
    section_col = db["content_sections"]

    raw_projection = {
        "_id": 1, "title": 1, "description": 1,
        "thumbnail": 1, "thumbnail_data": 1, "backdrop": 1,
        "backdrop_data": 1, "poster_url": 1, "category_id": 1,
        "category_name": 1, "year": 1, "duration": 1,
        "total_episodes": 1, "content_type": 1, "series_id": 1,
        "total_seasons": 1, "has_subtitles": 1,
        "available_subtitle_languages": 1,
    }

    async def get_content_raw():
        cursor = content_col.find(
            content_filter, raw_projection,
        ).skip(skip).limit(limit)
        return await cursor.to_list(length=limit)

    async def get_total():
        return await content_col.count_documents(content_filter)

    async def get_all_categories():
        return await section_col.find().to_list(length=500)

    raw_items, total, categories = await asyncio.gather(
        get_content_raw(), get_total(), get_all_categories()
    )

    category_map = {
        str(cat["_id"]): {
            "slug": cat.get("slug"),
            "name_key": cat.get("name_key"),
        }
        for cat in categories
    }

    content_items = []
    for doc in raw_items:
        if not doc.get("title"):
            logger.warning(
                "Skipping content doc with missing title: %s",
                doc.get("_id"),
            )
            continue
        is_series = is_series_content(doc)
        cat_info = category_map.get(doc.get("category_id") or "", {})

        thumb_data = doc.get("thumbnail_data")
        thumb_url = doc.get("thumbnail") or doc.get("poster_url")
        backdrop_data = doc.get("backdrop_data")
        backdrop_url = doc.get("backdrop")

        item_data = {
            "id": str(doc["_id"]),
            "title": doc["title"],
            "description": doc.get("description"),
            "thumbnail": (
                thumb_data or convert_to_proxy_url(thumb_url)
                if (thumb_data or thumb_url)
                else None
            ),
            "backdrop": (
                backdrop_data or convert_to_proxy_url(backdrop_url)
                if (backdrop_data or backdrop_url)
                else None
            ),
            "category": doc.get("category_name"),
            "category_slug": cat_info.get("slug"),
            "category_name_key": cat_info.get("name_key"),
            "year": doc.get("year"),
            "duration": doc.get("duration"),
            "is_series": is_series,
            "type": "series" if is_series else "movie",
            "available_subtitle_languages": doc.get(
                "available_subtitle_languages", []
            ),
            "has_subtitles": doc.get("has_subtitles", False),
        }

        if is_series:
            if doc.get("total_episodes"):
                item_data["total_episodes"] = doc["total_episodes"]
            else:
                episode_count = await content_col.count_documents(
                    {"series_id": str(doc["_id"]), "is_published": True}
                )
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
    logger.info("Full content sync requested (podcasts sync in background)")

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
    request: Request,
    query: str,
    type: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Search across all content."""
    skip = (page - 1) * limit
    results = []

    # Check if user has passkey access for protected content
    passkey_session = await get_passkey_session(request)
    has_passkey = passkey_session is not None
    visibility_filter = build_visibility_filter(has_passkey)
    if not type or type == "vod":
        # Build search filter with visibility rules
        search_filter = {
            "$and": [
                {"$text": {"$search": query}},
                {"is_published": True},
                visibility_filter,
            ]
        }
        vod_items = await Content.find(search_filter).limit(limit).to_list()

        for item in vod_items:
            results.append(
                {
                    "id": str(item.id),
                    "title": item.title,
                    "thumbnail": item.thumbnail,
                    "duration": item.duration,
                    "year": item.year,
                    "category": item.category_name,
                    "type": "series" if is_series_content(item.model_dump()) else "movie",
                }
            )

    return {
        "query": query,
        "results": results,
        "total": len(results),
    }
