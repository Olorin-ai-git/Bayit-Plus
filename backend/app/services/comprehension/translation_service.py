"""
Comprehension Translation Service.

Handles translation of Hebrew comprehension questions to English.
"""

import json

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.comprehension import ComprehensionQuestionModel
from app.services.comprehension.prompts import build_translation_prompt

logger = get_logger(__name__)


class ComprehensionTranslationService:
    """Translate comprehension questions."""

    def __init__(self):
        self._anthropic_client = None

    @property
    def anthropic_client(self):
        """Lazy-load Anthropic client."""
        if self._anthropic_client is None:
            self._anthropic_client = get_anthropic_client()
        return self._anthropic_client

    async def add_english_translation(
        self, question: ComprehensionQuestionModel
    ) -> ComprehensionQuestionModel:
        """Add English translation to Hebrew question."""
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

        question.question_text_en = translated_data["question"]
        question.options_en = translated_data["options"]
        question.explanation_en = translated_data.get("explanation")

        return question
