"""
HLS Subtitle Generator - Generate VTT files and HLS playlists for Apple TV

Apple TV requires subtitles to be wrapped in HLS playlists (.m3u8) rather than
referenced directly as .vtt files. This module generates both the VTT files
and their corresponding HLS playlist wrappers.
"""

import logging
import os
from typing import List, Optional

from app.models.subtitles import SubtitleTrackDoc

logger = logging.getLogger(__name__)


def _generate_subtitle_playlist(vtt_filename: str, output_path: str) -> None:
    """
    Generate HLS subtitle playlist (.m3u8) that wraps a VTT file.

    Apple TV requires subtitles to be delivered via HLS playlists, not raw VTT.

    Args:
        vtt_filename: Name of the VTT file (e.g., "subtitles_en.vtt")
        output_path: Full path for the output .m3u8 file
    """
    content = f"""#EXTM3U
#EXT-X-TARGETDURATION:3600
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:3600.000,
{vtt_filename}
#EXT-X-ENDLIST
"""
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(content)


async def generate_vtt_files_for_content(
    content_id: str,
    output_dir: str,
) -> List[dict]:
    """
    Generate VTT files and HLS playlists for all subtitle languages.

    Creates both .vtt files and .m3u8 playlist wrappers for Apple TV compatibility.

    Args:
        content_id: Content identifier
        output_dir: Directory to write VTT and playlist files

    Returns:
        List of subtitle info dicts with playlist references for HLS manifest
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

            # Write VTT file
            vtt_filename = f"subtitles_{language}.vtt"
            vtt_path = os.path.join(output_dir, vtt_filename)

            with open(vtt_path, "w", encoding="utf-8") as f:
                f.write(vtt_content)

            # Generate HLS playlist wrapper for Apple TV compatibility
            playlist_filename = f"subtitles_{language}.m3u8"
            playlist_path = os.path.join(output_dir, playlist_filename)
            _generate_subtitle_playlist(vtt_filename, playlist_path)

            # Get language label
            label = _get_language_label(language)

            subtitle_files.append({
                "language": language,
                "path": vtt_path,
                "filename": vtt_filename,
                "playlist_filename": playlist_filename,
                "playlist_path": playlist_path,
                "label": label,
            })

            logger.info(
                f"Generated subtitle files for {content_id} ({language}): "
                f"{vtt_filename}, {playlist_filename}"
            )

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
    variants: Optional[List[dict]] = None,
) -> str:
    """
    Generate HLS master manifest with subtitle and ABR variant references.

    Supports both single-stream (legacy) and multi-bitrate ABR manifests.
    Apple TV requires subtitles referenced via .m3u8 playlists, not .vtt.

    Args:
        video_playlist_name: Name of the video playlist file (legacy fallback)
        subtitle_files: List of subtitle info dicts from generate_vtt_files_for_content
        output_path: Path to write the master manifest
        variants: Optional list of ABR variant dicts with keys:
            name, playlist, width, height, bandwidth

    Returns:
        Path to the generated master manifest
    """
    manifest = "#EXTM3U\n"
    manifest += "#EXT-X-VERSION:3\n\n"

    # Subtitle tracks (DEFAULT=NO, AUTOSELECT=NO to prevent auto-loading)
    if subtitle_files:
        for sub in subtitle_files:
            subtitle_uri = sub.get("playlist_filename", sub["filename"])
            manifest += (
                f'#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="subs",'
                f'NAME="{sub["label"]}",DEFAULT=NO,'
                f'AUTOSELECT=NO,FORCED=NO,'
                f'LANGUAGE="{sub["language"]}",'
                f'CHARACTERISTICS='
                f'"public.accessibility.transcribes-spoken-dialog",'
                f'URI="{subtitle_uri}"\n'
            )
        manifest += "\n"

    has_subs = bool(subtitle_files)
    subs_attr = ',SUBTITLES="subs"' if has_subs else ""

    if variants:
        # ABR: one STREAM-INF per variant with resolution and codecs
        for variant in variants:
            manifest += (
                f"#EXT-X-STREAM-INF:"
                f"BANDWIDTH={variant['bandwidth']},"
                f"RESOLUTION={variant['width']}x{variant['height']},"
                f'CODECS="avc1.640029,mp4a.40.2"'
                f"{subs_attr}\n"
            )
            manifest += f"{variant['playlist']}\n"
    else:
        # Legacy: single stream
        manifest += (
            f"#EXT-X-STREAM-INF:BANDWIDTH=2000000{subs_attr}\n"
        )
        manifest += f"{video_playlist_name}\n"

    with open(output_path, "w", encoding="utf-8") as f:
        f.write(manifest)

    variant_count = len(variants) if variants else 1
    logger.info(
        f"Generated master manifest with {variant_count} variant(s) and "
        f"{len(subtitle_files)} subtitle track(s): {output_path}"
    )
    return output_path
