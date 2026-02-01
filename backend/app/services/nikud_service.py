"""
Nikud (Vocalization) Service.
Uses Claude AI to add nikud marks to Hebrew text for heritage speakers.
Also provides word translation for tap-to-translate feature.
"""

import json
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.core.ai_clients import get_anthropic_client
from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.ai_text_transform_service import AITextTransformService

logger = get_logger(__name__)


@dataclass
class TranslationResult:
    """Result of word translation"""

    word: str
    translation: str
    transliteration: Optional[str] = None
    part_of_speech: Optional[str] = None
    example: Optional[str] = None
    example_translation: Optional[str] = None


class NikudService(AITextTransformService[str]):
    """Service for adding nikud (vocalization) to Hebrew text"""

    def __init__(self):
        super().__init__(
            cache_max_size=settings.SUBTITLE_NIKUD_CACHE_MAX_SIZE,
            service_name="nikud",
        )

    async def _transform_single(self, text: str) -> str:
        """Add nikud to a single Hebrew text"""
        prompt = f"""הוסף ניקוד (תנועות) לטקסט העברי הבא. החזר רק את הטקסט עם הניקוד, ללא הסברים נוספים.

טקסט: {text}

טקסט עם ניקוד:"""

        client = get_anthropic_client()
        # Cap max_tokens to prevent unbounded requests
        max_tokens = min(len(text) * 3, settings.SUBTITLE_AI_MAX_TOKENS)
        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()

    def _create_batch_prompt(self, texts: List[str]) -> str:
        """Create batch prompt for nikud addition"""
        texts_formatted = "\n---\n".join(
            [f"[{i+1}] {t}" for i, t in enumerate(texts)]
        )

        return f"""הוסף ניקוד לכל אחד מהטקסטים הבאים. החזר כל טקסט בשורה נפרדת, עם המספור המקורי.

{texts_formatted}

החזר בפורמט:
[1] טקסט עם ניקוד
[2] טקסט עם ניקוד
וכו'"""

    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[str]:
        """Parse batch nikud addition response"""
        results = []

        for line in response_text.split("\n"):
            line = line.strip()
            if line.startswith("[") and "]" in line:
                try:
                    bracket_end = line.index("]")
                    idx = int(line[1:bracket_end]) - 1
                    nikud_text = line[bracket_end + 1 :].strip()

                    if 0 <= idx < len(original_texts):
                        # Extend results list if needed
                        while len(results) <= idx:
                            results.append(None)
                        results[idx] = nikud_text
                except (ValueError, IndexError):
                    continue

        # Fill any missing results with original text
        for i in range(len(original_texts)):
            if i >= len(results) or results[i] is None:
                if i >= len(results):
                    results.append(original_texts[i])
                else:
                    results[i] = original_texts[i]

        return results


class TranslationService(AITextTransformService[TranslationResult]):
    """Service for translating Hebrew words with context"""

    def __init__(self):
        super().__init__(
            cache_max_size=settings.SUBTITLE_NIKUD_CACHE_MAX_SIZE,
            service_name="translation",
            supports_batch=False,  # Translation uses sequential processing
        )
        self._source_lang = "he"
        self._target_lang = "en"

    def set_languages(self, source_lang: str, target_lang: str):
        """Set source and target languages for translation"""
        self._source_lang = source_lang
        self._target_lang = target_lang

    async def _transform_single(self, text: str) -> TranslationResult:
        """Translate a single word with context"""
        if self._source_lang == "he" and self._target_lang == "en":
            prompt = f"""תרגם את המילה העברית הבאה לאנגלית. החזר JSON בפורמט:
{{
    "translation": "English translation",
    "transliteration": "How to pronounce in English letters",
    "part_of_speech": "noun/verb/adjective/etc",
    "example": "משפט דוגמה בעברית",
    "example_translation": "Example sentence in English"
}}

מילה: {text}"""
        else:
            prompt = f"""Translate this word from {self._source_lang} to {self._target_lang}:
Word: {text}

Return JSON:
{{
    "translation": "translated word",
    "transliteration": "pronunciation guide",
    "part_of_speech": "noun/verb/etc"
}}"""

        client = get_anthropic_client()
        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text.strip()

        # Parse JSON
        if response_text.startswith("```json"):
            response_text = response_text[7:]
        if response_text.startswith("```"):
            response_text = response_text[3:]
        if response_text.endswith("```"):
            response_text = response_text[:-3]

        data = json.loads(response_text)

        return TranslationResult(
            word=text,
            translation=data.get("translation", ""),
            transliteration=data.get("transliteration"),
            part_of_speech=data.get("part_of_speech"),
            example=data.get("example"),
            example_translation=data.get("example_translation"),
        )

    def _create_batch_prompt(self, texts: List[str]) -> str:
        """Not used - translation uses sequential processing (supports_batch=False)"""
        return ""  # Not called due to supports_batch=False

    def _parse_batch_response(
        self, response_text: str, original_texts: List[str]
    ) -> List[TranslationResult]:
        """Not used - translation uses sequential processing (supports_batch=False)"""
        return []  # Not called due to supports_batch=False


