"""Location-based content service for aggregating Israeli-focused content by US city."""
import logging
import math
import re
from datetime import datetime, timezone
from typing import Any, Optional

from app.core.config import settings
from app.models.content import Content
from app.models.jewish_community import CommunityEvent
from app.services.location_constants import MAJOR_US_CITIES, CITY_COORDINATES
from app.services.news_scraper.location_scrapers import scrape_israeli_content_in_us_city
from app.services.news_scraper.rss_parser import _fetch_og_image

logger = logging.getLogger(__name__)

# Fallback poster for articles without images
FALLBACK_NEWS_POSTER = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&h=450&fit=crop"  # News/journalism themed image


class LocationContentService:
    """Service for aggregating Israeli-focused content by US location."""

    @staticmethod
    def _calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance in miles between two coordinates using Haversine formula."""
        # Radius of Earth in miles
        R = 3959.0

        # Convert to radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)

        # Haversine formula
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
        c = 2 * math.asin(math.sqrt(a))

        return R * c

    @staticmethod
    def _find_nearest_major_city(latitude: float, longitude: float) -> Optional[tuple[str, str, float]]:
        """Find the nearest major city to given coordinates.

        Returns: (city_name, state_code, distance_in_miles) or None
        """
        nearest = None
        min_distance = float('inf')

        for state_code, city_data in MAJOR_US_CITIES.items():
            distance = LocationContentService._calculate_distance(
                latitude, longitude,
                city_data["latitude"], city_data["longitude"]
            )
            if distance < min_distance:
                min_distance = distance
                nearest = (city_data["city"], state_code, distance)

        return nearest

    @staticmethod
    def _get_city_coordinates(city: str, state: str) -> tuple[float, float]:
        """Get latitude/longitude for a city/state.

        Returns default coordinates if not found in lookup table.
        Format: (latitude, longitude)
        """
        coords = CITY_COORDINATES.get((city, state))
        if coords:
            return coords["latitude"], coords["longitude"]
        return 40.0, -95.0  # Default: center of USA

    async def get_israelis_in_city(
        self,
        city: str,
        state: str,
        county: Optional[str] = None,
        limit_per_type: int = 10,
        include_articles: bool = True,
        include_events: bool = True,
        allow_nearby_fallback: bool = True,
    ) -> dict:
        """Get all Israeli-focused content for a specific city. Never raises exceptions.

        Args:
            city: City name
            state: State code (e.g., 'NY', 'CA')
            county: Optional county name
            limit_per_type: Max items per content type
            include_articles: Whether to fetch news articles
            include_events: Whether to fetch community events
            allow_nearby_fallback: If True and no local content found, fetch from nearest major city
        """
        try:
            # Validate and sanitize inputs
            if not city or not state:
                logger.error(f"Invalid city/state: city={city}, state={state}")
                return self._get_empty_result("Unknown", "XX")

            city = city.strip()
            state = state.upper().strip()

            latitude, longitude = self._get_city_coordinates(city, state)
            now = datetime.now(timezone.utc)

            result = {
                "location": {
                    "city": city,
                    "state": state,
                    "county": county,
                    "latitude": latitude,
                    "longitude": longitude,
                    "timestamp": now,
                    "source": "lookup",
                },
                "content": {"news_articles": [], "community_events": []},
                "total_items": 0,
                "coverage": {
                    "has_content": False,
                    "nearest_major_city": None,
                    "content_source": "local",  # 'local' or 'nearby'
                    "distance_miles": None,
                },
                "updated_at": now,
            }

            # Fetch content with error handling - never let one failure crash the entire response
            if include_articles:
                try:
                    result["content"]["news_articles"] = await self.fetch_news_articles(
                        city, state, limit_per_type
                    )
                except Exception as e:
                    logger.error(f"Failed to fetch articles for {city}, {state}: {e}")
                    result["content"]["news_articles"] = []

            if include_events:
                try:
                    result["content"]["community_events"] = await self.fetch_community_events(
                        city, state, limit_per_type
                    )
                except Exception as e:
                    logger.error(f"Failed to fetch events for {city}, {state}: {e}")
                    result["content"]["community_events"] = []

            total = (
                len(result["content"]["news_articles"])
                + len(result["content"]["community_events"])
            )
            result["total_items"] = total
            result["coverage"]["has_content"] = total > 0

            # If no local content found and fallback is allowed, fetch from nearest major city
            if not result["coverage"]["has_content"] and allow_nearby_fallback:
                nearest = self._find_nearest_major_city(latitude, longitude)
                if nearest:
                    nearby_city, nearby_state, distance = nearest
                    result["coverage"]["nearest_major_city"] = nearby_city
                    result["coverage"]["distance_miles"] = round(distance, 1)

                    logger.info(
                        f"No content for {city}, {state}. Fetching from nearest major city: "
                        f"{nearby_city}, {nearby_state} ({distance:.1f} miles away)"
                    )

                    # Recursively fetch from nearby city (with fallback disabled to prevent infinite recursion)
                    nearby_result = await self.get_israelis_in_city(
                        nearby_city,
                        nearby_state,
                        limit_per_type=limit_per_type,
                        include_articles=include_articles,
                        include_events=include_events,
                        allow_nearby_fallback=False,  # Prevent infinite recursion
                    )

                    # Use nearby city's content if available
                    if nearby_result["total_items"] > 0:
                        result["content"]["news_articles"] = nearby_result["content"]["news_articles"]
                        result["content"]["community_events"] = nearby_result["content"]["community_events"]
                        result["total_items"] = nearby_result["total_items"]
                        result["coverage"]["has_content"] = True
                        result["coverage"]["content_source"] = "nearby"

                        logger.info(
                            f"Successfully loaded {nearby_result['total_items']} items from "
                            f"{nearby_city}, {nearby_state} for {city}, {state}"
                        )

            return result

        except Exception as e:
            logger.error(f"Critical error in get_israelis_in_city for {city}, {state}: {e}")
            return self._get_empty_result(city, state)

    def _get_empty_result(self, city: str, state: str) -> dict:
        """Return empty result structure - used for error recovery."""
        now = datetime.now(timezone.utc)
        return {
            "location": {
                "city": city,
                "state": state,
                "county": None,
                "latitude": 0.0,
                "longitude": 0.0,
                "timestamp": now,
                "source": "lookup",
            },
            "content": {"news_articles": [], "community_events": []},
            "total_items": 0,
            "coverage": {"has_content": False, "nearest_major_city": None},
            "updated_at": now,
        }

    async def fetch_news_articles(
        self, city: str, state: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Fetch news articles related to Israelis in a specific city using live web scraping."""
        try:
            logger.info(f"Scraping Israeli content for {city}, {state}")

            # Use live web scraper to get Israeli-related news for this US city
            headlines = await scrape_israeli_content_in_us_city(city, state, max_results=limit)

            logger.info(f"Found {len(headlines)} Israeli-related headlines for {city}, {state}")

            return [
                {
                    "id": f"article-{idx}",
                    "title": headline.title,
                    "description": headline.summary,
                    "thumbnail": headline.image_url or FALLBACK_NEWS_POSTER,
                    "url": headline.url,  # Article URL for modal display
                    "source": headline.source,
                    "city": city,
                    "state": state,
                    "type": "article",
                    "content_format": "article",
                    "published_at": (
                        headline.published_at.isoformat()
                        if headline.published_at
                        else datetime.now(timezone.utc).isoformat()
                    ),
                }
                for idx, headline in enumerate(headlines)
            ]
        except Exception as e:
            logger.error(f"Error fetching news articles for {city}, {state}: {e}")
            return []

    async def fetch_community_events(
        self, city: str, state: str, limit: int = 10
    ) -> list[dict[str, Any]]:
        """Fetch community events with Israeli focus for a specific city."""
        try:
            city_escaped = re.escape(city)
            match = {
                "$and": [
                    {
                        "$or": [
                            {"location": {"$regex": f"(?i){city_escaped}"}},
                            {
                                "title": {
                                    "$regex": f"(?i){city_escaped}|israeli|israel|yom ha'atzmaut|yom hazikaron"
                                }
                            },
                            {"description": {"$regex": "(?i)israeli|israel"}},
                            {
                                "event_type": {
                                    "$in": settings.LOCATION_CONTENT_EVENT_TYPES
                                }
                            },
                        ]
                    },
                    {"is_active": True},
                    {"start_time": {"$gte": datetime.now(timezone.utc)}},
                ]
            }

            pipeline = [
                {"$match": match},
                {"$sort": {"start_time": 1}},
                {"$limit": limit},
                {
                    "$project": {
                        "id": "$_id",
                        "title": 1,
                        "description": 1,
                        "image_url": 1,
                        "start_time": 1,
                        "location": 1,
                        "organization_name": 1,
                    }
                },
            ]
            collection = CommunityEvent.get_pymongo_collection()
            results = await collection.aggregate(pipeline).to_list(length=limit)

            return [
                {
                    "id": str(r.get("id")),
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "thumbnail": r.get("image_url"),
                    "event_date": (
                        r.get("start_time").isoformat()
                        if r.get("start_time")
                        else None
                    ),
                    "event_location": r.get("location")
                    or r.get("organization_name"),
                    "type": "event",
                }
                for r in results
            ]
        except Exception as e:
            logger.error(f"Error fetching community events for {city}, {state}: {e}")
            return []

    @staticmethod
    def _build_content_match(city: str, state: str, content_type: str) -> dict:
        """Build MongoDB query match stage with sanitized user input."""
        city_escaped = re.escape(city)
        state_escaped = re.escape(state)
        pattern = f"(?i)({city_escaped}|{state_escaped}|israeli)"

        match = {
            "$and": [
                {
                    "$or": [
                        {"title": {"$regex": pattern}},
                        {"description": {"$regex": pattern}},
                        {
                            "topic_tags": {
                                "$in": settings.LOCATION_CONTENT_TOPIC_TAGS
                            }
                        },
                    ]
                },
                {"is_published": True},
                {"visibility_mode": {"$in": ["public", None]}},
            ]
        }

        if content_type == "articles":
            match["$and"].append(
                {"content_format": {"$in": settings.LOCATION_CONTENT_ARTICLE_FORMATS}}
            )
        return match