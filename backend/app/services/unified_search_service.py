"""
Unified Search Service for Bayit+

Provides comprehensive search functionality across all content types:
- Text search (MongoDB full-text with weighted fields)
- Subtitle content search (dialogue search)
- Advanced metadata filtering (genre, year, rating, language)
- Result ranking and scoring
- Search suggestions and autocomplete
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from pydantic import BaseModel, Field

from app.core.config import settings
from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc
from app.services.search_cache import get_cache

logger = logging.getLogger(__name__)


class SearchFilters(BaseModel):
    """Advanced search filters"""

    content_types: List[str] = Field(
        default=["vod"], description="vod, live, radio, podcast"
    )
    genres: Optional[List[str]] = Field(None, description="Filter by genres")
    year_min: Optional[int] = Field(None, description="Minimum year")
    year_max: Optional[int] = Field(None, description="Maximum year")
    rating_min: Optional[float] = Field(None, description="Minimum rating")
    subtitle_languages: Optional[List[str]] = Field(
        None, description="Required subtitle languages"
    )
    subscription_tier: Optional[str] = Field(None, description="basic, premium, family")
    is_kids_content: Optional[bool] = Field(None, description="Filter for kids content")
    search_in_subtitles: bool = Field(False, description="Enable subtitle text search")


class SubtitleMatch(BaseModel):
    """A single subtitle cue match"""

    cue_index: int
    timestamp: float  # seconds
    text: str
    highlighted_text: str  # HTML with <mark> tags


class SubtitleSearchResult(BaseModel):
    """Search result with subtitle matches"""

    content_id: str
    content_title: str
    content_thumbnail: Optional[str]
    content_type: str
    matches: List[SubtitleMatch]


class SearchResults(BaseModel):
    """Search results with metadata"""

    results: List[Dict[str, Any]]
    total: int
    page: int
    page_size: int
    has_more: bool
    execution_time_ms: int
    cache_hit: bool = False


class UnifiedSearchService:
    """
    Core search engine for all content.

    Features:
    - Full-text search with MongoDB text indexes
    - Subtitle dialogue search
    - Multi-criteria filtering
    - Result caching
    - Ranked results
    """

    def __init__(self):
        self.cache = get_cache()

    async def search(
        self,
        query: str,
        filters: SearchFilters,
        page: int = 1,
        limit: int = 20,
        user_subscription_tier: Optional[str] = None,
    ) -> SearchResults:
        """
        Main search entry point.

        Args:
            query: Search query string
            filters: Advanced filters
            page: Page number (1-indexed)
            limit: Results per page
            user_subscription_tier: User's subscription tier for filtering

        Returns:
            SearchResults with paginated content items
        """
        start_time = datetime.now()

        # Check cache first
        cache_key_data = {
            "query": query,
            "filters": filters.dict(),
            "page": page,
            "limit": limit,
            "tier": user_subscription_tier,
        }

        cached = self.cache.get_cached_results(query, cache_key_data)
        if cached:
            cached["cache_hit"] = True
            return SearchResults(**cached)

        # Execute search based on filters
        if filters.search_in_subtitles and query.strip():
            # Subtitle search
            subtitle_results = await self._search_subtitles(query, filters)
            results = subtitle_results
        else:
            # Text and metadata search
            results = await self._search_text_and_metadata(
                query, filters, page, limit, user_subscription_tier
            )

        # Calculate execution time
        execution_time = int((datetime.now() - start_time).total_seconds() * 1000)

        # Build response
        response_data = {
            "results": results,
            "total": len(results),
            "page": page,
            "page_size": limit,
            "has_more": len(results) >= limit,
            "execution_time_ms": execution_time,
            "cache_hit": False,
        }

        # Cache results
        self.cache.cache_results(query, cache_key_data, response_data)

        return SearchResults(**response_data)

    async def _search_text_and_metadata(
        self,
        query: str,
        filters: SearchFilters,
        page: int,
        limit: int,
        user_subscription_tier: Optional[str],
    ) -> List[Dict[str, Any]]:
        """
        Execute text search with metadata filters.

        Uses MongoDB $text operator with weighted fields and applies
        advanced filters for genre, year, rating, etc.
        """
        # Build MongoDB query
        mongo_query = self._build_mongo_query(query, filters, user_subscription_tier)

        # Execute query with text score sorting if query exists
        if query.strip():
            # Text search with scoring
            results = (
                await Content.find(
                    mongo_query, projection={"score": {"$meta": "textScore"}}
                )
                .sort([("score", {"$meta": "textScore"})])
                .skip((page - 1) * limit)
                .limit(limit)
                .to_list()
            )
        else:
            # Metadata-only search, sort by featured then date
            results = (
                await Content.find(mongo_query)
                .sort([("is_featured", -1), ("created_at", -1)])
                .skip((page - 1) * limit)
                .limit(limit)
                .to_list()
            )

        # Convert to dict format
        return [self._content_to_dict(content) for content in results]

    async def _search_subtitles(
        self, query: str, filters: SearchFilters
    ) -> List[Dict[str, Any]]:
        """
        Search within subtitle cues for specific dialogue.

        Returns content items with matching subtitle cues highlighted.
        """
        logger.info(f"Subtitle search for: {query}")

        # Search subtitle tracks
        subtitle_tracks = (
            await SubtitleTrackDoc.find(
                {"$text": {"$search": query}},
                projection={"score": {"$meta": "textScore"}},
            )
            .sort([("score", {"$meta": "textScore"})])
            .limit(settings.SEARCH_SUBTITLE_RESULT_LIMIT)
            .to_list()
        )

        logger.info(f"Found {len(subtitle_tracks)} subtitle track matches")

        # Group by content_id and extract matching cues
        content_matches: Dict[str, List[SubtitleMatch]] = {}

        for track in subtitle_tracks:
            content_id = track.content_id

            # Find matching cues
            for idx, cue in enumerate(track.cues):
                if query.lower() in cue.text.lower():
                    # Highlight the match
                    highlighted = self._highlight_text(cue.text, query)

                    match = SubtitleMatch(
                        cue_index=idx,
                        timestamp=cue.start_time,
                        text=cue.text,
                        highlighted_text=highlighted,
                    )

                    if content_id not in content_matches:
                        content_matches[content_id] = []
                    content_matches[content_id].append(match)

        # Fetch content items
        content_ids = list(content_matches.keys())
        if not content_ids:
            return []

        contents = await Content.find(
            {"_id": {"$in": content_ids}, "is_published": True}
        ).to_list()

        # Build results with subtitle matches
        results = []
        for content in contents:
            content_dict = self._content_to_dict(content)
            content_dict["subtitle_matches"] = [
                match.dict()
                for match in content_matches[str(content.id)][
                    :5
                ]  # Limit to 5 matches per content
            ]
            results.append(content_dict)

        return results

    def _build_mongo_query(
        self, query: str, filters: SearchFilters, user_subscription_tier: Optional[str]
    ) -> Dict[str, Any]:
        """
        Build MongoDB query from search query and filters.
        """
        conditions = []

        # Text search condition
        if query.strip():
            conditions.append({"$text": {"$search": query}})

        # Always filter by published
        conditions.append({"is_published": True})

        # Filter by content type (vod vs series episodes)
        if "vod" in filters.content_types:
            # Exclude episodes (series_id is None OR is_series is True for parent series)
            conditions.append({"$or": [{"series_id": None}, {"is_series": True}]})

        # Genre filter
        if filters.genres:
            conditions.append({"genres": {"$in": filters.genres}})

        # Year range filter
        if filters.year_min is not None or filters.year_max is not None:
            year_condition = {}
            if filters.year_min is not None:
                year_condition["$gte"] = filters.year_min
            if filters.year_max is not None:
                year_condition["$lte"] = filters.year_max
            conditions.append({"year": year_condition})

        # Rating filter
        if filters.rating_min is not None:
            conditions.append({"rating": {"$gte": filters.rating_min}})

        # Subtitle language filter
        if filters.subtitle_languages:
            conditions.append(
                {"available_subtitle_languages": {"$all": filters.subtitle_languages}}
            )

        # Subscription tier filter
        if filters.subscription_tier:
            conditions.append({"requires_subscription": filters.subscription_tier})
        elif user_subscription_tier:
            # Filter by user's accessible tiers
            tier_hierarchy = {
                "basic": ["basic"],
                "premium": ["basic", "premium"],
                "family": ["basic", "premium", "family"],
            }
            accessible_tiers = tier_hierarchy.get(user_subscription_tier, ["basic"])
            conditions.append({"requires_subscription": {"$in": accessible_tiers}})

        # Kids content filter
        if filters.is_kids_content is not None:
            conditions.append({"is_kids_content": filters.is_kids_content})

        # Combine all conditions
        if len(conditions) == 1:
            return conditions[0]
        else:
            return {"$and": conditions}

    async def get_suggestions(self, query: str, limit: int = 5) -> List[str]:
        """
        Get autocomplete suggestions for a query.

        Returns:
            List of suggested search terms
        """
        if len(query) < 2:
            return []

        # Search for titles starting with or containing the query
        suggestions = (
            await Content.find(
                {
                    "is_published": True,
                    "$or": [
                        {"title": {"$regex": f"^{query}", "$options": "i"}},
                        {"title_en": {"$regex": f"^{query}", "$options": "i"}},
                        {"cast": {"$regex": query, "$options": "i"}},
                        {"director": {"$regex": query, "$options": "i"}},
                    ],
                },
                projection={"title": 1, "title_en": 1},
            )
            .limit(limit)
            .to_list()
        )

        # Extract unique suggestions
        suggestion_set = set()
        for content in suggestions:
            if content.title:
                suggestion_set.add(content.title)
            if content.title_en and content.title_en != content.title:
                suggestion_set.add(content.title_en)

        return list(suggestion_set)[:limit]

    async def get_filter_options(self) -> Dict[str, Any]:
        """
        Get available filter options (genres, year range, languages).

        Returns:
            Dictionary with filter options
        """
        # Get unique genres
        genres_pipeline = [
            {
                "$match": {
                    "is_published": True,
                    "genres": {"$exists": True, "$ne": None},
                }
            },
            {"$unwind": "$genres"},
            {"$group": {"_id": "$genres"}},
            {"$sort": {"_id": 1}},
        ]
        genres_result = (
            await Content.get_motor_collection()
            .aggregate(genres_pipeline)
            .to_list(None)
        )
        genres = [item["_id"] for item in genres_result if item["_id"]]

        # Get year range
        year_pipeline = [
            {"$match": {"is_published": True, "year": {"$exists": True, "$ne": None}}},
            {
                "$group": {
                    "_id": None,
                    "min_year": {"$min": "$year"},
                    "max_year": {"$max": "$year"},
                }
            },
        ]
        year_result = (
            await Content.get_motor_collection().aggregate(year_pipeline).to_list(None)
        )
        year_min = year_result[0]["min_year"] if year_result else 1900
        year_max = year_result[0]["max_year"] if year_result else datetime.now().year

        # Get available subtitle languages
        langs_pipeline = [
            {
                "$match": {
                    "is_published": True,
                    "available_subtitle_languages": {"$exists": True, "$ne": []},
                }
            },
            {"$unwind": "$available_subtitle_languages"},
            {"$group": {"_id": "$available_subtitle_languages"}},
            {"$sort": {"_id": 1}},
        ]
        langs_result = (
            await Content.get_motor_collection().aggregate(langs_pipeline).to_list(None)
        )
        subtitle_languages = [item["_id"] for item in langs_result if item["_id"]]

        return {
            "genres": genres,
            "year_range": {"min": year_min, "max": year_max},
            "subtitle_languages": subtitle_languages,
            "content_types": ["vod", "live", "radio", "podcast"],
            "subscription_tiers": ["basic", "premium", "family"],
        }

    def _content_to_dict(self, content: Content) -> Dict[str, Any]:
        """
        Convert Content document to dictionary for API response.
        Excludes large base64 fields.
        """
        return {
            "id": str(content.id),
            "title": content.title,
            "title_en": content.title_en,
            "title_es": content.title_es,
            "description": content.description,
            "thumbnail": content.thumbnail,
            "backdrop": content.backdrop,
            "category_id": content.category_id,
            "category_name": content.category_name,
            "duration": content.duration,
            "year": content.year,
            "rating": content.rating,
            "genres": content.genres or [content.genre] if content.genre else [],
            "cast": content.cast,
            "director": content.director,
            "content_type": content.content_type,
            "is_series": content.is_series,
            "requires_subscription": content.requires_subscription,
            "is_kids_content": content.is_kids_content,
            "age_rating": content.age_rating,
            "available_subtitle_languages": content.available_subtitle_languages,
            "has_subtitles": content.has_subtitles,
            "view_count": content.view_count,
            "avg_rating": content.avg_rating,
            "is_featured": content.is_featured,
        }

    def _highlight_text(self, text: str, query: str) -> str:
        """
        Highlight search query in text with <mark> tags.

        Args:
            text: Original text
            query: Search query to highlight

        Returns:
            Text with <mark> tags around matches
        """
        import re

        # Escape special regex characters in query
        escaped_query = re.escape(query)

        # Case-insensitive replacement
        pattern = re.compile(f"({escaped_query})", re.IGNORECASE)
        highlighted = pattern.sub(r"<mark>\1</mark>", text)

        return highlighted
