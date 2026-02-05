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
        """Cache question in MongoDB using atomic upsert."""
        await ContentComprehension.get_motor_collection().update_one(
            {"content_id": content_id, "language": language},
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
