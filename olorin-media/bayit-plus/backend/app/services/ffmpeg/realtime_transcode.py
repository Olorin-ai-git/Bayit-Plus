"""
Real-time Video Transcoding Service

Streams video with on-the-fly audio transcoding from AC3/DTS to AAC.
This allows browsers to play videos with incompatible audio codecs
without pre-converting the entire file.

Similar to Plex/Jellyfin real-time transcoding.
"""

import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator, Optional

from app.services.ffmpeg.video_analysis import detect_codec

logger = logging.getLogger(__name__)

# Audio codecs that browsers cannot play
INCOMPATIBLE_AUDIO_CODECS = {"ac3", "dts", "truehd", "eac3", "dca", "pcm_s24le"}

# Video codecs that browsers can play directly
COMPATIBLE_VIDEO_CODECS = {"h264", "hevc", "vp9", "av1"}

# File extensions that typically have incompatible audio (AC3/DTS)
LIKELY_INCOMPATIBLE_EXTENSIONS = {".mkv", ".avi", ".mov", ".wmv", ".m4v"}


class RealtimeTranscodeError(Exception):
    """Raised when real-time transcoding fails."""

    pass


def needs_audio_transcode(audio_codec: str) -> bool:
    """Check if audio codec needs transcoding for browser playback."""
    return audio_codec.lower() in INCOMPATIBLE_AUDIO_CODECS


def needs_video_transcode(video_codec: str) -> bool:
    """Check if video codec needs transcoding for browser playback."""
    return video_codec.lower() not in COMPATIBLE_VIDEO_CODECS


def _get_extension(url: str) -> str:
    """Extract file extension from URL or path."""
    # Remove query params
    clean_url = url.split("?")[0]
    return Path(clean_url).suffix.lower()


def needs_transcode_by_extension(url: str) -> bool:
    """
    Quick check if URL likely needs transcoding based on extension only.
    No ffprobe call - instant response.
    """
    if not url:
        return False
    ext = _get_extension(url)
    # HLS and MP4 can usually direct play
    if ext in {".m3u8", ".mp4"}:
        return False
    # MKV, AVI, etc. likely need transcoding
    return ext in LIKELY_INCOMPATIBLE_EXTENSIONS


async def check_transcode_requirements(
    video_url: str,
) -> dict:
    """
    Check if a video needs transcoding for browser playback.

    First tries to detect codecs via ffprobe. If that fails (e.g., for
    authenticated URLs), falls back to extension-based detection.

    Args:
        video_url: URL or path to the video file

    Returns:
        Dictionary with transcode requirements:
        {
            "needs_audio_transcode": True,
            "needs_video_transcode": False,
            "audio_codec": "ac3",
            "video_codec": "h264",
            "can_direct_play": False,
            "detection_method": "codec" or "extension"
        }
    """
    # Try codec detection first
    try:
        codecs = detect_codec(video_url, timeout=30)
        audio_codec = codecs.get("audio_codec", "unknown")
        video_codec = codecs.get("video_codec", "unknown")

        if audio_codec != "unknown" or video_codec != "unknown":
            audio_needs = needs_audio_transcode(audio_codec)
            video_needs = needs_video_transcode(video_codec)

            return {
                "needs_audio_transcode": audio_needs,
                "needs_video_transcode": video_needs,
                "audio_codec": audio_codec,
                "video_codec": video_codec,
                "can_direct_play": not audio_needs and not video_needs,
                "detection_method": "codec",
            }
    except Exception as e:
        logger.debug(f"Codec detection failed, falling back to extension: {e}")

    # Fall back to extension-based detection
    ext = _get_extension(video_url)
    logger.info(f"Using extension-based detection for {ext}")

    # HLS is always direct play
    if ext == ".m3u8":
        return {
            "needs_audio_transcode": False,
            "needs_video_transcode": False,
            "audio_codec": "unknown",
            "video_codec": "unknown",
            "can_direct_play": True,
            "detection_method": "extension",
        }

    # MP4 with known good extensions can usually direct play
    if ext == ".mp4":
        return {
            "needs_audio_transcode": False,
            "needs_video_transcode": False,
            "audio_codec": "aac",  # Assumed
            "video_codec": "h264",  # Assumed
            "can_direct_play": True,
            "detection_method": "extension",
        }

    # MKV, AVI, etc. likely have AC3/DTS - assume transcoding needed
    if ext in LIKELY_INCOMPATIBLE_EXTENSIONS:
        return {
            "needs_audio_transcode": True,
            "needs_video_transcode": False,
            "audio_codec": "ac3",  # Assumed (common in MKV)
            "video_codec": "h264",  # Assumed
            "can_direct_play": False,
            "detection_method": "extension",
        }

    # Unknown extension - assume direct play
    return {
        "needs_audio_transcode": False,
        "needs_video_transcode": False,
        "audio_codec": "unknown",
        "video_codec": "unknown",
        "can_direct_play": True,
        "detection_method": "extension",
    }


