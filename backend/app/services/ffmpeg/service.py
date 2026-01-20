"""
FFmpeg Service - Main Coordinator Class

This module provides the main FFmpegService class that coordinates all FFmpeg
operations by delegating to specialized modules.
"""

import logging
import subprocess
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from app.core.config import settings
from app.services.ffmpeg.constants import (
    LANGUAGE_CODE_MAP,
    is_text_based_subtitle,
    normalize_language_code,
)
from app.services.ffmpeg.conversion import (
    compress_video,
    convert_to_hls,
    convert_video,
    extract_audio,
    resize_video,
    transcode_video,
)
from app.services.ffmpeg.stream_recording import (
    capture_screenshot,
    download_video_from_url,
    extract_thumbnail_from_video,
    start_recording_stream,
    stop_recording,
)
from app.services.ffmpeg.subtitle_operations import (
    burn_subtitles,
    convert_subtitles,
    embed_subtitles,
    extract_all_subtitles,
    extract_subtitle_track,
    generate_srt_from_vtt,
)
from app.services.ffmpeg.validation import (
    check_ffmpeg_installed,
    check_ffprobe_installed,
    validate_codec_support,
    validate_video_file,
    verify_ffmpeg_installation,
)
from app.services.ffmpeg.video_analysis import (
    analyze_video,
    analyze_video_quality,
    detect_codec,
    get_bitrate,
    get_resolution,
    get_video_duration,
    get_video_info,
)

logger = logging.getLogger(__name__)


