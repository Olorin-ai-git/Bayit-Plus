from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models.content import Content, Category
from app.models.user import User
from app.core.security import get_optional_user, get_current_active_user
from app.services.podcast_sync import sync_all_podcasts
from app.services.tmdb_service import tmdb_service
from google.cloud import storage
from datetime import timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


def generate_signed_url_if_needed(url: str) -> str:
    """Generate signed URL for GCS files, return original URL otherwise."""
    if not url or "storage.googleapis.com" not in url:
        return url

    try:
        # Extract bucket and blob path from URL
        # Format: https://storage.googleapis.com/bucket-name/path/to/file
        parts = url.replace("https://storage.googleapis.com/", "").split("/", 1)
        if len(parts) == 2:
            bucket_name, blob_name = parts

            # Generate signed URL (valid for 4 hours)
            storage_client = storage.Client()
            bucket = storage_client.bucket(bucket_name)
            blob = bucket.blob(blob_name)

            signed_url = blob.generate_signed_url(
                version="v4",
                expiration=timedelta(hours=4),
                method="GET"
            )
            return signed_url
    except Exception as e:
        logger.error(f"Failed to generate signed URL for {url}: {e}")
        # Fall back to original URL if signing fails
        pass

    return url


@router.get("/featured")
async def get_featured(current_user: Optional[User] = Depends(get_optional_user)):
    """Get featured content for homepage."""
    # Get featured content for hero
    hero_content = await Content.find_one(
        Content.is_featured == True,
        Content.is_published == True,
    )

    # Get spotlight items - one entry per featured series (not episodes)
    spotlight_items = []

    # Get all featured series
    featured_series = await Content.find(
        Content.is_featured == True,
        Content.is_published == True,
        Content.is_series == True,
    ).to_list()

    # Add each series as a single spotlight item
    for series in featured_series:
        # Get first episode for playback reference
        first_episode = await Content.find_one(
            Content.series_id == str(series.id),
            Content.is_published == True,
        )

        spotlight_items.append({
            "id": str(series.id),
            "title": series.title,
            "description": series.description,
            "backdrop": series.backdrop or series.thumbnail,
            "thumbnail": series.thumbnail,
            "category": series.category_name,
            "year": series.year,
            "duration": series.duration,
            "rating": series.rating,
            "is_series": True,
            "first_episode_id": str(first_episode.id) if first_episode else None,
        })

    # Get categories with their content
    categories = await Category.find(Category.is_active == True).sort("order").to_list()
    category_data = []

    for cat in categories:
        # Exclude episodes (items with series_id set) - only show movies and parent series
        items = await Content.find(
            Content.category_id == str(cat.id),
            Content.is_published == True,
            {"$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""},
            ]},
        ).limit(10).to_list()

        # Build items with episode counts for series
        category_items = []
        for item in items:
            item_data = {
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "duration": item.duration,
                "year": item.year,
                "category": cat.name,
                "type": "series" if item.is_series else "movie",
                "is_series": item.is_series,
            }

            # Calculate episode count for series if not already set
            if item.is_series:
                if item.total_episodes:
                    item_data["total_episodes"] = item.total_episodes
                else:
                    # Count episodes dynamically
                    episode_count = await Content.find(
                        Content.series_id == str(item.id),
                        Content.is_published == True,
                    ).count()
                    item_data["total_episodes"] = episode_count

            category_items.append(item_data)

        category_data.append({
            "id": str(cat.id),
            "name": cat.name,
            "items": category_items,
        })

    return {
        "hero": {
            "id": str(hero_content.id) if hero_content else None,
            "title": hero_content.title if hero_content else None,
            "description": hero_content.description if hero_content else None,
            "backdrop": hero_content.backdrop if hero_content else None,
            "thumbnail": hero_content.thumbnail if hero_content else None,
            "category": hero_content.category_name if hero_content else None,
            "year": hero_content.year if hero_content else None,
            "duration": hero_content.duration if hero_content else None,
            "rating": hero_content.rating if hero_content else None,
        } if hero_content else None,
        "spotlight": spotlight_items,
        "categories": category_data,
    }


@router.get("/categories")
async def get_categories():
    """Get all content categories."""
    categories = await Category.find(Category.is_active == True).sort("order").to_list()
    return {
        "categories": [
            {
                "id": str(cat.id),
                "name": cat.name,
                "slug": cat.slug,
                "thumbnail": cat.thumbnail,
            }
            for cat in categories
        ]
    }


