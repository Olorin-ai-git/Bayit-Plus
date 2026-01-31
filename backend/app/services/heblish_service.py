"""
Heblish (English-Hebrew Synthesis) Service.
Converts English text to "Heblish" - English with Hebrew word injections
for cultural immersion and language learning by osmosis.

Example:
Input: "Hello friends! Today we are going to watch a great show."
Output: "Shalom chaverim! Today we are going to watch a sababa show."
"""

from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.ai_text_transform_service import AITextTransformService

logger = get_logger(__name__)

# Heblish transformation prompt
HEBLISH_PROMPT = """Act as a bilingual cultural mediator. Rewrite the following text into 'Heblish'—a synthesis of English and Hebrew.

**The Rules:**
1. **Core Grammar:** Keep the sentence structure primarily in English.
2. **Vocabulary Injection:** Replace high-frequency or culturally specific English nouns, adjectives, and greetings with their Hebrew equivalents. Common replacements:
   - Greetings: hello/hi -> shalom/ahlan, goodbye -> lehitraot, thanks -> toda
   - People: friends -> chaverim, buddy/dude -> achi, guys -> chevre
   - Expressions: great/awesome -> sababa/achla, cool -> magniv, okay/fine -> beseder
   - Common words: let's go -> yalla, really -> be'emet, no problem -> ein ba'aya
3. **Transliteration:** Use English characters for the Hebrew words (Phonetic Transliteration).
4. **Contextual Preservation:** Ensure that even if the user doesn't know the Hebrew word, the context of the English sentence makes the meaning clear.
5. **Tone:** Match the energy of an Israeli 'Sabra'—direct, warm, and a bit informal.
6. **Consistency:** For the same English word, use the same Hebrew replacement throughout.

**Text to process:** {text}

**Output only the Heblish text, nothing else.**"""


class HeblishService(AITextTransformService[str]):
    """Service for converting English text to Heblish (English with Hebrew injections)"""

    def __init__(self):
        super().__init__(
            cache_max_size=settings.SUBTITLE_HEBLISH_CACHE_MAX_SIZE,
            service_name="heblish",
        )

    async def _transform_single(self, text: str) -> str:
        """Transform a single English text to Heblish"""
        prompt = HEBLISH_PROMPT.format(text=text)

        client = get_anthropic_client()
        max_tokens = min(len(text) * 3, settings.SUBTITLE_AI_MAX_TOKENS)

        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()

    def _create_batch_prompt(self, texts: List[str]) -> str:
        """Create batch prompt for Heblish transformation"""
        texts_formatted = "\n---\n".join(
            [f"[{i+1}] {t}" for i, t in enumerate(texts)]
        )

        return f"""Act as a bilingual cultural mediator. Convert each English text below to 'Heblish'—English with Hebrew word injections.

**Rules:**
1. Keep sentence structure in English
2. Replace greetings, common nouns, and expressions with Hebrew equivalents (transliterated)
   - hello/hi -> shalom/ahlan, friends -> chaverim, great -> sababa, okay -> beseder
   - let's go -> yalla, thanks -> toda, cool -> magniv, guys -> chevre
3. Use English characters for Hebrew words (phonetic transliteration)
4. Ensure meaning is clear from English context
5. Keep the "Sabra" tone—direct, warm, informal

**Texts:**
{texts_formatted}

**Return in exact format:**
[1] Heblish text for first
[2] Heblish text for second
etc."""

    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[str]:
        """Parse batch Heblish transformation response"""
        results = []
        parsed_count = 0

        for line in response_text.split("\n"):
            line = line.strip()
            if line.startswith("[") and "]" in line:
                try:
                    bracket_end = line.index("]")
                    idx = int(line[1:bracket_end]) - 1
                    heblish_text = line[bracket_end + 1:].strip()

                    if 0 <= idx < len(original_texts):
                        while len(results) <= idx:
                            results.append(None)
                        results[idx] = heblish_text
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
            "Heblish batch parsed",
            extra={"total_texts": len(original_texts), "parsed_count": parsed_count},
        )

        return results


# Singleton instance
_heblish_service = HeblishService()


async def convert_to_heblish(text: str, use_cache: bool = True) -> str:
    """
    Convert English text to Heblish using Claude AI.
    Heblish is English with Hebrew word injections for cultural immersion.

    Example:
        Input: "Hello friends! Today we watch a great show."
        Output: "Shalom chaverim! Today we watch a sababa show."
    """
    return await _heblish_service.transform(text, use_cache)


async def convert_to_heblish_batch(
    texts: List[str], use_cache: bool = True
) -> List[str]:
    """
    Convert multiple English texts to Heblish efficiently.
    Batches uncached texts into single API call.
    """
    return await _heblish_service.transform_batch(texts, use_cache)


def clear_cache():
    """Clear Heblish cache"""
    _heblish_service.clear_cache()


def get_cache_stats():
    """Get cache statistics"""
    stats = _heblish_service.get_cache_stats()
    return {
        "heblish_cache_size": stats["cache_size"],
        "max_size": stats["max_size"],
    }
