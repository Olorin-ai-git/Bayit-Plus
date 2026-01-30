"""
Subtitle Extraction Service
Background service for analyzing videos and extracting embedded subtitles
"""

import logging
from datetime import datetime, timezone
from typing import List

from app.models.content import Content
from app.models.subtitles import SubtitleCueModel, SubtitleTrackDoc
from app.services.ffmpeg_service import FFmpegService
from app.services.subtitle_service import parse_subtitles

logger = logging.getLogger(__name__)

# Language name mapping
LANGUAGE_NAMES = {
    "en": "English",
    "he": "עברית",
    "es": "Español",
    "ar": "العربية",
    "ru": "Русский",
    "fr": "Français",
}


def get_language_name(code: str) -> str:
    """Get language name from code."""
    return LANGUAGE_NAMES.get(code, code.upper())


async def analyze_and_extract_subtitles(content_id: str, stream_url: str):
    """
    Background task: Analyze video and extract embedded subtitles.
    Called after content creation/update with stream_url.

    Args:
        content_id: ID of the content to process
        stream_url: URL of the video file to analyze
    """
    try:
        content = await Content.get(content_id)
        if not content:
            logger.error(f"Content {content_id} not found for subtitle extraction")
            return

        logger.info(f"Starting subtitle extraction for content {content_id}")
        ffmpeg_service = FFmpegService()

        # Step 1: Analyze video for metadata and subtitle tracks
        metadata = await ffmpeg_service.analyze_video(stream_url)
        content.video_metadata = metadata
        content.embedded_subtitle_count = len(metadata.get("subtitle_tracks", []))
        content.subtitle_last_checked = datetime.now(timezone.utc)

        # Step 2: Extract subtitles if found (only required languages: en, he, es)
        subtitle_tracks = metadata.get("subtitle_tracks", [])
        if subtitle_tracks:
            logger.info(f"Found {len(subtitle_tracks)} subtitle tracks in {content_id}")
            # Only extract required languages to avoid performance issues
            # Limit to 10 subtitles max, prioritizing he, en, es
            extracted = await ffmpeg_service.extract_all_subtitles(
                stream_url,
                languages=["en", "he", "es"],  # Only extract required languages
                max_parallel=3,
                max_subtitles=10,  # Max 10 subtitles per movie
            )

            saved_languages = []
            for sub in extracted:
                try:
                    # Parse subtitle content
                    track = parse_subtitles(sub["content"], sub["format"])

                    # Convert to database model
                    cues = [
                        SubtitleCueModel(
                            index=cue.index,
                            start_time=cue.start_time,
                            end_time=cue.end_time,
                            text=cue.text,
                            text_nikud=cue.text_nikud,
                        )
                        for cue in track.cues
                    ]

                    # Create subtitle track document
                    subtitle_doc = SubtitleTrackDoc(
                        content_id=content_id,
                        content_type="vod",
                        language=sub["language"],
                        language_name=get_language_name(sub["language"]),
                        format="srt",
                        cues=cues,
                        is_auto_generated=False,
                    )
                    await subtitle_doc.insert()
                    saved_languages.append(sub["language"])
                    logger.info(
                        f"✅ Extracted {sub['language']} subtitles for {content_id}"
                    )

                except Exception as e:
                    logger.error(
                        f"Failed to save {sub['language']} subtitles: {str(e)}"
                    )

            # Update content with subtitle status
            content.has_subtitles = len(saved_languages) > 0
            content.available_subtitle_languages = saved_languages
            content.subtitle_extraction_status = "completed"
            logger.info(
                f"✅ Completed subtitle extraction for {content_id}: {saved_languages}"
            )
        else:
            logger.info(f"No embedded subtitles found in {content_id}")
            content.subtitle_extraction_status = "completed"

        await content.save()

    except Exception as e:
        logger.error(f"❌ Failed to extract subtitles for {content_id}: {str(e)}")
        try:
            content = await Content.get(content_id)
            if content:
                content.subtitle_extraction_status = "failed"
                await content.save()
        except Exception:
            pass
