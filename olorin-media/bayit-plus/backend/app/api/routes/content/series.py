"""
Series-specific endpoints.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_optional_user
from app.models.content import Content
from app.models.user import User

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/series")
async def list_all_series(
    page: int = 1,
    limit: int = 50,
    category_id: Optional[str] = None,
):
    """Get all series (parent series, not episodes)."""
    skip = (page - 1) * limit

    filters = {
        "is_published": True,
        "is_series": True,
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ],
    }
    if category_id:
        filters["category_id"] = category_id

    items = await Content.find(filters).skip(skip).limit(limit).to_list()
    total = await Content.find(filters).count()

    return {
        "items": [
            {
                "id": str(item.id),
                "title": item.title,
                "description": item.description,
                "thumbnail": item.thumbnail,
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
    if not series or not series.is_published or not series.is_series:
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

    related = (
        await Content.find(
            Content.category_id == series.category_id,
            Content.id != series.id,
            Content.is_published == True,
            Content.is_series == True,
        )
        .limit(6)
        .to_list()
    )

    return {
        "id": str(series.id),
        "title": series.title,
        "description": series.description,
        "thumbnail": series.thumbnail,
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
        "tmdb_id": series.tmdb_id,
        "imdb_id": series.imdb_id,
        "available_subtitle_languages": series.available_subtitle_languages or [],
        "has_subtitles": bool(
            series.available_subtitle_languages
            and len(series.available_subtitle_languages) > 0
        ),
        "seasons": seasons,
        "related": [
            {
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "year": item.year,
                "type": "series",
            }
            for item in related
        ],
    }


@router.get("/series/{series_id}/seasons")
async def get_series_seasons(series_id: str):
    """Get all seasons for a series."""
    series = await Content.get(series_id)
    if not series or not series.is_published or not series.is_series:
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
async def get_season_episodes(series_id: str, season_num: int):
    """Get episodes for a specific season."""
    series = await Content.get(series_id)
    if not series or not series.is_published or not series.is_series:
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

    return {
        "series_id": series_id,
        "season_number": season_num,
        "episodes": [
            {
                "id": str(ep.id),
                "title": ep.title,
                "description": ep.description,
                "thumbnail": ep.thumbnail,
                "episode_number": ep.episode,
                "duration": ep.duration,
                "preview_url": ep.preview_url,
                "stream_url": ep.stream_url,
            }
            for ep in episodes
        ],
    }
