"""
Topic Tracker

Manages MongoDB persistence of detected topics for live trivia.
"""

import logging
from datetime import datetime, timezone

from app.models.live_trivia import LiveTriviaTopic

logger = logging.getLogger(__name__)


class TopicTracker:
    """Tracks detected topics in MongoDB."""

    def __init__(self, default_confidence: float = 0.8):
        """
        Initialize topic tracker.

        Args:
            default_confidence: Default confidence score for tracked topics
        """
        self.default_confidence = default_confidence

    async def track_topic(
        self,
        topic_text: str,
        entity_type: str,
        topic_hash: str,
        channel_id: str,
        search_url: str,
        facts_count: int
    ) -> None:
        """
        Track detected topic in database.

        Args:
            topic_text: Topic text
            entity_type: Entity type (person, place, etc.)
            topic_hash: Topic hash for deduplication
            channel_id: Channel ID
            search_url: Search URL used
            facts_count: Number of facts generated
        """
        try:
            # Atomic upsert: create or update in single operation (no race condition)
            await LiveTriviaTopic.get_motor_collection().update_one(
                {
                    "channel_id": channel_id,
                    "topic_hash": topic_hash
                },
                {
                    "$inc": {
                        "mention_count": 1,
                        "facts_generated": facts_count,
                    },
                    "$set": {
                        "last_search_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc),
                    },
                    "$setOnInsert": {
                        "topic_text": topic_text,
                        "entity_type": entity_type,
                        "confidence_score": self.default_confidence,
                        "search_queries": [topic_text],
                        "source_transcript": "",
                        "detected_at": datetime.now(timezone.utc),
                        "created_at": datetime.now(timezone.utc),
                    }
                },
                upsert=True  # Create if doesn't exist, update if exists
            )

        except Exception as e:
            logger.error(f"Error tracking topic in database: {e}")
