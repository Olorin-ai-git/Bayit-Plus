"""
Collections API Endpoints
Handles movie collection listing, detail, and AI promo generation
"""

import random
from typing import List, Optional

from app.core.logging_config import get_logger
from app.core.redis_client import get_redis_client
from app.models.content import Content
from app.services.collection_detector_service import collection_detector_service
from app.services.collection_promo_service import collection_promo_service
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

logger = get_logger(__name__)

router = APIRouter()


class CollectionResponse(BaseModel):
    """Response model for collection listing"""

    id: str
    title: str
    title_en: Optional[str] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    promo_text: Optional[str] = None
    promo_text_en: Optional[str] = None
    available_movies: int
    total_movies: int
    tmdb_collection_id: Optional[int] = None


class CollectionRecommendationResponse(BaseModel):
    """Response model for collection recommendations with all language promo texts"""

    id: str
    title: str
    title_en: Optional[str] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    promo_text: Optional[str] = None
    promo_text_en: Optional[str] = None
    promo_text_es: Optional[str] = None
    promo_text_fr: Optional[str] = None
    promo_text_it: Optional[str] = None
    promo_text_hi: Optional[str] = None
    promo_text_ta: Optional[str] = None
    promo_text_bn: Optional[str] = None
    promo_text_ja: Optional[str] = None
    promo_text_zh: Optional[str] = None
    available_movies: int
    total_movies: int
    tmdb_collection_id: Optional[int] = None


class MovieInCollection(BaseModel):
    """Movie in collection detail"""

    id: str
    title: str
    title_en: Optional[str] = None
    year: Optional[int] = None
    thumbnail: Optional[str] = None
    duration: Optional[str] = None
    collection_order: int
    rating: Optional[float] = None
    stream_url: str


class CollectionDetailResponse(BaseModel):
    """Response model for collection detail"""

    id: str
    title: str
    title_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    thumbnail: Optional[str] = None
    backdrop: Optional[str] = None
    promo_text: Optional[str] = None
    promo_text_en: Optional[str] = None
    promo_text_es: Optional[str] = None
    promo_text_fr: Optional[str] = None
    promo_text_it: Optional[str] = None
    promo_text_hi: Optional[str] = None
    promo_text_ta: Optional[str] = None
    promo_text_bn: Optional[str] = None
    promo_text_ja: Optional[str] = None
    promo_text_zh: Optional[str] = None
    available_movies: int
    total_movies: int
    tmdb_collection_id: Optional[int] = None
    movies: List[MovieInCollection] = Field(default_factory=list)


class GeneratePromoRequest(BaseModel):
    """Request model for generating promo text"""

    language: str = "he"  # Target language code


class GeneratePromoResponse(BaseModel):
    """Response model for promo generation"""

    promo_text: str
    language: str


class ScanCollectionsResponse(BaseModel):
    """Response model for collection scan"""

    total_movies_scanned: int
    collections_created: int
    collections_skipped: int
    movies_linked: int


@router.get("/collections", response_model=List[CollectionResponse])
async def list_collections(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    published_only: bool = Query(True),
):
    """
    List all movie collections.

    Args:
        skip: Number of results to skip (pagination)
        limit: Maximum number of results to return
        published_only: Only return published collections

    Returns:
        List of collections with metadata
    """
    query = Content.find({"is_collection_parent": True})  # noqa: E712

    if published_only:
        query = query.find({"is_published": True})  # noqa: E712

    collections = await query.skip(skip).limit(limit).to_list()

    results = []
    for collection in collections:
        # Count available movies
        available_movies = await Content.find(
            {"collection_parent_id": str(collection.id)}
).count()

        results.append(
            CollectionResponse(
                id=str(collection.id),
                title=collection.title,
                title_en=collection.title_en,
                thumbnail=collection.thumbnail,
                backdrop=collection.backdrop,
                promo_text=collection.promo_text,
                promo_text_en=collection.promo_text_en,
                available_movies=available_movies,
                total_movies=collection.collection_total_movies or available_movies,
                tmdb_collection_id=collection.tmdb_collection_id,
            )
        )

    logger.info(f"Returning {len(results)} collections")
    return results


