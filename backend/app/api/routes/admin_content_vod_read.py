"""
Admin VOD Content Read Endpoints
GET operations for VOD content
"""

import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.logging_config import get_logger
from app.models.admin import Permission
from app.models.content import Content, Podcast
from app.models.content_taxonomy import ContentSection
from app.models.user import User

from .admin_content_utils import has_permission
from app.api.routes.content.utils import is_series_content

logger = get_logger(__name__)

router = APIRouter()


@router.get("/content/hierarchical")
async def get_content_hierarchical(
    search: Optional[str] = None,
    category_id: Optional[str] = None,
    is_featured: Optional[bool] = None,
    is_published: Optional[bool] = None,
    is_kids_content: Optional[bool] = None,
    content_type: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, le=100),
    sort_by: Optional[str] = Query(default="created_at"),
    sort_direction: Optional[str] = Query(default="desc"),
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get content in hierarchical structure - only parent items (series and movies), not episodes."""
    logger.debug("Query params received", extra={"page": page, "page_size": page_size, "sort_by": sort_by, "sort_direction": sort_direction, "content_type": content_type, "search": search, "is_published": is_published})
    # Build base query - exclude episodes (items with series_id set) and merged items
    query = Content.find(
        {
            "$and": [
                {
                    "$or": [
                        {"series_id": None},
                        {"series_id": {"$exists": False}},
                        {"series_id": ""},
                    ]
                },
                {
                    "$or": [
                        {"review_issue_type": {"$ne": "merged"}},
                        {"review_issue_type": None},
                        {"review_issue_type": {"$exists": False}},
                    ]
                },
            ]
        }
    )

    # Apply filters
    if search:
        search = re.escape(search)
        query = query.find(
            {
                "$or": [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                ]
            }
        )
    if category_id:
        query = query.find({"category_id": category_id})
    if is_featured is not None:
        query = query.find({"is_featured": is_featured})
    if is_published is not None:
        query = query.find({"is_published": is_published})
    if is_kids_content is not None:
        query = query.find({"is_kids_content": is_kids_content})
    if content_type == "series":
        # Filter by category_name for series (NOT is_series field)
        query = query.find({"category_name": {"$regex": "series|סדרות", "$options": "i"}})
    elif content_type == "movies":
        # Filter by category_name for movies (NOT is_series field)
        query = query.find({"category_name": {"$regex": "^(?!.*(series|סדרות)).*$", "$options": "i"}})

    # Map frontend column keys to backend Content model fields
    column_field_map = {
        "title": "title",
        "category_name": "category_name",
        "year": "year",
        "created_at": "created_at",
        "updated_at": "updated_at",
        "view_count": "view_count",
        "avg_rating": "avg_rating",
        "is_published": "is_published",
        "is_featured": "is_featured",
    }

    # Get the field to sort by (default to created_at if invalid)
    sort_field = column_field_map.get(sort_by, "created_at")

    # Build sort string with direction prefix (+ for asc, - for desc)
    sort_prefix = "+" if sort_direction == "asc" else "-"
    sort_string = f"{sort_prefix}{sort_field}"

    import time
    start_time = time.time()

    logger.debug("Sort configuration", extra={"sort_string": sort_string, "sort_by": sort_by, "sort_direction": sort_direction})
    logger.debug("Content type filter applied", extra={"content_type": content_type})

    count_start = time.time()
    total = await query.count()
    logger.debug("Count query completed", extra={"duration_ms": f"{(time.time() - count_start) * 1000:.0f}"})

    query_start = time.time()
    skip = (page - 1) * page_size
    items = await query.sort(sort_string).skip(skip).limit(page_size).to_list()
    logger.debug("Main query completed", extra={"duration_ms": f"{(time.time() - query_start) * 1000:.0f}"})
    logger.debug("Query results", extra={"items_returned": len(items), "total": total})

    # Batch fetch all subtitle tracks for all content IDs (eliminates N+1 query problem)
    # Use projection to only fetch content_id and language (exclude massive 'cues' array)
    # Use PyMongo collection directly for better projection control
    subtitle_start = time.time()
    content_ids = [str(item.id) for item in items]
    from app.core.database import get_database
    db = get_database()
    all_subtitle_tracks = await db.subtitle_tracks.find(
        {"content_id": {"$in": content_ids}},
        {"content_id": 1, "language": 1, "has_nikud_version": 1, "has_shoresh_version": 1, "has_heblish_version": 1, "has_grammar_flip_version": 1, "has_slang_synthesis_version": 1, "has_engrew_version": 1}
    ).to_list(None)
    logger.debug("Subtitle query completed", extra={"duration_ms": f"{(time.time() - subtitle_start) * 1000:.0f}"})

    # Build subtitle map: content_id -> {languages: set, ai_languages: set}
    # ai_languages contains languages that have AI-generated versions (nikud, shoresh, heblish, grammarFlip, slangSynthesis)
    subtitle_map = {}
    for track in all_subtitle_tracks:
        # track is now a dict (projection result), not SubtitleTrackDoc object
        content_id = track["content_id"]
        language = track["language"]
        if content_id not in subtitle_map:
            subtitle_map[content_id] = {"languages": set(), "ai_languages": set()}
        subtitle_map[content_id]["languages"].add(language)
        # Check if this track has any AI-generated versions
        has_ai = (
            track.get("has_nikud_version", False) or
            track.get("has_shoresh_version", False) or
            track.get("has_heblish_version", False) or
            track.get("has_grammar_flip_version", False) or
            track.get("has_slang_synthesis_version", False) or
            track.get("has_engrew_version", False)
        )
        if has_ai:
            subtitle_map[content_id]["ai_languages"].add(language)

    # Batch fetch episode counts for all series using aggregation (server-side counting)
    episode_start = time.time()
    # Use helper function instead of is_series field
    series_ids = [str(item.id) for item in items if is_series_content(item.model_dump())]
    episode_counts = {}
    if series_ids:
        # Use aggregation to count episodes per series (much faster than fetching all documents)
        # Use PyMongo collection directly for aggregation to avoid Beanie cursor issues
        from app.core.database import get_database
        db = get_database()
        pipeline = [
            {"$match": {"series_id": {"$in": series_ids}}},
            {"$group": {"_id": "$series_id", "count": {"$sum": 1}}}
        ]
        aggregation_result = await db.content.aggregate(pipeline).to_list(None)
        episode_counts = {doc["_id"]: doc["count"] for doc in aggregation_result}
        logger.debug("Episode count query completed", extra={"duration_ms": f"{(time.time() - episode_start) * 1000:.0f}"})

    # Build response with episode counts for series and subtitle availability
    result_items = []
    for item in items:
        # Get available subtitle languages from batch-fetched data
        subtitle_info = subtitle_map.get(str(item.id), {"languages": set(), "ai_languages": set()})
        available_subtitles = list(subtitle_info["languages"])
        ai_subtitles = list(subtitle_info["ai_languages"])

        item_data = {
            "id": str(item.id),
            "title": item.title,
            "description": item.description,
            # Return stored image data if available, otherwise return URL
            "thumbnail": item.thumbnail_data or item.thumbnail,
            "backdrop": item.backdrop_data or item.backdrop,
            "category_id": item.category_id,
            "category_name": item.category_name,
            "duration": item.duration,
            "year": item.year,
            "rating": item.rating,
            "genre": item.genre,
            "is_series": is_series_content(item.model_dump()),  # Computed from category/structure
            "is_published": item.is_published,
            "is_featured": item.is_featured,
            "requires_subscription": item.requires_subscription,
            "is_kids_content": item.is_kids_content,
            "view_count": item.view_count,
            "avg_rating": item.avg_rating,
            "available_subtitles": available_subtitles,
            "ai_subtitles": ai_subtitles,  # Languages with AI-generated versions (nikud, shoresh, heblish, grammarFlip, slangSynthesis)
            "review_issue_type": item.review_issue_type,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
            "episode_count": (
                episode_counts.get(str(item.id), 0) if is_series_content(item.model_dump()) else 0
            ),
        }

        result_items.append(item_data)

    logger.debug("Hierarchical content request completed", extra={"total_duration_ms": f"{(time.time() - start_time) * 1000:.0f}"})

    return {
        "items": result_items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size,
    }


@router.get("/content/{content_id}")
async def get_content_detail(
    content_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get single content item details."""
    try:
        content = await Content.get(content_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Content not found")
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    return {
        "id": str(content.id),
        "title": content.title,
        "description": content.description,
        # Return stored image data if available, otherwise return URL
        "thumbnail": content.thumbnail_data or content.thumbnail,
        "backdrop": content.backdrop_data or content.backdrop,
        "category_id": content.category_id,
        "category_name": content.category_name,
        "duration": content.duration,
        "year": content.year,
        "rating": content.rating,
        "genre": content.genre,
        "cast": content.cast,
        "director": content.director,
        "stream_url": content.stream_url,
        "stream_type": content.stream_type,
        "is_drm_protected": content.is_drm_protected,
        "is_series": is_series_content(content.model_dump()),  # Computed from category/structure
        "season": content.season,
        "episode": content.episode,
        "series_id": content.series_id,
        "is_published": content.is_published,
        "is_featured": content.is_featured,
        "requires_subscription": content.requires_subscription,
        "is_kids_content": content.is_kids_content,
        "age_rating": content.age_rating,
        "content_rating": content.content_rating,
        "educational_tags": content.educational_tags,
        "view_count": content.view_count,
        "avg_rating": content.avg_rating,
        "created_at": content.created_at.isoformat(),
        "updated_at": content.updated_at.isoformat(),
        "published_at": (
            content.published_at.isoformat() if content.published_at else None
        ),
    }


@router.get("/content/{series_id}/episodes")
async def get_series_episodes(
    series_id: str,
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get episodes for a series, sorted by season and episode number."""
    # Verify series exists
    try:
        series = await Content.get(series_id)
    except Exception:
        raise HTTPException(status_code=404, detail="Series not found")
    if not series:
        raise HTTPException(status_code=404, detail="Series not found")
    # Verify it's actually a series using helper function
    if not is_series_content(series.model_dump()):
        raise HTTPException(status_code=400, detail="Content is not a series")

    # Get all episodes for this series
    episodes = (
        await Content.find({"series_id": series_id})
        .sort("+season", "+episode")
        .to_list()
    )

    # Group episodes by season
    seasons = {}
    for ep in episodes:
        season_num = ep.season or 1
        if season_num not in seasons:
            seasons[season_num] = []
        seasons[season_num].append(
            {
                "id": str(ep.id),
                "title": ep.title,
                "description": ep.description,
                "thumbnail": ep.thumbnail,
                "duration": ep.duration,
                "season": ep.season,
                "episode": ep.episode,
                "is_published": ep.is_published,
                "is_featured": ep.is_featured,
                "view_count": ep.view_count,
                "created_at": ep.created_at.isoformat(),
            }
        )

    return {
        "series_id": series_id,
        "series_title": series.title,
        "total_episodes": len(episodes),
        "seasons": seasons,
        "episodes": [
            {
                "id": str(ep.id),
                "title": ep.title,
                "description": ep.description,
                "thumbnail": ep.thumbnail,
                "duration": ep.duration,
                "season": ep.season,
                "episode": ep.episode,
                "is_published": ep.is_published,
                "is_featured": ep.is_featured,
                "view_count": ep.view_count,
                "created_at": ep.created_at.isoformat(),
            }
            for ep in episodes
        ],
    }


@router.get("/featured-by-sections")
async def get_featured_by_sections(
    current_user: User = Depends(has_permission(Permission.CONTENT_READ)),
):
    """Get featured content grouped by sections for admin management."""
    # Get all active homepage sections
    sections = await (
        ContentSection.find(
            {"is_active": True, "show_on_homepage": True}
)
        .sort("+order")
        .to_list()
    )

    # Group sections by slug to deduplicate (one carousel per slug)
    sections_by_slug: dict[str, list] = {}
    for section in sections:
        if section.slug not in sections_by_slug:
            sections_by_slug[section.slug] = []
        sections_by_slug[section.slug].append(section)

    sections_data = []
    for slug, slug_sections in sections_by_slug.items():
        # Use first section's metadata, collect all section IDs for querying
        primary_section = slug_sections[0]
        all_section_ids = [str(s.id) for s in slug_sections]

        section_items = []

        # Handle podcasts specially - they're in Podcast collection, not Content
        if slug == "podcasts":
            podcasts = await Podcast.find({"is_active": True}).find(
                {"is_featured": True}
).sort("-order").limit(100).to_list()
            section_items = [
                {
                    "id": str(podcast.id),
                    "title": podcast.title,
                    "thumbnail": podcast.cover,
                    "year": None,
                    "content_format": "podcast",
                    "is_series": False,
                    "duration": None,
                    "featured_order": idx,
                }
                for idx, podcast in enumerate(podcasts)
            ]
        # Handle audiobooks specially - query by content_format
        elif slug == "audiobooks":
            audiobook_pipeline = [
                {"$match": {"content_format": "audiobook", "is_published": True}},
                {"$project": {"_id": 1, "title": 1, "thumbnail": 1, "year": 1, "duration": 1}},
                {"$sort": {"created_at": -1}},
                {"$limit": 100},
            ]
            collection = Content.get_settings().pymongo_collection
            audiobooks = await collection.aggregate(audiobook_pipeline).to_list(length=None)
            section_items = [
                {
                    "id": str(item["_id"]),
                    "title": item.get("title"),
                    "thumbnail": item.get("thumbnail"),
                    "year": item.get("year"),
                    "content_format": "audiobook",
                    "is_series": False,
                    "duration": item.get("duration"),
                    "featured_order": idx,
                }
                for idx, item in enumerate(audiobooks)
            ]
        else:
            # Standard content sections - query by featured_order
            or_conditions = [
                {f"featured_order.{sid}": {"$exists": True}} for sid in all_section_ids
            ]

            pipeline = [
                {
                    "$match": {
                        "is_featured": True,
                        "is_published": True,
                        "$or": or_conditions,
                    }
                },
                {
                    "$project": {
                        "_id": 1,
                        "title": 1,
                        "thumbnail": 1,
                        "year": 1,
                        "content_format": 1,
                        "category_name": 1,  # For is_series_content() helper
                        "series_id": 1,  # For is_series_content() helper
                        "total_episodes": 1,  # For is_series_content() helper
                        "season_number": 1,  # For is_series_content() helper
                        "episode_number": 1,  # For is_series_content() helper
                        "duration": 1,
                        "featured_order": 1,
                    }
                },
                {"$limit": 100},
            ]

            collection = Content.get_settings().pymongo_collection
            cursor = collection.aggregate(pipeline)
            items = await cursor.to_list(length=None)

            # Deduplicate items and get best order from any section
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

                section_items.append(
                    {
                        "id": item_id,
                        "title": item.get("title"),
                        "thumbnail": item.get("thumbnail"),
                        "year": item.get("year"),
                        "content_format": item.get("content_format"),
                        "is_series": is_series_content(item),  # Computed from category/structure
                        "duration": item.get("duration"),
                        "featured_order": best_order,
                    }
                )

            # Sort by featured_order
            section_items.sort(key=lambda x: x["featured_order"])

        sections_data.append(
            {
                "section_id": str(primary_section.id),
                "slug": slug,
                "name_key": primary_section.name_key,
                "order": primary_section.order,
                "item_count": len(section_items),
                "items": section_items,
            }
        )

    # Sort sections by order
    sections_data.sort(key=lambda x: x["order"])

    # Get existing section slugs to avoid duplicates
    existing_slugs = {s["slug"] for s in sections_data}

    # Add podcasts section if not already in ContentSection
    if "podcasts" not in existing_slugs:
        podcasts = await Podcast.find({"is_active": True}).find(
            {"is_featured": True}
).sort("-order").limit(100).to_list()
        if podcasts:
            podcast_items = [
                {
                    "id": str(podcast.id),
                    "title": podcast.title,
                    "thumbnail": podcast.cover,
                    "year": None,
                    "content_format": "podcast",
                    "is_series": False,
                    "duration": None,
                    "featured_order": idx,
                }
                for idx, podcast in enumerate(podcasts)
            ]
            max_order = max((s["order"] for s in sections_data), default=0)
            sections_data.append({
                "section_id": "podcasts",
                "slug": "podcasts",
                "name_key": "home.podcasts",
                "order": max_order + 1,
                "item_count": len(podcast_items),
                "items": podcast_items,
            })

    # Add audiobooks section if not already in ContentSection
    if "audiobooks" not in existing_slugs:
        audiobook_pipeline = [
            {
                "$match": {
                    "content_format": "audiobook",
                    "is_published": True,
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "title": 1,
                    "thumbnail": 1,
                    "year": 1,
                    "content_format": 1,
                    "duration": 1,
                    "author": 1,
                    "narrator": 1,
                }
            },
            {"$sort": {"created_at": -1}},
            {"$limit": 100},
        ]
        collection = Content.get_settings().pymongo_collection
        audiobooks = await collection.aggregate(audiobook_pipeline).to_list(length=None)
        if audiobooks:
            audiobook_items = [
                {
                    "id": str(item["_id"]),
                    "title": item.get("title"),
                    "thumbnail": item.get("thumbnail"),
                    "year": item.get("year"),
                    "content_format": "audiobook",
                    "is_series": False,
                    "duration": item.get("duration"),
                    "featured_order": idx,
                }
                for idx, item in enumerate(audiobooks)
            ]
            max_order = max((s["order"] for s in sections_data), default=0)
            sections_data.append({
                "section_id": "audiobooks",
                "slug": "audiobooks",
                "name_key": "home.audiobooks",
                "order": max_order + 1,
                "item_count": len(audiobook_items),
                "items": audiobook_items,
            })

    return {"sections": sections_data}
