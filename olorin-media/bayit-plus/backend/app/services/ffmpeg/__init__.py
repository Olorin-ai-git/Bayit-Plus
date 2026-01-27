"""
FFmpeg Service Package

This package provides a modular FFmpeg service for video analysis, subtitle extraction,
stream recording, and video conversion.

All imports from the original `app.services.ffmpeg_service` module are preserved for
backward compatibility.

Usage:
    # Import the singleton instance (most common usage)
    from app.services.ffmpeg_service import ffmpeg_service

    # Import the class for custom instantiation
    from app.services.ffmpeg_service import FFmpegService

    # Or import from this package directly
    from app.services.ffmpeg import ffmpeg_service, FFmpegService

Modules:
    - constants: Language codes, codec definitions, and configuration constants
    - validation: Input validation and FFmpeg installation verification
    - video_analysis: Video file analysis using ffprobe
    - subtitle_operations: Subtitle extraction, embedding, and conversion
    - stream_recording: Stream recording and video downloads
    - conversion: Video conversion, encoding, and transcoding
    - service: Main FFmpegService class that coordinates all modules
"""

# Re-export constants and utilities
from app.services.ffmpeg.constants import (BITMAP_SUBTITLE_CODECS,
                                           LANGUAGE_CODE_MAP,
                                           PRIORITY_LANGUAGES,
                                           TEXT_BASED_SUBTITLE_CODECS,
                                           is_text_based_subtitle,
                                           normalize_language_code)
# Re-export conversion functions and exceptions
from app.services.ffmpeg.conversion import (VideoConversionError,
                                            VideoConversionTimeoutError,
                                            compress_video, convert_to_hls,
                                            convert_video, extract_audio,
                                            resize_video, transcode_video)
# Re-export main service class and singleton
from app.services.ffmpeg.service import FFmpegService, ffmpeg_service
# Re-export stream recording functions and exceptions
from app.services.ffmpeg.stream_recording import (StreamRecordingError,
                                                  StreamRecordingTimeoutError,
                                                  capture_screenshot,
                                                  download_video_from_url,
                                                  extract_thumbnail_from_video,
                                                  start_recording_stream,
                                                  stop_recording)
# Re-export subtitle operations functions and exceptions
from app.services.ffmpeg.subtitle_operations import (
    SubtitleExtractionError, SubtitleExtractionTimeoutError, burn_subtitles,
    convert_subtitles, embed_subtitles, extract_all_subtitles,
    extract_subtitle_track, generate_srt_from_vtt)
# Re-export validation functions and exceptions
from app.services.ffmpeg.validation import (FFmpegNotInstalledError,
                                            FFmpegValidationError,
                                            InvalidVideoFileError,
                                            check_ffmpeg_installed,
                                            check_ffprobe_installed,
                                            validate_codec_support,
                                            validate_video_file,
                                            verify_ffmpeg_installation)
# Re-export video analysis functions and exceptions
from app.services.ffmpeg.video_analysis import (VideoAnalysisError,
                                                VideoAnalysisTimeoutError,
                                                analyze_video,
                                                analyze_video_quality,
                                                detect_codec, get_bitrate,
                                                get_resolution,
                                                get_video_duration,
                                                get_video_info)
# Re-export realtime transcode functions and exceptions
from app.services.ffmpeg.realtime_transcode import (
    RealtimeTranscodeError,
    check_transcode_requirements,
    needs_audio_transcode,
    needs_transcode_by_extension,
    needs_video_transcode,
    stream_transcode,
)

__all__ = [
    # Main service
    "FFmpegService",
    "ffmpeg_service",
    # Constants
    "LANGUAGE_CODE_MAP",
    "TEXT_BASED_SUBTITLE_CODECS",
    "BITMAP_SUBTITLE_CODECS",
    "PRIORITY_LANGUAGES",
    "normalize_language_code",
    "is_text_based_subtitle",
    # Validation
    "FFmpegValidationError",
    "FFmpegNotInstalledError",
    "InvalidVideoFileError",
    "verify_ffmpeg_installation",
    "check_ffmpeg_installed",
    "check_ffprobe_installed",
    "validate_video_file",
    "validate_codec_support",
    # Video Analysis
    "VideoAnalysisError",
    "VideoAnalysisTimeoutError",
    "analyze_video",
    "get_video_info",
    "get_video_duration",
    "detect_codec",
    "get_resolution",
    "get_bitrate",
    "analyze_video_quality",
    # Subtitle Operations
    "SubtitleExtractionError",
    "SubtitleExtractionTimeoutError",
    "extract_subtitle_track",
    "extract_all_subtitles",
    "embed_subtitles",
    "convert_subtitles",
    "burn_subtitles",
    "generate_srt_from_vtt",
    # Stream Recording
    "StreamRecordingError",
    "StreamRecordingTimeoutError",
    "start_recording_stream",
    "stop_recording",
    "download_video_from_url",
    "capture_screenshot",
    "extract_thumbnail_from_video",
    # Conversion
    "VideoConversionError",
    "VideoConversionTimeoutError",
    "convert_video",
    "transcode_video",
    "compress_video",
    "resize_video",
    "extract_audio",
    "convert_to_hls",
    # Realtime Transcode
    "RealtimeTranscodeError",
    "check_transcode_requirements",
    "needs_audio_transcode",
    "needs_transcode_by_extension",
    "needs_video_transcode",
    "stream_transcode",
]
