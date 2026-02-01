"""
Engrew (English+Hebrew in Hebrew letters) Service.
Converts Hebrew text to "Engrew" - Hebrew with English word injections
written in Hebrew letters, with the original English in parentheses.

Example:
Input: "אני הולך לגלוש על הגלים היום"
Output: "אני הולך לסרף (Surf) על הווייבס (Waves) היום"

This is the Hebrew equivalent of Heblish - helping Hebrew speakers
learn English vocabulary naturally through immersion.
"""

from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.ai_text_transform_service import AITextTransformService
from app.services.security_utils import sanitize_for_prompt

logger = get_logger(__name__)

# Engrew transformation prompt
ENGREW_PROMPT = """Act as a bilingual cultural mediator. Rewrite the following Hebrew text into 'Engrew'—Hebrew with English word injections written in Hebrew letters.

**The Rules:**
1. **Core Grammar:** Keep the sentence structure primarily in Hebrew.
2. **Vocabulary Injection:** Replace some Hebrew nouns, adjectives, and expressions with their English equivalents, transliterated into Hebrew letters. The original English word should appear in parentheses after. Common replacements:
   - Greetings: שלום -> היי (Hi), להתראות -> ביי (Bye)
   - Expressions: מגניב/אחלה -> קול (Cool), בסדר -> אוקיי (OK)
   - Common words: חברים -> פרנדס (Friends), אהבה -> לאב (Love)
   - Modern terms: גלישה -> סרפינג (Surfing), קניות -> שופינג (Shopping)
3. **Transliteration Format:** Write the English word in Hebrew letters, followed by the original English in parentheses.
   Example: קול (Cool), נייס (Nice), אמייזינג (Amazing)
4. **Natural Integration:** Don't over-inject - keep it natural and readable. About 15-25% word replacement.
5. **Contextual Clarity:** Even if the user doesn't know the English word, the context should make meaning clear.
6. **Consistency:** For the same Hebrew word, use the same English replacement throughout.

**Text to process:** {text}

**Output only the Engrew text, nothing else.**"""


class EngrewService(AITextTransformService[str]):
    """Service for converting Hebrew text to Engrew (Hebrew with English injections)"""

    def __init__(self):
        super().__init__(
            cache_max_size=settings.SUBTITLE_ENGREW_CACHE_MAX_SIZE,
            service_name="engrew",
        )

    async def _transform_single(self, text: str) -> str:
        """Transform a single Hebrew text to Engrew"""
        # Sanitize input to prevent prompt injection
        sanitized_text = sanitize_for_prompt(text, max_len=2000)
        prompt = ENGREW_PROMPT.format(text=sanitized_text)

        client = get_anthropic_client()
        max_tokens = min(len(text) * 4, settings.SUBTITLE_AI_MAX_TOKENS)

        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()

    def _create_batch_prompt(self, texts: List[str]) -> str:
        """Create batch prompt for Engrew transformation"""
        texts_formatted = "\n---\n".join(
            [f"[{i+1}] {t}" for i, t in enumerate(texts)]
        )

        return f"""Act as a bilingual cultural mediator. Convert each Hebrew text below to 'Engrew'—Hebrew with English word injections in Hebrew letters.

**Rules:**
1. Keep sentence structure in Hebrew
2. Replace some Hebrew words with English equivalents in Hebrew letters + original in parentheses
   - Examples: קול (Cool), נייס (Nice), פרנדס (Friends), לאב (Love)
3. Keep it natural - about 15-25% word replacement
4. Ensure meaning is clear from Hebrew context
5. Be consistent with replacements

**Texts:**
{texts_formatted}

**Return in exact format:**
[1] Engrew text for first
[2] Engrew text for second
etc."""

    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[str]:
        """Parse batch Engrew transformation response"""
        results = []
        parsed_count = 0

        for line in response_text.split("\n"):
            line = line.strip()
            if line.startswith("[") and "]" in line:
                try:
                    bracket_end = line.index("]")
                    idx = int(line[1:bracket_end]) - 1
                    engrew_text = line[bracket_end + 1:].strip()

                    if 0 <= idx < len(original_texts):
                        while len(results) <= idx:
                            results.append(None)
                        results[idx] = engrew_text
                        parsed_count += 1
                except (ValueError, IndexError):
                    continue

        # Fill missing results with original text
        for i in range(len(original_texts)):
            if i >= len(results) or results[i] is None:
                if i >= len(results):
                    results.append(original_texts[i])
                else:
                    results[i] = original_texts[i]

        self._logger.info(
            "Engrew batch parsed",
            extra={"total_texts": len(original_texts), "parsed_count": parsed_count},
        )

        return results


# Singleton instance
_engrew_service = EngrewService()


async def convert_to_engrew(text: str, use_cache: bool = True) -> str:
    """
    Convert Hebrew text to Engrew using Claude AI.
    Engrew is Hebrew with English word injections in Hebrew letters.

    Example:
        Input: "אני הולך לגלוש על הגלים היום"
        Output: "אני הולך לסרף (Surf) על הווייבס (Waves) היום"
    """
    return await _engrew_service.transform(text, use_cache)


async def convert_to_engrew_batch(
    texts: List[str], use_cache: bool = True
) -> List[str]:
    """
    Convert multiple Hebrew texts to Engrew efficiently.
    Batches uncached texts into single API call.
    """
    return await _engrew_service.transform_batch(texts, use_cache)


def clear_cache():
    """Clear Engrew cache"""
    _engrew_service.clear_cache()


def get_cache_stats():
    """Get cache statistics"""
    stats = _engrew_service.get_cache_stats()
    return {
        "engrew_cache_size": stats["cache_size"],
        "max_size": stats["max_size"],
    }
