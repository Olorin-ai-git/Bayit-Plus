"""
Slang Synthesis (Modern Israeli/American Slang Blend) Service.
Converts text using a blend of modern Israeli and American slang.
Prevents language learning from feeling like "schoolwork" by adding cool factor.

Example:
Input: "That show was terrible but the ending was great!"
Output: "That show was totally al hapane (terrible) but the ending was esh (fire)!"
"""

from typing import List

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.ai_text_transform_service import AITextTransformService

logger = get_logger(__name__)

# Slang Synthesis transformation prompt
SLANG_SYNTHESIS_PROMPT = """You are a bilingual slang expert who speaks both modern Israeli Hebrew and American English fluently.
Transform the following text using "Slang Synthesis" mode: a cool blend of Israeli and American slang.

**The Rules:**
1. **Keep it Natural:** The result should sound like how young bilingual Israelis actually talk.
2. **Israeli Slang Injection:** Replace appropriate words with Israeli slang (transliterated).
3. **Parenthetical Hint:** Add English meaning in parentheses for learning.
4. **American Slang Mix:** Feel free to keep or add American slang where natural.
5. **Vibe Check:** Match the energy - casual, fun, authentic. Not textbook.
6. **Context Matters:** Negative things get negative slang, positive things get hype slang.

**Israeli Slang Dictionary:**
- great/awesome/amazing -> esh (fire), achla, sababa, magniv
- terrible/bad -> al hapane (on the face = terrible), lo beseder
- cool person -> gever (man), achi (my brother), king
- crazy/wild -> meshuga, balagan (chaos)
- yes/sure/okay -> betach, kacha kacha, beseder gamur
- annoying/boring -> matzbia, meakev
- money -> kesef, caspomat
- party/fun -> mistamka, party hard
- food -> ochel magniv, shuklada (chocolate)
- tired -> harus (destroyed), gamus (finished)
- excited -> al ha-pnim, lehit (short for excited)

**American Slang to Mix:**
- fire, lit, goated, slay, no cap, lowkey, highkey, vibe, bet

**Text to process:** {text}

**Output only the Slang Synthesis text with parenthetical translations where helpful, nothing else.**"""


class SlangSynthesisService(AITextTransformService[str]):
    """Service for converting text to Slang Synthesis (Israeli/American blend)"""

    def __init__(self):
        super().__init__(
            cache_max_size=settings.SUBTITLE_SLANG_SYNTHESIS_CACHE_MAX_SIZE,
            service_name="slang_synthesis",
        )

    async def _transform_single(self, text: str) -> str:
        """Transform a single text to Slang Synthesis format"""
        prompt = SLANG_SYNTHESIS_PROMPT.format(text=text)

        client = get_anthropic_client()
        max_tokens = min(len(text) * 4, settings.SUBTITLE_AI_MAX_TOKENS)

        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()

    def _create_batch_prompt(self, texts: List[str]) -> str:
        """Create batch prompt for Slang Synthesis transformation"""
        texts_formatted = "\n---\n".join(
            [f"[{i+1}] {t}" for i, t in enumerate(texts)]
        )

        return f"""Transform each text below using "Slang Synthesis" mode: cool Israeli/American slang blend.

**Rules:**
1. Sound natural - like young bilingual Israelis actually talk
2. Use Israeli slang: esh (fire), achla (great), al hapane (terrible), sababa (cool)
3. Mix with American slang: lit, goated, no cap, vibe
4. Add parenthetical translations for Hebrew slang
5. Keep the energy casual and fun

**Texts:**
{texts_formatted}

**Return in exact format:**
[1] Slang Synthesis text for first
[2] Slang Synthesis text for second
etc."""

    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[str]:
        """Parse batch Slang Synthesis transformation response"""
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
            "Slang Synthesis batch parsed",
            extra={"total_texts": len(original_texts), "parsed_count": parsed_count},
        )

        return results


# Singleton instance
_slang_synthesis_service = SlangSynthesisService()


async def convert_to_slang_synthesis(text: str, use_cache: bool = True) -> str:
    """
    Convert text to Slang Synthesis using Claude AI.
    Slang Synthesis blends modern Israeli and American slang for engaging content.

    Example:
        Input: "That show was terrible but the ending was great!"
        Output: "That show was totally al hapane (terrible) but the ending was esh (fire)!"
    """
    return await _slang_synthesis_service.transform(text, use_cache)


async def convert_to_slang_synthesis_batch(
    texts: List[str], use_cache: bool = True
) -> List[str]:
    """
    Convert multiple texts to Slang Synthesis efficiently.
    Batches uncached texts into single API call.
    """
    return await _slang_synthesis_service.transform_batch(texts, use_cache)


def clear_cache():
    """Clear Slang Synthesis cache"""
    _slang_synthesis_service.clear_cache()


def get_cache_stats():
    """Get cache statistics"""
    stats = _slang_synthesis_service.get_cache_stats()
    return {
        "slang_synthesis_cache_size": stats["cache_size"],
        "max_size": stats["max_size"],
    }
