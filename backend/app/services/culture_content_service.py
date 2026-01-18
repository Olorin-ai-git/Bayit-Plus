"""
Culture Content Service - Generic aggregation service for all cultures.

Replaces the per-city services (jerusalem_content_service.py, tel_aviv_content_service.py)
with a unified service that supports any culture dynamically.
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any

from app.core.config import settings
from app.models.culture import (
    Culture,
    CultureCity,
    CultureNewsSource,
    CultureContentItem,
    CultureResponse,
    CultureCityResponse,
    CultureNewsSourceResponse,
    CultureContentItemResponse,
    CultureContentAggregatedResponse,
    CultureFeaturedResponse,
    CultureTimeResponse,
)
from app.services.culture_scrapers import (
    get_scraper,
    CultureHeadlineItem,
)

logger = logging.getLogger(__name__)


class CultureContentCache:
    """In-memory cache for culture content with TTL support."""

    def __init__(self, ttl_minutes: int):
        self._cache: Dict[str, tuple[List[Dict[str, Any]], datetime]] = {}
        self._ttl = timedelta(minutes=ttl_minutes)

    def get(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached items if not expired."""
        if key not in self._cache:
            return None

        items, cached_at = self._cache[key]
        if datetime.now(timezone.utc) - cached_at > self._ttl:
            del self._cache[key]
            return None

        return items

    def set(self, key: str, items: List[Dict[str, Any]]) -> None:
        """Cache items with current timestamp."""
        self._cache[key] = (items, datetime.now(timezone.utc))

    def clear(self, key: Optional[str] = None) -> None:
        """Clear cached items. If key provided, clear only that key."""
        if key:
            self._cache.pop(key, None)
        else:
            self._cache.clear()

    def get_last_updated(self, key: str) -> Optional[datetime]:
        """Get the timestamp when the cache was last updated."""
        if key in self._cache:
            return self._cache[key][1]
        return None

    def get_stale(self, key: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached items even if expired (for fallback)."""
        if key in self._cache:
            return self._cache[key][0]
        return None


class CultureContentService:
    """
    Generic service for aggregating content across all cultures.

    Handles:
    - Culture configuration loading from DB
    - City-specific content fetching
    - Caching with culture/city-specific keys
    - Relevance scoring using culture scrapers
    """

    def __init__(self):
        self._cache = CultureContentCache(
            ttl_minutes=settings.CULTURES_CACHE_TTL_MINUTES
        )
        self._cultures_initialized = False

    async def _ensure_cultures_initialized(self) -> None:
        """Ensure default cultures exist in database."""
        if self._cultures_initialized:
            return

        # Check if cultures exist
        existing_count = await Culture.count()
        if existing_count == 0:
            logger.info("No cultures found - will be seeded by migration script")

        self._cultures_initialized = True

    # ==================== Culture Operations ====================

    async def get_all_cultures(self, active_only: bool = True) -> List[CultureResponse]:
        """Get all available cultures."""
        await self._ensure_cultures_initialized()

        query = {"is_active": True} if active_only else {}
        cultures = await Culture.find(query).sort("display_order").to_list()

        return [
            CultureResponse(
                id=str(culture.id),
                culture_id=culture.culture_id,
                name=culture.name,
                name_localized=culture.name_localized,
                flag_emoji=culture.flag_emoji,
                country_code=culture.country_code,
                primary_timezone=culture.primary_timezone,
                primary_language=culture.primary_language,
                supported_languages=culture.supported_languages,
                has_shabbat_mode=culture.has_shabbat_mode,
                has_lunar_calendar=culture.has_lunar_calendar,
                display_order=culture.display_order,
                is_active=culture.is_active,
                is_default=culture.is_default,
                background_image_key=culture.background_image_key,
                accent_color=culture.accent_color,
            )
            for culture in cultures
        ]

    async def get_culture(self, culture_id: str) -> Optional[CultureResponse]:
        """Get a specific culture by ID."""
        culture = await Culture.find_one(Culture.culture_id == culture_id)
        if not culture:
            return None

        return CultureResponse(
            id=str(culture.id),
            culture_id=culture.culture_id,
            name=culture.name,
            name_localized=culture.name_localized,
            flag_emoji=culture.flag_emoji,
            country_code=culture.country_code,
            primary_timezone=culture.primary_timezone,
            primary_language=culture.primary_language,
            supported_languages=culture.supported_languages,
            has_shabbat_mode=culture.has_shabbat_mode,
            has_lunar_calendar=culture.has_lunar_calendar,
            display_order=culture.display_order,
            is_active=culture.is_active,
            is_default=culture.is_default,
            background_image_key=culture.background_image_key,
            accent_color=culture.accent_color,
        )

    async def get_default_culture(self) -> Optional[CultureResponse]:
        """Get the default culture (Israeli for backward compatibility)."""
        culture = await Culture.find_one(Culture.is_default == True)
        if culture:
            return CultureResponse(
                id=str(culture.id),
                culture_id=culture.culture_id,
                name=culture.name,
                name_localized=culture.name_localized,
                flag_emoji=culture.flag_emoji,
                country_code=culture.country_code,
                primary_timezone=culture.primary_timezone,
                primary_language=culture.primary_language,
                supported_languages=culture.supported_languages,
                has_shabbat_mode=culture.has_shabbat_mode,
                has_lunar_calendar=culture.has_lunar_calendar,
                display_order=culture.display_order,
                is_active=culture.is_active,
                is_default=culture.is_default,
                background_image_key=culture.background_image_key,
                accent_color=culture.accent_color,
            )

        # Fallback to israeli if no default set
        return await self.get_culture(settings.CULTURES_DEFAULT_ID)

    # ==================== City Operations ====================

    async def get_culture_cities(
        self,
        culture_id: str,
        featured_only: bool = True,
    ) -> List[CultureCityResponse]:
        """Get cities for a culture."""
        query = {"culture_id": culture_id, "is_active": True}
        if featured_only:
            query["is_featured"] = True

        cities = await CultureCity.find(query).sort("display_order").to_list()

        return [
            CultureCityResponse(
                id=str(city.id),
                city_id=city.city_id,
                culture_id=city.culture_id,
                name=city.name,
                name_localized=city.name_localized,
                name_native=city.name_native,
                timezone=city.timezone,
                coordinates=city.coordinates,
                categories=city.categories,
                display_order=city.display_order,
                is_active=city.is_active,
                is_featured=city.is_featured,
                background_image_key=city.background_image_key,
                thumbnail_image_key=city.thumbnail_image_key,
                accent_color=city.accent_color,
            )
            for city in cities
        ]

    async def get_city(
        self,
        culture_id: str,
        city_id: str,
    ) -> Optional[CultureCityResponse]:
        """Get a specific city."""
        city = await CultureCity.find_one(
            CultureCity.culture_id == culture_id,
            CultureCity.city_id == city_id,
        )
        if not city:
            return None

        return CultureCityResponse(
            id=str(city.id),
            city_id=city.city_id,
            culture_id=city.culture_id,
            name=city.name,
            name_localized=city.name_localized,
            name_native=city.name_native,
            timezone=city.timezone,
            coordinates=city.coordinates,
            categories=city.categories,
            display_order=city.display_order,
            is_active=city.is_active,
            is_featured=city.is_featured,
            background_image_key=city.background_image_key,
            thumbnail_image_key=city.thumbnail_image_key,
            accent_color=city.accent_color,
        )

    # ==================== Content Operations ====================

    async def get_city_content(
        self,
        culture_id: str,
        city_id: str,
        category: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> CultureContentAggregatedResponse:
        """
        Fetch aggregated content for a specific city.

        Uses culture-specific scraper for fresh content,
        with caching and fallback strategies.
        """
        cache_key = f"culture_content:{culture_id}:{city_id}"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            all_items = []

            # Get the scraper for this culture
            scraper = get_scraper(culture_id)
            if scraper:
                try:
                    # Scrape city-specific news
                    headlines = await scraper.scrape_city_news(city_id)
                    for headline in headlines:
                        all_items.append(self._headline_to_dict(headline, culture_id, city_id))
                    logger.info(f"Scraped {len(all_items)} items for {culture_id}/{city_id}")
                except Exception as e:
                    logger.error(f"Scraper failed for {culture_id}/{city_id}: {e}")

            # Sort by relevance then date
            all_items.sort(
                key=lambda x: (x.get("relevance_score", 0), x.get("published_at", datetime.min)),
                reverse=True,
            )

            # Cache if we have content
            if all_items:
                self._cache.set(cache_key, all_items)
                cached_items = all_items
            else:
                # Try stale cache
                stale_items = self._cache.get_stale(cache_key)
                if stale_items:
                    cached_items = stale_items
                    logger.warning(f"Using stale cache for {culture_id}/{city_id}")
                else:
                    cached_items = []

        # Apply category filter
        filtered_items = cached_items
        if category:
            filtered_items = [
                item for item in filtered_items if item.get("category") == category
            ]

        # Pagination
        total = len(filtered_items)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_items = filtered_items[start_idx:end_idx]

        # Convert to response models
        response_items = [
            self._dict_to_response(item, i + start_idx)
            for i, item in enumerate(paginated_items)
        ]

        # Get sources count
        sources_count = await CultureNewsSource.find(
            CultureNewsSource.culture_id == culture_id,
            CultureNewsSource.is_active == True,
        ).count()

        last_updated = self._cache.get_last_updated(cache_key) or datetime.now(timezone.utc)

        return CultureContentAggregatedResponse(
            items=response_items,
            pagination={
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit if limit > 0 else 0,
            },
            sources_count=sources_count,
            last_updated=last_updated,
            culture_id=culture_id,
            city_id=city_id,
            category=category,
        )

    async def get_culture_trending(
        self,
        culture_id: str,
        limit: int = 10,
    ) -> List[CultureContentItemResponse]:
        """Get trending content for a culture across all cities."""
        cache_key = f"culture_trending:{culture_id}"
        cached_items = self._cache.get(cache_key)

        if cached_items is None:
            all_items = []

            # Get scraper
            scraper = get_scraper(culture_id)
            if scraper:
                try:
                    headlines = await scraper.scrape_headlines()
                    for headline in headlines[:limit * 2]:
                        all_items.append(self._headline_to_dict(headline, culture_id, None))
                except Exception as e:
                    logger.error(f"Trending scrape failed for {culture_id}: {e}")

            # Sort by relevance
            all_items.sort(key=lambda x: x.get("relevance_score", 0), reverse=True)

            if all_items:
                self._cache.set(cache_key, all_items[:limit])
                cached_items = all_items[:limit]
            else:
                cached_items = []

        return [
            self._dict_to_response(item, i)
            for i, item in enumerate(cached_items[:limit])
        ]

    async def get_featured_content(
        self,
        culture_id: str,
    ) -> CultureFeaturedResponse:
        """Get featured content for hero section."""
        # Get trending as featured
        trending = await self.get_culture_trending(culture_id, limit=6)

        return CultureFeaturedResponse(
            featured=trending[:6],
            trending=trending,
            live_streams=[],
            last_updated=datetime.now(timezone.utc),
            culture_id=culture_id,
        )

    # ==================== Time Operations ====================

    async def get_culture_time(self, culture_id: str) -> Optional[CultureTimeResponse]:
        """Get current time information for a culture's timezone."""
        culture = await Culture.find_one(Culture.culture_id == culture_id)
        if not culture:
            return None

        try:
            from zoneinfo import ZoneInfo

            tz = ZoneInfo(culture.primary_timezone)
            now = datetime.now(tz)

            # Format time display
            display_time = now.strftime("%I:%M %p")  # 10:30 PM
            display_date = now.strftime("%B %d, %Y")  # January 18, 2026
            day_of_week = now.strftime("%A")  # Saturday

            # Check if weekend (culture-specific)
            is_weekend = False
            if culture.has_shabbat_mode:
                # Israeli Shabbat (Friday sunset to Saturday sunset)
                is_weekend = now.weekday() in [4, 5]  # Friday or Saturday
            else:
                # Standard weekend
                is_weekend = now.weekday() in [5, 6]  # Saturday or Sunday

            return CultureTimeResponse(
                culture_id=culture_id,
                timezone=culture.primary_timezone,
                current_time=now.isoformat(),
                display_time=display_time,
                display_date=display_date,
                day_of_week=day_of_week,
                is_weekend=is_weekend,
            )

        except Exception as e:
            logger.error(f"Failed to get time for {culture_id}: {e}")
            return None

    # ==================== Source Operations ====================

    async def get_sources(
        self,
        culture_id: str,
        city_id: Optional[str] = None,
        active_only: bool = True,
    ) -> List[CultureNewsSourceResponse]:
        """Get news sources for a culture/city."""
        query: Dict[str, Any] = {"culture_id": culture_id}
        if city_id:
            query["city_id"] = city_id
        if active_only:
            query["is_active"] = True

        sources = await CultureNewsSource.find(query).sort("priority", -1).to_list()

        return [
            CultureNewsSourceResponse(
                id=str(source.id),
                source_id=source.source_id,
                culture_id=source.culture_id,
                city_id=source.city_id,
                name=source.name,
                name_localized=source.name_localized,
                source_type=source.source_type,
                website_url=source.website_url,
                content_type=source.content_type,
                language=source.language,
                categories=source.categories,
                is_active=source.is_active,
                priority=source.priority,
                last_fetched_at=source.last_fetched_at,
            )
            for source in sources
        ]

    async def get_categories(
        self,
        culture_id: str,
        city_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get available categories for a culture/city."""
        scraper = get_scraper(culture_id)
        if scraper:
            return scraper.get_all_categories()

        # Fallback to default categories
        return [
            {"id": "general", "name": "General", "name_localized": {"en": "General"}},
        ]

    # ==================== Cache Operations ====================

    def clear_cache(self, culture_id: Optional[str] = None, city_id: Optional[str] = None) -> None:
        """Clear the content cache."""
        if culture_id and city_id:
            self._cache.clear(f"culture_content:{culture_id}:{city_id}")
            logger.info(f"Cleared cache for {culture_id}/{city_id}")
        elif culture_id:
            # Clear all caches for this culture (would need iteration)
            self._cache.clear()
            logger.info(f"Cleared all caches for {culture_id}")
        else:
            self._cache.clear()
            logger.info("Cleared all culture caches")

    # ==================== Private Helpers ====================

    def _headline_to_dict(
        self,
        headline: CultureHeadlineItem,
        culture_id: str,
        city_id: Optional[str],
    ) -> Dict[str, Any]:
        """Convert a CultureHeadlineItem to dictionary for caching."""
        return {
            "culture_id": culture_id,
            "city_id": city_id,
            "source_id": headline.source,
            "source_name": headline.source,
            "title": headline.title,
            "title_native": headline.title_native,
            "title_localized": {},
            "url": headline.url,
            "published_at": headline.published_at or headline.scraped_at,
            "summary": headline.summary,
            "summary_native": headline.summary_native,
            "summary_localized": {},
            "image_url": headline.image_url,
            "category": headline.category or "general",
            "category_label": {},
            "tags": headline.tags,
            "relevance_score": headline.relevance_score,
            "matched_keywords": headline.matched_keywords,
        }

    def _dict_to_response(
        self,
        item: Dict[str, Any],
        index: int,
    ) -> CultureContentItemResponse:
        """Convert a cached dictionary to response model."""
        return CultureContentItemResponse(
            id=f"culture-{item.get('culture_id', 'unknown')}-{index}",
            culture_id=item.get("culture_id", ""),
            city_id=item.get("city_id"),
            source_id=item.get("source_id", ""),
            source_name=item.get("source_name", ""),
            title=item.get("title", ""),
            title_native=item.get("title_native"),
            title_localized=item.get("title_localized", {}),
            url=item.get("url", ""),
            published_at=item.get("published_at", datetime.now(timezone.utc)),
            summary=item.get("summary"),
            summary_native=item.get("summary_native"),
            summary_localized=item.get("summary_localized", {}),
            image_url=item.get("image_url"),
            category=item.get("category", "general"),
            category_label=item.get("category_label", {}),
            tags=item.get("tags", []),
            relevance_score=item.get("relevance_score", 0.0),
        )


# Global service instance
culture_content_service = CultureContentService()
