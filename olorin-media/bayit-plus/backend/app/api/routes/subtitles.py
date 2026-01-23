"""
Subtitles API Routes.
Handles subtitle tracks, nikud generation, and word translation.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Request

from app.core.rate_limiter import limiter, RATE_LIMITS
from app.models.subtitles import (SUBTITLE_LANGUAGES, SubtitleCueModel,
                                  SubtitleCueResponse, SubtitleTrackDoc,
                                  SubtitleTrackResponse, TranslationCacheDoc,
                                  TranslationResponse)
from app.services.nikud_service import (add_nikud, add_nikud_batch,
                                        get_cache_stats, translate_phrase,
                                        translate_word, translation_to_dict)
from app.services.subtitle_service import (cues_to_dict, extract_words,
                                           fetch_subtitles, format_time,
                                           parse_subtitles)

router = APIRouter(prefix="/subtitles", tags=["subtitles"])


@router.get("/languages")
async def get_supported_languages():
    """Get list of supported subtitle languages"""
    return {"languages": SUBTITLE_LANGUAGES}


@router.get("/{content_id}")
async def get_subtitle_tracks(content_id: str, language: Optional[str] = None) -> dict:
    """
    Get available subtitle tracks for content.
    Optionally filter by language.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    return {
        "tracks": [
            {
                "id": str(track.id),
                "content_id": track.content_id,
                "language": track.language,
                "language_name": track.language_name,
                "format": track.format,
                "has_nikud_version": track.has_nikud_version,
                "is_default": track.is_default,
                "is_auto_generated": getattr(track, "is_auto_generated", False),
                "cue_count": len(track.cues),
            }
            for track in tracks
        ]
    }


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
        result_cues.append(
            {
                "index": cue.index,
                "start_time": cue.start_time,
                "end_time": cue.end_time,
                "text": text,
                "text_nikud": cue.text_nikud,
                "formatted_start": format_time(cue.start_time),
                "formatted_end": format_time(cue.end_time),
                "words": extract_words(text),
            }
        )

    return {
        "content_id": content_id,
        "language": track.language,
        "language_name": track.language_name,
        "has_nikud": track.has_nikud_version,
        "cues": result_cues,
    }


