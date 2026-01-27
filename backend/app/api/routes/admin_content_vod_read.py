"""
Admin VOD Content Read Endpoints
GET operations for VOD content
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.admin import Permission
from app.models.content import Content
from app.models.content_taxonomy import ContentSection
from app.models.subtitles import SubtitleTrackDoc
from app.models.user import User

from .admin_content_utils import has_permission

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
    # Debug logging
    print(f"[admin_content_vod_read] Query params: page={page}, page_size={page_size}, sort_by={sort_by}, sort_direction={sort_direction}, content_type={content_type}, search={search}, is_published={is_published}")
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
        query = query.find(
            {
                "$or": [
                    {"title": {"$regex": search, "$options": "i"}},
                    {"description": {"$regex": search, "$options": "i"}},
                ]
            }
        )
    if category_id:
        query = query.find(Content.category_id == category_id)
    if is_featured is not None:
        query = query.find(Content.is_featured == is_featured)
    if is_published is not None:
        query = query.find(Content.is_published == is_published)
    if is_kids_content is not None:
        query = query.find(Content.is_kids_content == is_kids_content)
    if content_type == "series":
        query = query.find(Content.is_series == True)
    elif content_type == "movies":
        query = query.find(Content.is_series == False)

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

    print(f"[admin_content_vod_read] Sorting by: {sort_string} (from sort_by={sort_by}, sort_direction={sort_direction})")
    print(f"[admin_content_vod_read] Content type filter: {content_type}")

    count_start = time.time()
    total = await query.count()
    print(f"[admin_content_vod_read] Count took: {(time.time() - count_start) * 1000:.0f}ms")

    query_start = time.time()
    skip = (page - 1) * page_size
    items = await query.sort(sort_string).skip(skip).limit(page_size).to_list()
    print(f"[admin_content_vod_read] Main query took: {(time.time() - query_start) * 1000:.0f}ms")
    print(f"[admin_content_vod_read] Query executed: {len(items)} items returned out of {total} total")

    # Batch fetch all subtitle tracks for all content IDs (eliminates N+1 query problem)
    # Use projection to only fetch content_id and language (exclude massive 'cues' array)
    # Use PyMongo collection directly for better projection control
    subtitle_start = time.time()
    content_ids = [str(item.id) for item in items]
    from app.core.database import get_database
    db = get_database()
    all_subtitle_tracks = await db.subtitle_tracks.find(
        {"content_id": {"$in": content_ids}},
        {"content_id": 1, "language": 1}
    ).to_list(None)
    print(f"[admin_content_vod_read] Subtitle query took: {(time.time() - subtitle_start) * 1000:.0f}ms")

    # Build subtitle map: content_id -> list of unique language codes
    subtitle_map = {}
    for track in all_subtitle_tracks:
        # track is now a dict (projection result), not SubtitleTrackDoc object
        content_id = track["content_id"]
        language = track["language"]
        if content_id not in subtitle_map:
            subtitle_map[content_id] = set()
        subtitle_map[content_id].add(language)

    # Batch fetch episode counts for all series using aggregation (server-side counting)
    episode_start = time.time()
    series_ids = [str(item.id) for item in items if item.is_series]
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
        print(f"[admin_content_vod_read] Episode query took: {(time.time() - episode_start) * 1000:.0f}ms")

    # Build response with episode counts for series and subtitle availability
    result_items = []
    for item in items:
        # Get available subtitle languages from batch-fetched data
        available_subtitles = list(subtitle_map.get(str(item.id), set()))

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
            "is_series": item.is_series,
            "is_published": item.is_published,
            "is_featured": item.is_featured,
            "requires_subscription": item.requires_subscription,
            "is_kids_content": item.is_kids_content,
            "view_count": item.view_count,
            "avg_rating": item.avg_rating,
            "available_subtitles": available_subtitles,
            "review_issue_type": item.review_issue_type,
            "created_at": item.created_at.isoformat(),
            "updated_at": item.updated_at.isoformat(),
            "episode_count": (
                episode_counts.get(str(item.id), 0) if item.is_series else 0
            ),
        }

        result_items.append(item_data)

    print(f"[admin_content_vod_read] TOTAL TIME: {(time.time() - start_time) * 1000:.0f}ms")

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
        "is_series": content.is_series,
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
    if not series.is_series:
        raise HTTPException(status_code=400, detail="Content is not a series")

    # Get all episodes for this series
    episodes = (
        await Content.find(Content.series_id == series_id)
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
            ContentSection.is_active == True,
            ContentSection.show_on_homepage == True,
        )
        .sort("+order")
        .to_list()
    )

    sections_data = []
    for section in sections:
        section_id = str(section.id)

        # Fetch featured items for this section, ordered by featured_order
        pipeline = [
            {
                "$match": {
                    "is_featured": True,
                    "is_published": True,
                    f"featured_order.{section_id}": {"$exists": True},
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "title": 1,
                    "thumbnail": 1,
                    "year": 1,
                    "content_format": 1,
                    "is_series": 1,
                    "duration": 1,
                    "featured_order": 1,
                }
            },
            {"$sort": {f"featured_order.{section_id}": 1}},
            {"$limit": 50},
        ]

        collection = Content.get_settings().pymongo_collection
        cursor = collection.aggregate(pipeline)
        items = await cursor.to_list(length=None)

        section_items = [
            {
                "id": str(item["_id"]),
                "title": item.get("title"),
                "thumbnail": item.get("thumbnail"),
                "year": item.get("year"),
                "content_format": item.get("content_format"),
                "is_series": item.get("is_series", False),
                "duration": item.get("duration"),
                "featured_order": item.get("featured_order", {}).get(section_id, 999),
            }
            for item in items
        ]

        sections_data.append(
            {
                "section_id": section_id,
                "slug": section.slug,
                "name_key": section.name_key,
                "order": section.order,
                "item_count": len(section_items),
                "items": section_items,
            }
        )

    return {"sections": sections_data}
