import asyncio
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, Query
from app.models.content import Content, Category
from app.models.user import User
from app.core.security import get_optional_user, get_current_active_user
from app.services.podcast_sync import sync_all_podcasts
from app.services.tmdb_service import tmdb_service
from app.services.subtitle_enrichment import enrich_content_items_with_subtitles
from app.core.config import settings
from google.cloud import storage
from datetime import timedelta
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Series category indicators (Hebrew and English) - used to detect series by category name
SERIES_CATEGORY_KEYWORDS = ["series", "סדרות", "סדרה", "tv shows", "shows"]


def is_series_by_category(category_name: str) -> bool:
    """Check if category name indicates series content."""
    if not category_name:
        return False
    category_lower = category_name.lower()
    return any(keyword in category_lower for keyword in SERIES_CATEGORY_KEYWORDS)


def generate_signed_url_if_needed(url: str) -> str:
    """Generate signed URL for GCS files, return other URLs as-is."""
    if not url:
        return url

    # Check if this is a GCS URL
    if "storage.googleapis.com" not in url and "gs://" not in url:
        return url

    try:
        # Initialize GCS client
        client = storage.Client(project=settings.GCS_PROJECT_ID or None)

        # Extract bucket and blob path from URL
        if url.startswith("gs://"):
            # Format: gs://bucket-name/path/to/file
            parts = url[5:].split("/", 1)
            bucket_name = parts[0]
            blob_name = parts[1] if len(parts) > 1 else ""
        elif "storage.googleapis.com" in url:
            # Format: https://storage.googleapis.com/bucket-name/path/to/file
            parts = url.split("storage.googleapis.com/")[1].split("/", 1)
            bucket_name = parts[0]
            blob_name = parts[1] if len(parts) > 1 else ""
        else:
            return url

        # Get bucket and blob
        bucket = client.bucket(bucket_name)
        blob = bucket.blob(blob_name)

        # Check if blob exists
        if not blob.exists():
            logger.error(f"GCS blob does not exist: {blob_name}")
            return url

        # Generate signed URL (valid for 4 hours)
        signed_url = blob.generate_signed_url(
            version="v4",
            expiration=timedelta(hours=4),
            method="GET",
        )

        logger.info(f"Generated signed URL for {blob_name}")
        return signed_url

    except Exception as e:
        logger.error(f"Failed to generate signed URL for {url}: {e}")
        # Return original URL as fallback
        return url


def convert_to_proxy_url(url: str, base_url: str = "https://api.bayit.tv/api/v1/proxy/media") -> str:
    """Convert GCS URL to proxied URL through our backend."""
    if not url or "storage.googleapis.com" not in url:
        return url

    try:
        import base64
        # Encode the full GCS URL in base64 for the proxy
        encoded_url = base64.urlsafe_b64encode(url.encode()).decode()
        return f"{base_url}/{encoded_url}"
    except Exception as e:
        logger.error(f"Failed to convert URL to proxy: {e}")
        return url