@router.post("/{content_id}/nikud")
@limiter.limit(RATE_LIMITS["subtitle_nikud"])
async def generate_nikud_for_track(
    request: Request,
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
@limiter.limit(RATE_LIMITS["subtitle_import"])
async def import_subtitles(
    request: Request,
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
        raise HTTPException(
            status_code=400, detail="Failed to fetch or parse subtitles"
        )

    # Check if track already exists
    existing = await SubtitleTrackDoc.find_one(
        SubtitleTrackDoc.content_id == content_id, SubtitleTrackDoc.language == language
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


@router.post("/nikud/text")
@limiter.limit(RATE_LIMITS["subtitle_nikud"])
async def add_nikud_to_text(
    request: Request,
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


@router.post("/{content_id}/fetch-external")
@limiter.limit(RATE_LIMITS["subtitle_fetch_external"])
async def fetch_external_subtitles(
    request: Request,
    content_id: str,
    languages: Optional[List[str]] = Query(
        default=None,
        description="Languages to fetch (e.g., ['en', 'es', 'he']). If not provided, fetches common languages.",
    ),
) -> dict:
    """
    Search OpenSubtitles for available subtitles and download them.
    Immediately imports successful downloads so user can watch with subtitles.

    Returns list of successfully imported languages.
    """
    import logging

    from app.models.content import Content
    from app.services.opensubtitles_service import get_opensubtitles_service
    from app.services.subtitle_service import parse_srt

    logger = logging.getLogger(__name__)

    # Get content to find IMDB ID
    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    imdb_id = content.imdb_id
    if not imdb_id:
        raise HTTPException(
            status_code=400,
            detail="Content does not have IMDB ID. Cannot search OpenSubtitles.",
        )

    # Default languages if not specified
    if not languages:
        languages = ["en", "he", "es", "ar", "ru", "fr", "de", "pt", "it"]

    # Language name mapping
    language_names = {
        "en": "English",
        "he": "עברית",
        "es": "Español",
        "ar": "العربية",
        "ru": "Русский",
        "fr": "Français",
        "de": "Deutsch",
        "pt": "Português",
        "it": "Italiano",
        "yi": "ייִדיש",
        "zh": "中文",
        "ja": "日本語",
        "ko": "한국어",
    }

    # Get existing subtitle languages to skip
    existing_tracks = await SubtitleTrackDoc.get_for_content(content_id)
    existing_languages = {t.language for t in existing_tracks}

    # Filter out already existing languages
    languages_to_fetch = [lang for lang in languages if lang not in existing_languages]

    if not languages_to_fetch:
        return {
            "message": "All requested languages already available",
            "imported": [],
            "skipped": list(existing_languages),
            "failed": [],
        }

    opensubtitles = get_opensubtitles_service()

    # Check quota
    quota = await opensubtitles.check_quota_available()
    if not quota["available"]:
        raise HTTPException(
            status_code=429,
            detail=f"OpenSubtitles daily quota exhausted ({quota['used']}/{quota['daily_limit']}). Resets at {quota['resets_at']}.",
        )

    imported = []
    failed = []

    # Determine if this is a series episode
    season_number = getattr(content, "season", None)
    episode_number = getattr(content, "episode", None)
    parent_imdb_id = getattr(content, "series_imdb_id", None) or (
        getattr(content, "series_id", None)
        and await _get_series_imdb_id(content.series_id)
    )

    for lang in languages_to_fetch:
        try:
            logger.info(f"🔍 Searching subtitles for {content.title} ({lang})")

            # Search for subtitles
            results = await opensubtitles.search_subtitles(
                imdb_id=imdb_id,
                language=lang,
                content_id=content_id,
                season_number=season_number,
                episode_number=episode_number,
                parent_imdb_id=parent_imdb_id,
                query=content.title if not imdb_id else None,
            )

            if not results:
                logger.info(f"❌ No subtitles found for {content.title} ({lang})")
                failed.append({"language": lang, "reason": "Not found"})
                continue

            # Get the best result (first one, usually highest rated)
            best_result = results[0]
            file_id = best_result.get("file_id")

            if not file_id:
                failed.append({"language": lang, "reason": "No file ID in result"})
                continue

            # Download subtitle content
            subtitle_content = await opensubtitles.download_subtitle(
                file_id=file_id,
                content_id=content_id,
                language=lang,
            )

            if not subtitle_content:
                failed.append({"language": lang, "reason": "Download failed"})
                continue

            # Parse SRT content
            parsed = parse_srt(subtitle_content)

            if not parsed.cues:
                failed.append({"language": lang, "reason": "No cues parsed"})
                continue

            # Save to database
            track = SubtitleTrackDoc(
                content_id=content_id,
                content_type="vod",
                language=lang,
                language_name=language_names.get(lang, lang.upper()),
                format="srt",
                source="opensubtitles",
                external_id=file_id,
                external_url=best_result.get("download_url"),
                download_date=datetime.utcnow(),
                cues=[
                    SubtitleCueModel(
                        index=cue.index,
                        start_time=cue.start_time,
                        end_time=cue.end_time,
                        text=cue.text,
                    )
                    for cue in parsed.cues
                ],
                is_default=False,
                is_auto_generated=False,
            )
            await track.insert()

            imported.append(
                {
                    "language": lang,
                    "language_name": language_names.get(lang, lang.upper()),
                    "cue_count": len(parsed.cues),
                    "track_id": str(track.id),
                }
            )

            logger.info(
                f"✅ Imported {lang} subtitles for {content.title} ({len(parsed.cues)} cues)"
            )

        except Exception as e:
            logger.error(f"❌ Error fetching {lang} subtitles: {e}")
            failed.append({"language": lang, "reason": str(e)})

    return {
        "message": f"Imported {len(imported)} subtitle tracks",
        "imported": imported,
        "skipped": list(existing_languages),
        "failed": failed,
        "quota_remaining": (await opensubtitles.check_quota_available())["remaining"],
    }


async def _get_series_imdb_id(series_id: str) -> Optional[str]:
    """Helper to get IMDB ID from parent series"""
    from app.models.content import Content

    try:
        series = await Content.get(series_id)
        return series.imdb_id if series else None
    except Exception:
        return None


@router.get("/cache/stats")
async def get_subtitle_cache_stats() -> dict:
    """Get cache statistics for nikud and translation services"""
    return get_cache_stats()


@router.delete("/{content_id}/{language}")
@limiter.limit(RATE_LIMITS["subtitle_delete"])
async def delete_subtitle_track(
    request: Request,
    content_id: str,
    language: str,
) -> dict:
    """Delete a subtitle track"""
    track = await SubtitleTrackDoc.find_one(
        SubtitleTrackDoc.content_id == content_id, SubtitleTrackDoc.language == language
    )

    if not track:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    await track.delete()

    return {"message": "Subtitle track deleted"}
