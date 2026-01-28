"""
Featured content endpoint for homepage.
"""

import asyncio
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, Request

from app.api.routes.content.utils import is_series_by_category
from app.core.security import get_optional_user, get_passkey_session
from app.models.content import Content, Podcast
from app.models.content_taxonomy import ContentSection
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


def build_visibility_match(has_passkey_access: bool) -> dict:
    """
    Build a MongoDB $match condition for content visibility.

    Content visibility rules:
    - "public": Always visible
    - "private": Hidden from discovery
    - "passkey_protected": Visible only with valid passkey session,
      OR if requires_subscription is "none" (free content)
    """
    if has_passkey_access:
        return {
            "$or": [
                {"visibility_mode": {"$in": ["public", None]}},
                {"visibility_mode": "passkey_protected"},
                {"visibility_mode": {"$exists": False}},
            ]
        }
    else:
        return {
            "$or": [
                {"visibility_mode": {"$in": ["public", None]}},
                {"visibility_mode": {"$exists": False}},
                {"requires_subscription": "none"},
            ]
        }


@router.get("/featured")
async def get_featured(
    request: Request,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get featured content for homepage - OPTIMIZED for performance."""
    start_time = time.time()

    # Check if user has passkey access for protected content
    passkey_session = await get_passkey_session(request)
    has_passkey = passkey_session is not None
    visibility_match = build_visibility_match(has_passkey)

    async def get_hero():
        # Hero must be featured, published, and pass visibility check
        pipeline = [
            {
                "$match": {
                    "$and": [
                        {"is_featured": True, "is_published": True},
                        visibility_match,
                    ]
                }
            },
            {"$project": {"thumbnail_data": 0, "backdrop_data": 0}},
            {"$limit": 1},
        ]
        collection = Content.get_settings().pymongo_collection
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        return results[0] if results else None

    async def get_featured_content():
        pipeline = [
            {
                "$match": {
                    "$and": [
                        {
                            "is_featured": True,
                            "is_published": True,
                            "is_quality_variant": {"$ne": True},
                        },
                        {
                            "$or": [
                                {"series_id": None},
                                {"series_id": {"$exists": False}},
                                {"series_id": ""},
                            ]
                        },
                        # Exclude series without episodes from homepage
                        {
                            "$or": [
                                {"is_series": {"$ne": True}},
                                {"total_episodes": {"$gt": 0}},
                            ]
                        },
                        visibility_match,
                    ]
                }
            },
            {"$project": {"thumbnail_data": 0, "backdrop_data": 0}},
            {"$limit": 10},
        ]
        collection = Content.get_settings().pymongo_collection
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None)

    async def get_categories():
        return (
            await ContentSection.find(
                ContentSection.is_active == True,
                ContentSection.show_on_homepage == True,
            )
            .sort("order")
            .limit(6)
            .to_list()
        )

    async def get_podcasts():
        """Get featured podcasts for homepage."""
        return await Podcast.find(
            (Podcast.is_active == True) & (Podcast.is_featured == True)
        ).sort("-order").limit(10).to_list()

    async def get_audiobooks():
        """Get featured audiobooks from Content collection."""
        pipeline = [
            {
                "$match": {
                    "$and": [
                        {
                            "content_format": "audiobook",
                            "is_featured": True,
                            "is_published": True,
                            "is_quality_variant": {"$ne": True},
                        },
                        visibility_match,
                    ]
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "title": 1,
                    "thumbnail": 1,
                    "thumbnail_data": 1,
                    "poster_url": 1,
                    "duration": 1,
                    "year": 1,
                    "author": 1,
                    "narrator": 1,
                }
            },
            {"$sort": {"created_at": -1}},
            {"$limit": 10},
        ]
        collection = Content.get_settings().pymongo_collection
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None)

    hero_content, featured_content, categories, podcasts, audiobooks = await asyncio.gather(
        get_hero(), get_featured_content(), get_categories(), get_podcasts(), get_audiobooks()
    )
    logger.info(f"⏱️ Featured: Initial queries took {time.time() - start_time:.2f}s")

    spotlight_items = []
    for item in featured_content:
        category_name = item.get("category_name")
        is_series = item.get("is_series", False) or is_series_by_category(category_name)
        subtitle_langs = item.get("available_subtitle_languages") or []
        spotlight_items.append(
            {
                "id": str(item.get("_id")),
                "title": item.get("title"),
                "description": item.get("description"),
                "backdrop": item.get("backdrop")
                or item.get("thumbnail")
                or item.get("poster_url"),
                "thumbnail": item.get("thumbnail") or item.get("poster_url"),
                "category": category_name,
                "year": item.get("year"),
                "duration": item.get("duration"),
                "rating": item.get("rating"),
                "is_series": is_series,
                "total_episodes": item.get("total_episodes") if is_series else None,
                "available_subtitle_languages": subtitle_langs,
                "has_subtitles": len(subtitle_langs) > 0,
            }
        )

    cat_query_start = time.time()
    # Separate special sections (podcasts, audiobooks) from regular content sections
    special_slugs = {"podcasts", "audiobooks"}

    # Group sections by slug to handle potential duplicates
    sections_by_slug: dict = {}
    for cat in categories:
        if cat.slug not in sections_by_slug:
            sections_by_slug[cat.slug] = []
        sections_by_slug[cat.slug].append(cat)

    # Build category data using featured_order (matching admin endpoint logic)
    category_data = []
    collection = Content.get_settings().pymongo_collection

    for slug, slug_sections in sections_by_slug.items():
        primary_section = slug_sections[0]
        all_section_ids = [str(s.id) for s in slug_sections]

        if slug == "podcasts":
            # Podcasts from Podcast collection
            podcast_items = [
                {
                    "id": str(podcast.id),
                    "title": podcast.title,
                    "thumbnail": podcast.cover,
                    "category": "podcasts",
                    "type": "podcast",
                    "is_series": False,
                    "author": podcast.author,
                }
                for podcast in podcasts
            ] if podcasts else []
            category_data.append({
                "id": str(primary_section.id),
                "name": slug,
                "name_key": primary_section.name_key or "home.podcasts",
                "name_en": "Podcasts",
                "name_es": "Podcasts",
                "items": podcast_items,
            })
        elif slug == "audiobooks":
            # Audiobooks from Content collection
            audiobook_items = [
                {
                    "id": str(item["_id"]),
                    "title": item.get("title"),
                    "thumbnail": item.get("thumbnail_data") or item.get("thumbnail") or item.get("poster_url"),
                    "duration": item.get("duration"),
                    "year": item.get("year"),
                    "category": "audiobooks",
                    "type": "audiobook",
                    "is_series": False,
                    "author": item.get("author"),
                    "narrator": item.get("narrator"),
                }
                for item in audiobooks
            ] if audiobooks else []
            category_data.append({
                "id": str(primary_section.id),
                "name": slug,
                "name_key": primary_section.name_key or "home.audiobooks",
                "name_en": "Audiobooks",
                "name_es": "Audiolibros",
                "items": audiobook_items,
            })
        else:
            # Regular content sections - query by featured_order (matching admin logic)
            or_conditions = [
                {f"featured_order.{sid}": {"$exists": True}} for sid in all_section_ids
            ]

            pipeline = [
                {
                    "$match": {
                        "$and": [
                            {
                                "is_featured": True,
                                "is_published": True,
                                "is_quality_variant": {"$ne": True},
                                "$or": or_conditions,
                            },
                            {
                                "$or": [
                                    {"series_id": None},
                                    {"series_id": {"$exists": False}},
                                    {"series_id": ""},
                                ]
                            },
                            # Exclude series without episodes from category carousels
                            {
                                "$or": [
                                    {"is_series": {"$ne": True}},
                                    {"total_episodes": {"$gt": 0}},
                                ]
                            },
                            visibility_match,
                        ]
                    }
                },
                {
                    "$project": {
                        "_id": 1,
                        "title": 1,
                        "thumbnail": 1,
                        "thumbnail_data": 1,
                        "poster_url": 1,
                        "duration": 1,
                        "year": 1,
                        "is_series": 1,
                        "total_episodes": 1,
                        "available_subtitle_languages": 1,
                        "featured_order": 1,
                    }
                },
                {"$limit": 100},
            ]

            cursor = collection.aggregate(pipeline)
            items = await cursor.to_list(length=None)

            # Process items and get best order from any section
            category_items = []
            seen_ids = set()
            for item in items:
                item_id = str(item["_id"])
                if item_id in seen_ids:
                    continue
                seen_ids.add(item_id)

                # Get the lowest order from any of the section IDs
                featured_order = item.get("featured_order", {})
                best_order = min(
                    (featured_order.get(sid, 999) for sid in all_section_ids),
                    default=999,
                )

                is_series = item.get("is_series", False) or is_series_by_category(slug)
                thumbnail = (
                    item.get("thumbnail_data")
                    or item.get("thumbnail")
                    or item.get("poster_url")
                )
                subtitle_langs = item.get("available_subtitle_languages") or []

                item_data = {
                    "id": item_id,
                    "title": item.get("title"),
                    "thumbnail": thumbnail,
                    "duration": item.get("duration"),
                    "year": item.get("year"),
                    "category": slug,
                    "category_name_en": slug,
                    "category_name_es": slug,
                    "type": "series" if is_series else "movie",
                    "is_series": is_series,
                    "available_subtitle_languages": subtitle_langs,
                    "has_subtitles": len(subtitle_langs) > 0,
                    "_order": best_order,
                }
                if is_series:
                    item_data["total_episodes"] = item.get("total_episodes") or 0

                category_items.append(item_data)

            # Sort by featured_order
            category_items.sort(key=lambda x: x.get("_order", 999))

            # Remove internal _order field and limit to 10 items
            for item in category_items:
                item.pop("_order", None)
            category_items = category_items[:10]

            category_data.append({
                "id": str(primary_section.id),
                "name": slug,
                "name_key": primary_section.name_key,
                "name_en": slug,
                "name_es": slug,
                "items": category_items,
            })

    logger.info(
        f"⏱️ Featured: Category content query took {time.time() - cat_query_start:.2f}s"
    )

    # Track existing slugs to avoid duplicates
    existing_slugs = {cat.slug for cat in categories}

    # Add podcasts if not already in ContentSection
    if "podcasts" not in existing_slugs and podcasts:
        podcast_items = [
            {
                "id": str(podcast.id),
                "title": podcast.title,
                "thumbnail": podcast.cover,
                "category": "podcasts",
                "type": "podcast",
                "is_series": False,
                "author": podcast.author,
            }
            for podcast in podcasts
        ]
        category_data.append({
            "id": "podcasts",
            "name": "podcasts",
            "name_key": "home.podcasts",
            "name_en": "Podcasts",
            "name_es": "Podcasts",
            "items": podcast_items,
        })

    # Add audiobooks if not already in ContentSection
    if "audiobooks" not in existing_slugs and audiobooks:
        audiobook_items = [
            {
                "id": str(item["_id"]),
                "title": item.get("title"),
                "thumbnail": item.get("thumbnail_data") or item.get("thumbnail") or item.get("poster_url"),
                "duration": item.get("duration"),
                "year": item.get("year"),
                "category": "audiobooks",
                "type": "audiobook",
                "is_series": False,
                "author": item.get("author"),
                "narrator": item.get("narrator"),
            }
            for item in audiobooks
        ]
        category_data.append({
            "id": "audiobooks",
            "name": "audiobooks",
            "name_key": "home.audiobooks",
            "name_en": "Audiobooks",
            "name_es": "Audiolibros",
            "items": audiobook_items,
        })

    logger.info(f"⏱️ Featured: TOTAL took {time.time() - start_time:.2f}s")

    return {
        "hero": (
            {
                "id": str(hero_content.get("_id")) if hero_content else None,
                "title": hero_content.get("title") if hero_content else None,
                "description": (
                    hero_content.get("description") if hero_content else None
                ),
                "backdrop": hero_content.get("backdrop") if hero_content else None,
                "thumbnail": hero_content.get("thumbnail") if hero_content else None,
                "category": hero_content.get("category_name") if hero_content else None,
                "year": hero_content.get("year") if hero_content else None,
                "duration": hero_content.get("duration") if hero_content else None,
                "rating": hero_content.get("rating") if hero_content else None,
            }
            if hero_content
            else None
        ),
        "spotlight": spotlight_items,
        "categories": category_data,
    }
