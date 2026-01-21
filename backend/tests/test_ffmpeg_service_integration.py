"""
Integration Tests for FFmpeg Service

Tests the FFmpegService functionality including video analysis,
subtitle operations, and stream recording capabilities.
Uses real FFmpeg/FFprobe operations on test files.
"""

import asyncio
import os
import subprocess
import tempfile
from pathlib import Path
from typing import Optional

import pytest
import pytest_asyncio

from app.core.config import settings


def check_ffmpeg_available() -> bool:
    """Check if FFmpeg is available on the system."""
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


def check_ffprobe_available() -> bool:
    """Check if FFprobe is available on the system."""
    try:
        result = subprocess.run(
            ["ffprobe", "-version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except (subprocess.SubprocessError, FileNotFoundError):
        return False


FFMPEG_AVAILABLE = check_ffmpeg_available()
FFPROBE_AVAILABLE = check_ffprobe_available()


def create_test_video_file(output_path: str, duration: int = 5) -> bool:
    """
    Create a real test video file using FFmpeg.

    Args:
        output_path: Path where to save the video
        duration: Duration in seconds

    Returns:
        True if video was created successfully
    """
    if not FFMPEG_AVAILABLE:
        return False

    try:
        # Create a simple test video with color bars and audio
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i", f"testsrc=duration={duration}:size=640x480:rate=24",
            "-f", "lavfi",
            "-i", f"sine=frequency=440:duration={duration}",
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-c:a", "aac",
            "-b:a", "128k",
            "-pix_fmt", "yuv420p",
            output_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )

        return result.returncode == 0 and os.path.exists(output_path)

    except subprocess.SubprocessError:
        return False


def create_test_video_with_subtitles(
    video_path: str,
    subtitle_path: str,
    duration: int = 5,
) -> bool:
    """
    Create a test video with embedded SRT subtitles.

    Args:
        video_path: Path where to save the video
        subtitle_path: Path to the SRT subtitle file
        duration: Duration in seconds

    Returns:
        True if video was created successfully
    """
    if not FFMPEG_AVAILABLE:
        return False

    try:
        # First create SRT subtitle file
        with open(subtitle_path, "w", encoding="utf-8") as f:
            f.write("1\n")
            f.write("00:00:01,000 --> 00:00:03,000\n")
            f.write("Hello, this is a test subtitle.\n")
            f.write("\n")
            f.write("2\n")
            f.write("00:00:03,500 --> 00:00:05,000\n")
            f.write("Second subtitle line here.\n")

        # Create video with embedded subtitle
        cmd = [
            "ffmpeg",
            "-y",
            "-f", "lavfi",
            "-i", f"testsrc=duration={duration}:size=640x480:rate=24",
            "-f", "lavfi",
            "-i", f"sine=frequency=440:duration={duration}",
            "-i", subtitle_path,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-c:a", "aac",
            "-c:s", "mov_text",
            "-metadata:s:s:0", "language=eng",
            "-pix_fmt", "yuv420p",
            video_path,
        ]

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
        )

        return result.returncode == 0 and os.path.exists(video_path)

    except subprocess.SubprocessError:
        return False