@router.post("/sync")
async def sync_all_content():
    """Sync all content: podcasts, live channels, and trending data."""
    try:
        logger.info("📻 Full content sync triggered")

        # Sync podcasts
        podcast_result = await sync_all_podcasts(max_episodes=20)

        # Note: Trending is fetched on-demand from news APIs, so no sync needed
        # Live channels are typically static or updated via admin, so no sync needed

        return {
            "status": "synced",
            "podcasts": {
                "total": podcast_result["total_podcasts"],
                "synced": podcast_result["podcasts_synced"],
                "episodes_added": podcast_result["total_episodes_added"],
            },
        }
    except Exception as e:
        logger.error(f"Error syncing content: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to sync content")


@router.get("/category/{category_id}")
async def get_by_category(
    category_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Get content by category (accepts ID or slug)."""
    skip = (page - 1) * limit

    # Try to get category by ID first, then by slug
    category = None
    try:
        category = await Category.get(category_id)
    except Exception:
        # ID parsing failed, try slug lookup
        pass

    if not category:
        # Try to get by slug (e.g., "movies" -> Category with slug="movies")
        category = await Category.find_one(Category.slug == category_id)

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    # Use the actual category ID from the found category object
    category_obj_id = str(category.id)

    # Exclude episodes (items with series_id set) - only show movies and parent series
    items = await Content.find(
        Content.category_id == category_obj_id,
        Content.is_published == True,
        {"$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ]},
    ).skip(skip).limit(limit).to_list()

    total = await Content.find(
        Content.category_id == category_obj_id,
        Content.is_published == True,
        {"$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ]},
    ).count()

    # Build items with episode counts for series
    result_items = []
    for item in items:
        item_data = {
            "id": str(item.id),
            "title": item.title,
            "thumbnail": item.thumbnail,
            "duration": item.duration,
            "year": item.year,
            "category": category.name,
            "type": "series" if item.is_series else "movie",
            "is_series": item.is_series,
        }

        # Calculate episode count for series if not already set
        if item.is_series:
            if item.total_episodes:
                item_data["total_episodes"] = item.total_episodes
            else:
                # Count episodes dynamically
                episode_count = await Content.find(
                    Content.series_id == str(item.id),
                    Content.is_published == True,
                ).count()
                item_data["total_episodes"] = episode_count

        result_items.append(item_data)

    return {
        "category": {
            "id": str(category.id),
            "name": category.name,
        },
        "items": result_items,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit,
    }


@router.get("/{content_id}")
async def get_content(
    content_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get content details."""
    content = await Content.get(content_id)
    if not content or not content.is_published:
        raise HTTPException(status_code=404, detail="Content not found")

    # Get related content
    related = await Content.find(
        Content.category_id == content.category_id,
        Content.id != content.id,
        Content.is_published == True,
    ).limit(6).to_list()

    return {
        "id": str(content.id),
        "title": content.title,
        "description": content.description,
        "thumbnail": content.thumbnail,
        "backdrop": content.backdrop,
        "category": content.category_name,
        "duration": content.duration,
        "year": content.year,
        "rating": content.rating,
        "genre": content.genre,
        "cast": content.cast,
        "director": content.director,
        "is_series": content.is_series,
        "type": "series" if content.is_series else "movie",
        "related": [
            {
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "duration": item.duration,
                "year": item.year,
                "type": "series" if item.is_series else "movie",
            }
            for item in related
        ],
    }


@router.get("/{content_id}/stream")
async def get_stream_url(
    content_id: str,
    current_user: User = Depends(get_current_active_user),
):
    """Get stream URL for content (requires authentication)."""
    content = await Content.get(content_id)
    if not content or not content.is_published:
        raise HTTPException(status_code=404, detail="Content not found")

    # Admin users bypass subscription checks
    is_admin = current_user.role in ["super_admin", "admin"]

    # Check subscription (skip for admins)
    if not is_admin:
        required_tier = content.requires_subscription or "basic"

        # If content requires no subscription (free), allow access
        if required_tier != "none":
            user_tier = current_user.subscription_tier

            tier_levels = {"basic": 1, "premium": 2, "family": 3}
            if not user_tier or tier_levels.get(user_tier, 0) < tier_levels.get(required_tier, 1):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Subscription upgrade required",
                )

    # Generate signed URL for GCS files
    stream_url = generate_signed_url_if_needed(content.stream_url)
    if stream_url != content.stream_url:
        logger.info(f"Generated signed URL for content {content_id}")

    return {
        "url": stream_url,
        "type": content.stream_type,
        "is_drm_protected": content.is_drm_protected,
        "drm_key_id": content.drm_key_id if content.is_drm_protected else None,
    }