@router.get(
    "/collections/recommendations", response_model=List[CollectionRecommendationResponse]
)
async def get_collection_recommendations(
    limit: int = Query(20, ge=1, le=100, description="Max collections to return"),
    offset: int = Query(0, ge=0, description="Number of collections to skip"),
):
    """
    Get published collections with weighted random ordering.

    Collections are ordered using weighted random selection based on available_movies count.
    Collections with more movies appear more frequently in rotation.

    Results are cached in Redis for 30 minutes for performance.

    Args:
        limit: Maximum collections to return (default 20, max 100)
        offset: Skip this many collections for pagination (default 0)

    Returns:
        Paginated list of published collections with all language promo texts
    """
    cache_key = "collection_recs:all:weighted"
    redis_client = await get_redis_client()

    # Check cache first — cache holds the full ordered list, pagination applied after
    cached_data = await redis_client.get(cache_key)
    if cached_data and isinstance(cached_data, dict) and "collections" in cached_data:
        logger.info("Returning cached collection recommendations")
        page_items = cached_data["collections"][offset : offset + limit]
        return [CollectionRecommendationResponse(**item) for item in page_items]

    # Fetch all published collections
    collections = await Content.find(
        {"is_collection_parent": True, "is_published": True}
    ).to_list()

    if not collections:
        logger.warning("No published collections found")
        return []

    # Build collection data with available_movies count
    collection_data = []
    max_movies = 0

    for collection in collections:
        available_movies = await Content.find(
            {"collection_parent_id": str(collection.id)}
        ).count()

        collection_data.append(
            {
                "collection": collection,
                "available_movies": available_movies,
            }
        )

        max_movies = max(max_movies, available_movies)

    # Apply weighted random ordering
    # Weight = available_movies / max_movies (normalized between 0 and 1)
    # Collections with more movies have higher probability of appearing first
    if max_movies > 0:
        # Assign random values weighted by available_movies
        # Collections with more movies get lower random values (appear first when sorted)
        for item in collection_data:
            weight = item["available_movies"] / max_movies
            # Use exponential distribution for weighted random ordering
            # Higher weight = lower random value = appears earlier
            item["sort_key"] = random.random() ** (1 / (weight + 0.1))

        # Sort by random weighted key
        selected_collections = sorted(collection_data, key=lambda x: x["sort_key"])
    else:
        # No movies, just shuffle randomly
        random.shuffle(collection_data)
        selected_collections = collection_data

    # Apply pagination to the weighted-ordered list
    paginated_collections = selected_collections[offset : offset + limit]

    # Build response with all language promo texts
    results = []
    for item in paginated_collections:
        collection = item["collection"]
        available_movies = item["available_movies"]

        results.append(
            CollectionRecommendationResponse(
                id=str(collection.id),
                title=collection.title,
                title_en=collection.title_en,
                thumbnail=collection.thumbnail,
                backdrop=collection.backdrop,
                promo_text=collection.promo_text,
                promo_text_en=collection.promo_text_en,
                promo_text_es=collection.promo_text_es,
                promo_text_fr=collection.promo_text_fr,
                promo_text_it=collection.promo_text_it,
                promo_text_hi=collection.promo_text_hi,
                promo_text_ta=collection.promo_text_ta,
                promo_text_bn=collection.promo_text_bn,
                promo_text_ja=collection.promo_text_ja,
                promo_text_zh=collection.promo_text_zh,
                available_movies=available_movies,
                total_movies=collection.collection_total_movies or available_movies,
                tmdb_collection_id=collection.tmdb_collection_id,
            )
        )

    # Cache for 30 minutes (1800 seconds)
    cache_data = {"collections": [item.model_dump() for item in results]}
    await redis_client.set_with_ttl(cache_key, cache_data, 1800)

    logger.info(f"Returning {len(results)} weighted collection recommendations")
    return results


