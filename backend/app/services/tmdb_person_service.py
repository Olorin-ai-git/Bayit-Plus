"""
TMDB Person Service
Fetch actor/person metadata from The Movie Database (TMDB) API.
Uses the shared tmdb_service singleton for HTTP requests and image URLs.
"""

from typing import Any, Dict, Optional

from app.core.logging_config import get_logger
from app.core.redis_client import get_redis_client
from app.services.tmdb_service import tmdb_service

logger = get_logger(__name__)

# Redis cache TTL for actor TMDB data (24 hours)
_ACTOR_CACHE_TTL_SECONDS = 86400


def _actor_slug(name: str) -> str:
    """Normalise an actor name into a lowercase slug for cache keys."""
    return name.strip().lower().replace(" ", "-")


async def search_person(name: str) -> Optional[Dict[str, Any]]:
    """Search TMDB for a person by name. Returns the first result or None."""
    data = await tmdb_service._make_request(
        "/search/person", params={"query": name}
    )
    if data and data.get("results"):
        return data["results"][0]
    return None


async def get_person_details(tmdb_id: int) -> Optional[Dict[str, Any]]:
    """Fetch full person details including movie credits from TMDB."""
    return await tmdb_service._make_request(
        f"/person/{tmdb_id}",
        params={"append_to_response": "movie_credits"},
    )


async def fetch_actor_tmdb_data(name: str) -> Dict[str, Any]:
    """
    Look up an actor on TMDB and return enriched metadata.

    Results are cached in Redis under ``actor:tmdb:{slug}`` for 24 hours.

    Returns a dict with keys:
        tmdb_id, profile_url, biography, birthday, place_of_birth
    """
    slug = _actor_slug(name)
    cache_key = f"actor:tmdb:{slug}"

    redis_client = await get_redis_client()
    cached = await redis_client.get(cache_key)
    if cached and isinstance(cached, dict) and "tmdb_id" in cached:
        logger.info("Returning cached TMDB data for actor %s", name)
        return cached

    result: Dict[str, Any] = {
        "tmdb_id": None,
        "profile_url": None,
        "biography": None,
        "birthday": None,
        "place_of_birth": None,
        "popularity": 0.0,
    }

    person = await search_person(name)
    if not person:
        logger.info("TMDB: No person results for '%s'", name)
        return result

    tmdb_id = person.get("id")
    result["tmdb_id"] = tmdb_id
    result["popularity"] = person.get("popularity", 0.0)

    # Use profile image from search result as a quick fallback
    if person.get("profile_path"):
        result["profile_url"] = tmdb_service.get_image_url(
            person["profile_path"], "w500"
        )

    # Fetch full details for biography and birthday
    details = await get_person_details(tmdb_id)
    if details:
        result["biography"] = details.get("biography") or None
        result["birthday"] = details.get("birthday") or None
        result["place_of_birth"] = details.get("place_of_birth") or None
        if details.get("profile_path"):
            result["profile_url"] = tmdb_service.get_image_url(
                details["profile_path"], "w500"
            )

    await redis_client.set_with_ttl(cache_key, result, _ACTOR_CACHE_TTL_SECONDS)
    logger.info(
        "Fetched and cached TMDB data for actor '%s' (tmdb_id=%s)",
        name,
        tmdb_id,
    )
    return result