@router.post("/search")
async def search_content(
    query: str,
    type: Optional[str] = None,  # vod, live, radio, podcast
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=50),
):
    """Search across all content."""
    skip = (page - 1) * limit
    results = []

    # Search in VOD content
    if not type or type == "vod":
        vod_items = await Content.find(
            {"$text": {"$search": query}},
            Content.is_published == True,
        ).limit(limit).to_list()

        for item in vod_items:
            results.append({
                "id": str(item.id),
                "title": item.title,
                "thumbnail": item.thumbnail,
                "duration": item.duration,
                "year": item.year,
                "category": item.category_name,
                "type": "series" if item.is_series else "movie",
            })

    # Note: In production, also search live channels, radio, podcasts
    # This is a simplified version

    return {
        "query": query,
        "results": results,
        "total": len(results),
    }


# ============ Series Detail Endpoints ============

@router.get("/series/{series_id}")
async def get_series_details(
    series_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get full series details with seasons summary."""
    series = await Content.get(series_id)
    if not series or not series.is_published or not series.is_series:
        raise HTTPException(status_code=404, detail="Series not found")

    # Get all episodes for this series
    episodes = await Content.find(
        Content.series_id == series_id,
        Content.is_published == True,
    ).sort([("season", 1), ("episode", 1)]).to_list()

    # Build seasons summary
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

    # Get related series
    related = await Content.find(
        Content.category_id == series.category_id,
        Content.id != series.id,
        Content.is_published == True,
        Content.is_series == True,
    ).limit(6).to_list()

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

    # Get all episodes and group by season
    episodes = await Content.find(
        Content.series_id == series_id,
        Content.is_published == True,
    ).sort([("season", 1), ("episode", 1)]).to_list()

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

    episodes = await Content.find(
        Content.series_id == series_id,
        Content.season == season_num,
        Content.is_published == True,
    ).sort("episode").to_list()

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
                "stream_url": ep.stream_url,  # For preview fallback
            }
            for ep in episodes
        ],
    }


# ============ Movie Detail Endpoints ============

@router.get("/movie/{movie_id}")
async def get_movie_details(
    movie_id: str,
    current_user: Optional[User] = Depends(get_optional_user),
):
    """Get movie details with TMDB/IMDB data."""
    movie = await Content.get(movie_id)
    if not movie or not movie.is_published or movie.is_series:
        raise HTTPException(status_code=404, detail="Movie not found")

    # Get related movies
    related = await Content.find(
        Content.category_id == movie.category_id,
        Content.id != movie.id,
        Content.is_published == True,
        Content.is_series == False,
    ).limit(6).to_list()

    return {
        "id": str(movie.id),
        "title": movie.title,
        "description": movie.description,
        "thumbnail": movie.thumbnail,
        "backdrop": movie.backdrop,
        "category": movie.category_name,
        "duration": movie.duration,
        "year": movie.year,
        "rating": movie.rating,
        "genre": movie.genre,
        "cast": movie.cast,
        "director": movie.director,
        "trailer_url": generate_signed_url_if_needed(movie.trailer_url) if movie.trailer_url else None,
        "preview_url": generate_signed_url_if_needed(movie.preview_url) if movie.preview_url else None,
        "stream_url": generate_signed_url_if_needed(movie.stream_url) if movie.stream_url else None,
        "tmdb_id": movie.tmdb_id,
        "imdb_id": movie.imdb_id,
        "imdb_rating": movie.imdb_rating,
        "imdb_votes": movie.imdb_votes,
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

    # Fetch TMDB data
    tmdb_data = await tmdb_service.enrich_movie_content(movie.title, movie.year)

    # Update movie with TMDB data
    update_fields = {}
    if tmdb_data.get("tmdb_id"):
        update_fields["tmdb_id"] = tmdb_data["tmdb_id"]
    if tmdb_data.get("imdb_id"):
        update_fields["imdb_id"] = tmdb_data["imdb_id"]
    if tmdb_data.get("imdb_rating"):
        update_fields["imdb_rating"] = tmdb_data["imdb_rating"]
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


@router.get("/{content_id}/preview")
async def get_content_preview(content_id: str):
    """Get preview/trailer URL for content."""
    content = await Content.get(content_id)
    if not content or not content.is_published:
        raise HTTPException(status_code=404, detail="Content not found")

    return {
        "id": str(content.id),
        "preview_url": content.preview_url,
        "trailer_url": content.trailer_url,
        "thumbnail": content.thumbnail,
        "backdrop": content.backdrop,
    }
