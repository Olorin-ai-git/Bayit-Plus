"""
Grammar-Flip (Hebrew Words + English Syntax) Service.
Converts text using Hebrew vocabulary with English sentence structure (SVO).
Excellent for Hebrew speakers learning English sentence patterns.

Example:
Input: "The boy ate the apple."
Output: "The yeled (boy) ate the tapuach (apple)."
"""

from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.ai_text_transform_service import AITextTransformService

logger = get_logger(__name__)

# Grammar-Flip transformation prompt
GRAMMAR_FLIP_PROMPT = """You are a language learning assistant specializing in Hebrew-English synthesis.
Transform the following text using "Grammar-Flip" mode: Hebrew vocabulary with English syntax.

**The Rules:**
1. **English Sentence Structure:** Keep Subject-Verb-Object (SVO) word order strictly in English.
2. **Hebrew Vocabulary:** Replace key nouns, verbs, and adjectives with Hebrew words (transliterated).
3. **Parenthetical Translation:** After each Hebrew word, add the English translation in parentheses.
4. **Consistent Transliteration:** Use phonetic English spelling for Hebrew words.
5. **Learning Focus:** This helps Hebrew speakers understand English sentence structure.

**Common Replacements:**
- boy/girl -> yeled/yalda, man/woman -> ish/isha
- eat/ate -> ochel/achal, drink/drank -> shoteh/shata, go/went -> holech/halach
- apple -> tapuach, water -> mayim, house -> bayit, school -> beit sefer
- big/large -> gadol, small -> katan, good -> tov, bad -> ra

**Text to process:** {text}

**Output only the Grammar-Flip text with parenthetical translations, nothing else.**"""


class GrammarFlipService(AITextTransformService[str]):
    """Service for converting text to Grammar-Flip (Hebrew words + English syntax)"""

    def __init__(self):
        super().__init__(
            cache_max_size=settings.SUBTITLE_GRAMMAR_FLIP_CACHE_MAX_SIZE,
            service_name="grammar_flip",
        )

    async def _transform_single(self, text: str) -> str:
        """Transform a single text to Grammar-Flip format"""
        prompt = GRAMMAR_FLIP_PROMPT.format(text=text)

        client = get_anthropic_client()
        max_tokens = min(len(text) * 4, settings.SUBTITLE_AI_MAX_TOKENS)

        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()

    def _create_batch_prompt(self, texts: List[str]) -> str:
        """Create batch prompt for Grammar-Flip transformation"""
        texts_formatted = "\n---\n".join(
            [f"[{i+1}] {t}" for i, t in enumerate(texts)]
        )

        return f"""Transform each text below using "Grammar-Flip" mode: Hebrew vocabulary with English syntax.

**Rules:**
1. Keep English sentence structure (Subject-Verb-Object)
2. Replace key words with Hebrew (transliterated)
3. Add English translation in parentheses after each Hebrew word
4. Example: "The boy ate the apple" -> "The yeled (boy) achal (ate) the tapuach (apple)"

**Texts:**
{texts_formatted}

**Return in exact format:**
[1] Grammar-Flip text for first
[2] Grammar-Flip text for second
etc."""

    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[str]:
        """Parse batch Grammar-Flip transformation response"""
        results = []
        parsed_count = 0

        for line in response_text.split("\n"):
            line = line.strip()
            if line.startswith("[") and "]" in line:
                try:
                    bracket_end = line.index("]")
                    idx = int(line[1:bracket_end]) - 1
                    transformed_text = line[bracket_end + 1:].strip()

                    if 0 <= idx < len(original_texts):
                        while len(results) <= idx:
                            results.append(None)
                        results[idx] = transformed_text
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
            "Grammar-Flip batch parsed",
            extra={"total_texts": len(original_texts), "parsed_count": parsed_count},
        )

        return results


# Singleton instance
_grammar_flip_service = GrammarFlipService()


async def convert_to_grammar_flip(text: str, use_cache: bool = True) -> str:
    """
    Convert text to Grammar-Flip using Claude AI.
    Grammar-Flip uses Hebrew vocabulary with English sentence structure.

    Example:
        Input: "The boy ate the apple."
        Output: "The yeled (boy) achal (ate) the tapuach (apple)."
    """
    return await _grammar_flip_service.transform(text, use_cache)


async def convert_to_grammar_flip_batch(
    texts: List[str], use_cache: bool = True
) -> List[str]:
    """
    Convert multiple texts to Grammar-Flip efficiently.
    Batches uncached texts into single API call.
    """
    return await _grammar_flip_service.transform_batch(texts, use_cache)


def clear_cache():
    """Clear Grammar-Flip cache"""
    _grammar_flip_service.clear_cache()


def get_cache_stats():
    """Get cache statistics"""
    stats = _grammar_flip_service.get_cache_stats()
    return {
        "grammar_flip_cache_size": stats["cache_size"],
        "max_size": stats["max_size"],
    }
