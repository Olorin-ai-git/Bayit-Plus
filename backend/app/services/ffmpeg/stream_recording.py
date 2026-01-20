"""
FFmpeg Stream Recording Module

This module provides stream recording functionality from HLS and other URLs.
Supports live stream recording, video downloads, and screenshot capture.
"""

import asyncio
import logging
import os
import subprocess
from pathlib import Path
from typing import Any, Callable, Dict, Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class StreamRecordingError(Exception):
    """Raised when stream recording fails."""

    pass


class StreamRecordingTimeoutError(StreamRecordingError):
    """Raised when stream recording times out."""

    pass


async def start_recording_stream(
    stream_url: str,
    output_path: str,
    recording_id: str,
    max_duration_seconds: int = 14400,
    progress_callback: Optional[Callable[[str, int], None]] = None,
) -> subprocess.Popen:
    """
    Start recording HLS stream with FFmpeg.

    Args:
        stream_url: HLS stream URL to record
        output_path: Path where to save the recording
        recording_id: Unique recording identifier for progress monitoring
        max_duration_seconds: Maximum recording duration (default 4 hours)
        progress_callback: Optional callback for progress updates (recording_id, duration_seconds)

    Returns:
        FFmpeg process handle

    Raises:
        StreamRecordingError: If recording fails to start
    """
    try:
        logger.info(f"Starting recording of stream {stream_url} to {output_path}")

        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        # FFmpeg command for HLS recording with re-encoding
        cmd = [
            "ffmpeg",
            "-i",
            stream_url,
            "-c:v",
            "libx264",  # Re-encode to H.264
            "-preset",
            "faster",  # Balance speed/quality
            "-crf",
            "23",  # Quality
            "-c:a",
            "aac",  # Audio codec
            "-b:a",
            "128k",  # Audio bitrate
            "-movflags",
            "+faststart",  # Web optimization
            "-t",
            str(max_duration_seconds),  # Max duration
            "-progress",
            "pipe:1",  # Progress output
            "-loglevel",
            "error",
            "-y",  # Overwrite output file
            output_path,
        ]

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        logger.info(f"FFmpeg recording started with PID {process.pid}")

        # Monitor progress in background if callback provided
        if progress_callback:
            asyncio.create_task(
                _monitor_ffmpeg_progress(process, recording_id, progress_callback)
            )

        return process

    except Exception as e:
        logger.error(f"Failed to start recording: {str(e)}")
        raise StreamRecordingError(f"Failed to start recording: {str(e)}")


async def _monitor_ffmpeg_progress(
    process: subprocess.Popen,
    recording_id: str,
    callback: Optional[Callable[[str, int], None]] = None,
) -> None:
    """
    Monitor FFmpeg progress and optionally call callback.

    Parses FFmpeg progress output and can be used to update
    RecordingSession with duration and file size information.

    Args:
        process: FFmpeg process to monitor
        recording_id: Recording identifier for updates
        callback: Optional callback function (recording_id, duration_seconds)
    """
    try:
        logger.info(f"Starting progress monitor for recording {recording_id}")

        while process.poll() is None:
            if process.stdout is None:
                await asyncio.sleep(0.1)
                continue

            line = process.stdout.readline()
            if not line:
                await asyncio.sleep(0.1)
                continue

            # Parse FFmpeg progress output
            # Format: key=value pairs like "out_time_ms=5000000"
            if "=" in line:
                key, value = line.strip().split("=", 1)

                if key == "out_time_ms":
                    # Convert microseconds to seconds
                    try:
                        duration_seconds = int(value) // 1000000
                        logger.debug(f"Recording {recording_id}: {duration_seconds}s")
                        if callback:
                            callback(recording_id, duration_seconds)
                    except ValueError:
                        pass

        # Process completed
        return_code = process.returncode
        logger.info(f"Recording {recording_id} completed with code {return_code}")

    except Exception as e:
        logger.error(f"Error monitoring FFmpeg progress: {str(e)}")


async def stop_recording(process: subprocess.Popen, graceful_timeout: int = 10) -> None:
    """
    Gracefully stop FFmpeg recording.

    Sends SIGTERM for graceful stop, waits up to graceful_timeout seconds,
    then kills the process if it doesn't stop.

    Args:
        process: FFmpeg process to stop
        graceful_timeout: Seconds to wait for graceful termination (default 10)

    Raises:
        StreamRecordingError: If stopping fails
    """
    try:
        logger.info(f"Stopping recording process PID {process.pid}")

        # Send SIGTERM for graceful stop
        process.terminate()

        try:
            await asyncio.wait_for(
                asyncio.get_event_loop().run_in_executor(None, process.wait),
                timeout=graceful_timeout,
            )
            logger.info("Recording stopped gracefully")
        except asyncio.TimeoutError:
            logger.warning("Recording didn't stop gracefully, killing process")
            process.kill()
            await asyncio.get_event_loop().run_in_executor(None, process.wait)

    except Exception as e:
        logger.error(f"Error stopping recording: {str(e)}")
        raise StreamRecordingError(f"Error stopping recording: {str(e)}")


