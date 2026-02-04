"""
Comprehension Question Service.

Generates comprehension questions for scenes using Claude Anthropic.
"""

import json
from typing import Optional

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.chapters import VideoChapters
from app.models.comprehension import (
    ComprehensionQuestionModel,
    ContentComprehension,
)
from app.models.content import Content
from app.services.comprehension.prompts import (
    build_comprehension_question_prompt,
    build_translation_prompt,
)
from app.services.scene_detection_service import SceneDetectionService

logger = get_logger(__name__)


class ComprehensionQuestionService:
    """Generate and manage comprehension questions."""

    def __init__(self):
        self._anthropic_client = None
        self.scene_detector = SceneDetectionService()

    @property
    def anthropic_client(self):
        """Lazy-load Anthropic client."""
        if self._anthropic_client is None:
            self._anthropic_client = get_anthropic_client()
        return self._anthropic_client

    async def get_or_generate_question(
        self,
        content_id: str,
        scene_start_time: float,
        scene_end_time: float,
        language: str = "he",
    ) -> Optional[ComprehensionQuestionModel]:
        """
        Get cached question or generate new one for scene.

        Pipeline:
        1. Check cache (ContentComprehension collection)
        2. If not cached:
           a. Fetch scene context (subtitle text + chapter metadata)
           b. Generate question via Claude
           c. Translate if needed
           d. Cache in MongoDB
        3. Return question
        """
        # Check cache
        cached = await self._get_cached_question(
            content_id, scene_start_time, scene_end_time, language
        )
        if cached:
            return cached

        # Get content metadata
        content = await Content.get(content_id)
        if not content:
            logger.error(f"Content not found: {content_id}")
            return None

        # Get scene context
        scene = await self.scene_detector.get_scene_at_timestamp(
            content_id, scene_end_time
        )
        if not scene:
            logger.warning(
                f"No scene found at {scene_end_time}s for {content_id}"
            )
            return None

        # Get chapter title if available
        chapter_title = await self._get_chapter_title(
            content_id, scene_start_time
        )

        # Generate question
        try:
            question = await self._generate_question(
                scene_context=scene.subtitle_text,
                chapter_title=chapter_title,
                content_title=content.title,
                language=language,
                scene_start_time=scene_start_time,
                scene_end_time=scene_end_time,
            )

            # Cache question
            await self._cache_question(content_id, question, language)

            return question

        except Exception as e:
            logger.error(
                f"Failed to generate question for {content_id}: {e}"
            )
            return None

    async def _generate_question(
        self,
        scene_context: str,
        chapter_title: Optional[str],
        content_title: str,
        language: str,
        scene_start_time: float,
        scene_end_time: float,
    ) -> ComprehensionQuestionModel:
        """Generate question using Claude."""
        prompt = build_comprehension_question_prompt(
            scene_context=scene_context,
            chapter_title=chapter_title or "",
            content_title=content_title,
            language=language,
        )

        response = await self.anthropic_client.messages.create(
            model=settings.COMPREHENSION_QUESTION_MODEL,
            max_tokens=settings.COMPREHENSION_AI_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )

        # Parse JSON response
        content_text = response.content[0].text
        question_data = json.loads(content_text)

        # Build question model
        question = ComprehensionQuestionModel(
            question_text=question_data["question"],
            options=question_data["options"],
            correct_index=question_data["correct_index"],
            explanation=question_data.get("explanation"),
            scene_start_time=scene_start_time,
            scene_end_time=scene_end_time,
            scene_context=scene_context[:1000],
            chapter_title=chapter_title,
            generation_method="ai",
        )

        # Generate translation if Hebrew
        if language == "he":
            question = await self._add_english_translation(question)

        return question

    async def _add_english_translation(
        self, question: ComprehensionQuestionModel
    ) -> ComprehensionQuestionModel:
        """Add English translation to Hebrew question."""
        # Build translation data
        translation_input = {
            "question": question.question_text,
            "options": question.options,
            "explanation": question.explanation,
        }

        prompt = build_translation_prompt(
            text=json.dumps(translation_input, ensure_ascii=False),
            source_lang="he",
            target_lang="en",
        )

        response = await self.anthropic_client.messages.create(
            model=settings.COMPREHENSION_QUESTION_MODEL,
            max_tokens=settings.COMPREHENSION_AI_MAX_TOKENS,
            messages=[{"role": "user", "content": prompt}],
        )

        content_text = response.content[0].text
        translated_data = json.loads(content_text)

        # Update question with translations
        question.question_text_en = translated_data["question"]
        question.options_en = translated_data["options"]
        question.explanation_en = translated_data.get("explanation")

        return question

    async def _get_cached_question(
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

        # Find question matching scene timing
        for q in doc.questions:
            if (
                q.scene_start_time == scene_start_time
                and q.scene_end_time == scene_end_time
            ):
                return q

        return None

    async def _cache_question(
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

    async def _get_chapter_title(
        self, content_id: str, timestamp: float
    ) -> Optional[str]:
        """Get chapter title for timestamp."""
        chapters_doc = await VideoChapters.find_one(
            {"content_id": content_id}
        )
        if not chapters_doc or not chapters_doc.chapters:
            return None

        # Find chapter containing timestamp
        for chapter in chapters_doc.chapters:
            if chapter.start_time <= timestamp <= chapter.end_time:
                return chapter.title

        return None
