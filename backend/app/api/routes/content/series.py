"""
Series-specific endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.routes.content.beta_filter import (
    build_beta_content_filter,
    check_beta_access,
)
from app.api.routes.content.utils import is_native_app, is_series_content
from app.core.security import get_optional_user
from app.models.content import Content
from app.models.user import User
from app.services.ffmpeg.realtime_transcode import needs_transcode_by_extension

router = APIRouter()
logger = logging.getLogger(__name__)


def _get_stream_url_for_platform(
    content_id: str,
    stream_url: str,
    user_agent: str,
) -> tuple[str, bool]:
    """Get appropriate stream URL based on platform (fast extension-based check)."""
    is_native = is_native_app(user_agent)

    if is_native or not stream_url:
        return stream_url, False

    # Fast extension-based check
    if needs_transcode_by_extension(stream_url):
        return f"/api/proxy/transcode/{content_id}", True

    return stream_url, False


@router.get("/series")
async def list_all_series(
    page: int = 1,
    limit: int = 50,
    category_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get all series (parent series, not episodes)."""
    skip = (page - 1) * limit

    beta_filter = build_beta_content_filter(current_user)

    # Defensive filtering: Exclude episodes even if data is malformed
    # Parent series should NEVER have season/episode numbers
    # Also exclude series with no episodes from user-facing endpoints

    # Match any category containing series-related keywords (case-insensitive)
    from app.api.routes.content.utils import SERIES_CATEGORY_KEYWORDS
    series_regex = "|".join(SERIES_CATEGORY_KEYWORDS)

    filters = {
        "is_published": True,
        "category_name": {"$regex": series_regex, "$options": "i"},
        "total_episodes": {"$gt": 0},  # Hide series without episodes
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ],
        # Defensive: Ensure no season/episode numbers (episodes have these)
        "$and": [
            {
                "$or": [
                    {"season": None},
                    {"season": {"$exists": False}},
                ]
            },
            {
                "$or": [
                    {"episode": None},
                    {"episode": {"$exists": False}},
                ]
            },
        ],
        **beta_filter,
    }
    if category_id:
        filters["category_id"] = category_id

    # Apply search filter if provided
    if search and search.strip():
        from app.api.routes.content.utils import sanitize_search_input
        search_regex = {"$regex": sanitize_search_input(search), "$options": "i"}
        filters["$and"] = filters.get("$and", []) + [
            {
                "$or": [
                    {"title": search_regex},
                    {"description": search_regex},
                ]
            }
        ]

    items = await Content.find(filters).skip(skip).limit(limit).to_list()
    total = await Content.find(filters).count()

    return {
        "items": [
            {
                "id": str(item.id),
                "title": item.title,
                "description": item.description,
                "thumbnail": item.thumbnail or item.poster_url,
                "backdrop": item.backdrop,
                "category": item.category_name,
                "year": item.year,
                "total_episodes": item.total_episodes,
                "total_seasons": item.total_seasons,
                "type": "series",
                "is_series": True,
                "available_subtitle_languages": item.available_subtitle_languages or [],
                "has_subtitles": bool(
                    item.available_subtitle_languages
                    and len(item.available_subtitle_languages) > 0
                ),
            }
            for item in items
        ],
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.get("/series/{series_id}")
async def get_series_details(
    series_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get full series details with seasons summary."""
    series = await Content.get(series_id)
    if not series or not series.is_published:
        raise HTTPException(status_code=404, detail="Series not found")

    # Verify it's actually a series using helper function
    series_dict = series.model_dump()
    if not is_series_content(series_dict):
        raise HTTPException(status_code=404, detail="Series not found")

    # Check beta content access - return 404 to hide existence from non-authorized users
    is_beta = getattr(series, "is_beta_content", False)
    if not check_beta_access(current_user, is_beta):
        raise HTTPException(status_code=404, detail="Series not found")

    episodes = (
        await Content.find(
            Content.series_id == series_id,
            Content.is_published == True,
        )
        .sort([("season", 1), ("episode", 1)])
        .to_list()
    )

    seasons_map = {}
    for ep in episodes:
        season_num = ep.season or 1
        if season_num not in seasons_map:
            seasons_map[season_num] = {
                "season_number": season_num,
                "episode_count": 0,
                "first_episode_id": str(ep.id),
                "first_episode_thumbnail": ep.thumbnail,
            }
        seasons_map[season_num]["episode_count"] += 1

    seasons = sorted(seasons_map.values(), key=lambda x: x["season_number"])

    # Build beta filter for related items
    beta_filter = build_beta_content_filter(current_user)

    # Query related items with beta filter
    related_query = {
        "category_id": series.category_id,
        "_id": {"$ne": series.id},
        "is_published": True,
        # Use category_name instead of deprecated is_series field
        "category_name": {"$regex": "series|סדרות", "$options": "i"},
        **beta_filter,
    }
    related = await Content.find(related_query).limit(6).to_list()

    return {
        "id": str(series.id),
        "title": series.title,
        "description": series.description,
        "thumbnail": series.thumbnail or series.poster_url,
        "backdrop": series.backdrop,
        "category": series.category_name,
        "year": series.year,
        "rating": series.rating,
        "genre": series.genre,
        "cast": series.cast,
        "director": series.director,
        "total_seasons": series.total_seasons or len(seasons),
        "total_episodes": series.total_episodes or len(episodes),
        "trailer_url": series.trailer_url,
        "preview_url": series.preview_url,
        "tmdb_id": str(series.tmdb_id) if series.tmdb_id is not None else None,
        "imdb_id": str(series.imdb_id) if series.imdb_id is not None else None,
        "available_subtitle_languages": series.available_subtitle_languages or [],
        "has_subtitles": bool(
            series.available_subtitle_languages
            and len(series.available_subtitle_languages) > 0
        ),
        "is_kids_content": series.is_kids_content,
        "age_rating": series.age_rating,
        "seasons": seasons,
        "related": [
            {
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail or item.poster_url,
                "year": item.year,
                "type": "series",
            }
            for item in related
        ],
    }


@router.get("/series/{series_id}/seasons")
async def get_series_seasons(
    series_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get all seasons for a series."""
    series = await Content.get(series_id)
    if not series or not series.is_published:
        raise HTTPException(status_code=404, detail="Series not found")

    # Verify it's actually a series using helper function
    series_dict = series.model_dump()
    if not is_series_content(series_dict):
        raise HTTPException(status_code=404, detail="Series not found")

    # Check beta content access on parent series
    is_beta = getattr(series, "is_beta_content", False)
    if not check_beta_access(current_user, is_beta):
        raise HTTPException(status_code=404, detail="Series not found")

    episodes = (
        await Content.find(
            Content.series_id == series_id,
            Content.is_published == True,
        )
        .sort([("season", 1), ("episode", 1)])
        .to_list()
    )

    seasons_map = {}
    for ep in episodes:
        season_num = ep.season or 1
        if season_num not in seasons_map:
            seasons_map[season_num] = {
                "season_number": season_num,
                "episode_count": 0,
                "thumbnail": ep.thumbnail,
            }
        seasons_map[season_num]["episode_count"] += 1

    return {
        "series_id": series_id,
        "seasons": sorted(seasons_map.values(), key=lambda x: x["season_number"]),
    }


@router.get("/series/{series_id}/season/{season_num}/episodes")
async def get_season_episodes(
    request: Request,
    series_id: str,
    season_num: int,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get episodes for a specific season."""
    series = await Content.get(series_id)
    if not series or not series.is_published:
        raise HTTPException(status_code=404, detail="Series not found")

    # Verify it's actually a series using helper function
    series_dict = series.model_dump()
    if not is_series_content(series_dict):
        raise HTTPException(status_code=404, detail="Series not found")

    # Check beta content access on parent series
    is_beta = getattr(series, "is_beta_content", False)
    if not check_beta_access(current_user, is_beta):
        raise HTTPException(status_code=404, detail="Series not found")

    episodes = (
        await Content.find(
            Content.series_id == series_id,
            Content.season == season_num,
            Content.is_published == True,
        )
        .sort("episode")
        .to_list()
    )

    user_agent = request.headers.get("User-Agent", "")
    episode_list = []

    for ep in episodes:
        stream_url, is_transcoded = _get_stream_url_for_platform(
            str(ep.id), ep.stream_url, user_agent
        )
        episode_list.append({
            "id": str(ep.id),
            "title": ep.title,
            "description": ep.description,
            "thumbnail": ep.thumbnail,
            "episode_number": ep.episode,
            "duration": ep.duration,
            "preview_url": ep.preview_url,
            "stream_url": stream_url,
            "direct_url": ep.stream_url,
            "is_transcoded": is_transcoded,
        })

    return {
        "series_id": series_id,
        "season_number": season_num,
        "episodes": episode_list,
    }
