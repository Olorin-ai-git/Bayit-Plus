"""
Search Analytics Models.

Tracks search queries, user behavior, and search performance for:
- Popular query analysis
- Content gap identification (queries with no results)
- Click-through rate tracking
- LLM search usage analytics
- Filter usage patterns
"""

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from beanie import Document
from pydantic import Field


class SearchQuery(Document):
    """
    Individual search query log entry.

    Tracks every search performed to analyze:
    - Popular searches
    - Queries with no results (content gaps)
    - Click-through rates
    - Filter usage
    """

    # Query details
    query: str
    search_type: str  # "text", "subtitle", "llm", "metadata_only"
    user_id: Optional[str] = None

    # Filters applied
    filters: Dict[str, Any] = Field(default_factory=dict)

    # Results
    result_count: int
    execution_time_ms: int
    cache_hit: bool = False

    # User interaction
    clicked_result_id: Optional[str] = None  # Content ID that was clicked
    clicked_position: Optional[int] = None  # Position in results (1-indexed)
    time_to_click_ms: Optional[int] = None  # Time from search to click

    # LLM-specific (for natural language search)
    llm_interpretation: Optional[str] = None
    llm_confidence: Optional[float] = None

    # Metadata
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    session_id: Optional[str] = None
    platform: Optional[str] = None  # "web", "mobile", "tv"
    user_agent: Optional[str] = None

    class Settings:
        name = "search_queries"
        indexes = [
            "query",  # For finding popular queries
            "timestamp",  # For time-based analysis
            "user_id",  # For user-specific analysis
            "search_type",  # For search type analysis
            "result_count",  # For finding no-result queries
            [("timestamp", -1)],  # Recent queries
            [("query", 1), ("timestamp", -1)],  # Query history
        ]

    @classmethod
    async def log_search(
        cls,
        query: str,
        search_type: str,
        result_count: int,
        execution_time_ms: int,
        filters: Optional[Dict[str, Any]] = None,
        user_id: Optional[str] = None,
        cache_hit: bool = False,
        llm_interpretation: Optional[str] = None,
        llm_confidence: Optional[float] = None,
        platform: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> "SearchQuery":
        """
        Log a search query.

        Args:
            query: Search query string
            search_type: "text", "subtitle", "llm", or "metadata_only"
            result_count: Number of results returned
            execution_time_ms: Query execution time in milliseconds
            filters: Optional filters applied
            user_id: Optional user ID
            cache_hit: Whether result was from cache
            llm_interpretation: LLM interpretation text (for LLM searches)
            llm_confidence: LLM confidence score (for LLM searches)
            platform: "web", "mobile", or "tv"
            session_id: Optional session ID

        Returns:
            Created SearchQuery document
        """
        log_entry = cls(
            query=query,
            search_type=search_type,
            result_count=result_count,
            execution_time_ms=execution_time_ms,
            filters=filters or {},
            user_id=user_id,
            cache_hit=cache_hit,
            llm_interpretation=llm_interpretation,
            llm_confidence=llm_confidence,
            platform=platform,
            session_id=session_id,
        )
        await log_entry.insert()
        return log_entry

    async def log_click(
        self, content_id: str, position: int, time_to_click_ms: int
    ) -> None:
        """
        Log a click on a search result.

        Args:
            content_id: ID of clicked content
            position: Position in results list (1-indexed)
            time_to_click_ms: Time from search to click
        """
        self.clicked_result_id = content_id
        self.clicked_position = position
        self.time_to_click_ms = time_to_click_ms
        await self.save()

    @classmethod
    async def get_popular_queries(
        cls, limit: int = 10, days: int = 7
    ) -> list[Dict[str, Any]]:
        """
        Get most popular search queries.

        Args:
            limit: Number of queries to return
            days: Time window in days

        Returns:
            List of {query, count} dicts
        """
        from datetime import timedelta

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_date}}},
            {
                "$group": {
                    "_id": "$query",
                    "count": {"$sum": 1},
                    "avg_results": {"$avg": "$result_count"},
                }
            },
            {"$sort": {"count": -1}},
            {"$limit": limit},
            {"$project": {"query": "$_id", "count": 1, "avg_results": 1, "_id": 0}},
        ]

        results = await cls.get_pymongo_collection().aggregate(pipeline).to_list(None)
        return results

    @classmethod
    async def get_no_result_queries(
        cls, limit: int = 20, days: int = 7
    ) -> list[Dict[str, Any]]:
        """
        Get queries that returned no results (content gaps).

        Args:
            limit: Number of queries to return
            days: Time window in days

        Returns:
            List of {query, count} dicts
        """
        from datetime import timedelta

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_date}, "result_count": 0}},
            {"$group": {"_id": "$query", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": limit},
            {"$project": {"query": "$_id", "count": 1, "_id": 0}},
        ]

        results = await cls.get_pymongo_collection().aggregate(pipeline).to_list(None)
        return results

    @classmethod
    async def get_click_through_rate(cls, days: int = 7) -> float:
        """
        Calculate overall click-through rate.

        Args:
            days: Time window in days

        Returns:
            CTR as percentage (0-100)
        """
        from datetime import timedelta

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_date}}},
            {
                "$group": {
                    "_id": None,
                    "total_searches": {"$sum": 1},
                    "clicked_searches": {
                        "$sum": {"$cond": [{"$ne": ["$clicked_result_id", None]}, 1, 0]}
                    },
                }
            },
        ]

        results = await cls.get_pymongo_collection().aggregate(pipeline).to_list(None)

        if not results or results[0]["total_searches"] == 0:
            return 0.0

        ctr = (results[0]["clicked_searches"] / results[0]["total_searches"]) * 100
        return round(ctr, 2)

    @classmethod
    async def get_search_type_distribution(cls, days: int = 7) -> Dict[str, int]:
        """
        Get distribution of search types.

        Args:
            days: Time window in days

        Returns:
            Dict of {search_type: count}
        """
        from datetime import timedelta

        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_date}}},
            {"$group": {"_id": "$search_type", "count": {"$sum": 1}}},
            {"$project": {"search_type": "$_id", "count": 1, "_id": 0}},
        ]

        results = await cls.get_pymongo_collection().aggregate(pipeline).to_list(None)
        return {r["search_type"]: r["count"] for r in results}


