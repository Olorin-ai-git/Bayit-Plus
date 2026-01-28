"""
Featured content endpoint for homepage.
"""

import asyncio
import logging
import time
from typing import Optional

from fastapi import APIRouter, Depends, Request, Header

from app.api.routes.content.utils import is_series_by_category
from app.core.security import get_optional_user, get_passkey_session
from app.models.content import Content, Podcast
from app.models.content_taxonomy import ContentSection
from app.models.user import User
from app.services.culture_content_service import culture_content_service
from app.services.location_content_service import LocationContentService

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
    x_user_city: Optional[str] = Header(None, alias="X-User-City"),
    x_user_state: Optional[str] = Header(None, alias="X-User-State"),
):
    """Get featured content for homepage - OPTIMIZED for performance.

    Headers:
        X-User-City: Optional detected city for location-based content
        X-User-State: Optional detected state for location-based content
    """
    start_time = time.time()

    # Check if user has passkey access for protected content
    passkey_session = await get_passkey_session(request)
    has_passkey = passkey_session is not None
    visibility_match = build_visibility_match(has_passkey)

    async def get_hero():
        """Get hero content, with fallback to recently published if none marked as featured."""
        collection = Content.get_settings().pymongo_collection

        # Try to get explicitly featured content first
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
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)

        # If no explicitly featured hero, fallback to most recent published
        if not results:
            logger.info("No explicitly featured hero found, using recently published fallback")
            fallback_pipeline = [
                {
                    "$match": {
                        "$and": [
                            {"is_published": True},
                            visibility_match,
                        ]
                    }
                },
                {"$sort": {"created_at": -1}},
                {"$project": {"thumbnail_data": 0, "backdrop_data": 0}},
                {"$limit": 1},
            ]
            cursor = collection.aggregate(fallback_pipeline)
            results = await cursor.to_list(length=1)

        return results[0] if results else None

    async def get_featured_content():
        """Get featured content, with fallback to recently published if none marked as featured."""
        collection = Content.get_settings().pymongo_collection

        # Try to get explicitly featured content first
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
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=None)

        # If no explicitly featured content, fallback to recently published
        if not results:
            logger.info("No explicitly featured content found, using recently published fallback")
            fallback_pipeline = [
                {
                    "$match": {
                        "$and": [
                            {
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
                {"$sort": {"created_at": -1}},  # Sort by most recently added
                {"$project": {"thumbnail_data": 0, "backdrop_data": 0}},
                {"$limit": 10},
            ]
            cursor = collection.aggregate(fallback_pipeline)
            results = await cursor.to_list(length=None)

        return results

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
        """Get featured podcasts for homepage, with fallback to recently created."""
        # Try featured podcasts first
        podcasts = await Podcast.find(
            Podcast.is_active == True, Podcast.is_featured == True
        ).sort("-order").limit(10).to_list()

        # Fallback to recently created active podcasts if no featured ones
        if not podcasts:
            logger.info("No explicitly featured podcasts, using recently created fallback")
            podcasts = await Podcast.find(
                Podcast.is_active == True
            ).sort("-created_at").limit(10).to_list()

        return podcasts

    async def get_audiobooks():
        """Get featured audiobooks from Content collection, with fallback to recently published."""
        collection = Content.get_settings().pymongo_collection

        # Try featured audiobooks first
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
        cursor = collection.aggregate(pipeline)
        audiobooks = await cursor.to_list(length=None)

        # Fallback to recently published audiobooks if no featured ones
        if not audiobooks:
            logger.info("No explicitly featured audiobooks, using recently published fallback")
            fallback_pipeline = [
                {
                    "$match": {
                        "$and": [
                            {
                                "content_format": "audiobook",
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
            cursor = collection.aggregate(fallback_pipeline)
            audiobooks = await cursor.to_list(length=None)

        return audiobooks

    async def get_location_content():
        """Get location-specific content near user's detected location. Never crashes - returns empty list on error."""
        # Early validation
        if not x_user_city or not x_user_state:
            logger.debug(f"Location headers incomplete - city: {x_user_city}, state: {x_user_state}")
            return []

        try:
            logger.info(f"Fetching location-based content for: {x_user_city}, {x_user_state}")

            # Use location content service for city-specific news and events
            location_service = LocationContentService()
            location_response = await location_service.get_israelis_in_city(
                city=x_user_city,
                state=x_user_state,
                limit_per_type=10,
                include_articles=True,
                include_events=True,
            )

            # Safe navigation with fallbacks
            if not location_response:
                logger.warning(f"Empty location response for {x_user_city}, {x_user_state}")
                return []

            content = location_response.get("content")
            if not content:
                logger.warning(f"No content key in location response for {x_user_city}, {x_user_state}")
                return []

            articles = content.get("news_articles") or []
            events = content.get("community_events") or []

            # Validate articles and events are lists
            if not isinstance(articles, list):
                logger.error(f"Articles is not a list: {type(articles)}")
                articles = []
            if not isinstance(events, list):
                logger.error(f"Events is not a list: {type(events)}")
                events = []

            all_items = articles + events
            logger.info(f"Found {len(all_items)} location-based items ({len(articles)} articles, {len(events)} events)")

            return all_items[:10]  # Limit to 10 items for homepage

        except Exception as e:
            logger.error(f"Critical error fetching location content for {x_user_city}, {x_user_state}: {e}", exc_info=True)
            return []  # Always return empty list, never raise

    hero_content, featured_content, categories, podcasts, audiobooks, location_content = await asyncio.gather(
        get_hero(), get_featured_content(), get_categories(), get_podcasts(), get_audiobooks(), get_location_content()
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
    # Separate special sections (podcasts, audiobooks, location-based) from regular content sections
    # Note: "near-you" is dynamically generated below, not from database
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

            # Try to get explicitly featured content with featured_order first
            pipeline = [
                {
                    "$match": {
                        "$and": [
                            {
                                "is_featured": True,
                                "is_published": True,
                                "is_quality_variant": {"$ne": True},
                            },
                            {"$or": or_conditions},
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

            # If no explicitly featured content for this section, use recently published fallback
            if not items:
                logger.info(f"No explicitly featured content for section '{slug}', using recently published fallback")
                fallback_pipeline = [
                    {
                        "$match": {
                            "$and": [
                                {
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
                    {"$sort": {"created_at": -1}},
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
                        }
                    },
                    {"$limit": 10},
                ]
                cursor = collection.aggregate(fallback_pipeline)
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

    # Add location-based content if user has location and content exists
    if "near-you" not in existing_slugs and location_content and x_user_city and x_user_state:
        location_items = []
        for item in location_content:
            try:
                # Validate required fields
                if not item or not isinstance(item, dict):
                    logger.warning(f"Invalid location content item: {item}")
                    continue

                if not item.get("id") or not item.get("title"):
                    logger.warning(f"Location item missing id or title: {item}")
                    continue

                location_items.append({
                    "id": item.get("id"),
                    "title": item.get("title", "Untitled"),
                    "thumbnail": item.get("thumbnail"),
                    "description": item.get("description", "")[:200] if item.get("description") else None,
                    "category": "near-you",
                    "type": item.get("type", "article"),  # "article" or "event"
                    "is_series": False,
                    "city": x_user_city,
                    "state": x_user_state,
                    "source": "News" if item.get("type") == "article" else item.get("event_location", "Event"),
                    "published_at": item.get("published_at") or item.get("event_date"),
                    "url": None,  # Internal link, not external
                })
            except Exception as e:
                logger.error(f"Error processing location content item: {e}", exc_info=True)
                continue  # Skip this item, don't crash
        category_data.append({
            "id": "near-you",
            "name": "near-you",
            "name_key": "home.nearYou",
            "name_en": f"Israelis Near {x_user_city}, {x_user_state}",
            "name_es": f"Israelíes Cerca de {x_user_city}, {x_user_state}",
            "items": location_items,
        })
        logger.info(f"Added {len(location_items)} location-based items for {x_user_city}, {x_user_state}")

    # Sort categories by desired order
    desired_order = [
        "near-you",
        "trending",  # What's hot in Israel
        "jerusalem",
        "tel-aviv",
        "movies",
        "israeli-movies",
        "series",
        "israeli-series",
        "podcasts",
        "audiobooks",
    ]

    def get_sort_priority(category: dict) -> int:
        """Get sort priority for a category. Lower number = higher priority."""
        name = category.get("name", "")
        try:
            return desired_order.index(name)
        except ValueError:
            # Categories not in the desired order list go to the end
            return len(desired_order) + 100

    category_data.sort(key=get_sort_priority)

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
