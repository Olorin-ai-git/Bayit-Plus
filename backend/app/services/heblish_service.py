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

# Heblish transformation prompt - MAXIMUM HEBREW IMMERSION
HEBLISH_PROMPT = """Act as a Hebrew immersion specialist. Convert the following text to COMPREHENSIVE 'Heblish'—English grammar with MAXIMUM Hebrew vocabulary transliterated to English letters.

**CRITICAL: Transliterate AS MANY words as possible to Hebrew while keeping English sentence structure.**

**Priority Transliteration Categories (convert ALL of these):**

1. **Greetings & Expressions:**
   hello/hi → shalom/ahlan, goodbye → lehitraot, thanks → toda, please → bevakasha
   excuse me → slicha, sorry → mitztaer, wow → walla, yes → ken, no → lo

2. **People & Relationships:**
   friends → chaverim, friend → chaver/chavera, buddy/dude → achi, guys → chevre
   people → anashim, person → ben adam, family → mishpacha, mother → ima, father → aba
   brother → ach, sister → achot, children → yeladim, child → yeled/yalda, baby → tinok

3. **Common Verbs (use Hebrew infinitives or conjugated forms):**
   go → lelekhet/holech, come → lavo/ba, see → lirot/ro'eh, want → rotzeh, need → tzarich
   know → yode'a, think → choshev, say → omer, do/make → oseh, give → noten
   take → loke'ach, eat → ochel, drink → shoteh, speak → medaber, hear → shome'a

4. **Adjectives & Descriptions:**
   good/great → tov/sababa/achla, bad → ra, big → gadol, small → katan
   beautiful → yafe/yafa, nice → nechmad, new → chadash, old → yashan
   happy → same'ach, sad → atzuv, tired → ayef, hungry → ra'ev, thirsty → tzame

5. **Common Nouns:**
   house → bayit, home → bayit, room → cheder, door → delet, window → chalon
   car → mechonit, street → rechov, city → ir, country → eretz, world → olam
   food → ochel, water → mayim, bread → lechem, coffee → kafe, tea → te
   day → yom, night → layla, morning → boker, evening → erev, time → zman
   book → sefer, movie → seret, music → musica, work → avoda, school → beit sefer

6. **Adverbs & Modifiers:**
   very → me'od, really → mamash/be'emet, now → achshav, today → hayom
   yesterday → etmol, tomorrow → machar, always → tamid, never → af pa'am
   here → kan, there → sham, maybe → ulai, why → lama, how → eich, what → ma

7. **Expressions & Idioms:**
   let's go → yalla, okay/fine → beseder, cool → magniv, no problem → ein ba'aya
   exactly → bediyuk, of course → bevadai, wait → rega, enough → maspik

**Rules:**
- Keep English sentence structure (Subject-Verb-Object)
- Transliterate to English letters (phonetic)
- Use Hebrew words even if less common in conversation
- Aim for 60-80% Hebrew vocabulary while maintaining clarity
- If unsure, transliterate it anyway - immersion is the goal

**Text to process:** {text}

**Output only the maximum-Hebrew Heblish text, nothing else.**"""


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
        """Create batch prompt for COMPREHENSIVE Heblish transformation"""
        texts_formatted = "\n---\n".join(
            [f"[{i+1}] {t}" for i, t in enumerate(texts)]
        )

        return f"""Act as Hebrew immersion specialist. Convert each text to COMPREHENSIVE 'Heblish'—English grammar with MAXIMUM Hebrew vocabulary.

**CRITICAL: Transliterate AS MANY words as possible to Hebrew using English letters.**

**Quick Reference (transliterate these categories):**
- Greetings: hello→shalom, goodbye→lehitraot, thanks→toda, please→bevakasha
- People: friends→chaverim, people→anashim, family→mishpacha, mother→ima, father→aba
- Verbs: go→lelekhet/holech, come→lavo/ba, see→lirot, want→rotzeh, know→yode'a, think→choshev
- Adjectives: good→tov/sababa, bad→ra, big→gadol, small→katan, beautiful→yafe, nice→nechmad
- Nouns: house→bayit, car→mechonit, food→ochel, water→mayim, day→yom, night→layla
- Adverbs: very→me'od, really→mamash, now→achshav, today→hayom, always→tamid
- Expressions: let's go→yalla, okay→beseder, cool→magniv, no problem→ein ba'aya

**Rules:**
1. Keep English sentence structure (Subject-Verb-Object)
2. Transliterate to English letters (phonetic)
3. Aim for 60-80% Hebrew vocabulary
4. Ensure meaning clear from context
5. Consistency: same English word → same Hebrew throughout

**Texts:**
{texts_formatted}

**Return in exact format:**
[1] Maximum-Hebrew Heblish for first
[2] Maximum-Hebrew Heblish for second
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
