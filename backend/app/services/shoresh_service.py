"""
Shoresh (Root Word) Service.
Uses Claude AI to extract Hebrew root words (שורש) from words.
Returns structured data for frontend to render with bold shoresh letters.
"""

import json
import re
from typing import List, TypedDict

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.ai_text_transform_service import AITextTransformService

logger = get_logger(__name__)


class ShoreshSegment(TypedDict):
    """A word with its shoresh (root)"""
    word: str
    shoresh: str


class ShoreshResult(TypedDict):
    """Structured shoresh extraction result"""
    segments: List[ShoreshSegment]


class ShoreshService(AITextTransformService[str]):
    """Service for extracting Hebrew root words (shoresh)"""

    def __init__(self):
        super().__init__(
            cache_max_size=settings.SUBTITLE_SHORESH_CACHE_MAX_SIZE,
            service_name="shoresh",
        )

    async def _transform_single(self, text: str) -> str:
        """Extract shoresh from a single Hebrew text, return as JSON"""
        prompt = f"""Extract the shoresh (Hebrew root, typically 3 consonants) from each Hebrew word.
Return ONLY valid JSON in this exact format:
{{"segments":[{{"word":"מילה","shoresh":"שורש"}}]}}

Rules:
- Include punctuation and spaces with the preceding word
- For non-Hebrew words or particles without roots, use empty string for shoresh
- Keep the original word exactly as written

Example:
Input: "הילדים הולכים לבית"
Output: {{"segments":[{{"word":"הילדים","shoresh":"ילד"}},{{"word":" הולכים","shoresh":"הלך"}},{{"word":" לבית","shoresh":"בית"}}]}}

Input: {text}
Output:"""

        client = get_anthropic_client()
        max_tokens = min(len(text) * 6, settings.SUBTITLE_AI_MAX_TOKENS)

        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        result_text = response.content[0].text.strip()

        # Validate JSON and return
        try:
            parsed = json.loads(result_text)
            if "segments" in parsed:
                return result_text
        except json.JSONDecodeError:
            pass

        # Fallback: return original text as single segment
        return json.dumps({"segments": [{"word": text, "shoresh": ""}]})

    def _create_batch_prompt(self, texts: List[str]) -> str:
        """Create batch prompt for shoresh extraction"""
        texts_formatted = "\n".join([f"[{i+1}] {t}" for i, t in enumerate(texts)])

        return f"""Extract shoresh (Hebrew root) from each word in each text.
Return each result on a new line with the index, as valid JSON.

Format per line:
[N] {{"segments":[{{"word":"מילה","shoresh":"שורש"}}]}}

Rules:
- Include spaces/punctuation with preceding word
- Empty shoresh for non-Hebrew words or particles
- Keep original words exactly as written

Texts:
{texts_formatted}

Results:"""

    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[str]:
        """Parse batch shoresh extraction response"""
        results: List[str | None] = [None] * len(original_texts)
        parsed_count = 0

        for line in response_text.split("\n"):
            line = line.strip()
            if not line.startswith("["):
                continue

            match = re.match(r"\[(\d+)\]\s*(.+)", line)
            if not match:
                continue

            try:
                idx = int(match.group(1)) - 1
                json_str = match.group(2).strip()

                if 0 <= idx < len(original_texts):
                    # Validate JSON
                    parsed = json.loads(json_str)
                    if "segments" in parsed:
                        results[idx] = json_str
                        parsed_count += 1
            except (ValueError, json.JSONDecodeError):
                continue

        # Fill missing with fallback
        for i, text in enumerate(original_texts):
            if results[i] is None:
                results[i] = json.dumps({"segments": [{"word": text, "shoresh": ""}]})

        self._logger.info(
            "Shoresh batch parsed",
            extra={"total_texts": len(original_texts), "parsed_count": parsed_count},
        )

        return results  # type: ignore


# Singleton instance
_shoresh_service = ShoreshService()


async def extract_shoresh(text: str, use_cache: bool = True) -> str:
    """
    Extract shoresh (root words) from Hebrew text using Claude.
    Returns JSON with word-shoresh pairs for frontend rendering.
    Format: {"segments": [{"word": "הולכים", "shoresh": "הלך"}, ...]}
    """
    return await _shoresh_service.transform(text, use_cache)


async def extract_shoresh_batch(texts: List[str], use_cache: bool = True) -> List[str]:
    """
    Extract shoresh from multiple texts efficiently.
    Batches uncached texts into single API call.
    Returns list of JSON strings with shoresh data in same order as input.
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
