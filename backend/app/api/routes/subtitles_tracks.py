"""
Subtitle Track Management Routes.
Handles track listing, import, deletion, and external fetching.
"""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query, Request

from app.core.rate_limiter import RATE_LIMITS, limiter
from app.models.subtitles import (
    SUBTITLE_LANGUAGES,
    SubtitleCueModel,
    SubtitleTrackDoc,
    get_language_name,
)
from app.services.subtitle_service import fetch_subtitles
from app.services.subtitle_sync_service import sync_content_subtitle_languages

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
    Hebrew and English subtitles are prioritized at the top.
    """
    tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

    # Sort tracks: Hebrew first, English second, then others
    def sort_key(track):
        if track.language == "he":
            return (0, track.language)
        elif track.language == "en":
            return (1, track.language)
        else:
            return (2, track.language)

    sorted_tracks = sorted(tracks, key=sort_key)

    return {
        "tracks": [
            {
                "id": str(track.id),
                "content_id": track.content_id,
                "language": track.language,
                "language_name": track.language_name,
                "format": track.format,
                "has_nikud_version": track.has_nikud_version,
                "has_shoresh_version": track.has_shoresh_version,
                "has_heblish_version": track.has_heblish_version,
                "has_grammar_flip_version": getattr(track, "has_grammar_flip_version", False),
                "has_slang_synthesis_version": getattr(track, "has_slang_synthesis_version", False),
                "has_engrew_version": getattr(track, "has_engrew_version", False),
                "is_default": track.is_default,
                "is_auto_generated": getattr(track, "is_auto_generated", False),
                "cue_count": len(track.cues),
            }
            for track in sorted_tracks
        ]
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
    track = await fetch_subtitles(source_url)

    if not track:
        raise HTTPException(
            status_code=400, detail="Failed to fetch or parse subtitles"
        )

    existing = await SubtitleTrackDoc.find_one(
        SubtitleTrackDoc.content_id == content_id, SubtitleTrackDoc.language == language
    )

    if existing:
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

    # Sync available_subtitle_languages with actual tracks
    await sync_content_subtitle_languages(content_id)

    return {
        "message": "Subtitle track imported",
        "id": str(doc.id),
        "cue_count": len(doc.cues),
    }


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

    # Sync available_subtitle_languages with actual tracks
    await sync_content_subtitle_languages(content_id)

    return {"message": "Subtitle track deleted"}


@router.patch("/{content_id}/{language}/set-default")
async def set_default_subtitle(
    content_id: str,
    language: str,
) -> dict:
    """Set a subtitle track as the default for this content."""
    # Find the track to set as default
    track = await SubtitleTrackDoc.find_one(
        SubtitleTrackDoc.content_id == content_id, SubtitleTrackDoc.language == language
    )

    if not track:
        raise HTTPException(status_code=404, detail="Subtitle track not found")

    # Unset is_default on all other tracks for this content
    await SubtitleTrackDoc.find(
        SubtitleTrackDoc.content_id == content_id,
        SubtitleTrackDoc.language != language
    ).update({"$set": {"is_default": False}})

    # Set this track as default
    track.is_default = True
    await track.save()

    return {
        "message": "Default subtitle updated",
        "language": language,
        "track_id": str(track.id),
    }


@router.post("/{content_id}/fetch-external")
@limiter.limit(RATE_LIMITS["subtitle_fetch_external"])
async def fetch_external_subtitles(
    request: Request,
    content_id: str,
    languages: Optional[List[str]] = Query(
        default=None,
        description="Languages to fetch (e.g., ['en', 'es', 'he'])",
    ),
) -> dict:
    """
    Search OpenSubtitles for available subtitles and download them.
    Returns list of successfully imported languages.
    """
    from app.core.logging_config import get_logger
    from app.models.content import Content
    from app.services.opensubtitles_service import get_opensubtitles_service
    from app.services.subtitle_service import parse_srt

    logger = get_logger(__name__)

    content = await Content.get(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    imdb_id = content.imdb_id
    if not imdb_id:
        raise HTTPException(
            status_code=400,
            detail="Content does not have IMDB ID",
        )

    if not languages:
        languages = ["en", "he", "es", "ar", "ru", "fr", "de", "pt", "it"]

    existing_tracks = await SubtitleTrackDoc.get_for_content(content_id)
    existing_languages = {t.language for t in existing_tracks}
    languages_to_fetch = [lang for lang in languages if lang not in existing_languages]

    if not languages_to_fetch:
        return {
            "message": "All requested languages already available",
            "imported": [],
            "skipped": list(existing_languages),
            "failed": [],
        }

    opensubtitles = get_opensubtitles_service()

    quota = await opensubtitles.check_quota_available()
    if not quota["available"]:
        raise HTTPException(
            status_code=429,
            detail=f"OpenSubtitles quota exhausted",
        )

    imported = []
    failed = []

    for lang in languages_to_fetch:
        try:
            results = await opensubtitles.search_subtitles(
                imdb_id=imdb_id,
                language=lang,
                content_id=content_id,
            )

            if not results:
                failed.append({"language": lang, "reason": "Not found"})
                continue

            best_result = results[0]
            file_id = best_result.get("file_id")

            if not file_id:
                failed.append({"language": lang, "reason": "No file ID"})
                continue

            subtitle_content = await opensubtitles.download_subtitle(
                file_id=file_id,
                content_id=content_id,
                language=lang,
            )

            if not subtitle_content:
                failed.append({"language": lang, "reason": "Download failed"})
                continue

            parsed = parse_srt(subtitle_content)

            if not parsed.cues:
                failed.append({"language": lang, "reason": "No cues"})
                continue

            track = SubtitleTrackDoc(
                content_id=content_id,
                content_type="vod",
                language=lang,
                language_name=get_language_name(lang),
                format="srt",
                source="opensubtitles",
                external_id=file_id,
                cues=[
                    SubtitleCueModel(
                        index=cue.index,
                        start_time=cue.start_time,
                        end_time=cue.end_time,
                        text=cue.text,
                    )
                    for cue in parsed.cues
                ],
            )
            await track.insert()

            imported.append(
                {
                    "language": lang,
                    "language_name": get_language_name(lang),
                    "cue_count": len(parsed.cues),
                    "track_id": str(track.id),
                }
            )

            logger.info(f"Imported {lang} subtitles", extra={"content_id": content_id})

        except Exception as e:
            logger.error(f"Error fetching {lang} subtitles", extra={"error": str(e)})
            failed.append({"language": lang, "reason": str(e)})

    # Sync available_subtitle_languages with actual tracks
    if imported:
        await sync_content_subtitle_languages(content_id)

    return {
        "message": f"Imported {len(imported)} subtitle tracks",
        "imported": imported,
        "skipped": list(existing_languages),
        "failed": failed,
    }
