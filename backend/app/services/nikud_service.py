"""
Nikud (Vocalization) Service.
Uses Claude AI to add nikud marks to Hebrew text for heritage speakers.
Also provides word translation for tap-to-translate feature.
"""
import hashlib
import json
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import anthropic
from app.core.config import settings


@dataclass
class TranslationResult:
    """Result of word translation"""

    word: str
    translation: str
    transliteration: Optional[str] = None
    part_of_speech: Optional[str] = None
    example: Optional[str] = None
    example_translation: Optional[str] = None


# Simple in-memory cache for nikud and translations
_nikud_cache: Dict[str, str] = {}
_translation_cache: Dict[str, TranslationResult] = {}
_cache_max_size = 10000


def _get_cache_key(text: str) -> str:
    """Generate cache key for text"""
    return hashlib.md5(text.encode()).hexdigest()


async def add_nikud(text: str, use_cache: bool = True) -> str:
    """
    Add nikud (vocalization marks) to Hebrew text using Claude.
    Nikud helps heritage speakers who understand spoken Hebrew
    but struggle to read unvocalized text.
    """
    if not text or not text.strip():
        return text

    # Check cache
    cache_key = _get_cache_key(text)
    if use_cache and cache_key in _nikud_cache:
        return _nikud_cache[cache_key]

    prompt = f"""הוסף ניקוד (תנועות) לטקסט העברי הבא. החזר רק את הטקסט עם הניקוד, ללא הסברים נוספים.

טקסט: {text}

טקסט עם ניקוד:"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=len(text) * 3,  # Nikud adds characters
            messages=[{"role": "user", "content": prompt}],
        )

        nikud_text = response.content[0].text.strip()

        # Cache result
        if use_cache and len(_nikud_cache) < _cache_max_size:
            _nikud_cache[cache_key] = nikud_text

        return nikud_text

    except Exception as e:
        print(f"Error adding nikud: {e}")
        return text


async def add_nikud_batch(texts: List[str], use_cache: bool = True) -> List[str]:
    """
    Add nikud to multiple texts efficiently.
    Batches uncached texts into single API call.
    """
    results = []
    uncached_indices = []
    uncached_texts = []

    # Check cache first
    for i, text in enumerate(texts):
        if not text or not text.strip():
            results.append(text)
            continue

        cache_key = _get_cache_key(text)
        if use_cache and cache_key in _nikud_cache:
            results.append(_nikud_cache[cache_key])
        else:
            results.append(None)  # Placeholder
            uncached_indices.append(i)
            uncached_texts.append(text)

    # If all cached, return
    if not uncached_texts:
        return results

    # Batch process uncached texts
    texts_formatted = "\n---\n".join(
        [f"[{i+1}] {t}" for i, t in enumerate(uncached_texts)]
    )

    prompt = f"""הוסף ניקוד לכל אחד מהטקסטים הבאים. החזר כל טקסט בשורה נפרדת, עם המספור המקורי.

{texts_formatted}

החזר בפורמט:
[1] טקסט עם ניקוד
[2] טקסט עם ניקוד
וכו'"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=sum(len(t) * 3 for t in uncached_texts),
            messages=[{"role": "user", "content": prompt}],
        )

        response_text = response.content[0].text.strip()

        # Parse response
        for line in response_text.split("\n"):
            line = line.strip()
            if line.startswith("[") and "]" in line:
                try:
                    bracket_end = line.index("]")
                    idx = int(line[1:bracket_end]) - 1
                    nikud_text = line[bracket_end + 1 :].strip()

                    if 0 <= idx < len(uncached_texts):
                        original_idx = uncached_indices[idx]
                        results[original_idx] = nikud_text

                        # Cache
                        if use_cache and len(_nikud_cache) < _cache_max_size:
                            cache_key = _get_cache_key(uncached_texts[idx])
                            _nikud_cache[cache_key] = nikud_text
                except (ValueError, IndexError):
                    continue

        # Fill any remaining Nones with original text
        for i, result in enumerate(results):
            if result is None:
                results[i] = texts[i]

        return results

    except Exception as e:
        print(f"Error batch adding nikud: {e}")
        # Return original texts for uncached items
        for idx in uncached_indices:
            if results[idx] is None:
                results[idx] = texts[idx]
        return results


async def translate_word(
    word: str, source_lang: str = "he", target_lang: str = "en", use_cache: bool = True
) -> TranslationResult:
    """
    Translate a single word with context.
    Used for tap-to-translate feature in interactive subtitles.
    """
    if not word or not word.strip():
        return TranslationResult(word=word, translation="")

    # Check cache
    cache_key = f"{word}_{source_lang}_{target_lang}"
    if use_cache and cache_key in _translation_cache:
        return _translation_cache[cache_key]

    if source_lang == "he" and target_lang == "en":
        prompt = f"""תרגם את המילה העברית הבאה לאנגלית. החזר JSON בפורמט:
{{
    "translation": "English translation",
    "transliteration": "How to pronounce in English letters",
    "part_of_speech": "noun/verb/adjective/etc",
    "example": "משפט דוגמה בעברית",
    "example_translation": "Example sentence in English"
}}

מילה: {word}"""
    else:
        prompt = f"""Translate this word from {source_lang} to {target_lang}:
Word: {word}

Return JSON:
{{
    "translation": "translated word",
    "transliteration": "pronunciation guide",
    "part_of_speech": "noun/verb/etc"
}}"""

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
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

        result = TranslationResult(
            word=word,
            translation=data.get("translation", ""),
            transliteration=data.get("transliteration"),
            part_of_speech=data.get("part_of_speech"),
            example=data.get("example"),
            example_translation=data.get("example_translation"),
        )

        # Cache
        if use_cache and len(_translation_cache) < _cache_max_size:
            _translation_cache[cache_key] = result

        return result

    except Exception as e:
        print(f"Error translating word: {e}")
        return TranslationResult(word=word, translation="")


async def translate_phrase(
    phrase: str, source_lang: str = "he", target_lang: str = "en"
) -> str:
    """
    Translate a phrase or sentence.
    """
    if not phrase or not phrase.strip():
        return ""

    if source_lang == "he":
        prompt = f"תרגם את המשפט הבא לאנגלית. החזר רק את התרגום:\n\n{phrase}"
    else:
        prompt = f"Translate to {target_lang}:\n\n{phrase}"

    try:
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=len(phrase) * 2,
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text.strip()

    except Exception as e:
        print(f"Error translating phrase: {e}")
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
    global _nikud_cache, _translation_cache
    _nikud_cache = {}
    _translation_cache = {}


def get_cache_stats() -> Dict[str, int]:
    """Get cache statistics"""
    return {
        "nikud_cache_size": len(_nikud_cache),
        "translation_cache_size": len(_translation_cache),
        "max_size": _cache_max_size,
    }
