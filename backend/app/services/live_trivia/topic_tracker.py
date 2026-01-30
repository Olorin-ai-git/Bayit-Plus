"""
Topic Tracker

Manages MongoDB persistence of detected topics for live trivia.
"""

import logging
from datetime import datetime

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
            # Check if topic already exists
            existing_topic = await LiveTriviaTopic.find_one(
                LiveTriviaTopic.topic_hash == topic_hash,
                LiveTriviaTopic.channel_id == channel_id
            )

            if existing_topic:
                # Update existing with atomic operations to prevent race conditions
                await LiveTriviaTopic.get_motor_collection().update_one(
                    {
                        "_id": existing_topic.id,
                    },
                    {
                        "$inc": {
                            "mention_count": 1,
                            "facts_generated": facts_count,
                        },
                        "$set": {
                            "last_search_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow(),
                        }
                    }
                )
            else:
                # Create new
                topic = LiveTriviaTopic(
                    topic_text=topic_text,
                    topic_hash=topic_hash,
                    entity_type=entity_type,
                    channel_id=channel_id,
                    source_transcript="",  # Could store last transcript snippet
                    confidence_score=self.default_confidence,
                    search_queries=[topic_text],
                    facts_generated=facts_count,
                    last_search_at=datetime.utcnow()
                )
                await topic.insert()

        except Exception as e:
            logger.error(f"Error tracking topic in database: {e}")
