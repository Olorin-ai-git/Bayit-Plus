"""
Subtitle VTT Streaming Endpoint
Serves WebVTT files for native video track elements (AirPlay/Chromecast support)
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
import logging

from app.models.content import Content
from app.models.subtitles import SubtitleTrackDoc
from app.services.subtitle_service import apply_subtitle_time_offset

logger = logging.getLogger(__name__)
router = APIRouter()


@router.options("/vtt/{content_id}")
async def vtt_options(content_id: str) -> Response:
    """
    CORS preflight handler for VTT endpoint.
    Required for Apple TV AirPlay to access subtitles.
    """
    return Response(
        status_code=204,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "86400",
        }
    )


@router.get("/vtt/{content_id}")
async def stream_vtt_subtitles(
    content_id: str,
    language: str = Query(..., description="Language code (e.g., 'en', 'he')"),
) -> Response:
    """
    Stream WebVTT subtitle file for a given content and language.

    Used by native <track> elements for AirPlay/Chromecast subtitle support.
    Returns VTT content with proper MIME type and CORS headers.

    Args:
        content_id: Content identifier
        language: Language code (ISO 639-1)

    Returns:
        WebVTT file content with text/vtt MIME type
    """
    try:
        # Fetch subtitle track from database
        tracks = await SubtitleTrackDoc.get_for_content(content_id, language)

        if not tracks:
            raise HTTPException(
                status_code=404,
                detail=f"Subtitles not found for content {content_id} in language {language}"
            )

        track = tracks[0]

        # Look up subtitle time offset for multi-part movies
        content_doc = await Content.get(content_id)
        time_offset = content_doc.subtitle_time_offset if content_doc else None

        # Convert to VTT format (with offset for split movie files)
        vtt_content = _generate_vtt_from_track(track, time_offset=time_offset)

        # Return with proper headers for video track consumption
        return Response(
            content=vtt_content,
            media_type="text/vtt",
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type",
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming VTT subtitles: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to stream subtitles")


def _generate_vtt_from_track(
    track: SubtitleTrackDoc,
    time_offset: float = None,
) -> str:
    """
    Generate WebVTT content from SubtitleTrackDoc.

    Args:
        track: SubtitleTrackDoc with cues
        time_offset: Optional seconds to subtract from cue times (multi-part movies)

    Returns:
        WebVTT formatted string
    """
    # WebVTT header with optional metadata for better compatibility
    vtt = "WEBVTT\n"

    # Add language metadata if available
    if hasattr(track, 'language') and track.language:
        vtt += "X-TIMESTAMP-MAP=MPEGTS:0,LOCAL:00:00:00.000\n"

    vtt += "\n"

    # Apply time offset for multi-part movies (e.g. LOTR Extended PT.2)
    if time_offset and time_offset > 0:
        adjusted = apply_subtitle_time_offset(track.cues, time_offset)
        for ac in adjusted:
            vtt += f"{ac.index}\n"
            start_ts = _format_vtt_timestamp(ac.start_time)
            end_ts = _format_vtt_timestamp(ac.end_time)
            vtt += f"{start_ts} --> {end_ts}"
            if hasattr(ac.original, 'settings') and ac.original.settings:
                vtt += f" {ac.original.settings}"
            vtt += "\n"
            vtt += f"{ac.original.text}\n\n"
    else:
        for cue in track.cues:
            vtt += f"{cue.index}\n"
            start_time = _format_vtt_timestamp(cue.start_time)
            end_time = _format_vtt_timestamp(cue.end_time)
            vtt += f"{start_time} --> {end_time}"
            if hasattr(cue, 'settings') and cue.settings:
                vtt += f" {cue.settings}"
            vtt += "\n"
            vtt += f"{cue.text}\n\n"

    return vtt


def _format_vtt_timestamp(seconds: float) -> str:
    """
    Format time in seconds to VTT timestamp format (HH:MM:SS.mmm).

    Args:
        seconds: Time in seconds

    Returns:
        Formatted timestamp string
    """
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    milliseconds = int((seconds % 1) * 1000)

    return f"{hours:02d}:{minutes:02d}:{secs:02d}.{milliseconds:03d}"