@router.get("/collections/{collection_id}", response_model=CollectionDetailResponse)
async def get_collection_detail(collection_id: str):
    """
    Get detailed information about a collection including all movies.

    Args:
        collection_id: Collection parent ID

    Returns:
        Collection detail with movies list
    """
    collection = await Content.get(collection_id)

    if not collection or not collection.is_collection_parent:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Fetch movies in collection
    movies = await Content.find(
        {"collection_parent_id": collection_id}
).sort("+collection_order").to_list()

    movie_list = [
        MovieInCollection(
            id=str(movie.id),
            title=movie.title,
            title_en=movie.title_en,
            year=movie.year,
            thumbnail=movie.thumbnail,
            duration=movie.duration,
            collection_order=movie.collection_order or 0,
            rating=movie.imdb_rating if isinstance(movie.imdb_rating, float) else None,
            stream_url=movie.stream_url,
        )
        for movie in movies
    ]

    return CollectionDetailResponse(
        id=str(collection.id),
        title=collection.title,
        title_en=collection.title_en,
        description=collection.description,
        description_en=collection.description_en,
        thumbnail=collection.thumbnail,
        backdrop=collection.backdrop,
        promo_text=collection.promo_text,
        promo_text_en=collection.promo_text_en,
        promo_text_es=collection.promo_text_es,
        promo_text_fr=collection.promo_text_fr,
        promo_text_it=collection.promo_text_it,
        promo_text_hi=collection.promo_text_hi,
        promo_text_ta=collection.promo_text_ta,
        promo_text_bn=collection.promo_text_bn,
        promo_text_ja=collection.promo_text_ja,
        promo_text_zh=collection.promo_text_zh,
        available_movies=len(movies),
        total_movies=collection.collection_total_movies or len(movies),
        tmdb_collection_id=collection.tmdb_collection_id,
        movies=movie_list,
    )


@router.post(
    "/collections/{collection_id}/generate-promo",
    response_model=GeneratePromoResponse,
)
async def generate_collection_promo(
    collection_id: str, request: GeneratePromoRequest
):
    """
    Generate AI promotional text for a collection in specified language.

    Args:
        collection_id: Collection parent ID
        request: Generation request with language

    Returns:
        Generated promotional text
    """
    collection = await Content.get(collection_id)

    if not collection or not collection.is_collection_parent:
        raise HTTPException(status_code=404, detail="Collection not found")

    # Fetch movies to get titles and genres
    movies = await Content.find({"collection_parent_id": collection_id}).to_list()

    movie_titles = [m.title for m in movies if m.title]
    genres = []
    for movie in movies:
        if movie.genres:
            genres.extend(movie.genres)
    genres = list(set(genres))  # Deduplicate

    # Generate promo text
    promo_text = await collection_promo_service.generate_promo(
        collection_name=collection.title,
        movie_titles=movie_titles,
        genres=genres,
        language=request.language,
    )

    # Save to collection
    lang_field_map = {
        "he": "promo_text",
        "en": "promo_text_en",
        "es": "promo_text_es",
        "fr": "promo_text_fr",
        "it": "promo_text_it",
        "hi": "promo_text_hi",
        "ta": "promo_text_ta",
        "bn": "promo_text_bn",
        "ja": "promo_text_ja",
        "zh": "promo_text_zh",
    }

    field_name = lang_field_map.get(request.language, "promo_text_en")
    setattr(collection, field_name, promo_text)
    await collection.save()

    logger.info(
        f"Generated and saved promo for collection {collection.title} "
        f"(language: {request.language})"
    )

    return GeneratePromoResponse(promo_text=promo_text, language=request.language)


@router.post("/collections/scan", response_model=ScanCollectionsResponse)
async def scan_collections():
    """
    Admin endpoint: Scan all movies and auto-detect collections.

    Returns:
        Scan statistics
    """
    logger.info("Starting collection scan via API")
    stats = await collection_detector_service.scan_all_movies()

    return ScanCollectionsResponse(**stats)