# Singleton instances
_nikud_service = NikudService()
_translation_service = TranslationService()


async def add_nikud(text: str, use_cache: bool = True) -> str:
    """
    Add nikud (vocalization marks) to Hebrew text using Claude.
    Nikud helps heritage speakers who understand spoken Hebrew
    but struggle to read unvocalized text.
    """
    return await _nikud_service.transform(text, use_cache)


async def add_nikud_batch(texts: List[str], use_cache: bool = True) -> List[str]:
    """
    Add nikud to multiple texts efficiently.
    Batches uncached texts into single API call.
    """
    return await _nikud_service.transform_batch(texts, use_cache)


async def translate_word(
    word: str, source_lang: str = "he", target_lang: str = "en", use_cache: bool = True
) -> TranslationResult:
    """
    Translate a single word with context.
    Used for tap-to-translate feature in interactive subtitles.
    """
    if not word or not word.strip():
        return TranslationResult(word=word, translation="")

    _translation_service.set_languages(source_lang, target_lang)
    return await _translation_service.transform(word, use_cache)


async def translate_phrase(
    phrase: str, source_lang: str = "he", target_lang: str = "en"
) -> str:
    """
    Translate a phrase or sentence.
    """
    if not phrase or not phrase.strip():
        return ""

    # Language names in Hebrew for Hebrew-sourced prompts
    target_lang_names_he = {
        "en": "אנגלית",
        "es": "ספרדית",
        "fr": "צרפתית",
        "de": "גרמנית",
        "ru": "רוסית",
        "ar": "ערבית",
        "zh": "סינית",
        "ja": "יפנית",
        "it": "איטלקית",
        "pt": "פורטוגזית",
    }
    target_lang_name = target_lang_names_he.get(target_lang, target_lang)

    if source_lang == "he":
        prompt = f"תרגם את המשפט הבא ל{target_lang_name}. החזר רק את התרגום:\n\n{phrase}"
    else:
        prompt = f"Translate to {target_lang}:\n\n{phrase}"

    try:
        client = get_anthropic_client()
        # Cap max_tokens to prevent unbounded requests
        max_tokens = min(len(phrase) * 2, settings.SUBTITLE_AI_MAX_TOKENS)

        response = await client.messages.create(
            model=settings.SUBTITLE_AI_MODEL,
            max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()

    except Exception as e:
        logger.error(f"Error translating phrase: {e}")
        return ""


def translation_to_dict(result: TranslationResult) -> Dict[str, Any]:
    """Convert TranslationResult to dictionary"""
    return {
        "word": result.word,
        "translation": result.translation,
        "transliteration": result.transliteration,
        "part_of_speech": result.part_of_speech,
        "example": result.example,
        "example_translation": result.example_translation,
    }


def clear_caches():
    """Clear all caches"""
    _nikud_service.clear_cache()
    _translation_service.clear_cache()


def get_cache_stats() -> Dict[str, int]:
    """Get cache statistics"""
    nikud_stats = _nikud_service.get_cache_stats()
    translation_stats = _translation_service.get_cache_stats()

    return {
        "nikud_cache_size": nikud_stats["cache_size"],
        "translation_cache_size": translation_stats["cache_size"],
        "max_size": settings.SUBTITLE_NIKUD_CACHE_MAX_SIZE,
    }
