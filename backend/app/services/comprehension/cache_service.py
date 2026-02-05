"""
Comprehension Question Cache Service.

Handles caching and retrieval of generated questions.
"""

from datetime import datetime
from typing import Optional

from app.core.logging_config import get_logger
from app.models.comprehension import (
    ComprehensionQuestionModel,
    ContentComprehension,
)

logger = get_logger(__name__)

# Float comparison tolerance
EPSILON = 0.001


class ComprehensionCacheService:
    """Manage comprehension question cache."""

    async def get_cached_question(
        self,
        content_id: str,
        scene_start_time: float,
        scene_end_time: float,
        language: str,
    ) -> Optional[ComprehensionQuestionModel]:
        """Get cached question for scene."""
        doc = await ContentComprehension.get_for_content(
            content_id, language
        )
        if not doc or not doc.questions:
            return None

        for q in doc.questions:
            if (
                abs(q.scene_start_time - scene_start_time) < EPSILON
                and abs(q.scene_end_time - scene_end_time) < EPSILON
            ):
                return q

        return None

    async def cache_question(
        self,
        content_id: str,
        question: ComprehensionQuestionModel,
        language: str,
    ):
        """Cache question in MongoDB using atomic upsert with duplicate prevention."""
        scene_start = question.scene_start_time
        scene_end = question.scene_end_time

        # Only push if no question exists for this scene (prevents race condition duplicates)
        result = await ContentComprehension.get_motor_collection().update_one(
            {
                "content_id": content_id,
                "language": language,
                "questions": {
                    "$not": {
                        "$elemMatch": {
                            "scene_start_time": {
                                "$gte": scene_start - EPSILON,
                                "$lte": scene_start + EPSILON
                            },
                            "scene_end_time": {
                                "$gte": scene_end - EPSILON,
                                "$lte": scene_end + EPSILON
                            },
                        }
                    }
                }
            },
            {
                "$push": {"questions": question.model_dump()},
                "$setOnInsert": {
                    "content_id": content_id,
                    "language": language,
                    "content_type": "vod",
                    "created_at": datetime.utcnow(),
                },
                "$set": {"updated_at": datetime.utcnow()},
            },
            upsert=True,
        )

        if result.matched_count == 0 and result.modified_count == 0:
            logger.debug(
                "Question already cached for scene",
                extra={
                    "content_id": content_id,
                    "scene_start": scene_start,
                    "scene_end": scene_end
                }
            )