class TestFFmpegServiceVideoAnalysis:
    """Tests for video analysis functionality."""

    @pytest.fixture
    def temp_video_path(self):
        """Create a temporary video file for testing."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            video_path = f.name

        if FFMPEG_AVAILABLE:
            created = create_test_video_file(video_path)
            if created:
                yield video_path
                if os.path.exists(video_path):
                    os.unlink(video_path)
                return

        pytest.skip("FFmpeg not available - cannot create test video")

    @pytest.mark.skipif(not FFPROBE_AVAILABLE, reason="FFprobe not available")
    @pytest.mark.asyncio
    async def test_get_video_info(self, temp_video_path):
        """Test extracting video metadata."""
        from app.services.ffmpeg import ffmpeg_service

        info = await ffmpeg_service.get_video_info(temp_video_path)

        assert info is not None
        assert "duration" in info
        assert "width" in info or "resolution" in info
        assert "codec" in info or "video_codec" in info
        assert info.get("duration", 0) > 0

    @pytest.mark.skipif(not FFPROBE_AVAILABLE, reason="FFprobe not available")
    @pytest.mark.asyncio
    async def test_analyze_video(self, temp_video_path):
        """Test comprehensive video analysis."""
        from app.services.ffmpeg import ffmpeg_service

        analysis = await ffmpeg_service.analyze_video(temp_video_path)

        assert analysis is not None
        assert "duration" in analysis
        assert analysis["duration"] > 0

    @pytest.mark.skipif(not FFPROBE_AVAILABLE, reason="FFprobe not available")
    def test_get_video_duration(self, temp_video_path):
        """Test getting video duration."""
        from app.services.ffmpeg import get_video_duration

        duration = get_video_duration(temp_video_path)

        assert duration > 0
        assert duration <= 10  # Our test video is 5 seconds

    @pytest.mark.skipif(not FFPROBE_AVAILABLE, reason="FFprobe not available")
    def test_detect_codec(self, temp_video_path):
        """Test detecting video and audio codecs."""
        from app.services.ffmpeg import detect_codec

        codecs = detect_codec(temp_video_path)

        assert codecs is not None
        assert "video_codec" in codecs
        assert "audio_codec" in codecs
        assert codecs["video_codec"] in ["h264", "libx264", "H.264"]

    @pytest.mark.skipif(not FFPROBE_AVAILABLE, reason="FFprobe not available")
    def test_get_resolution(self, temp_video_path):
        """Test getting video resolution."""
        from app.services.ffmpeg import get_resolution

        resolution = get_resolution(temp_video_path)

        assert resolution is not None
        assert "width" in resolution
        assert "height" in resolution
        assert resolution["width"] == 640
        assert resolution["height"] == 480

    @pytest.mark.skipif(not FFPROBE_AVAILABLE, reason="FFprobe not available")
    def test_get_bitrate(self, temp_video_path):
        """Test getting video bitrate."""
        from app.services.ffmpeg import get_bitrate

        bitrate = get_bitrate(temp_video_path)

        assert bitrate > 0

    @pytest.mark.skipif(not FFPROBE_AVAILABLE, reason="FFprobe not available")
    def test_analyze_video_quality(self, temp_video_path):
        """Test video quality analysis."""
        from app.services.ffmpeg import analyze_video_quality

        quality = analyze_video_quality(temp_video_path)

        assert quality is not None


class TestFFmpegServiceValidation:
    """Tests for FFmpeg validation functionality."""

    @pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not available")
    def test_verify_ffmpeg_installation(self):
        """Test FFmpeg installation verification."""
        from app.services.ffmpeg import verify_ffmpeg_installation

        # Should not raise an exception
        verify_ffmpeg_installation()

    @pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not available")
    def test_check_ffmpeg_installed(self):
        """Test FFmpeg installed check."""
        from app.services.ffmpeg import check_ffmpeg_installed

        assert check_ffmpeg_installed() is True

    @pytest.mark.skipif(not FFPROBE_AVAILABLE, reason="FFprobe not available")
    def test_check_ffprobe_installed(self):
        """Test FFprobe installed check."""
        from app.services.ffmpeg import check_ffprobe_installed

        assert check_ffprobe_installed() is True

    @pytest.mark.skipif(not FFPROBE_AVAILABLE, reason="FFprobe not available")
    def test_validate_video_file_valid(self):
        """Test validating a valid video file."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            video_path = f.name

        try:
            if create_test_video_file(video_path):
                from app.services.ffmpeg import validate_video_file

                # Should not raise an exception
                validate_video_file(video_path)
        finally:
            if os.path.exists(video_path):
                os.unlink(video_path)

    def test_validate_video_file_not_found(self):
        """Test validating a non-existent file."""
        from app.services.ffmpeg import InvalidVideoFileError, validate_video_file

        with pytest.raises((InvalidVideoFileError, FileNotFoundError, Exception)):
            validate_video_file("/nonexistent/path/video.mp4")