class SearchPerformanceMetrics(Document):
    """
    Aggregated search performance metrics (daily snapshots).

    Stored daily for historical trend analysis.
    """

    date: str  # Format: "YYYY-MM-DD"

    # Volume metrics
    total_searches: int = 0
    unique_users: int = 0
    unique_queries: int = 0

    # Performance metrics
    avg_execution_time_ms: float = 0.0
    p95_execution_time_ms: float = 0.0
    cache_hit_rate: float = 0.0  # Percentage

    # User engagement
    click_through_rate: float = 0.0  # Percentage
    avg_results_per_search: float = 0.0
    no_result_rate: float = 0.0  # Percentage

    # Search type distribution
    text_search_count: int = 0
    subtitle_search_count: int = 0
    llm_search_count: int = 0
    metadata_only_search_count: int = 0

    # Popular queries
    top_queries: list[Dict[str, Any]] = Field(default_factory=list)
    top_no_result_queries: list[Dict[str, Any]] = Field(default_factory=list)

    # Metadata
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "search_performance_metrics"
        indexes = [
            "date",
            [("date", -1)],  # Recent metrics first
        ]

    @classmethod
    async def generate_daily_snapshot(
        cls, date: Optional[datetime] = None
    ) -> "SearchPerformanceMetrics":
        """
        Generate daily performance snapshot.

        Args:
            date: Optional date (defaults to yesterday)

        Returns:
            SearchPerformanceMetrics document
        """
        from datetime import timedelta

        if date is None:
            date = datetime.now(timezone.utc) - timedelta(days=1)

        date_str = date.strftime("%Y-%m-%d")

        # Check if snapshot already exists
        existing = await cls.find_one({"date": date_str})
        if existing:
            return existing

        # Calculate metrics for the day
        start_of_day = datetime(date.year, date.month, date.day)
        end_of_day = start_of_day + timedelta(days=1)

        queries = await SearchQuery.find(
            {"timestamp": {"$gte": start_of_day, "$lt": end_of_day}}
        ).to_list()

        if not queries:
            # No data for this day
            return cls(date=date_str, total_searches=0)

        # Calculate metrics
        total_searches = len(queries)
        unique_users = len(set(q.user_id for q in queries if q.user_id))
        unique_queries = len(set(q.query for q in queries))

        execution_times = [q.execution_time_ms for q in queries]
        avg_execution_time = sum(execution_times) / len(execution_times)
        p95_execution_time = (
            sorted(execution_times)[int(len(execution_times) * 0.95)]
            if execution_times
            else 0
        )

        cache_hits = sum(1 for q in queries if q.cache_hit)
        cache_hit_rate = (cache_hits / total_searches) * 100

        clicks = sum(1 for q in queries if q.clicked_result_id)
        click_through_rate = (clicks / total_searches) * 100

        total_results = sum(q.result_count for q in queries)
        avg_results = total_results / total_searches

        no_results = sum(1 for q in queries if q.result_count == 0)
        no_result_rate = (no_results / total_searches) * 100

        # Search type distribution
        search_types = {}
        for q in queries:
            search_types[q.search_type] = search_types.get(q.search_type, 0) + 1

        # Top queries
        top_queries = await SearchQuery.get_popular_queries(limit=10, days=1)
        top_no_result = await SearchQuery.get_no_result_queries(limit=10, days=1)

        # Create snapshot
        snapshot = cls(
            date=date_str,
            total_searches=total_searches,
            unique_users=unique_users,
            unique_queries=unique_queries,
            avg_execution_time_ms=round(avg_execution_time, 2),
            p95_execution_time_ms=round(p95_execution_time, 2),
            cache_hit_rate=round(cache_hit_rate, 2),
            click_through_rate=round(click_through_rate, 2),
            avg_results_per_search=round(avg_results, 2),
            no_result_rate=round(no_result_rate, 2),
            text_search_count=search_types.get("text", 0),
            subtitle_search_count=search_types.get("subtitle", 0),
            llm_search_count=search_types.get("llm", 0),
            metadata_only_search_count=search_types.get("metadata_only", 0),
            top_queries=top_queries,
            top_no_result_queries=top_no_result,
        )

        await snapshot.insert()
        return snapshot
