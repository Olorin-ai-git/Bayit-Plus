"""
Subtitle Translation Routes.
Handles word and phrase translation for tap-to-translate features.
"""

from fastapi import APIRouter, HTTPException, Request

from app.core.rate_limiter import RATE_LIMITS, limiter
from app.models.subtitles import TranslationCacheDoc
from app.services.nikud_service import translate_phrase, translate_word, translation_to_dict

router = APIRouter(prefix="/subtitles", tags=["subtitles"])


@router.post("/translate/word")
async def translate_single_word(
    word: str,
    source_lang: str = "he",
    target_lang: str = "en",
) -> dict:
    """
    Translate a single word with context.
    Used for tap-to-translate feature.
    Returns translation, transliteration, and example usage.
    """
    if not word or not word.strip():
        raise HTTPException(status_code=400, detail="Word is required")

    # Check database cache first
    cached = await TranslationCacheDoc.get_translation(word, source_lang, target_lang)
    if cached:
        return {
            "word": cached.word,
            "translation": cached.translation,
            "transliteration": cached.transliteration,
            "part_of_speech": cached.part_of_speech,
            "example": cached.example,
            "example_translation": cached.example_translation,
            "cached": True,
        }

    # Generate new translation
    result = await translate_word(word, source_lang, target_lang)

    # Cache in database
    if result.translation:
        await TranslationCacheDoc.cache_translation(
            word=word,
            translation=result.translation,
            source_lang=source_lang,
            target_lang=target_lang,
            transliteration=result.transliteration,
            part_of_speech=result.part_of_speech,
            example=result.example,
            example_translation=result.example_translation,
        )

    return {
        **translation_to_dict(result),
        "cached": False,
    }


@router.post("/translate/phrase")
@limiter.limit(RATE_LIMITS["subtitle_translate_phrase"])
async def translate_phrase_endpoint(
    request: Request,
    phrase: str,
    source_lang: str = "he",
    target_lang: str = "en",
) -> dict:
    """
    Translate a phrase or sentence.
    """
    if not phrase or not phrase.strip():
        raise HTTPException(status_code=400, detail="Phrase is required")

    translation = await translate_phrase(phrase, source_lang, target_lang)

    return {
        "phrase": phrase,
        "translation": translation,
        "source_lang": source_lang,
        "target_lang": target_lang,
    }