class TestFFmpegServiceConversion:
    """Tests for video conversion functionality."""

    @pytest.fixture
    def temp_video_path(self):
        """Create a temporary video file for testing."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            video_path = f.name

        if FFMPEG_AVAILABLE:
            created = create_test_video_file(video_path, duration=3)
            if created:
                yield video_path
                if os.path.exists(video_path):
                    os.unlink(video_path)
                return

        pytest.skip("FFmpeg not available - cannot create test video")

    @pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not available")
    @pytest.mark.asyncio
    async def test_extract_audio(self, temp_video_path):
        """Test extracting audio from video."""
        from app.services.ffmpeg import extract_audio

        # Use .m4a extension for aac codec (default codec)
        with tempfile.NamedTemporaryFile(suffix=".m4a", delete=False) as f:
            output_path = f.name

        try:
            result = await extract_audio(temp_video_path, output_path)

            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    @pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not available")
    @pytest.mark.asyncio
    async def test_extract_audio_mp3(self, temp_video_path):
        """Test extracting audio from video as MP3."""
        from app.services.ffmpeg import extract_audio

        with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f:
            output_path = f.name

        try:
            # Use libmp3lame codec for mp3 output
            result = await extract_audio(
                temp_video_path,
                output_path,
                audio_codec="libmp3lame",
                audio_bitrate="192k",
            )

            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    @pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not available")
    @pytest.mark.asyncio
    async def test_extract_thumbnail_from_video(self, temp_video_path):
        """Test extracting thumbnail from video."""
        from app.services.ffmpeg import extract_thumbnail_from_video

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            output_path = f.name

        try:
            # Use timestamp_seconds as integer (function signature requirement)
            result = await extract_thumbnail_from_video(
                temp_video_path,
                output_path,
                timestamp_seconds=1,
            )

            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)


class TestFFmpegServiceConstants:
    """Tests for FFmpeg service constants and utilities."""

    def test_normalize_language_code_two_letter(self):
        """Test normalizing 2-letter language codes."""
        from app.services.ffmpeg import normalize_language_code

        assert normalize_language_code("en") == "en"
        assert normalize_language_code("he") == "he"
        assert normalize_language_code("es") == "es"

    def test_normalize_language_code_three_letter(self):
        """Test normalizing 3-letter language codes to 2-letter."""
        from app.services.ffmpeg import normalize_language_code

        assert normalize_language_code("eng") == "en"
        assert normalize_language_code("heb") == "he"
        assert normalize_language_code("spa") == "es"

    def test_is_text_based_subtitle(self):
        """Test identifying text-based subtitle codecs."""
        from app.services.ffmpeg import is_text_based_subtitle

        # Text-based codecs
        assert is_text_based_subtitle("subrip") is True
        assert is_text_based_subtitle("srt") is True
        assert is_text_based_subtitle("webvtt") is True
        assert is_text_based_subtitle("ass") is True

        # Bitmap-based codecs
        assert is_text_based_subtitle("dvd_subtitle") is False
        assert is_text_based_subtitle("hdmv_pgs_subtitle") is False

    def test_language_code_map_structure(self):
        """Test that language code map has expected entries."""
        from app.services.ffmpeg import LANGUAGE_CODE_MAP

        assert isinstance(LANGUAGE_CODE_MAP, dict)
        assert len(LANGUAGE_CODE_MAP) > 0

        # Check some common mappings
        assert LANGUAGE_CODE_MAP.get("eng") == "en"
        assert LANGUAGE_CODE_MAP.get("heb") == "he"


class TestFFmpegServiceInstance:
    """Tests for the FFmpegService class instance."""

    def test_ffmpeg_service_singleton_exists(self):
        """Test that ffmpeg_service singleton is available."""
        from app.services.ffmpeg import ffmpeg_service

        assert ffmpeg_service is not None

    def test_ffmpeg_service_has_temp_dir(self):
        """Test that FFmpegService has temp directory configured."""
        from app.services.ffmpeg import FFmpegService

        service = FFmpegService()

        assert hasattr(service, "temp_dir")
        assert service.temp_dir is not None

    def test_ffmpeg_service_methods_exist(self):
        """Test that FFmpegService has all required methods."""
        from app.services.ffmpeg import FFmpegService

        service = FFmpegService()

        # Video analysis methods
        assert hasattr(service, "analyze_video")
        assert hasattr(service, "get_video_info")
        assert hasattr(service, "get_video_duration")
        assert hasattr(service, "detect_codec")
        assert hasattr(service, "get_resolution")
        assert hasattr(service, "get_bitrate")

        # Subtitle methods
        assert hasattr(service, "extract_subtitle_track")
        assert hasattr(service, "extract_all_subtitles")

        # Utility methods
        assert hasattr(service, "normalize_language_code")


class TestFFmpegServiceErrorHandling:
    """Tests for error handling in FFmpeg service."""

    @pytest.mark.asyncio
    async def test_analyze_video_nonexistent_file(self):
        """Test error handling for non-existent video file."""
        from app.services.ffmpeg import ffmpeg_service

        with pytest.raises(Exception):
            await ffmpeg_service.analyze_video("/nonexistent/path/video.mp4")

    @pytest.mark.asyncio
    async def test_get_video_info_invalid_file(self):
        """Test error handling for invalid video file."""
        from app.services.ffmpeg import ffmpeg_service

        # Create an empty file that is not a valid video
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            invalid_path = f.name
            f.write(b"not a video file")

        try:
            with pytest.raises(Exception):
                await ffmpeg_service.get_video_info(invalid_path)
        finally:
            os.unlink(invalid_path)

    def test_get_video_duration_timeout(self):
        """Test that timeout is respected for video duration."""
        from app.services.ffmpeg import get_video_duration

        # Non-existent file should fail quickly
        with pytest.raises(Exception):
            get_video_duration("/nonexistent/path/video.mp4", timeout=1)


class TestFFmpegConversionFunctions:
    """Tests for standalone conversion functions."""

    @pytest.fixture
    def temp_video_path(self):
        """Create a temporary video file for testing."""
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            video_path = f.name

        if FFMPEG_AVAILABLE:
            created = create_test_video_file(video_path, duration=2)
            if created:
                yield video_path
                if os.path.exists(video_path):
                    os.unlink(video_path)
                return

        pytest.skip("FFmpeg not available - cannot create test video")

    @pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not available")
    @pytest.mark.asyncio
    async def test_convert_video(self, temp_video_path):
        """Test video format conversion."""
        from app.services.ffmpeg import convert_video

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            output_path = f.name

        try:
            result = await convert_video(
                temp_video_path,
                output_path,
                video_codec="libx264",
                audio_codec="aac",
                preset="ultrafast",
                crf=28,
            )

            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    @pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not available")
    @pytest.mark.asyncio
    async def test_resize_video(self, temp_video_path):
        """Test video resizing."""
        from app.services.ffmpeg import resize_video

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            output_path = f.name

        try:
            result = await resize_video(
                temp_video_path,
                output_path,
                width=320,
                height=-1,  # Maintain aspect ratio
            )

            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0

            # Verify the new resolution
            from app.services.ffmpeg import get_resolution

            resolution = get_resolution(output_path)
            assert resolution["width"] == 320
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)

    @pytest.mark.skipif(not FFMPEG_AVAILABLE, reason="FFmpeg not available")
    @pytest.mark.asyncio
    async def test_capture_screenshot(self, temp_video_path):
        """Test screenshot capture from video."""
        from app.services.ffmpeg import capture_screenshot

        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as f:
            output_path = f.name

        try:
            result = await capture_screenshot(
                temp_video_path,
                output_path,
                timestamp_seconds=1,
                width=640,
                quality=5,
            )

            assert os.path.exists(output_path)
            assert os.path.getsize(output_path) > 0
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)


class TestFFmpegStreamRecording:
    """Tests for stream recording functionality."""

    def test_stream_recording_error_classes_exist(self):
        """Test that stream recording error classes are defined."""
        from app.services.ffmpeg import (
            StreamRecordingError,
            StreamRecordingTimeoutError,
        )

        assert StreamRecordingError is not None
        assert StreamRecordingTimeoutError is not None
        assert issubclass(StreamRecordingTimeoutError, StreamRecordingError)

    def test_stream_recording_functions_importable(self):
        """Test that stream recording functions are importable."""
        from app.services.ffmpeg import (
            capture_screenshot,
            download_video_from_url,
            extract_thumbnail_from_video,
            start_recording_stream,
            stop_recording,
        )

        assert start_recording_stream is not None
        assert stop_recording is not None
        assert download_video_from_url is not None
        assert capture_screenshot is not None
        assert extract_thumbnail_from_video is not None


class TestFFmpegSubtitleOperations:
    """Tests for subtitle extraction and conversion."""

    def test_subtitle_error_classes_exist(self):
        """Test that subtitle error classes are defined."""
        from app.services.ffmpeg import (
            SubtitleExtractionError,
            SubtitleExtractionTimeoutError,
        )

        assert SubtitleExtractionError is not None
        assert SubtitleExtractionTimeoutError is not None
        assert issubclass(SubtitleExtractionTimeoutError, SubtitleExtractionError)

    def test_subtitle_functions_importable(self):
        """Test that subtitle functions are importable."""
        from app.services.ffmpeg import (
            burn_subtitles,
            convert_subtitles,
            embed_subtitles,
            extract_all_subtitles,
            extract_subtitle_track,
            generate_srt_from_vtt,
        )

        assert extract_subtitle_track is not None
        assert extract_all_subtitles is not None
        assert embed_subtitles is not None
        assert convert_subtitles is not None
        assert burn_subtitles is not None
        assert generate_srt_from_vtt is not None


class TestFFmpegVideoConversionErrors:
    """Tests for video conversion error handling."""

    def test_video_conversion_error_classes_exist(self):
        """Test that video conversion error classes are defined."""
        from app.services.ffmpeg import (
            VideoConversionError,
            VideoConversionTimeoutError,
        )

        assert VideoConversionError is not None
        assert VideoConversionTimeoutError is not None
        assert issubclass(VideoConversionTimeoutError, VideoConversionError)

    @pytest.mark.asyncio
    async def test_convert_video_nonexistent_input(self):
        """Test error handling for non-existent input file."""
        from app.services.ffmpeg import VideoConversionError, convert_video

        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as f:
            output_path = f.name

        try:
            with pytest.raises((VideoConversionError, Exception)):
                await convert_video(
                    "/nonexistent/path/video.mp4",
                    output_path,
                )
        finally:
            if os.path.exists(output_path):
                os.unlink(output_path)
