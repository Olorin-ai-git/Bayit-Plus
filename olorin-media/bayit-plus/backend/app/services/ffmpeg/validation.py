"""
FFmpeg Validation Module

This module provides input validation and FFmpeg installation verification.
"""

import logging
import subprocess
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class FFmpegValidationError(Exception):
    """Raised when FFmpeg validation fails."""

    pass


class FFmpegNotInstalledError(FFmpegValidationError):
    """Raised when FFmpeg or ffprobe is not installed."""

    pass


class InvalidVideoFileError(FFmpegValidationError):
    """Raised when a video file is invalid or inaccessible."""

    pass


async def verify_ffmpeg_installation() -> Dict[str, Any]:
    """
    Verify that FFmpeg and ffprobe are installed and accessible.

    Returns:
        Dictionary containing:
        {
            "ffmpeg_installed": True,
            "ffprobe_installed": True,
            "ffmpeg_version": "8.0.1",
            "ffprobe_version": "8.0.1"
        }
    """
    result: Dict[str, Any] = {
        "ffmpeg_installed": False,
        "ffprobe_installed": False,
        "ffmpeg_version": None,
        "ffprobe_version": None,
    }

    # Check ffmpeg
    try:
        ffmpeg_result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if ffmpeg_result.returncode == 0:
            result["ffmpeg_installed"] = True
            # Extract version from first line
            first_line = ffmpeg_result.stdout.split("\n")[0]
            if "version" in first_line:
                result["ffmpeg_version"] = first_line.split()[2]
    except subprocess.TimeoutExpired:
        logger.warning("ffmpeg version check timed out")
    except FileNotFoundError:
        logger.warning("ffmpeg not found in PATH")
    except Exception as e:
        logger.warning(f"ffmpeg check failed: {str(e)}")

    # Check ffprobe
    try:
        ffprobe_result = subprocess.run(
            ["ffprobe", "-version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if ffprobe_result.returncode == 0:
            result["ffprobe_installed"] = True
            # Extract version from first line
            first_line = ffprobe_result.stdout.split("\n")[0]
            if "version" in first_line:
                result["ffprobe_version"] = first_line.split()[2]
    except subprocess.TimeoutExpired:
        logger.warning("ffprobe version check timed out")
    except FileNotFoundError:
        logger.warning("ffprobe not found in PATH")
    except Exception as e:
        logger.warning(f"ffprobe check failed: {str(e)}")

    return result


def check_ffmpeg_installed() -> bool:
    """
    Check if FFmpeg is installed and accessible.

    Returns:
        True if FFmpeg is installed and accessible

    Raises:
        FFmpegNotInstalledError: If FFmpeg is not installed
    """
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return True
        raise FFmpegNotInstalledError("FFmpeg returned non-zero exit code")
    except FileNotFoundError:
        raise FFmpegNotInstalledError(
            "FFmpeg is not installed. Please install FFmpeg to use this service."
        )
    except subprocess.TimeoutExpired:
        raise FFmpegNotInstalledError("FFmpeg version check timed out")
    except Exception as e:
        raise FFmpegNotInstalledError(f"Failed to verify FFmpeg installation: {str(e)}")


def check_ffprobe_installed() -> bool:
    """
    Check if ffprobe is installed and accessible.

    Returns:
        True if ffprobe is installed and accessible

    Raises:
        FFmpegNotInstalledError: If ffprobe is not installed
    """
    try:
        result = subprocess.run(
            ["ffprobe", "-version"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if result.returncode == 0:
            return True
        raise FFmpegNotInstalledError("ffprobe returned non-zero exit code")
    except FileNotFoundError:
        raise FFmpegNotInstalledError(
            "ffprobe is not installed. Please install FFmpeg (includes ffprobe) to use this service."
        )
    except subprocess.TimeoutExpired:
        raise FFmpegNotInstalledError("ffprobe version check timed out")
    except Exception as e:
        raise FFmpegNotInstalledError(
            f"Failed to verify ffprobe installation: {str(e)}"
        )


def validate_video_file(video_path: str) -> bool:
    """
    Validate that a video file exists and is accessible.

    Args:
        video_path: Path or URL to the video file

    Returns:
        True if the file is valid and accessible

    Raises:
        InvalidVideoFileError: If the file is invalid or inaccessible
    """
    if not video_path:
        raise InvalidVideoFileError("Video path is empty")

    # For URLs, we cannot validate locally - assume valid
    if video_path.startswith(("http://", "https://", "rtmp://", "rtsp://")):
        return True

    # For local files, check existence
    import os

    if not os.path.exists(video_path):
        raise InvalidVideoFileError(f"Video file not found: {video_path}")

    if not os.path.isfile(video_path):
        raise InvalidVideoFileError(f"Path is not a file: {video_path}")

    if not os.access(video_path, os.R_OK):
        raise InvalidVideoFileError(f"Video file is not readable: {video_path}")

    return True


def validate_codec_support(codec: str) -> Dict[str, Any]:
    """
    Validate that FFmpeg supports a specific codec.

    Args:
        codec: Codec name to validate (e.g., 'h264', 'hevc', 'aac')

    Returns:
        Dictionary with codec support information:
        {
            "codec": "h264",
            "supported": True,
            "can_decode": True,
            "can_encode": True
        }
    """
    result: Dict[str, Any] = {
        "codec": codec,
        "supported": False,
        "can_decode": False,
        "can_encode": False,
    }

    try:
        # Check decoder support
        decoder_result = subprocess.run(
            ["ffmpeg", "-decoders"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if (
            decoder_result.returncode == 0
            and codec.lower() in decoder_result.stdout.lower()
        ):
            result["can_decode"] = True
            result["supported"] = True

        # Check encoder support
        encoder_result = subprocess.run(
            ["ffmpeg", "-encoders"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if (
            encoder_result.returncode == 0
            and codec.lower() in encoder_result.stdout.lower()
        ):
            result["can_encode"] = True
            result["supported"] = True

    except subprocess.TimeoutExpired:
        logger.warning(f"Codec validation timed out for: {codec}")
    except Exception as e:
        logger.warning(f"Codec validation failed for {codec}: {str(e)}")

    return result