class FFmpegService:
    """
    Service for video analysis, subtitle extraction, and live stream recording using FFmpeg.

    This class serves as the main coordinator for all FFmpeg operations, delegating
    to specialized modules for specific functionality.
    """

    # Expose language code map as class attribute for backward compatibility
    LANGUAGE_CODE_MAP = LANGUAGE_CODE_MAP

    def __init__(self) -> None:
        """Initialize FFmpeg service with temp directory."""
        self.temp_dir = Path(settings.UPLOAD_DIR) / "recordings"
        self.temp_dir.mkdir(exist_ok=True, parents=True)

    def normalize_language_code(self, code: str) -> str:
        """
        Normalize language code to 2-letter ISO 639-1 format.

        Accepts both 2-letter and 3-letter codes.

        Args:
            code: Language code to normalize

        Returns:
            Normalized 2-letter code
        """
        return normalize_language_code(code)

    def _is_text_based_subtitle(self, codec: str) -> bool:
        """
        Check if subtitle codec is text-based (can be converted to SRT).

        Args:
            codec: Subtitle codec name from ffprobe

        Returns:
            True if codec is text-based, False if bitmap-based
        """
        return is_text_based_subtitle(codec)

    # ========== Video Analysis Methods ==========

    async def analyze_video(self, video_url: str) -> Dict[str, Any]:
        """
        Analyze video file and return metadata including subtitle tracks.

        Uses ffprobe to extract comprehensive video metadata including:
        - Duration, resolution, codec, bitrate, fps
        - All subtitle tracks with language and codec information

        Args:
            video_url: URL or path to the video file

        Returns:
            Dictionary containing video metadata and subtitle tracks

        Raises:
            Exception: If analysis fails
        """
        return await analyze_video(video_url)

    async def get_video_info(self, video_path: str) -> Dict[str, Any]:
        """
        Get video metadata using ffprobe.

        Args:
            video_path: Path to video file

        Returns:
            Dictionary with video metadata including codec, resolution, duration, etc.
        """
        return await get_video_info(video_path)

    def get_video_duration(self, video_path: str, timeout: int = 30) -> float:
        """
        Get video duration in seconds.

        Args:
            video_path: Path or URL to the video file
            timeout: Maximum time in seconds to wait

        Returns:
            Duration in seconds
        """
        return get_video_duration(video_path, timeout)

    def detect_codec(self, video_path: str, timeout: int = 30) -> Dict[str, str]:
        """
        Detect video and audio codecs.

        Args:
            video_path: Path or URL to the video file
            timeout: Maximum time in seconds to wait

        Returns:
            Dictionary with video_codec and audio_codec keys
        """
        return detect_codec(video_path, timeout)

    def get_resolution(self, video_path: str, timeout: int = 30) -> Dict[str, int]:
        """
        Get video resolution (width and height).

        Args:
            video_path: Path or URL to the video file
            timeout: Maximum time in seconds to wait

        Returns:
            Dictionary with width and height keys
        """
        return get_resolution(video_path, timeout)

    def get_bitrate(self, video_path: str, timeout: int = 30) -> int:
        """
        Get video bitrate in bits per second.

        Args:
            video_path: Path or URL to the video file
            timeout: Maximum time in seconds to wait

        Returns:
            Bitrate in bits per second
        """
        return get_bitrate(video_path, timeout)

    def analyze_video_quality(
        self, video_path: str, timeout: int = 30
    ) -> Dict[str, Any]:
        """
        Analyze video quality metrics.

        Args:
            video_path: Path or URL to the video file
            timeout: Maximum time in seconds to wait

        Returns:
            Dictionary with quality metrics
        """
        return analyze_video_quality(video_path, timeout)

    # ========== Subtitle Methods ==========

    async def extract_subtitle_track(
        self,
        video_url: str,
        track_index: int,
        output_format: str = "srt",
        timeout: int = 120,
    ) -> str:
        """
        Extract a specific subtitle track from video file.

        Args:
            video_url: URL or path to the video file
            track_index: Stream index of the subtitle track
            output_format: Output format ('srt' or 'vtt')
            timeout: Maximum time in seconds to wait

        Returns:
            Subtitle content as string
        """
        return await extract_subtitle_track(
            video_url, track_index, output_format, timeout
        )

    async def extract_all_subtitles(
        self,
        video_url: str,
        languages: Optional[List[str]] = None,
        max_parallel: int = 3,
        max_subtitles: int = 10,
    ) -> List[Dict[str, str]]:
        """
        Extract subtitle tracks from video file with filtering and parallel processing.

        Args:
            video_url: URL or path to the video file
            languages: Optional list of language codes to extract
            max_parallel: Maximum number of parallel extractions
            max_subtitles: Maximum number of subtitles to extract

        Returns:
            List of dictionaries containing subtitle data
        """
        return await extract_all_subtitles(
            video_url, languages, max_parallel, max_subtitles
        )

    def embed_subtitles(
        self,
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
            subtitle_path: Path to the subtitle file
            output_path: Path for the output video
            language: Language code for the subtitle track
            timeout: Maximum time in seconds to wait

        Returns:
            Path to the output video file
        """
        return embed_subtitles(
            video_path, subtitle_path, output_path, language, timeout
        )

    def convert_subtitles(
        self,
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
            output_path: Optional output path
            timeout: Maximum time in seconds to wait

        Returns:
            Path to the converted subtitle file
        """
        return convert_subtitles(input_path, output_format, output_path, timeout)

    async def burn_subtitles(
        self,
        video_path: str,
        subtitle_path: str,
        output_path: str,
        timeout: int = 3600,
    ) -> str:
        """
        Burn (hardcode) subtitles into video.

        Args:
            video_path: Path to the video file
            subtitle_path: Path to the subtitle file
            output_path: Path for the output video
            timeout: Maximum time in seconds to wait

        Returns:
            Path to the output video file
        """
        return await burn_subtitles(video_path, subtitle_path, output_path, timeout)

    def generate_srt_from_vtt(self, vtt_content: str) -> str:
        """
        Convert VTT subtitle content to SRT format.

        Args:
            vtt_content: WebVTT subtitle content as string

        Returns:
            SRT formatted subtitle content
        """
        return generate_srt_from_vtt(vtt_content)

    # ========== Stream Recording Methods ==========

    async def start_recording_stream(
        self,
        stream_url: str,
        output_path: str,
        recording_id: str,
        max_duration_seconds: int = 14400,
    ) -> subprocess.Popen:
        """
        Start recording HLS stream with FFmpeg.

        Args:
            stream_url: HLS stream URL to record
            output_path: Path where to save the recording
            recording_id: Unique recording identifier
            max_duration_seconds: Maximum recording duration

        Returns:
            FFmpeg process handle
        """
        return await start_recording_stream(
            stream_url, output_path, recording_id, max_duration_seconds
        )

    async def stop_recording(self, process: subprocess.Popen) -> None:
        """
        Gracefully stop FFmpeg recording.

        Args:
            process: FFmpeg process to stop
        """
        return await stop_recording(process)

    async def extract_thumbnail_from_video(
        self,
        video_path: str,
        output_path: str,
        timestamp_seconds: int = 30,
    ) -> str:
        """
        Extract thumbnail from video at specific timestamp.

        Args:
            video_path: Path to video file
            output_path: Path where to save thumbnail
            timestamp_seconds: Timestamp to extract frame from

        Returns:
            Path to the saved thumbnail
        """
        return await extract_thumbnail_from_video(
            video_path, output_path, timestamp_seconds
        )

    async def capture_screenshot(
        self,
        video_path: str,
        output_path: str,
        timestamp_seconds: int = 30,
        width: Optional[int] = 1280,
        quality: int = 2,
    ) -> str:
        """
        Extract screenshot from video at specific timestamp.

        Args:
            video_path: Path or URL to video file
            output_path: Path where to save screenshot
            timestamp_seconds: Timestamp to extract frame from
            width: Target width in pixels
            quality: JPEG quality level

        Returns:
            Path to the saved screenshot
        """
        return await capture_screenshot(
            video_path, output_path, timestamp_seconds, width, quality
        )

    async def download_video_from_url(
        self,
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
            timeout: Maximum time in seconds to wait
            copy_codecs: If True, copy codecs without re-encoding

        Returns:
            Path to the downloaded video file
        """
        return await download_video_from_url(url, output_path, timeout, copy_codecs)

    # ========== Conversion Methods ==========

    async def convert_video(
        self,
        input_path: str,
        output_path: str,
        video_codec: str = "libx264",
        audio_codec: str = "aac",
        preset: str = "fast",
        crf: int = 23,
        timeout: int = 3600,
    ) -> str:
        """
        Convert video to different format or codec.

        Args:
            input_path: Path to the input video file
            output_path: Path for the output video file
            video_codec: Video codec to use
            audio_codec: Audio codec to use
            preset: Encoding preset
            crf: Constant Rate Factor for quality
            timeout: Maximum time in seconds to wait

        Returns:
            Path to the converted video file
        """
        return await convert_video(
            input_path, output_path, video_codec, audio_codec, preset, crf, timeout
        )

    async def transcode_video(
        self,
        input_path: str,
        output_path: str,
        target_codec: str = "h264",
        target_resolution: Optional[str] = None,
        target_bitrate: Optional[str] = None,
        timeout: int = 7200,
    ) -> str:
        """
        Transcode video to specific codec and optionally resize/change bitrate.

        Args:
            input_path: Path to the input video file
            output_path: Path for the output video file
            target_codec: Target video codec
            target_resolution: Optional target resolution
            target_bitrate: Optional target bitrate
            timeout: Maximum time in seconds to wait

        Returns:
            Path to the transcoded video file
        """
        return await transcode_video(
            input_path,
            output_path,
            target_codec,
            target_resolution,
            target_bitrate,
            timeout,
        )

    async def compress_video(
        self,
        input_path: str,
        output_path: str,
        target_size_mb: Optional[int] = None,
        crf: int = 28,
        timeout: int = 7200,
    ) -> str:
        """
        Compress video to reduce file size.

        Args:
            input_path: Path to the input video file
            output_path: Path for the compressed video file
            target_size_mb: Optional target file size in MB
            crf: Constant Rate Factor
            timeout: Maximum time in seconds to wait

        Returns:
            Path to the compressed video file
        """
        return await compress_video(
            input_path, output_path, target_size_mb, crf, timeout
        )

    async def resize_video(
        self,
        input_path: str,
        output_path: str,
        width: int,
        height: int = -1,
        timeout: int = 3600,
    ) -> str:
        """
        Resize video to specified dimensions.

        Args:
            input_path: Path to the input video file
            output_path: Path for the resized video file
            width: Target width in pixels
            height: Target height in pixels (-1 to maintain aspect ratio)
            timeout: Maximum time in seconds to wait

        Returns:
            Path to the resized video file
        """
        return await resize_video(input_path, output_path, width, height, timeout)

    async def extract_audio(
        self,
        input_path: str,
        output_path: str,
        audio_codec: str = "aac",
        audio_bitrate: str = "192k",
        timeout: int = 1800,
    ) -> str:
        """
        Extract audio track from video file.

        Args:
            input_path: Path to the input video file
            output_path: Path for the audio file
            audio_codec: Audio codec
            audio_bitrate: Audio bitrate
            timeout: Maximum time in seconds to wait

        Returns:
            Path to the extracted audio file
        """
        return await extract_audio(
            input_path, output_path, audio_codec, audio_bitrate, timeout
        )

    async def convert_to_hls(
        self,
        input_path: str,
        output_dir: str,
        segment_duration: int = 10,
        playlist_name: str = "playlist.m3u8",
        timeout: int = 7200,
    ) -> Dict[str, Any]:
        """
        Convert video to HLS (HTTP Live Streaming) format.

        Args:
            input_path: Path to the input video file
            output_dir: Directory for HLS output files
            segment_duration: Duration of each segment in seconds
            playlist_name: Name of the HLS playlist file
            timeout: Maximum time in seconds to wait

        Returns:
            Dictionary with HLS output information
        """
        return await convert_to_hls(
            input_path, output_dir, segment_duration, playlist_name, timeout
        )

    # ========== Validation Methods ==========

    async def verify_ffmpeg_installation(self) -> Dict[str, Any]:
        """
        Verify that FFmpeg and ffprobe are installed and accessible.

        Returns:
            Dictionary containing installation status and versions
        """
        return await verify_ffmpeg_installation()

    def check_ffmpeg_installed(self) -> bool:
        """
        Check if FFmpeg is installed.

        Returns:
            True if FFmpeg is installed

        Raises:
            FFmpegNotInstalledError: If FFmpeg is not installed
        """
        return check_ffmpeg_installed()

    def check_ffprobe_installed(self) -> bool:
        """
        Check if ffprobe is installed.

        Returns:
            True if ffprobe is installed

        Raises:
            FFmpegNotInstalledError: If ffprobe is not installed
        """
        return check_ffprobe_installed()

    def validate_video_file(self, video_path: str) -> bool:
        """
        Validate that a video file exists and is accessible.

        Args:
            video_path: Path or URL to the video file

        Returns:
            True if the file is valid

        Raises:
            InvalidVideoFileError: If the file is invalid
        """
        return validate_video_file(video_path)

    def validate_codec_support(self, codec: str) -> Dict[str, Any]:
        """
        Validate that FFmpeg supports a specific codec.

        Args:
            codec: Codec name to validate

        Returns:
            Dictionary with codec support information
        """
        return validate_codec_support(codec)


# Singleton instance for backward compatibility
ffmpeg_service = FFmpegService()