@router.get("/featured")
async def get_featured(current_user: Optional[User] = Depends(get_optional_user)):
    """Get featured content for homepage - OPTIMIZED for performance."""
    import time
    start_time = time.time()

    # Run initial queries in parallel for better performance
    # Use aggregation with projection to exclude large base64 fields
    async def get_hero():
        pipeline = [
            {"$match": {"is_featured": True, "is_published": True}},
            {"$project": {"thumbnail_data": 0, "backdrop_data": 0}},
            {"$limit": 1}
        ]
        collection = Content.get_settings().pymongo_collection
        cursor = collection.aggregate(pipeline)
        results = await cursor.to_list(length=1)
        return results[0] if results else None

    async def get_featured_content():
        pipeline = [
            {"$match": {
                "is_featured": True,
                "is_published": True,
                # Exclude episodes - only include items WITHOUT a series_id
                "$or": [
                    {"series_id": None},
                    {"series_id": {"$exists": False}},
                    {"series_id": ""},
                ],
                # Exclude quality variants
                "is_quality_variant": {"$ne": True},
            }},
            {"$project": {"thumbnail_data": 0, "backdrop_data": 0}},
            {"$limit": 10}
        ]
        collection = Content.get_settings().pymongo_collection
        cursor = collection.aggregate(pipeline)
        return await cursor.to_list(length=None)

    async def get_categories():
        # Only fetch categories that should appear on homepage
        return await Category.find(
            Category.is_active == True,
            Category.show_on_homepage == True
        ).sort("order").limit(6).to_list()

    # Await all initial queries in parallel
    hero_content, featured_content, categories = await asyncio.gather(
        get_hero(), get_featured_content(), get_categories()
    )
    logger.info(f"⏱️ Featured: Initial queries took {time.time() - start_time:.2f}s")

    # Build spotlight items from raw dicts (NO extra queries - use existing data)
    spotlight_items = []
    for item in featured_content:
        category_name = item.get("category_name")
        is_series = item.get("is_series", False) or is_series_by_category(category_name)
        spotlight_items.append({
            "id": str(item.get("_id")),
            "title": item.get("title"),
            "description": item.get("description"),
            "backdrop": item.get("backdrop") or item.get("thumbnail") or item.get("poster_url"),
            "thumbnail": item.get("thumbnail") or item.get("poster_url"),
            "category": category_name,
            "year": item.get("year"),
            "duration": item.get("duration"),
            "rating": item.get("rating"),
            "is_series": is_series,
            "total_episodes": item.get("total_episodes") if is_series else None,
        })

    # Fetch category content with LIMIT per category at DB level
    cat_query_start = time.time()
    category_ids = [str(cat.id) for cat in categories]
    # Build category map with all localized names
    category_info_map = {
        str(cat.id): {
            "name": cat.name,
            "name_en": cat.name_en,
            "name_es": cat.name_es,
        }
        for cat in categories
    }
    category_name_map = {str(cat.id): cat.name for cat in categories}

    # Optimized pipeline: only fetch needed fields, group by category, limit 10 per category
    # Exclude episodes (series_id set) and quality variants (is_quality_variant=True)
    pipeline = [
        {"$match": {
            "category_id": {"$in": category_ids},
            "is_published": True,
            # Exclude episodes - only include items WITHOUT a series_id
            "$or": [
                {"series_id": None},
                {"series_id": {"$exists": False}},
                {"series_id": ""},
            ],
            # Exclude quality variants
            "is_quality_variant": {"$ne": True},
        }},
        # Only project fields we actually need (include poster_url and thumbnail_data for fallback)
        {"$project": {
            "_id": 1,
            "title": 1,
            "thumbnail": 1,
            "thumbnail_data": 1,
            "poster_url": 1,
            "duration": 1,
            "year": 1,
            "category_id": 1,
            "is_series": 1,
            "total_episodes": 1,
        }},
        # Sort for consistent ordering
        {"$sort": {"_id": -1}},
        # Group by category and take first 10
        {"$group": {
            "_id": "$category_id",
            "items": {"$push": {
                "_id": "$_id",
                "title": "$title",
                "thumbnail": "$thumbnail",
                "thumbnail_data": "$thumbnail_data",
                "poster_url": "$poster_url",
                "duration": "$duration",
                "year": "$year",
                "is_series": "$is_series",
                "total_episodes": "$total_episodes",
            }}
        }},
        # Limit to 10 items per category
        {"$project": {
            "_id": 1,
            "items": {"$slice": ["$items", 10]}
        }}
    ]
    cursor = Content.get_settings().pymongo_collection.aggregate(pipeline)
    grouped_content = await cursor.to_list(length=None)
    logger.info(f"⏱️ Featured: Category content query took {time.time() - cat_query_start:.2f}s")

    # Build category items map from grouped results
    category_items_map = {}
    for group in grouped_content:
        cat_id = group["_id"]
        cat_info = category_info_map.get(cat_id, {})
        cat_name = cat_info.get("name", "")
        category_items = []
        for item in group["items"]:
            # Check both is_series flag and category name
            is_series = item.get("is_series", False) or is_series_by_category(cat_name)
            # Use thumbnail with fallback to thumbnail_data and poster_url
            thumbnail = item.get("thumbnail_data") or item.get("thumbnail") or item.get("poster_url")
            item_data = {
                "id": str(item["_id"]),
                "title": item.get("title"),
                "thumbnail": thumbnail,
                "duration": item.get("duration"),
                "year": item.get("year"),
                "category": cat_name,
                "category_name_en": cat_info.get("name_en"),
                "category_name_es": cat_info.get("name_es"),
                "type": "series" if is_series else "movie",
                "is_series": is_series,
            }
            if is_series:
                item_data["total_episodes"] = item.get("total_episodes") or 0
            category_items.append(item_data)

        # Sort to show available content first (movies, then series with episodes, then empty series)
        def availability_sort_key(item):
            is_series = item.get("is_series", False)
            total_episodes = item.get("total_episodes", 0) or 0
            if not is_series:
                return (0, 0)
            elif total_episodes > 0:
                return (1, -total_episodes)
            else:
                return (2, 0)

        category_items.sort(key=availability_sort_key)
        category_items_map[cat_id] = category_items

    # NOTE: Subtitle enrichment removed from featured endpoint for performance
    # Subtitle data can be fetched separately via /content/{id} if needed

    # Build final category data (preserve category order) with localized names
    category_data = [
        {
            "id": str(cat.id),
            "name": cat.name,
            "name_en": cat.name_en,
            "name_es": cat.name_es,
            "items": category_items_map.get(str(cat.id), []),
        }
        for cat in categories
    ]

    logger.info(f"⏱️ Featured: TOTAL took {time.time() - start_time:.2f}s")

    return {
        "hero": {
            "id": str(hero_content.get("_id")) if hero_content else None,
            "title": hero_content.get("title") if hero_content else None,
            "description": hero_content.get("description") if hero_content else None,
            "backdrop": hero_content.get("backdrop") if hero_content else None,
            "thumbnail": hero_content.get("thumbnail") if hero_content else None,
            "category": hero_content.get("category_name") if hero_content else None,
            "year": hero_content.get("year") if hero_content else None,
            "duration": hero_content.get("duration") if hero_content else None,
            "rating": hero_content.get("rating") if hero_content else None,
        } if hero_content else None,
        "spotlight": spotlight_items,
        "categories": category_data,
    }