async def stream_transcode(
    video_url: str,
    transcode_audio: bool = True,
    transcode_video: bool = False,
    start_time: Optional[float] = None,
    chunk_size: int = 65536,
) -> AsyncGenerator[bytes, None]:
    """
    Stream video with real-time transcoding.

    Pipes FFmpeg output directly to the response without temp files.
    Transcodes audio to AAC for browser compatibility.

    Args:
        video_url: URL or path to the source video
        transcode_audio: Whether to transcode audio to AAC (default True)
        transcode_video: Whether to transcode video to H.264 (default False)
        start_time: Optional start time in seconds for seeking
        chunk_size: Size of chunks to yield (default 64KB)

    Yields:
        Chunks of transcoded video data in MPEGTS format

    Raises:
        RealtimeTranscodeError: If transcoding fails
    """
    process = None
    try:
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error"]

        # Add seek if start time specified
        if start_time and start_time > 0:
            cmd.extend(["-ss", str(start_time)])

        # Input
        cmd.extend(["-i", video_url])

        # Video codec - copy if possible, otherwise transcode
        if transcode_video:
            cmd.extend(["-c:v", "libx264", "-preset", "ultrafast", "-crf", "23"])
        else:
            cmd.extend(["-c:v", "copy"])

        # Audio codec - transcode to AAC if needed
        if transcode_audio:
            cmd.extend(["-c:a", "aac", "-b:a", "192k", "-ac", "2"])
        else:
            cmd.extend(["-c:a", "copy"])

        # Output format - fragmented MP4 for browser streaming
        # Note: faststart is INCOMPATIBLE with stdout streaming (requires file rewrite)
        # empty_moov creates moov at start, frag_keyframe makes seekable fragments
        cmd.extend([
            "-f", "mp4",
            "-movflags", "frag_keyframe+empty_moov+default_base_moof",
            "-frag_duration", "1000000",  # 1 second fragments for faster startup
            "-"  # Output to stdout
        ])

        logger.info(f"Starting real-time transcode: {video_url}")
        logger.debug(f"FFmpeg command: {' '.join(cmd)}")

        process = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        bytes_sent = 0
        while True:
            chunk = await process.stdout.read(chunk_size)
            if not chunk:
                break
            bytes_sent += len(chunk)
            yield chunk

        # Wait for process to complete
        await process.wait()

        if process.returncode != 0:
            stderr = await process.stderr.read()
            error_msg = stderr.decode() if stderr else "Unknown error"
            logger.error(f"FFmpeg transcode failed: {error_msg}")
            raise RealtimeTranscodeError(f"Transcode failed: {error_msg}")

        logger.info(f"Transcode complete: {bytes_sent / 1024 / 1024:.1f} MB streamed")

    except asyncio.CancelledError:
        logger.info("Transcode cancelled by client disconnect")
        if process:
            process.kill()
        raise
    except RealtimeTranscodeError:
        raise
    except Exception as e:
        logger.error(f"Unexpected transcode error: {e}")
        if process:
            process.kill()
        raise RealtimeTranscodeError(f"Transcode error: {e}")
    finally:
        if process and process.returncode is None:
            process.kill()
            await process.wait()


async def stream_transcode_hls(
    video_url: str,
    transcode_audio: bool = True,
    transcode_video: bool = False,
    segment_duration: int = 6,
) -> AsyncGenerator[bytes, None]:
    """
    Stream video as HLS with real-time transcoding.

    Generates HLS playlist and segments on-the-fly.
    Better for seeking but has slightly higher latency.

    Args:
        video_url: URL or path to the source video
        transcode_audio: Whether to transcode audio to AAC
        transcode_video: Whether to transcode video to H.264
        segment_duration: HLS segment duration in seconds

    Yields:
        Chunks of HLS data

    Note:
        For simple streaming use stream_transcode() with MPEGTS format.
        This HLS version is more complex but supports adaptive seeking.
    """
    # For now, delegate to the simpler MPEGTS streaming
    # HLS live streaming requires segment management
    async for chunk in stream_transcode(
        video_url,
        transcode_audio=transcode_audio,
        transcode_video=transcode_video,
    ):
        yield chunk
