"""
Shoresh (Root Word) Service.
Uses Claude AI to extract Hebrew root words (שורש) from words.
Format: "הולך [הלך]" - word followed by root in brackets.
"""

from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.ai_text_transform_service import AITextTransformService

logger = get_logger(__name__)


class ShoreshService(AITextTransformService[str]):
    """Service for extracting Hebrew root words (shoresh)"""

    def __init__(self):
        super().__init__(
            cache_max_size=settings.SUBTITLE_SHORESH_CACHE_MAX_SIZE,
            service_name="shoresh",
        )

    async def _transform_single(self, text: str) -> str:
        """Extract shoresh from a single Hebrew text"""
        prompt = f"""חלץ שורש מכל מילה בטקסט העברי הבא. החזר את הטקסט בפורמט: 'מילה [שורש]' לכל מילה.

דוגמה:
טקסט: "הילדים הולכים לבית הספר"
תשובה: "הילדים [ילד] הולכים [הלך] לבית [בית] הספר [ספר]"

טקסט: {text}

תשובה:"""

        client = get_anthropic_client()
        # Cap max_tokens to prevent unbounded requests
        max_tokens = min(len(text) * 4, settings.SUBTITLE_AI_MAX_TOKENS)

        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()

    def _create_batch_prompt(self, texts: List[str]) -> str:
        """Create batch prompt for shoresh extraction"""
        texts_formatted = "\n---\n".join(
            [f"[{i+1}] {t}" for i, t in enumerate(texts)]
        )

        return f"""חלץ שורש מכל מילה בכל אחד מהטקסטים הבאים. החזר כל טקסט בשורה נפרדת עם המספור המקורי, בפורמט 'מילה [שורש]'.

דוגמה:
[1] הילדים הולכים
תשובה:
[1] הילדים [ילד] הולכים [הלך]

טקסטים:
{texts_formatted}

תשובות:"""

    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[str]:
        """Parse batch shoresh extraction response"""
        results = []
        parsed_count = 0

        for line in response_text.split("\n"):
            line = line.strip()
            if line.startswith("[") and "]" in line:
                try:
                    bracket_end = line.index("]")
                    idx = int(line[1:bracket_end]) - 1
                    shoresh_text = line[bracket_end + 1 :].strip()

                    if 0 <= idx < len(original_texts):
                        # Extend results list if needed
                        while len(results) <= idx:
                            results.append(None)
                        results[idx] = shoresh_text
                        parsed_count += 1
                except (ValueError, IndexError):
                    continue

        # Fill any missing results with original text
        for i in range(len(original_texts)):
            if i >= len(results) or results[i] is None:
                if i >= len(results):
                    results.append(original_texts[i])
                else:
                    results[i] = original_texts[i]

        self._logger.info(
            "Shoresh batch parsed",
            extra={"total_texts": len(original_texts), "parsed_count": parsed_count},
        )

        return results


# Singleton instance
_shoresh_service = ShoreshService()


async def extract_shoresh(text: str, use_cache: bool = True) -> str:
    """
    Extract shoresh (root words) from Hebrew text using Claude.
    Returns text in format: "word [root]" for each word.
    Example: "הולך [הלך]", "כותבים [כתב]"
    """
    return await _shoresh_service.transform(text, use_cache)


async def extract_shoresh_batch(texts: List[str], use_cache: bool = True) -> List[str]:
    """
    Extract shoresh from multiple texts efficiently.
    Batches uncached texts into single API call.
    Returns list of texts with shoresh in same order as input.
    """
    return await _shoresh_service.transform_batch(texts, use_cache)


def clear_cache():
    """Clear shoresh cache"""
    _shoresh_service.clear_cache()


def get_cache_stats():
    """Get cache statistics"""
    stats = _shoresh_service.get_cache_stats()
    return {
        "shoresh_cache_size": stats["cache_size"],
        "max_size": stats["max_size"],
    }
