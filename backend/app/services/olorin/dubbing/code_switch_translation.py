"""
Code-Switch Translation Service.

Creates mixed Hebrew/English translations where known vocabulary
stays in Hebrew and unknown words are translated to English.
Maintains the target language ratio.
"""

import json
import logging
from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.services.security_utils import sanitize_for_prompt

logger = logging.getLogger(__name__)

CODE_SWITCH_SYSTEM_PROMPT = (
    "You are a bilingual Hebrew-English translator for children's content. "
    "Given Hebrew source text and a list of known Hebrew words, create a "
    "code-switched translation that: "
    "1) Keeps known Hebrew words in Hebrew "
    "2) Translates unknown words to English "
    "3) Maintains natural sentence flow "
    "4) Targets the specified Hebrew ratio "
    "Respond in JSON format with 'mixed_text' and 'hebrew_words_used' fields."
)


class CodeSwitchTranslation:
    """Creates code-switched Hebrew/English translations."""

    async def translate(
        self,
        hebrew_text: str,
        known_hebrew_words: List[str],
        target_ratio: float,
    ) -> dict:
        """
        Create a code-switched translation.

        Args:
            hebrew_text: Original Hebrew text
            known_hebrew_words: Words to keep in Hebrew
            target_ratio: Target Hebrew ratio (0.0-1.0)

        Returns:
            Dict with mixed_text and hebrew_words_used
        """
        safe_text = sanitize_for_prompt(hebrew_text)
        safe_words = sanitize_for_prompt(
            ", ".join(known_hebrew_words)
        )

        prompt = (
            f"Hebrew source: {safe_text}\n"
            f"Known Hebrew words: {safe_words}\n"
            f"Target Hebrew ratio: {target_ratio}\n\n"
            f"Create a code-switched sentence keeping known words "
            f"in Hebrew and translating the rest to English. "
            f"Return JSON: {{\"mixed_text\": \"...\", "
            f"\"hebrew_words_used\": [...], "
            f"\"language_segments\": ["
            f"{{\"text\": \"...\", \"language\": \"he|en\"}}]}}"
        )

        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.BILINGUAL_DUBBING_AI_MODEL,
            max_tokens=settings.BILINGUAL_DUBBING_MAX_TOKENS,
            system=CODE_SWITCH_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": prompt}],
        )

        text = response.content[0].text
        result = self._parse_json_response(text)

        logger.info(
            "Code-switch translation complete",
            extra={
                "source_length": len(hebrew_text),
                "hebrew_words_kept": len(
                    result.get("hebrew_words_used", [])
                ),
                "target_ratio": target_ratio,
            },
        )
        return result

    def _parse_json_response(self, text: str) -> dict:
        """Parse JSON from Claude response."""
        cleaned = text.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            cleaned = "\n".join(lines)
        return json.loads(cleaned)


code_switch_translation = CodeSwitchTranslation()
