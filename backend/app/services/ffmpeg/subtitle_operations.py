"""
FFmpeg Subtitle Operations Module

This module provides subtitle extraction, embedding, and conversion functionality.
Handles embedded subtitle tracks in MKV/MP4 containers and text-based subtitle formats.
"""

import asyncio
import logging
import os
import subprocess
import tempfile
from typing import Any, Dict, List, Optional

from app.services.ffmpeg.constants import (
    PRIORITY_LANGUAGES,
    is_text_based_subtitle,
    normalize_language_code,
)
from app.services.ffmpeg.video_analysis import analyze_video

logger = logging.getLogger(__name__)


class SubtitleExtractionError(Exception):
    """Raised when subtitle extraction fails."""

    pass


class SubtitleExtractionTimeoutError(SubtitleExtractionError):
    """Raised when subtitle extraction times out."""

    pass


async def extract_subtitle_track(
    video_url: str,
    track_index: int,
    output_format: str = "srt",
    timeout: int = 120,
) -> str:
    """
    Extract a specific subtitle track from video file.

    Args:
        video_url: URL or path to the video file
        track_index: Stream index of the subtitle track (from analyze_video)
        output_format: Output format ('srt' or 'vtt')
        timeout: Maximum time in seconds to wait for extraction (default 120)

    Returns:
        Subtitle content as string (SRT or VTT format)

    Raises:
        SubtitleExtractionTimeoutError: If extraction times out
        SubtitleExtractionError: If extraction fails
    """
    output_path: Optional[str] = None
    try:
        # Create temporary file for subtitle output
        with tempfile.NamedTemporaryFile(
            suffix=f".{output_format}",
            delete=False,
            mode="w",
            encoding="utf-8",
        ) as tmp:
            output_path = tmp.name

        logger.info(
            f"Extracting subtitle track {track_index} from {video_url} "
            f"to format {output_format} (timeout: {timeout}s)"
        )

        # Extract subtitle track using ffmpeg
        # Note: We don't use -codec copy because we need to convert to SRT format
        # For remote files, ffmpeg will only download subtitle data, not the entire video
        cmd = [
            "ffmpeg",
            "-analyzeduration",
            "10M",  # Analyze up to 10MB to find streams
            "-probesize",
            "10M",  # Probe up to 10MB
            "-i",
            video_url,
            "-map",
            f"0:{track_index}",  # Select specific subtitle stream
            "-f",
            output_format,  # Output format (converts to SRT)
            "-y",  # Overwrite output file
            output_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout,
        )

        # Read extracted subtitle content
        with open(output_path, "r", encoding="utf-8") as f:
            subtitle_content = f.read()

        if not subtitle_content.strip():
            raise SubtitleExtractionError("Extracted subtitle file is empty")

        logger.info(
            f"Successfully extracted subtitle track {track_index}, "
            f"size: {len(subtitle_content)} bytes"
        )

        return subtitle_content

    except subprocess.TimeoutExpired:
        logger.error(f"Subtitle extraction timed out for track {track_index} after {timeout}s")
        raise SubtitleExtractionTimeoutError(
            f"Subtitle extraction timed out after {timeout} seconds"
        )
    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg extraction failed for track {track_index}: {e.stderr}")
        raise SubtitleExtractionError(f"Failed to extract subtitle track: {e.stderr}")
    except IOError as e:
        logger.error(f"File operation failed during subtitle extraction: {str(e)}")
        raise SubtitleExtractionError(f"Failed to read extracted subtitle file: {str(e)}")
    except SubtitleExtractionError:
        raise
    except Exception as e:
        logger.error(f"Unexpected error extracting subtitle track {track_index}: {str(e)}")
        raise SubtitleExtractionError(f"Unexpected error: {str(e)}")
    finally:
        # Cleanup temporary file
        if output_path and os.path.exists(output_path):
            try:
                os.remove(output_path)
            except Exception as e:
                logger.warning(f"Failed to delete temp file {output_path}: {str(e)}")


