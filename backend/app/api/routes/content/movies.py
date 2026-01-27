"""
Movie-specific endpoints.
"""

import logging
import re
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.config import settings
from app.core.security import get_current_active_user, get_optional_user
from app.models.content import Content
from app.models.user import User
from app.services.ffmpeg.realtime_transcode import needs_transcode_by_extension
from app.services.tmdb_service import tmdb_service

router = APIRouter()
logger = logging.getLogger(__name__)

# User-Agent patterns for native iOS/tvOS apps
_NATIVE_APP_PATTERNS = [
    r"Bayit\+/.*CFNetwork",
    r"Darwin/",
    r"AppleTV",
    r"com\.bayit\.plus",
]


def _is_native_app(user_agent: str) -> bool:
    """Check if request is from native iOS/tvOS app."""
    if not user_agent:
        return False
    for pattern in _NATIVE_APP_PATTERNS:
        if re.search(pattern, user_agent, re.IGNORECASE):
            return True
    return False


@router.get("/movies")
async def list_all_movies(
    page: int = 1,
    limit: int = 50,
    category_id: Optional[str] = None,
):
    """Get all movies (non-series content)."""
    skip = (page - 1) * limit

    filters = {
        "is_published": True,
        "is_series": {"$ne": True},
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
                "thumbnail": item.thumbnail or item.poster_url,
                "backdrop": item.backdrop,
                "category": item.category_name,
                "year": item.year,
                "duration": item.duration,
                "type": "movie",
                "is_series": False,
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


@router.get("/movie/{movie_id}/debug")
async def debug_movie(movie_id: str):
    """Debug endpoint to check database vs Beanie."""
    from bson import ObjectId
    from motor.motor_asyncio import AsyncIOMotorClient

    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    direct_doc = await db["content"].find_one({"_id": ObjectId(movie_id)})

    movie = await Content.get(movie_id)

    return {
        "direct_db_url": direct_doc.get("stream_url") if direct_doc else None,
        "beanie_url": movie.stream_url if movie else None,
        "match": (
            direct_doc.get("stream_url") == movie.stream_url
            if (direct_doc and movie)
            else False
        ),
    }


@router.get("/movie/{movie_id}")
async def get_movie_details(
    request: Request,
    movie_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get movie details with TMDB/IMDB data."""
    movie = await Content.get(movie_id)
    if not movie or not movie.is_published or movie.is_series:
        raise HTTPException(status_code=404, detail="Movie not found")

    related = (
        await Content.find(
            Content.category_id == movie.category_id,
            Content.id != movie.id,
            Content.is_published == True,
            Content.is_series == False,
        )
        .limit(6)
        .to_list()
    )

    # Determine stream URL based on platform
    user_agent = request.headers.get("User-Agent", "")
    is_native = _is_native_app(user_agent)
    stream_url = movie.stream_url
    use_transcode = False

    # For web clients, check if transcoding is needed (fast extension-based check)
    if not is_native and stream_url:
        if needs_transcode_by_extension(stream_url):
            use_transcode = True
            stream_url = f"/api/proxy/transcode/{movie_id}"

    # For transcoded streams, provide duration in seconds for proper slider
    duration_hint = None
    if use_transcode and movie.video_metadata:
        duration_hint = movie.video_metadata.get("duration")

    return {
        "id": str(movie.id),
        "title": movie.title,
        "description": movie.description,
        "thumbnail": movie.thumbnail,
        "backdrop": movie.backdrop,
        "category": movie.category_name,
        "duration": movie.duration,
        "duration_hint": duration_hint,
        "year": movie.year,
        "rating": movie.rating,
        "genre": movie.genre,
        "cast": movie.cast,
        "director": movie.director,
        "trailer_url": movie.trailer_url,
        "preview_url": movie.preview_url,
        "stream_url": stream_url,
        "direct_url": movie.stream_url,  # Always provide direct URL
        "tmdb_id": movie.tmdb_id,
        "imdb_id": movie.imdb_id,
        "imdb_rating": movie.imdb_rating,
        "imdb_votes": movie.imdb_votes,
        "available_subtitle_languages": movie.available_subtitle_languages or [],
        "has_subtitles": bool(
            movie.available_subtitle_languages
            and len(movie.available_subtitle_languages) > 0
        ),
        "is_transcoded": use_transcode,
        "related": [
            {
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "duration": item.duration,
                "year": item.year,
                "type": "movie",
            }
            for item in related
        ],
    }


@router.post("/movie/{movie_id}/enrich")
async def enrich_movie_with_tmdb(
    movie_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Enrich movie with TMDB data (admin only)."""
    if current_user.role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    movie = await Content.get(movie_id)
    if not movie or movie.is_series:
        raise HTTPException(status_code=404, detail="Movie not found")

    tmdb_data = await tmdb_service.enrich_movie_content(movie.title, movie.year)

    update_fields = {}
    if tmdb_data.get("tmdb_id"):
        update_fields["tmdb_id"] = tmdb_data["tmdb_id"]
    if tmdb_data.get("imdb_id"):
        update_fields["imdb_id"] = tmdb_data["imdb_id"]
    if tmdb_data.get("imdb_rating") is not None:
        update_fields["imdb_rating"] = tmdb_data["imdb_rating"]
    if tmdb_data.get("imdb_votes") is not None:
        update_fields["imdb_votes"] = tmdb_data["imdb_votes"]
    if tmdb_data.get("release_year") and not movie.year:
        update_fields["year"] = tmdb_data["release_year"]
    if tmdb_data.get("poster") and not movie.poster_url:
        update_fields["poster_url"] = tmdb_data["poster"]
    if tmdb_data.get("trailer_url"):
        update_fields["trailer_url"] = tmdb_data["trailer_url"]
    if tmdb_data.get("backdrop") and not movie.backdrop:
        update_fields["backdrop"] = tmdb_data["backdrop"]
    if tmdb_data.get("cast") and not movie.cast:
        update_fields["cast"] = tmdb_data["cast"]
    if tmdb_data.get("director") and not movie.director:
        update_fields["director"] = tmdb_data["director"]

    if update_fields:
        await movie.update({"$set": update_fields})

    return {
        "message": "Movie enriched with TMDB data",
        "updated_fields": list(update_fields.keys()),
        "tmdb_data": tmdb_data,
    }
