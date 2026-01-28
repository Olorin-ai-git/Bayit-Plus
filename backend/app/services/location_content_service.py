"""Location-based content service for aggregating Israeli-focused content by US city."""
import logging
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
    ) -> dict:
        """Get all Israeli-focused content for a specific city. Never raises exceptions."""
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
                "coverage": {"has_content": False, "nearest_major_city": None},
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

            if not result["coverage"]["has_content"] and state in MAJOR_US_CITIES:
                result["coverage"]["nearest_major_city"] = MAJOR_US_CITIES[state]["city"]

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