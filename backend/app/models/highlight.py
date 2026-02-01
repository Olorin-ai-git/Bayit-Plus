"""
LiveHighlight Model.

Stores detected highlights from live transcript analysis.
"""

from datetime import datetime
from typing import Literal, Optional
from uuid import uuid4

from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel


class LiveHighlight(Document):
    """Detected highlight from live transcript analysis."""

    highlight_id: str = Field(default_factory=lambda: str(uuid4()))
    channel_id: Indexed(str)
    start_time: float
    end_time: float
    transcript_text: str
    highlight_type: Literal["emotional", "entity", "keyword", "dramatic"]
    confidence: float
    metadata: dict = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "live_highlights"
        indexes = [
            IndexModel([("channel_id", 1), ("start_time", -1)]),
            IndexModel([("created_at", 1)], expireAfterSeconds=86400 * 7),
        ]

    @classmethod
    async def count_recent(cls, channel_id: str, since: datetime) -> int:
        """Count highlights for a channel since a given time."""
        return await cls.find(
            {"channel_id": channel_id, "created_at": {"$gte": since}}
        ).count()

    @classmethod
    async def get_for_channel(
        cls,
        channel_id: str,
        limit: int = 20,
        highlight_type: Optional[str] = None,
    ) -> list["LiveHighlight"]:
        """Get recent highlights for a channel."""
        query = {"channel_id": channel_id}
        if highlight_type:
            query["highlight_type"] = highlight_type

        return await cls.find(query).sort("-start_time").limit(limit).to_list()