def _prioritize_and_limit_subtitle_tracks(
    tracks: List[Dict[str, Any]],
    max_tracks: int = 10,
) -> List[Dict[str, Any]]:
    """
    Prioritize subtitle tracks and limit to max_tracks.

    Priority order: Hebrew (he), English (en), Spanish (es), then others alphabetically.

    Args:
        tracks: List of subtitle tracks to prioritize
        max_tracks: Maximum number of tracks to return (default 10)

    Returns:
        Prioritized and limited list of subtitle tracks
    """
    if len(tracks) <= max_tracks:
        return tracks

    # Separate tracks by priority
    priority_tracks: List[Dict[str, Any]] = []
    other_tracks: List[Dict[str, Any]] = []

    for track in tracks:
        lang = track.get("language", "und")
        if lang in PRIORITY_LANGUAGES:
            priority_tracks.append(track)
        else:
            other_tracks.append(track)

    # Sort priority tracks by priority order
    priority_tracks.sort(
        key=lambda t: (
            PRIORITY_LANGUAGES.index(t["language"])
            if t.get("language") in PRIORITY_LANGUAGES
            else 999
        )
    )

    # Sort other tracks alphabetically by language
    other_tracks.sort(key=lambda t: t.get("language", "zzz"))

    # Combine and limit
    all_tracks = priority_tracks + other_tracks
    limited_tracks = all_tracks[:max_tracks]

    if len(tracks) > max_tracks:
        skipped_count = len(tracks) - max_tracks
        skipped_languages = [t.get("language", "und") for t in tracks[max_tracks:]]
        logger.info(
            f"Limited to {max_tracks} subtitle tracks (skipped {skipped_count}: "
            f"{', '.join(skipped_languages[:5])}{'...' if skipped_count > 5 else ''})"
        )

    return limited_tracks