@router.get("/categories")
async def get_categories():
    """Get all content categories with localized names."""
    categories = await Category.find(Category.is_active == True).sort("order").to_list()
    return {
        "categories": [
            {
                "id": str(cat.id),
                "name": cat.name,
                "name_en": cat.name_en,
                "name_es": cat.name_es,
                "slug": cat.slug,
                "thumbnail": cat.thumbnail,
            }
            for cat in categories
        ]
    }


@router.get("/all")
async def get_all_content(
    page: int = Query(1, ge=1),
    limit: int = Query(100, ge=1, le=200),
):
    """Get all published content (movies and series, excluding episodes)."""
    skip = (page - 1) * limit

    # Combined filter to exclude episodes and quality variants
    # Episodes have series_id pointing to parent series
    # Quality variants have is_quality_variant=True
    content_filter = {
        "is_published": True,
        # Exclude episodes - only include items WITHOUT a series_id
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ],
        # Exclude quality variants
        "is_quality_variant": {"$ne": True},
    }

    # Fetch content and categories in parallel
    async def get_content():
        return await Content.find(content_filter).skip(skip).limit(limit).to_list()

    async def get_total():
        return await Content.find(content_filter).count()

    async def get_all_categories():
        return await Category.find().to_list()

    items, total, categories = await asyncio.gather(
        get_content(), get_total(), get_all_categories()
    )

    # Build category localization map: category_id -> {name, name_en, name_es}
    category_map = {
        str(cat.id): {
            "name": cat.name,
            "name_en": cat.name_en,
            "name_es": cat.name_es,
        }
        for cat in categories
    }

    # Debug logging for Avatar
    avatar = next((item for item in items if item.title == "Avatar"), None)
    if avatar:
        logger.info(f"Avatar found in /content/all: id={avatar.id}, thumbnail={avatar.thumbnail}, thumbnail_data={bool(avatar.thumbnail_data)}, poster_url={avatar.poster_url}")

    def is_series_content(item) -> bool:
        """Determine if content is a series based on is_series flag OR category name."""
        return item.is_series or is_series_by_category(item.category_name)

    # Build content items with localized category names and episode counts
    content_items = []
    for item in items:
        cat_info = category_map.get(item.category_id, {})
        is_series = is_series_content(item)
        item_data = {
            "id": str(item.id),
            "title": item.title,
            "description": item.description,
            "thumbnail": item.thumbnail_data or convert_to_proxy_url(item.thumbnail or item.poster_url) if (item.thumbnail_data or item.thumbnail or item.poster_url) else None,
            "backdrop": item.backdrop_data or convert_to_proxy_url(item.backdrop) if (item.backdrop_data or item.backdrop) else None,
            "category": item.category_name,
            "category_name_en": cat_info.get("name_en"),
            "category_name_es": cat_info.get("name_es"),
            "year": item.year,
            "duration": item.duration,
            "is_series": is_series,
            "type": "series" if is_series else "movie",
        }

        # Calculate episode count for series
        if is_series:
            if item.total_episodes:
                item_data["total_episodes"] = item.total_episodes
            else:
                episode_count = await Content.find(
                    Content.series_id == str(item.id),
                    Content.is_published == True,
                ).count()
                item_data["total_episodes"] = episode_count

        content_items.append(item_data)

    # Sort to show available content first:
    # - Movies (non-series) always available
    # - Series with episodes (total_episodes > 0) available
    # - Series without episodes (total_episodes = 0) last
    def availability_sort_key(item):
        is_series = item.get("is_series", False)
        total_episodes = item.get("total_episodes", 0) or 0
        if not is_series:
            return (0, 0)
        elif total_episodes > 0:
            return (1, -total_episodes)
        else:
            return (2, 0)

    content_items.sort(key=availability_sort_key)

    # Enrich with subtitle languages
    content_items = await enrich_content_items_with_subtitles(content_items)

    return {
        "items": content_items,
        "total": total,
        "page": page,
        "limit": limit,
    }


