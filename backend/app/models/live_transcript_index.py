"""
LiveTranscriptIndex Model.

Stores indexed live transcripts for search functionality.
"""

from datetime import datetime

from beanie import Document, Indexed
from pydantic import Field
from pymongo import IndexModel


class LiveTranscriptIndex(Document):
    """Indexed live transcript for search."""

    channel_id: Indexed(str)
    text: str
    timestamp: datetime
    source_lang: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "live_transcript_index"
        indexes = [
            IndexModel([("channel_id", 1), ("timestamp", -1)]),
            IndexModel([("text", "text")]),
            IndexModel([("created_at", 1)], expireAfterSeconds=86400),
        ]

    @classmethod
    async def search(
        cls,
        channel_id: str,
        query: str,
        limit: int = 20,
    ) -> list[dict]:
        """Search transcripts using text index."""
        results = await cls.find(
            {"channel_id": channel_id, "$text": {"$search": query}}
        ).sort("-timestamp").limit(limit).to_list()

        return [
            {
                "text": r.text,
                "timestamp": r.timestamp.isoformat(),
                "source_lang": r.source_lang,
                "score": getattr(r, "score", None),
            }
            for r in results
        ]

    @classmethod
    async def get_recent(
        cls,
        channel_id: str,
        limit: int = 50,
        minutes: int = 15,
    ) -> list[dict]:
        """Get recent transcripts for a channel."""
        from datetime import timedelta

        since = datetime.utcnow() - timedelta(minutes=minutes)
        results = await cls.find(
            {"channel_id": channel_id, "created_at": {"$gte": since}}
        ).sort("-timestamp").limit(limit).to_list()

        return [
            {
                "text": r.text,
                "timestamp": r.timestamp.isoformat(),
                "source_lang": r.source_lang,
            }
            for r in results
        ]
