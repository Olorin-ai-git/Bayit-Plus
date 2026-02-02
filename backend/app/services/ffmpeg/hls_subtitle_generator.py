"""
HLS Subtitle Generator - Generate VTT files for HLS embedding
"""

import logging
import os
from pathlib import Path
from typing import List, Optional

from app.models.subtitles import SubtitleTrackDoc

logger = logging.getLogger(__name__)


async def generate_vtt_files_for_content(
    content_id: str,
    output_dir: str,
) -> List[dict]:
    """
    Generate VTT files for all subtitle languages for a content item.

    Args:
        content_id: Content identifier
        output_dir: Directory to write VTT files

    Returns:
        List of subtitle info dicts: [{"language": "en", "path": "/path/to/en.vtt", "label": "English"}, ...]
    """
    try:
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        # Get all subtitle tracks for this content
        all_tracks = await SubtitleTrackDoc.find(
            {"content_id": content_id}
        ).to_list()

        if not all_tracks:
            logger.info(f"No subtitles found for content {content_id}")
            return []

        # Group by language (there might be multiple tracks per language)
        language_tracks = {}
        for track in all_tracks:
            lang = track.language
            if lang not in language_tracks:
                language_tracks[lang] = track

        subtitle_files = []

        for language, track in language_tracks.items():
            # Generate VTT content
            vtt_content = _generate_vtt_from_track(track)

            # Write to file
            vtt_filename = f"subtitles_{language}.vtt"
            vtt_path = os.path.join(output_dir, vtt_filename)

            with open(vtt_path, "w", encoding="utf-8") as f:
                f.write(vtt_content)

            # Get language label
            label = _get_language_label(language)

            subtitle_files.append({
                "language": language,
                "path": vtt_path,
                "filename": vtt_filename,
                "label": label,
            })

            logger.info(f"Generated VTT file for {content_id} ({language}): {vtt_path}")

        return subtitle_files

    except Exception as e:
        logger.error(f"Failed to generate VTT files: {e}", exc_info=True)
        return []


def _generate_vtt_from_track(track: SubtitleTrackDoc) -> str:
    """
    Generate WebVTT content from SubtitleTrackDoc.

    Args:
        track: SubtitleTrackDoc with cues

    Returns:
        WebVTT formatted string
    """
    # WebVTT header
    vtt = "WEBVTT\n\n"

    for cue in track.cues:
        # Add cue identifier
        vtt += f"{cue.index}\n"

        # Add timestamp line
        start_time = _format_vtt_timestamp(cue.start_time)
        end_time = _format_vtt_timestamp(cue.end_time)
        vtt += f"{start_time} --> {end_time}\n"

        # Add subtitle text
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


def _get_language_label(language_code: str) -> str:
    """Get human-readable language label from code."""
    language_map = {
        "en": "English",
        "he": "Hebrew",
        "es": "Spanish",
        "fr": "French",
        "de": "German",
        "it": "Italian",
        "ru": "Russian",
        "ar": "Arabic",
        "zh": "Chinese",
        "ja": "Japanese",
    }
    return language_map.get(language_code, language_code.upper())


def generate_master_m3u8_with_subtitles(
    video_playlist_name: str,
    subtitle_files: List[dict],
    output_path: str,
) -> str:
    """
    Generate HLS master manifest with subtitle references.

    Args:
        video_playlist_name: Name of the video playlist file (e.g., "playlist.m3u8")
        subtitle_files: List of subtitle info dicts from generate_vtt_files_for_content
        output_path: Path to write the master manifest

    Returns:
        Path to the generated master manifest
    """
    # Start with HLS version and target duration
    manifest = "#EXTM3U\n"
    manifest += "#EXT-X-VERSION:3\n\n"

    # Add subtitle tracks
    # CRITICAL: Set ALL subtitles to DEFAULT=NO and AUTOSELECT=NO
    # This prevents HLS.js from auto-loading subtitles during manifest parsing
    # The app will handle subtitle selection through the UI
    if subtitle_files:
        for idx, sub in enumerate(subtitle_files):
            manifest += (
                f'#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",'
                f'NAME="{sub["label"]}",DEFAULT=NO,'
                f'AUTOSELECT=NO,FORCED=NO,'
                f'LANGUAGE="{sub["language"]}",'
                f'URI="{sub["filename"]}"\n'
            )
        manifest += "\n"

    # Add video stream reference
    # For now, we'll use a simple single quality stream
    # In production, you'd have multiple quality levels here
    if subtitle_files:
        manifest += f'#EXT-X-STREAM-INF:BANDWIDTH=2000000,SUBTITLES="subs"\n'
    else:
        manifest += f'#EXT-X-STREAM-INF:BANDWIDTH=2000000\n'

    manifest += f"{video_playlist_name}\n"

    # Write to file
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(manifest)

    logger.info(f"Generated master manifest with {len(subtitle_files)} subtitle tracks: {output_path}")
    return output_path