async def extract_all_subtitles(
    video_url: str,
    languages: Optional[List[str]] = None,
    max_parallel: int = 3,
    max_subtitles: int = 10,
) -> List[Dict[str, str]]:
    """
    Extract subtitle tracks from video file with filtering and parallel processing.

    This method:
    1. Analyzes the video to find all subtitle tracks
    2. Filters by requested languages (if specified)
    3. Skips incompatible formats (bitmap subtitles)
    4. Prioritizes Hebrew, English, Spanish subtitles
    5. Limits to max_subtitles (default 10) per movie
    6. Extracts tracks in parallel for better performance
    7. Returns the parsed subtitle content

    Args:
        video_url: URL or path to the video file
        languages: Optional list of language codes to extract (e.g., ['en', 'es', 'he'])
                  If None, extracts all compatible tracks
        max_parallel: Maximum number of parallel extractions (default 3)
        max_subtitles: Maximum number of subtitles to extract per movie (default 10)

    Returns:
        List of dictionaries containing:
        [
            {
                "language": "eng",
                "format": "srt",
                "content": "1\n00:00:01,000 --> 00:00:03,000\nHello world\n\n",
                "title": "English",
                "codec": "subrip"
            },
            ...
        ]

    Raises:
        SubtitleExtractionError: If video analysis fails
    """
    try:
        # Step 1: Analyze video to find subtitle tracks
        metadata = await analyze_video(video_url)
        subtitle_tracks = metadata.get("subtitle_tracks", [])

        if not subtitle_tracks:
            logger.info(f"No subtitle tracks found in {video_url}")
            return []

        logger.info(f"Found {len(subtitle_tracks)} subtitle tracks in video")

        # Step 2: Filter tracks before extraction
        tracks_to_extract: List[Dict[str, Any]] = []
        skipped_bitmap: List[str] = []
        skipped_language: List[str] = []

        for track in subtitle_tracks:
            codec = track.get("codec", "unknown")
            language_raw = track.get("language", "und")
            language = normalize_language_code(language_raw)

            # Skip bitmap-based subtitles (can't convert to text)
            if not is_text_based_subtitle(codec):
                skipped_bitmap.append(f"{language} ({codec})")
                logger.info(
                    f"Skipping track {track['index']} ({language_raw}->{language}): "
                    f"bitmap codec '{codec}' cannot convert to SRT"
                )
                continue

            # Filter by language if specified (compare normalized codes)
            if languages and language not in languages:
                skipped_language.append(f"{language_raw}->{language} (not in {languages})")
                continue

            # Store normalized language code in track
            track["language"] = language
            track["language_raw"] = language_raw
            tracks_to_extract.append(track)

        if skipped_bitmap:
            logger.info(
                f"Skipped {len(skipped_bitmap)} bitmap subtitle tracks: {', '.join(skipped_bitmap)}"
            )
        if skipped_language:
            logger.info(
                f"Skipped {len(skipped_language)} tracks by language filter: {', '.join(skipped_language)}"
            )

        if not tracks_to_extract:
            logger.info("No compatible subtitle tracks to extract after filtering")
            return []

        # Step 3: Prioritize and limit subtitle tracks
        tracks_to_extract = _prioritize_and_limit_subtitle_tracks(
            tracks_to_extract,
            max_tracks=max_subtitles,
        )

        logger.info(
            f"Extracting {len(tracks_to_extract)} subtitle tracks "
            f"(prioritized: he, en, es; limited to {max_subtitles}; max {max_parallel} parallel)..."
        )

        # Step 4: Extract tracks in parallel with semaphore to limit concurrency
        semaphore = asyncio.Semaphore(max_parallel)

        async def extract_with_semaphore(track: Dict[str, Any]) -> Optional[Dict[str, str]]:
            async with semaphore:
                try:
                    content = await extract_subtitle_track(
                        video_url,
                        track["index"],
                        output_format="srt",
                        timeout=120,  # 120 second timeout per track for large remote files
                    )

                    logger.info(
                        f"Extracted {track['language']} subtitle "
                        f"(track {track['index']}, codec: {track.get('codec', 'unknown')})"
                    )

                    return {
                        "language": track["language"],
                        "format": "srt",
                        "content": content,
                        "title": track.get("title", ""),
                        "codec": track.get("codec", "unknown"),
                        "index": track["index"],
                    }

                except Exception as e:
                    logger.error(
                        f"Failed to extract subtitle track {track['index']} "
                        f"({track['language']}, {track.get('codec', 'unknown')}): {str(e)}"
                    )
                    return None

        # Run all extractions in parallel
        results = await asyncio.gather(
            *[extract_with_semaphore(track) for track in tracks_to_extract],
            return_exceptions=False,
        )

        # Filter out None results (failed extractions)
        extracted_subtitles = [r for r in results if r is not None]

        logger.info(
            f"Extraction complete: {len(extracted_subtitles)}/{len(tracks_to_extract)} "
            f"tracks successfully extracted"
        )

        return extracted_subtitles

    except Exception as e:
        logger.error(f"Failed to extract subtitles from {video_url}: {str(e)}")
        raise SubtitleExtractionError(f"Failed to extract subtitles: {str(e)}")


def embed_subtitles(
    video_path: str,
    subtitle_path: str,
    output_path: str,
    language: str = "en",
    timeout: int = 600,
) -> str:
    """
    Embed subtitle file into video container.

    Args:
        video_path: Path to the video file
        subtitle_path: Path to the subtitle file (SRT or VTT)
        output_path: Path for the output video
        language: Language code for the subtitle track
        timeout: Maximum time in seconds to wait (default 600)

    Returns:
        Path to the output video file

    Raises:
        SubtitleExtractionError: If embedding fails
    """
    try:
        cmd = [
            "ffmpeg",
            "-i",
            video_path,
            "-i",
            subtitle_path,
            "-c",
            "copy",
            "-c:s",
            "mov_text",
            "-metadata:s:s:0",
            f"language={language}",
            "-y",
            output_path,
        ]

        logger.info(f"Embedding subtitles into {video_path}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout,
        )

        logger.info(f"Successfully embedded subtitles to {output_path}")
        return output_path

    except subprocess.TimeoutExpired:
        raise SubtitleExtractionError(f"Subtitle embedding timed out after {timeout} seconds")
    except subprocess.CalledProcessError as e:
        raise SubtitleExtractionError(f"Failed to embed subtitles: {e.stderr}")
    except Exception as e:
        raise SubtitleExtractionError(f"Failed to embed subtitles: {str(e)}")