async def download_video_from_url(
    url: str,
    output_path: str,
    timeout: int = 3600,
    copy_codecs: bool = True,
) -> str:
    """
    Download video from URL to local file.

    Args:
        url: Video URL to download
        output_path: Local path for the downloaded video
        timeout: Maximum time in seconds to wait (default 1 hour)
        copy_codecs: If True, copy codecs without re-encoding (faster)

    Returns:
        Path to the downloaded video file

    Raises:
        StreamRecordingError: If download fails
    """
    try:
        logger.info(f"Downloading video from {url} to {output_path}")

        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        if copy_codecs:
            cmd = [
                "ffmpeg",
                "-i",
                url,
                "-c",
                "copy",
                "-y",
                output_path,
            ]
        else:
            cmd = [
                "ffmpeg",
                "-i",
                url,
                "-c:v",
                "libx264",
                "-preset",
                "fast",
                "-crf",
                "23",
                "-c:a",
                "aac",
                "-y",
                output_path,
            ]

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
            raise StreamRecordingTimeoutError(
                f"Video download timed out after {timeout} seconds"
            )

        if process.returncode != 0:
            raise StreamRecordingError(f"Failed to download video: {stderr.decode()}")

        if not os.path.exists(output_path):
            raise StreamRecordingError("Output file was not created")

        file_size = os.path.getsize(output_path)
        logger.info(f"Successfully downloaded video: {output_path} ({file_size} bytes)")

        return output_path

    except StreamRecordingError:
        raise
    except Exception as e:
        logger.error(f"Failed to download video: {str(e)}")
        raise StreamRecordingError(f"Failed to download video: {str(e)}")


async def capture_screenshot(
    video_path: str,
    output_path: str,
    timestamp_seconds: int = 30,
    width: Optional[int] = 1280,
    quality: int = 2,
) -> str:
    """
    Extract screenshot/thumbnail from video at specific timestamp.

    Args:
        video_path: Path or URL to video file
        output_path: Path where to save screenshot
        timestamp_seconds: Timestamp to extract frame from (default 30s)
        width: Target width in pixels (height auto-calculated, default 1280)
        quality: JPEG quality level 2-31 (2 is best, default 2)

    Returns:
        Path to the saved screenshot

    Raises:
        StreamRecordingError: If capture fails
    """
    try:
        logger.info(f"Extracting screenshot from {video_path} at {timestamp_seconds}s")

        # Ensure output directory exists
        output_dir = os.path.dirname(output_path)
        if output_dir:
            os.makedirs(output_dir, exist_ok=True)

        # Build scale filter
        scale_filter = f"scale={width}:-1" if width else ""

        cmd = [
            "ffmpeg",
            "-ss",
            str(timestamp_seconds),
            "-i",
            video_path,
            "-vframes",
            "1",
        ]

        if scale_filter:
            cmd.extend(["-vf", scale_filter])

        cmd.extend(["-q:v", str(quality), "-y", output_path])

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        stdout, stderr = await process.communicate()

        if process.returncode != 0:
            raise StreamRecordingError(
                f"FFmpeg screenshot extraction failed with code {process.returncode}: {stderr.decode()}"
            )

        if not os.path.exists(output_path):
            raise StreamRecordingError("Screenshot file was not created")

        logger.info(f"Screenshot extracted successfully to {output_path}")
        return output_path

    except StreamRecordingError:
        raise
    except Exception as e:
        logger.error(f"Failed to extract screenshot: {str(e)}")
        raise StreamRecordingError(f"Failed to extract screenshot: {str(e)}")


async def extract_thumbnail_from_video(
    video_path: str,
    output_path: str,
    timestamp_seconds: int = 30,
) -> str:
    """
    Extract thumbnail from video at specific timestamp.

    This is an alias for capture_screenshot with default parameters
    suitable for video thumbnails.

    Args:
        video_path: Path to video file
        output_path: Path where to save thumbnail
        timestamp_seconds: Timestamp to extract frame from (default 30s)

    Returns:
        Path to the saved thumbnail

    Raises:
        StreamRecordingError: If extraction fails
    """
    return await capture_screenshot(
        video_path=video_path,
        output_path=output_path,
        timestamp_seconds=timestamp_seconds,
        width=1280,
        quality=2,
    )
