"""
Actors API Endpoints
Browse content by actor: listing, recommendations, and detail with TMDB enrichment.
"""

import random
from typing import List, Optional
from urllib.parse import unquote

from app.core.logging_config import get_logger
from app.core.redis_client import get_redis_client
from app.models.content import Content
from app.services.tmdb_person_service import fetch_actor_tmdb_data
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

logger = get_logger(__name__)
router = APIRouter()

_ACTORS_LIST_TTL = 1800  # 30 min
_ACTORS_RECS_TTL = 3600  # 1 h
_MIN_TMDB_POPULARITY = 10.0  # Only megastars


class ActorListItem(BaseModel):
    name: str
    movie_count: int
    profile_url: Optional[str] = None


class MovieInActor(BaseModel):
    id: str
    title: str
    title_en: Optional[str] = None
    year: Optional[int] = None
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    rating: Optional[float] = None


class ActorDetailResponse(BaseModel):
    name: str
    movie_count: int
    profile_url: Optional[str] = None
    biography: Optional[str] = None
    birthday: Optional[str] = None
    place_of_birth: Optional[str] = None
    movies: List[MovieInActor]


async def _top_actors_aggregation(min_movies: int = 3) -> List[dict]:
    """Aggregate Content to find actors ordered by movie count."""
    pipeline = [
        {"$match": {
            "cast": {"$exists": True, "$ne": []},
            "is_published": True,
            "content_format": {"$ne": "series"},
        }},
        {"$unwind": "$cast"},
        {"$group": {"_id": "$cast", "movie_count": {"$sum": 1}}},
        {"$match": {"movie_count": {"$gte": min_movies}}},
        {"$sort": {"movie_count": -1}},
    ]
    collection = Content.get_pymongo_collection()
    return await collection.aggregate(pipeline).to_list(length=None)


async def _enrich_actor_list(actors_raw: List[dict]) -> List[ActorListItem]:
    """Enrich raw aggregation results; keep only TMDB-recognized megastars."""
    results: List[ActorListItem] = []
    for actor in actors_raw:
        name = actor["_id"]
        tmdb = await fetch_actor_tmdb_data(name)
        popularity = tmdb.get("popularity", 0.0) or 0.0
        if popularity < _MIN_TMDB_POPULARITY or not tmdb.get("tmdb_id"):
            continue
        results.append(ActorListItem(
            name=name,
            movie_count=actor["movie_count"],
            profile_url=tmdb.get("profile_url"),
        ))
    return results


@router.get("/actors", response_model=List[ActorListItem])
async def list_actors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List top actors by movie count. Cached 30 min."""
    cache_key = "actors:list:all"
    redis_client = await get_redis_client()

    cached = await redis_client.get(cache_key)
    if cached and isinstance(cached, dict) and "actors" in cached:
        logger.info("Returning cached actors list")
        page = cached["actors"][skip: skip + limit]
        return [ActorListItem(**item) for item in page]

    results = await _enrich_actor_list(await _top_actors_aggregation())
    cache_data = {"actors": [item.model_dump() for item in results]}
    await redis_client.set_with_ttl(cache_key, cache_data, _ACTORS_LIST_TTL)
    logger.info("Returning %d actors", len(results))
    return results[skip: skip + limit]


@router.get("/actors/recommendations", response_model=List[ActorListItem])
async def get_actor_recommendations(
    limit: int = Query(10, ge=1, le=50),
):
    """Weighted-random actor subset for carousel. Cached 1 hour."""
    cache_key = "actors:recs:weighted"
    redis_client = await get_redis_client()

    cached = await redis_client.get(cache_key)
    if cached and isinstance(cached, dict) and "actors" in cached:
        logger.info("Returning cached actor recommendations")
        return [ActorListItem(**item) for item in cached["actors"][:limit]]

    actors_raw = await _top_actors_aggregation()
    if not actors_raw:
        return []

    max_count = max(a["movie_count"] for a in actors_raw)
    for actor in actors_raw:
        weight = actor["movie_count"] / max_count if max_count else 0
        actor["sort_key"] = random.random() ** (1 / (weight + 0.1))
    actors_raw.sort(key=lambda a: a["sort_key"])

    results = await _enrich_actor_list(actors_raw)
    cache_data = {"actors": [item.model_dump() for item in results]}
    await redis_client.set_with_ttl(cache_key, cache_data, _ACTORS_RECS_TTL)
    logger.info("Returning %d actor recommendations", min(limit, len(results)))
    return results[:limit]


@router.get("/actors/{actor_name}", response_model=ActorDetailResponse)
async def get_actor_detail(actor_name: str):
    """Actor detail: TMDB bio/photo + filmography from content collection."""
    decoded_name = unquote(actor_name)
    tmdb = await fetch_actor_tmdb_data(decoded_name)

    movies = (
        await Content.find({
            "cast": {"$regex": f"^{decoded_name}$", "$options": "i"},
            "is_published": True,
            "content_format": {"$ne": "series"},
        })
        .sort("-year")
        .to_list()
    )
    if not movies:
        raise HTTPException(status_code=404, detail="Actor not found")

    movie_list = [
        MovieInActor(
            id=str(m.id), title=m.title, title_en=m.title_en,
            year=m.year, thumbnail=m.thumbnail, duration=m.duration,
            rating=m.imdb_rating if isinstance(m.imdb_rating, float) else None,
        )
        for m in movies
    ]

    return ActorDetailResponse(
        name=decoded_name, movie_count=len(movie_list),
        profile_url=tmdb.get("profile_url"),
        biography=tmdb.get("biography"),
        birthday=tmdb.get("birthday"),
        place_of_birth=tmdb.get("place_of_birth"),
        movies=movie_list,
    )
