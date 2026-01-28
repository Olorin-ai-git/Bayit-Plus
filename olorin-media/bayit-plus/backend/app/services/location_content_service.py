"""
Location-based content service for aggregating Israeli-related content by US city.

Services:
- Fetch news articles for specific city
- Fetch news reels for specific city
- Fetch community events for specific city
- Aggregate all location-based content
"""

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from app.core.database import db
from app.models.content import Content

logger = logging.getLogger(__name__)


class LocationContent:
    """Container for location-based content."""

    def __init__(self):
        self.news_articles = []
        self.news_reels = []
        self.community_events = []

    def to_dict(self):
        """Convert to dictionary for response."""
        return {
            "news_articles": self.news_articles,
            "news_reels": self.news_reels,
            "community_events": self.community_events,
        }

    @property
    def total_items(self) -> int:
        """Total items across all content types."""
        return len(self.news_articles) + len(self.news_reels) + len(self.community_events)


class LocationContentService:
    """Service for aggregating Israeli-focused content by US location."""

    # Major US cities for fallback suggestions
    MAJOR_CITIES = {
        "NY": {"city": "New York", "county": "New York County"},
        "CA": {"city": "Los Angeles", "county": "Los Angeles County"},
        "IL": {"city": "Chicago", "county": "Cook County"},
        "TX": {"city": "Houston", "county": "Harris County"},
        "AZ": {"city": "Phoenix", "county": "Maricopa County"},
        "PA": {"city": "Philadelphia", "county": "Philadelphia County"},
        "FL": {"city": "Miami", "county": "Miami-Dade County"},
        "MA": {"city": "Boston", "county": "Suffolk County"},
        "WA": {"city": "Seattle", "county": "King County"},
    }

    async def get_israelis_in_city(
        self,
        city: str,
        state: str,
        county: Optional[str] = None,
        limit_per_type: int = 10,
        include_articles: bool = True,
        include_reels: bool = True,
        include_events: bool = True,
    ) -> dict:
        """
        Get all Israeli-focused content for a specific city.

        Args:
            city: City name (e.g., "New York")
            state: Two-letter state code (e.g., "NY")
            county: Optional county name for more precise filtering
            limit_per_type: Max items per content type (default 10)
            include_articles: Include news articles
            include_reels: Include news reels
            include_events: Include community events

        Returns:
            Dict with location info and aggregated content
        """
        # Normalize inputs
        city = city.strip()
        state = state.upper().strip()

        result = {
            "location": {
                "city": city,
                "state": state,
                "county": county,
            },
            "content": LocationContent().to_dict(),
            "total_items": 0,
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "coverage": {
                "has_content": False,
                "nearest_major_city": None,
                "fallback_region": None,
            },
        }

        # Fetch content in parallel
        tasks = []

        if include_articles:
            tasks.append(self.fetch_news_articles(city, state, limit_per_type))

        if include_reels:
            tasks.append(self.fetch_news_reels(city, state, limit_per_type))

        if include_events:
            tasks.append(self.fetch_community_events(city, state, limit_per_type))

        # Execute all tasks concurrently
        if tasks:
            import asyncio

            responses = await asyncio.gather(*tasks, return_exceptions=True)

            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    logger.error(f"Error fetching content: {response}")
                    continue

                if include_articles and i == 0:
                    result["content"]["news_articles"] = response
                elif include_reels and (
                    (include_articles and i == 1) or (not include_articles and i == 0)
                ):
                    result["content"]["news_reels"] = response
                elif include_events:
                    result["content"]["community_events"] = response

        # Calculate totals
        total = (
            len(result["content"]["news_articles"])
            + len(result["content"]["news_reels"])
            + len(result["content"]["community_events"])
        )

        result["total_items"] = total
        result["coverage"]["has_content"] = total > 0

        # If no content found, suggest fallback
        if not result["coverage"]["has_content"]:
            if state in self.MAJOR_CITIES:
                fallback = self.MAJOR_CITIES[state]
                result["coverage"]["nearest_major_city"] = fallback["city"]

        return result

    async def fetch_news_articles(
        self, city: str, state: str, limit: int = 10
    ) -> list:
        """
        Fetch news articles related to Israelis in a specific city.

        Searches culture_content_items with Israeli focus and city keywords.
        """
        try:
            content_collection = db.get_collection("content")

            # Build search query
            match = {
                "$and": [
                    {
                        "$or": [
                            {
                                "title": {
                                    "$regex": f"(?i)({city}|{state}|israeli)",
                                }
                            },
                            {
                                "description": {
                                    "$regex": f"(?i)({city}|{state}|israeli)",
                                }
                            },
                            {
                                "topic_tags": {
                                    "$in": ["israeli", "israel", "jewish_community"]
                                }
                            },
                        ]
                    },
                    {"is_published": True},
                    {"content_format": {"$in": ["documentary", "news", "article"]}},
                    {"visibility_mode": {"$in": ["public", None]}},
                ]
            }

            pipeline = [
                {"$match": match},
                {
                    "$sort": {
                        "published_at": -1,
                        "created_at": -1,
                    }
                },
                {"$limit": limit},
                {
                    "$project": {
                        "id": "$_id",
                        "title": 1,
                        "description": 1,
                        "thumbnail": 1,
                        "content_format": 1,
                        "topic_tags": 1,
                        "published_at": 1,
                        "view_count": 1,
                    }
                },
            ]

            cursor = content_collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)

            return [
                {
                    "id": str(r.get("id")),
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "thumbnail": r.get("thumbnail"),
                    "type": "article",
                    "content_format": r.get("content_format", "article"),
                    "published_at": r.get("published_at", {}).isoformat()
                    if r.get("published_at")
                    else None,
                }
                for r in results
            ]

        except Exception as e:
            logger.error(f"Error fetching news articles for {city}, {state}: {e}")
            return []

    async def fetch_news_reels(
        self, city: str, state: str, limit: int = 10
    ) -> list:
        """
        Fetch news reels (short video summaries) for a specific city.

        Searches content with content_format="news_reel" and location targeting.
        """
        try:
            content_collection = db.get_collection("content")

            # Build location match
            match = {
                "$and": [
                    {
                        "$or": [
                            {
                                "title": {
                                    "$regex": f"(?i)({city}|{state}|israeli)",
                                }
                            },
                            {
                                "description": {
                                    "$regex": f"(?i)({city}|{state}|israeli)",
                                }
                            },
                            {
                                "topic_tags": {
                                    "$in": ["israeli", "israel", "jewish_community"]
                                }
                            },
                        ]
                    },
                    {"is_published": True},
                    {"content_format": "news_reel"},
                    {"visibility_mode": {"$in": ["public", None]}},
                    {
                        "$or": [
                            {
                                "published_at": {
                                    "$gte": datetime.now(timezone.utc)
                                    - timedelta(days=30)
                                }
                            },
                            {"published_at": {"$exists": False}},
                        ]
                    },
                ]
            }

            pipeline = [
                {"$match": match},
                {
                    "$sort": {
                        "published_at": -1,
                        "created_at": -1,
                    }
                },
                {"$limit": limit},
                {
                    "$project": {
                        "id": "$_id",
                        "title": 1,
                        "description": 1,
                        "thumbnail": 1,
                        "stream_url": 1,
                        "duration": 1,
                        "content_format": 1,
                        "topic_tags": 1,
                        "published_at": 1,
                        "view_count": 1,
                    }
                },
            ]

            cursor = content_collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)

            return [
                {
                    "id": str(r.get("id")),
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "thumbnail": r.get("thumbnail"),
                    "stream_url": r.get("stream_url"),
                    "duration": r.get("duration"),
                    "type": "reel",
                    "content_format": "news_reel",
                    "published_at": r.get("published_at", {}).isoformat()
                    if r.get("published_at")
                    else None,
                }
                for r in results
            ]

        except Exception as e:
            logger.error(f"Error fetching news reels for {city}, {state}: {e}")
            return []

    async def fetch_community_events(
        self, city: str, state: str, limit: int = 10
    ) -> list:
        """
        Fetch community events with Israeli focus for a specific city.

        Searches for upcoming events with Israeli focus in target city.
        """
        try:
            events_collection = db.get_collection("community_events")

            # Build location match - search for Israeli-related event types and titles
            match = {
                "$and": [
                    {
                        "$or": [
                            {"location": {"$regex": f"(?i){city}"}},
                            {"title": {"$regex": f"(?i)({city}|israeli|israel|yom ha'atzmaut|yom hazikaron)"}},
                            {"description": {"$regex": f"(?i)israeli|israel"}},
                            {
                                "event_type": {
                                    "$in": ["community", "holiday", "shiur"]
                                }
                            },
                        ]
                    },
                    {"is_active": True},
                    {
                        "start_time": {
                            "$gte": datetime.now(timezone.utc),
                        }
                    },
                ]
            }

            pipeline = [
                {"$match": match},
                {
                    "$sort": {
                        "start_time": 1,
                    }
                },
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
                        "event_type": 1,
                    }
                },
            ]

            cursor = events_collection.aggregate(pipeline)
            results = await cursor.to_list(length=limit)

            return [
                {
                    "id": str(r.get("id")),
                    "title": r.get("title", ""),
                    "description": r.get("description", ""),
                    "thumbnail": r.get("image_url"),
                    "event_date": r.get("start_time", {}).isoformat()
                    if r.get("start_time")
                    else None,
                    "event_location": r.get("location") or r.get("organization_name"),
                    "type": "event",
                    "content_format": "event",
                }
                for r in results
            ]

        except Exception as e:
            logger.error(
                f"Error fetching community events for {city}, {state}: {e}"
            )
            return []
