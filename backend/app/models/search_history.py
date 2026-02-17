"""
Search History Model.

Persists per-user search history for recent searches feature.
"""

from datetime import datetime
from typing import Optional

from beanie import Document
from pydantic import Field

from app.core.config import settings


class SearchHistory(Document):
    """Per-user search history entry."""

    user_id: str
    query: str
    content_type_filter: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "search_history"
        indexes = [
            "user_id",
            "query",
            [("user_id", 1), ("timestamp", -1)],
        ]

    @classmethod
    async def get_user_history(
        cls,
        user_id: str,
        limit: int = 20,
    ) -> list[str]:
        """Get recent unique search queries for a user."""
        pipeline = [
            {"$match": {"user_id": user_id}},
            {"$sort": {"timestamp": -1}},
            {"$group": {"_id": "$query", "latest": {"$first": "$timestamp"}}},
            {"$sort": {"latest": -1}},
            {"$limit": limit},
            {"$project": {"query": "$_id", "_id": 0}},
        ]
        results = await cls.get_pymongo_collection().aggregate(
            pipeline,
        ).to_list(None)
        return [r["query"] for r in results]

    @classmethod
    async def save_query(
        cls,
        user_id: str,
        query: str,
        content_type_filter: Optional[str] = None,
    ) -> "SearchHistory":
        """Save a search query to user history."""
        entry = cls(
            user_id=user_id,
            query=query,
            content_type_filter=content_type_filter,
        )
        await entry.insert()

        # Enforce max history cap per user
        max_entries = settings.SEARCH_HISTORY_MAX_ENTRIES
        count = await cls.find({"user_id": user_id}).count()
        if count > max_entries:
            oldest = await cls.find(
                {"user_id": user_id},
            ).sort("+timestamp").limit(count - max_entries).to_list()
            for old_entry in oldest:
                await old_entry.delete()

        return entry

    @classmethod
    async def remove_query(cls, user_id: str, query: str) -> int:
        """Remove a specific query from user history."""
        result = await cls.find(
            {"user_id": user_id, "query": query},
        ).delete()
        return result.deleted_count if result else 0

    @classmethod
    async def clear_user_history(cls, user_id: str) -> int:
        """Clear all search history for a user."""
        result = await cls.find({"user_id": user_id}).delete()
        return result.deleted_count if result else 0
