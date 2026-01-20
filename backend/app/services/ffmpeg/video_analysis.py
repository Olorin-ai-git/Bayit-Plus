"""
FFmpeg Video Analysis Module

This module provides video file analysis functionality using ffprobe.
Extracts metadata including duration, resolution, codec, bitrate, fps,
and subtitle track information.
"""

import asyncio
import json
import logging
import subprocess
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class VideoAnalysisError(Exception):
    """Raised when video analysis fails."""

    pass


class VideoAnalysisTimeoutError(VideoAnalysisError):
    """Raised when video analysis times out."""

    pass


async def analyze_video(video_url: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Analyze video file and return metadata including subtitle tracks.

    Uses ffprobe to extract comprehensive video metadata including:
    - Duration, resolution, codec, bitrate, fps
    - All subtitle tracks with language and codec information

    Args:
        video_url: URL or path to the video file
        timeout: Maximum time in seconds to wait for analysis (default 30)

    Returns:
        Dictionary containing:
        {
            "duration": 7265.5,
            "width": 1920,
            "height": 1080,
            "codec": "h264",
            "bitrate": 2500000,
            "fps": 23.976,
            "subtitle_tracks": [
                {"index": 2, "language": "eng", "codec": "subrip", "title": "English"},
                {"index": 3, "language": "spa", "codec": "subrip", "title": "Spanish"},
                {"index": 4, "language": "heb", "codec": "ass", "title": "Hebrew"}
            ]
        }

    Raises:
        VideoAnalysisTimeoutError: If ffprobe times out
        VideoAnalysisError: If ffprobe fails or returns invalid data
    """
    try:
        # Use ffprobe to get video metadata in JSON format
        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            video_url,
        ]

        logger.info(f"Analyzing video: {video_url}")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout,
        )

        data = json.loads(result.stdout)

        # Parse video stream
        video_stream = next(
            (s for s in data.get("streams", []) if s.get("codec_type") == "video"),
            None,
        )

        # Parse subtitle streams
        subtitle_streams = [
            s for s in data.get("streams", []) if s.get("codec_type") == "subtitle"
        ]

        # Calculate FPS from r_frame_rate (format: "24000/1001")
        fps = 0.0
        if video_stream and "r_frame_rate" in video_stream:
            try:
                numerator, denominator = map(int, video_stream["r_frame_rate"].split("/"))
                if denominator > 0:
                    fps = numerator / denominator
            except (ValueError, ZeroDivisionError):
                fps = 0.0

        metadata: Dict[str, Any] = {
            "duration": float(data.get("format", {}).get("duration", 0)),
            "bitrate": int(data.get("format", {}).get("bit_rate", 0)),
            "width": video_stream.get("width", 0) if video_stream else 0,
            "height": video_stream.get("height", 0) if video_stream else 0,
            "codec": video_stream.get("codec_name", "") if video_stream else "",
            "fps": round(fps, 3),
            "subtitle_tracks": [
                {
                    "index": s["index"],
                    "language": s.get("tags", {}).get("language", "und"),
                    "codec": s.get("codec_name", "unknown"),
                    "title": s.get("tags", {}).get("title", ""),
                }
                for s in subtitle_streams
            ],
        }

        logger.info(
            f"Video analysis complete: {metadata['width']}x{metadata['height']}, "
            f"{len(metadata['subtitle_tracks'])} subtitle tracks found"
        )

        return metadata

    except subprocess.TimeoutExpired:
        logger.error(f"Video analysis timed out for: {video_url}")
        raise VideoAnalysisTimeoutError(f"Video analysis timed out after {timeout} seconds")
    except subprocess.CalledProcessError as e:
        logger.error(f"ffprobe failed for {video_url}: {e.stderr}")
        raise VideoAnalysisError(f"Failed to analyze video: {e.stderr}")
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from ffprobe: {e}")
        raise VideoAnalysisError("Failed to parse video metadata")
    except Exception as e:
        logger.error(f"Unexpected error analyzing video {video_url}: {str(e)}")
        raise VideoAnalysisError(f"Unexpected error analyzing video: {str(e)}")


async def get_video_info(video_path: str) -> Dict[str, Any]:
    """
    Get video metadata using ffprobe (async version).

    Args:
        video_path: Path to video file

    Returns:
        Dictionary with video metadata including codec, resolution, duration, etc.

    Raises:
        VideoAnalysisError: If ffprobe fails
    """
    try:
        logger.info(f"Getting video info for {video_path}")

        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            video_path,
        ]

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise VideoAnalysisError(f"ffprobe failed: {stderr.decode()}")

        data = json.loads(stdout.decode())

        # Extract video and audio stream info
        video_stream = next(
            (s for s in data.get("streams", []) if s.get("codec_type") == "video"),
            {},
        )
        audio_stream = next(
            (s for s in data.get("streams", []) if s.get("codec_type") == "audio"),
            {},
        )

        info: Dict[str, Any] = {
            "duration": float(data.get("format", {}).get("duration", 0)),
            "size": int(data.get("format", {}).get("size", 0)),
            "bitrate": int(data.get("format", {}).get("bit_rate", 0)),
            "video_codec": video_stream.get("codec_name", "unknown"),
            "audio_codec": audio_stream.get("codec_name", "unknown"),
            "width": video_stream.get("width", 0),
            "height": video_stream.get("height", 0),
            "resolution": (
                f"{video_stream.get('height', 0)}p"
                if video_stream.get("height")
                else "unknown"
            ),
        }

        logger.info(
            f"Video info retrieved: {info['resolution']}, {info['duration']}s, {info['size']} bytes"
        )

        return info

    except VideoAnalysisError:
        raise
    except Exception as e:
        logger.error(f"Failed to get video info: {str(e)}")
        raise VideoAnalysisError(f"Failed to get video info: {str(e)}")


def get_video_duration(video_path: str, timeout: int = 30) -> float:
    """
    Get video duration in seconds.

    Args:
        video_path: Path or URL to the video file
        timeout: Maximum time in seconds to wait (default 30)

    Returns:
        Duration in seconds as float

    Raises:
        VideoAnalysisError: If duration cannot be determined
    """
    try:
        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            video_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout,
        )

        data = json.loads(result.stdout)
        duration = float(data.get("format", {}).get("duration", 0))

        if duration == 0:
            raise VideoAnalysisError("Video duration is 0 or could not be determined")

        return duration

    except subprocess.TimeoutExpired:
        raise VideoAnalysisError(f"Duration query timed out after {timeout} seconds")
    except subprocess.CalledProcessError as e:
        raise VideoAnalysisError(f"Failed to get video duration: {e.stderr}")
    except json.JSONDecodeError:
        raise VideoAnalysisError("Failed to parse ffprobe output")
    except Exception as e:
        raise VideoAnalysisError(f"Failed to get video duration: {str(e)}")


def detect_codec(video_path: str, timeout: int = 30) -> Dict[str, str]:
    """
    Detect video and audio codecs.

    Args:
        video_path: Path or URL to the video file
        timeout: Maximum time in seconds to wait (default 30)

    Returns:
        Dictionary with video_codec and audio_codec keys

    Raises:
        VideoAnalysisError: If codecs cannot be determined
    """
    try:
        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_streams",
            video_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout,
        )

        data = json.loads(result.stdout)
        streams = data.get("streams", [])

        video_codec = next(
            (s.get("codec_name", "unknown") for s in streams if s.get("codec_type") == "video"),
            "unknown",
        )
        audio_codec = next(
            (s.get("codec_name", "unknown") for s in streams if s.get("codec_type") == "audio"),
            "unknown",
        )

        return {"video_codec": video_codec, "audio_codec": audio_codec}

    except subprocess.TimeoutExpired:
        raise VideoAnalysisError(f"Codec detection timed out after {timeout} seconds")
    except subprocess.CalledProcessError as e:
        raise VideoAnalysisError(f"Failed to detect codecs: {e.stderr}")
    except Exception as e:
        raise VideoAnalysisError(f"Failed to detect codecs: {str(e)}")


def get_resolution(video_path: str, timeout: int = 30) -> Dict[str, int]:
    """
    Get video resolution (width and height).

    Args:
        video_path: Path or URL to the video file
        timeout: Maximum time in seconds to wait (default 30)

    Returns:
        Dictionary with width and height keys

    Raises:
        VideoAnalysisError: If resolution cannot be determined
    """
    try:
        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_streams",
            "-select_streams",
            "v:0",
            video_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout,
        )

        data = json.loads(result.stdout)
        video_stream = data.get("streams", [{}])[0]

        width = video_stream.get("width", 0)
        height = video_stream.get("height", 0)

        if width == 0 or height == 0:
            raise VideoAnalysisError("Video resolution could not be determined")

        return {"width": width, "height": height}

    except subprocess.TimeoutExpired:
        raise VideoAnalysisError(f"Resolution query timed out after {timeout} seconds")
    except subprocess.CalledProcessError as e:
        raise VideoAnalysisError(f"Failed to get resolution: {e.stderr}")
    except Exception as e:
        raise VideoAnalysisError(f"Failed to get resolution: {str(e)}")


def get_bitrate(video_path: str, timeout: int = 30) -> int:
    """
    Get video bitrate in bits per second.

    Args:
        video_path: Path or URL to the video file
        timeout: Maximum time in seconds to wait (default 30)

    Returns:
        Bitrate in bits per second

    Raises:
        VideoAnalysisError: If bitrate cannot be determined
    """
    try:
        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            video_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout,
        )

        data = json.loads(result.stdout)
        bitrate = int(data.get("format", {}).get("bit_rate", 0))

        return bitrate

    except subprocess.TimeoutExpired:
        raise VideoAnalysisError(f"Bitrate query timed out after {timeout} seconds")
    except subprocess.CalledProcessError as e:
        raise VideoAnalysisError(f"Failed to get bitrate: {e.stderr}")
    except Exception as e:
        raise VideoAnalysisError(f"Failed to get bitrate: {str(e)}")


def analyze_video_quality(video_path: str, timeout: int = 30) -> Dict[str, Any]:
    """
    Analyze video quality metrics.

    Args:
        video_path: Path or URL to the video file
        timeout: Maximum time in seconds to wait (default 30)

    Returns:
        Dictionary with quality metrics:
        {
            "width": 1920,
            "height": 1080,
            "resolution_label": "1080p",
            "bitrate": 2500000,
            "bitrate_mbps": 2.5,
            "codec": "h264",
            "fps": 23.976,
            "duration": 7200.5,
            "quality_tier": "HD"
        }

    Raises:
        VideoAnalysisError: If quality cannot be analyzed
    """
    try:
        cmd = [
            "ffprobe",
            "-v",
            "quiet",
            "-print_format",
            "json",
            "-show_format",
            "-show_streams",
            video_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=True,
            timeout=timeout,
        )

        data = json.loads(result.stdout)

        video_stream = next(
            (s for s in data.get("streams", []) if s.get("codec_type") == "video"),
            {},
        )

        width = video_stream.get("width", 0)
        height = video_stream.get("height", 0)
        bitrate = int(data.get("format", {}).get("bit_rate", 0))
        codec = video_stream.get("codec_name", "unknown")
        duration = float(data.get("format", {}).get("duration", 0))

        # Calculate FPS
        fps = 0.0
        if "r_frame_rate" in video_stream:
            try:
                numerator, denominator = map(int, video_stream["r_frame_rate"].split("/"))
                if denominator > 0:
                    fps = numerator / denominator
            except (ValueError, ZeroDivisionError):
                fps = 0.0

        # Determine resolution label
        resolution_label = "unknown"
        if height >= 2160:
            resolution_label = "4K"
        elif height >= 1080:
            resolution_label = "1080p"
        elif height >= 720:
            resolution_label = "720p"
        elif height >= 480:
            resolution_label = "480p"
        elif height > 0:
            resolution_label = f"{height}p"

        # Determine quality tier
        quality_tier = "SD"
        if height >= 2160:
            quality_tier = "4K"
        elif height >= 1080:
            quality_tier = "HD"
        elif height >= 720:
            quality_tier = "HD"

        return {
            "width": width,
            "height": height,
            "resolution_label": resolution_label,
            "bitrate": bitrate,
            "bitrate_mbps": round(bitrate / 1_000_000, 2) if bitrate > 0 else 0,
            "codec": codec,
            "fps": round(fps, 3),
            "duration": duration,
            "quality_tier": quality_tier,
        }

    except subprocess.TimeoutExpired:
        raise VideoAnalysisError(f"Quality analysis timed out after {timeout} seconds")
    except subprocess.CalledProcessError as e:
        raise VideoAnalysisError(f"Failed to analyze quality: {e.stderr}")
    except Exception as e:
        raise VideoAnalysisError(f"Failed to analyze quality: {str(e)}")
