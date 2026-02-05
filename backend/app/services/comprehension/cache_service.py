"""
Comprehension Question Cache Service.

Handles caching and retrieval of generated questions.
"""

from typing import Optional

from app.core.logging_config import get_logger
from app.models.comprehension import (
    ComprehensionQuestionModel,
    ContentComprehension,
)

logger = get_logger(__name__)


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
                q.scene_start_time == scene_start_time
                and q.scene_end_time == scene_end_time
            ):
                return q

        return None

    async def cache_question(
        self,
        content_id: str,
        question: ComprehensionQuestionModel,
        language: str,
    ):
        """Cache question in MongoDB."""
        doc = await ContentComprehension.get_for_content(
            content_id, language
        )
        if not doc:
            doc = ContentComprehension(
                content_id=content_id,
                language=language,
                questions=[question],
            )
            await doc.insert()
        else:
            doc.questions.append(question)
            await doc.save()