@router.post("/sync")
async def sync_all_content():
    """
    Sync all content: podcasts, live channels, and trending data.
    Podcast syncing is now background-only (scheduled task).
    """
    logger.info("📻 Full content sync requested (podcasts sync in background)")

    # Podcast syncing disabled - runs as background task only
    # Trending is fetched on-demand from news APIs, so no sync needed
    # Live channels are typically static or updated via admin, so no sync needed

    return {
        "status": "background_only",
        "message": "Podcast syncing runs as a scheduled background task only. Changes will appear automatically.",
        "podcasts": {
            "total": 0,
            "synced": 0,
            "episodes_added": 0,
        },
    }


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

    # Exclude episodes (items with series_id set) and quality variants - only show movies and parent series
    content_filter = {
        "category_id": category_obj_id,
        "is_published": True,
        # Exclude episodes - only include items WITHOUT a series_id
        "$or": [
            {"series_id": None},
            {"series_id": {"$exists": False}},
            {"series_id": ""},
        ],
        # Exclude quality variants
        "is_quality_variant": {"$ne": True},
    }

    items = await Content.find(content_filter).skip(skip).limit(limit).to_list()
    total = await Content.find(content_filter).count()

    # Build items with episode counts for series
    result_items = []
    for item in items:
        # Determine if series based on is_series flag OR category name
        is_series = item.is_series or is_series_by_category(category.name)

        item_data = {
            "id": str(item.id),
            "title": item.title,
            # Use stored image data if available, otherwise fall back to URLs
            "thumbnail": item.thumbnail_data or item.thumbnail or item.poster_url,
            "duration": item.duration,
            "year": item.year,
            "category": category.name,
            "category_name_en": category.name_en,
            "category_name_es": category.name_es,
            "type": "series" if is_series else "movie",
            "is_series": is_series,
        }

        # Calculate episode count for series if not already set
        if is_series:
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

    # Sort to show available content first:
    # - Movies (non-series) always available
    # - Series with episodes (total_episodes > 0) available
    # - Series without episodes (total_episodes = 0) last
    def availability_sort_key(item):
        is_series = item.get("is_series", False)
        total_episodes = item.get("total_episodes", 0) or 0
        # Non-series (movies) get priority 0, series with episodes get 1, empty series get 2
        if not is_series:
            return (0, 0)
        elif total_episodes > 0:
            return (1, -total_episodes)  # More episodes = higher priority
        else:
            return (2, 0)

    result_items.sort(key=availability_sort_key)

    # Enrich with subtitle languages
    result_items = await enrich_content_items_with_subtitles(result_items)

    return {
        "category": {
            "id": str(category.id),
            "name": category.name,
            "name_en": category.name_en,
            "name_es": category.name_es,
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

    response = {
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
        "available_subtitle_languages": content.available_subtitle_languages or [],
        "has_subtitles": bool(content.available_subtitle_languages and len(content.available_subtitle_languages) > 0),
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

    # Include stream URL if user is authenticated (bucket is public now)
    if current_user:
        response["stream_url"] = content.stream_url
        response["stream_type"] = content.stream_type
        response["preview_url"] = content.preview_url
        response["trailer_url"] = content.trailer_url

    return response


@router.get("/{content_id}/stream")
async def get_stream_url(
    content_id: str,
    quality: Optional[str] = Query(None, description="Quality tier to request (4k, 1080p, 720p, 480p)"),
    current_user: User = Depends(get_current_active_user),
):
    """Get stream URL for content (requires authentication). Supports quality selection."""
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

    # Build available qualities from quality_variants or current content
    available_qualities = []
    stream_url = content.stream_url
    current_quality = content.quality_tier

    # If this content has quality variants, use them
    if content.quality_variants:
        for variant in content.quality_variants:
            available_qualities.append({
                "quality": variant.get("quality_tier"),
                "resolution_height": variant.get("resolution_height"),
                "content_id": variant.get("content_id"),
            })

        # If specific quality requested, find the matching variant
        if quality:
            matching_variant = next(
                (v for v in content.quality_variants if v.get("quality_tier") == quality),
                None
            )
            if matching_variant:
                stream_url = matching_variant.get("stream_url", content.stream_url)
                current_quality = matching_variant.get("quality_tier")

    # If this is a variant pointing to a primary, fetch primary's variants
    elif content.primary_content_id:
        primary = await Content.get(content.primary_content_id)
        if primary and primary.quality_variants:
            for variant in primary.quality_variants:
                available_qualities.append({
                    "quality": variant.get("quality_tier"),
                    "resolution_height": variant.get("resolution_height"),
                    "content_id": variant.get("content_id"),
                })

            # If specific quality requested, find the matching variant
            if quality:
                matching_variant = next(
                    (v for v in primary.quality_variants if v.get("quality_tier") == quality),
                    None
                )
                if matching_variant:
                    stream_url = matching_variant.get("stream_url", content.stream_url)
                    current_quality = matching_variant.get("quality_tier")

    # If no variants exist, just report current quality based on video_metadata
    if not available_qualities and content.video_metadata:
        height = content.video_metadata.get("height", 0)
        if height >= 2160:
            current_quality = "4k"
        elif height >= 1080:
            current_quality = "1080p"
        elif height >= 720:
            current_quality = "720p"
        elif height >= 480:
            current_quality = "480p"

        available_qualities.append({
            "quality": current_quality,
            "resolution_height": height,
            "content_id": str(content.id),
        })

    return {
        "url": stream_url,
        "type": content.stream_type,
        "quality": current_quality,
        "available_qualities": available_qualities,
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
        "available_subtitle_languages": series.available_subtitle_languages or [],
        "has_subtitles": bool(series.available_subtitle_languages and len(series.available_subtitle_languages) > 0),
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

@router.get("/movie/{movie_id}/debug")
async def debug_movie(movie_id: str):
    """Debug endpoint to check database vs Beanie."""
    from motor.motor_asyncio import AsyncIOMotorClient
    from bson import ObjectId

    # Direct MongoDB query
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.MONGODB_DB_NAME]
    direct_doc = await db["content"].find_one({"_id": ObjectId(movie_id)})

    # Beanie query
    movie = await Content.get(movie_id)

    return {
        "direct_db_url": direct_doc.get("stream_url") if direct_doc else None,
        "beanie_url": movie.stream_url if movie else None,
        "match": direct_doc.get("stream_url") == movie.stream_url if (direct_doc and movie) else False
    }


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
        "trailer_url": movie.trailer_url,
        "preview_url": movie.preview_url,
        "stream_url": movie.stream_url,
        "tmdb_id": movie.tmdb_id,
        "imdb_id": movie.imdb_id,
        "imdb_rating": movie.imdb_rating,
        "imdb_votes": movie.imdb_votes,
        "available_subtitle_languages": movie.available_subtitle_languages or [],
        "has_subtitles": bool(movie.available_subtitle_languages and len(movie.available_subtitle_languages) > 0),
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
