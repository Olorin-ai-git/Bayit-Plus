"""
Subtitles API Routes.
Handles subtitle tracks, nikud generation, and word translation.
"""
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime

from app.models.subtitles import (
    SubtitleTrackDoc,
    SubtitleCueModel,
    TranslationCacheDoc,
    SubtitleTrackResponse,
    SubtitleCueResponse,
    TranslationResponse,
    SUBTITLE_LANGUAGES,
)
from app.services.subtitle_service import (
    parse_subtitles,
    fetch_subtitles,
    extract_words,
    format_time,
    cues_to_dict,
)
from app.services.nikud_service import (
    add_nikud,
    add_nikud_batch,
    translate_word,
    translate_phrase,
    translation_to_dict,
    get_cache_stats,
)

router = APIRouter(prefix="/subtitles", tags=["subtitles"])


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported subtitle languages"""
    return {"languages": SUBTITLE_LANGUAGES}


@router.get("/{content_id}")
async def get_subtitle_tracks(
    content_id: str,
    language: Optional[str] = None
) -> List[dict]:
    """
    Get available subtitle tracks for content.
    Optionally filter by language.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    return [
        {
            "id": str(track.id),
            "content_id": track.content_id,
            "language": track.language,
            "language_name": track.language_name,
            "format": track.format,
            "has_nikud_version": track.has_nikud_version,
            "is_default": track.is_default,
            "cue_count": len(track.cues),
        }
        for track in tracks
    ]


@router.get("/{content_id}/cues")
async def get_subtitle_cues(
    content_id: str,
    language: str = "he",
    with_nikud: bool = False,
    start_time: Optional[float] = None,
    end_time: Optional[float] = None,
) -> dict:
    """
    Get subtitle cues for content.
    Optionally filter by time range.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]
    cues = track.cues

    # Filter by time range if specified
    if start_time is not None or end_time is not None:
        filtered_cues = []
        for cue in cues:
            if start_time is not None and cue.end_time < start_time:
                continue
            if end_time is not None and cue.start_time > end_time:
                continue
            filtered_cues.append(cue)
        cues = filtered_cues

    # Format cues for response
    result_cues = []
    for cue in cues:
        text = cue.text_nikud if with_nikud and cue.text_nikud else cue.text
        result_cues.append({
            "index": cue.index,
            "start_time": cue.start_time,
            "end_time": cue.end_time,
            "text": text,
            "text_nikud": cue.text_nikud,
            "formatted_start": format_time(cue.start_time),
            "formatted_end": format_time(cue.end_time),
            "words": extract_words(text),
        })

    return {
        "content_id": content_id,
        "language": track.language,
        "language_name": track.language_name,
        "has_nikud": track.has_nikud_version,
        "cues": result_cues,
    }


@router.post("/{content_id}/nikud")
async def generate_nikud_for_track(
    content_id: str,
    language: str = "he",
    force: bool = False,
) -> dict:
    """
    Generate nikud (vocalization) for a subtitle track.
    Uses Claude AI to add Hebrew vowel marks.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    if not tracks:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    track = tracks[0]

    # Check if already generated
    if track.has_nikud_version and not force:
        return {
            "message": "Nikud already generated",
            "content_id": content_id,
            "generated_at": track.nikud_generated_at,
        }

    # Extract texts that need nikud
    texts_to_process = [cue.text for cue in track.cues]

    # Generate nikud in batch
    nikud_texts = await add_nikud_batch(texts_to_process)

    # Update cues with nikud versions
    for i, cue in enumerate(track.cues):
        cue.text_nikud = nikud_texts[i]

    track.has_nikud_version = True
    track.nikud_generated_at = datetime.utcnow()
    track.updated_at = datetime.utcnow()
    await track.save()

    return {
        "message": "Nikud generated successfully",
        "content_id": content_id,
        "cues_processed": len(track.cues),
        "generated_at": track.nikud_generated_at,
    }


@router.post("/{content_id}/import")
async def import_subtitles(
    content_id: str,
    source_url: str,
    language: str = "he",
    language_name: str = "עברית",
    content_type: str = "vod",
    is_default: bool = False,
) -> dict:
    """
    Import subtitles from a VTT or SRT URL.
    """
    # Fetch and parse subtitles
    track = await fetch_subtitles(source_url)

    if not track:
        raise HTTPException(status_code=400, detail="Failed to fetch or parse subtitles")

    # Check if track already exists
    existing = await SubtitleTrackDoc.find_one(
        SubtitleTrackDoc.content_id == content_id,
        SubtitleTrackDoc.language == language
    )

    if existing:
        # Update existing track
        existing.cues = [
            SubtitleCueModel(
                index=cue.index,
                start_time=cue.start_time,
                end_time=cue.end_time,
                text=cue.text,
            )
            for cue in track.cues
        ]
        existing.source_url = source_url
        existing.format = track.format
        existing.updated_at = datetime.utcnow()
        await existing.save()

        return {
            "message": "Subtitle track updated",
            "id": str(existing.id),
            "cue_count": len(existing.cues),
        }

    # Create new track
    doc = SubtitleTrackDoc(
        content_id=content_id,
        content_type=content_type,
        language=language,
        language_name=language_name,
        format=track.format,
        source_url=source_url,
        cues=[
            SubtitleCueModel(
                index=cue.index,
                start_time=cue.start_time,
                end_time=cue.end_time,
                text=cue.text,
            )
            for cue in track.cues
        ],
        is_default=is_default,
    )
    await doc.insert()

    return {
        "message": "Subtitle track imported",
        "id": str(doc.id),
        "cue_count": len(doc.cues),
    }


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
async def translate_phrase_endpoint(
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


@router.post("/nikud/text")
async def add_nikud_to_text(
    text: str,
) -> dict:
    """
    Add nikud (vocalization marks) to arbitrary Hebrew text.
    Useful for on-the-fly nikud generation.
    """
    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    nikud_text = await add_nikud(text)

    return {
        "original": text,
        "with_nikud": nikud_text,
    }


@router.get("/cache/stats")
async def get_subtitle_cache_stats() -> dict:
    """Get cache statistics for nikud and translation services"""
    return get_cache_stats()


@router.delete("/{content_id}/{language}")
async def delete_subtitle_track(
    content_id: str,
    language: str,
) -> dict:
    """Delete a subtitle track"""
    track = await SubtitleTrackDoc.find_one(
        SubtitleTrackDoc.content_id == content_id,
        SubtitleTrackDoc.language == language
    )

    if not track:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    await track.delete()

    return {"message": "Subtitle track deleted"}