def convert_subtitles(
    input_path: str,
    output_format: str,
    output_path: Optional[str] = None,
    timeout: int = 60,
) -> str:
    """
    Convert subtitle file to different format.

    Args:
        input_path: Path to the input subtitle file
        output_format: Target format ('srt', 'vtt', 'ass')
        output_path: Optional output path (auto-generated if not provided)
        timeout: Maximum time in seconds to wait (default 60)

    Returns:
        Path to the converted subtitle file

    Raises:
        SubtitleExtractionError: If conversion fails
    """
    try:
        if output_path is None:
            base_name = os.path.splitext(input_path)[0]
            output_path = f"{base_name}.{output_format}"

        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-f",
            output_format,
            "-y",
            output_path,
        ]

        logger.info(f"Converting subtitles to {output_format}: {input_path}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout,
        )

        logger.info(f"Successfully converted subtitles to {output_path}")
        return output_path

    except subprocess.TimeoutExpired:
        raise SubtitleExtractionError(f"Subtitle conversion timed out after {timeout} seconds")
    except subprocess.CalledProcessError as e:
        raise SubtitleExtractionError(f"Failed to convert subtitles: {e.stderr}")
    except Exception as e:
        raise SubtitleExtractionError(f"Failed to convert subtitles: {str(e)}")


async def burn_subtitles(
    video_path: str,
    subtitle_path: str,
    output_path: str,
    timeout: int = 3600,
) -> str:
    """
    Burn (hardcode) subtitles into video.

    This is a time-consuming operation as it requires re-encoding the video.

    Args:
        video_path: Path to the video file
        subtitle_path: Path to the subtitle file
        output_path: Path for the output video
        timeout: Maximum time in seconds to wait (default 3600 = 1 hour)

    Returns:
        Path to the output video file

    Raises:
        SubtitleExtractionError: If burning fails
    """
    try:
        # Escape special characters in subtitle path for filter
        escaped_path = subtitle_path.replace("\\", "\\\\").replace(":", "\\:")

        cmd = [
            "ffmpeg",
            "-i",
            video_path,
            "-vf",
            f"subtitles={escaped_path}",
            "-c:a",
            "copy",
            "-y",
            output_path,
        ]

        logger.info(f"Burning subtitles into {video_path}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=timeout,
            )
        except asyncio.TimeoutError:
            process.kill()
            raise SubtitleExtractionError(f"Subtitle burning timed out after {timeout} seconds")

        if process.returncode != 0:
            raise SubtitleExtractionError(f"Failed to burn subtitles: {stderr.decode()}")

        logger.info(f"Successfully burned subtitles to {output_path}")
        return output_path

    except SubtitleExtractionError:
        raise
    except Exception as e:
        raise SubtitleExtractionError(f"Failed to burn subtitles: {str(e)}")


def generate_srt_from_vtt(vtt_content: str) -> str:
    """
    Convert VTT subtitle content to SRT format.

    Args:
        vtt_content: WebVTT subtitle content as string

    Returns:
        SRT formatted subtitle content

    Raises:
        SubtitleExtractionError: If conversion fails
    """
    try:
        output_path: Optional[str] = None
        input_path: Optional[str] = None

        # Write VTT content to temp file
        with tempfile.NamedTemporaryFile(
            suffix=".vtt",
            delete=False,
            mode="w",
            encoding="utf-8",
        ) as vtt_file:
            vtt_file.write(vtt_content)
            input_path = vtt_file.name

        # Create output temp file
        with tempfile.NamedTemporaryFile(
            suffix=".srt",
            delete=False,
            mode="w",
            encoding="utf-8",
        ) as srt_file:
            output_path = srt_file.name

        # Convert using ffmpeg
        cmd = [
            "ffmpeg",
            "-i",
            input_path,
            "-f",
            "srt",
            "-y",
            output_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=30,
        )

        # Read converted content
        with open(output_path, "r", encoding="utf-8") as f:
            srt_content = f.read()

        return srt_content

    except subprocess.CalledProcessError as e:
        raise SubtitleExtractionError(f"Failed to convert VTT to SRT: {e.stderr}")
    except Exception as e:
        raise SubtitleExtractionError(f"Failed to convert VTT to SRT: {str(e)}")
    finally:
        # Cleanup temp files
        for path in [input_path, output_path]:
            if path and os.path.exists(path):
                try:
                    os.remove(path)
                except Exception:
                    pass
