"""
FFmpeg service for video analysis and subtitle extraction.

This module is maintained for backward compatibility. All functionality has been
refactored into the modular `app.services.ffmpeg` package.

For new code, prefer importing directly from the package:
    from app.services.ffmpeg import FFmpegService, ffmpeg_service

This file re-exports all public symbols from the new package structure to ensure
existing imports continue to work.
"""

# Re-export all public symbols for full backward compatibility
# Re-export main service class and singleton instance
from app.services.ffmpeg import (  # Constants; Validation; Video Analysis; Subtitle Operations; Stream Recording; Conversion
    BITMAP_SUBTITLE_CODECS, LANGUAGE_CODE_MAP, PRIORITY_LANGUAGES,
    TEXT_BASED_SUBTITLE_CODECS, FFmpegNotInstalledError, FFmpegService,
    FFmpegValidationError, InvalidVideoFileError, StreamRecordingError,
    StreamRecordingTimeoutError, SubtitleExtractionError,
    SubtitleExtractionTimeoutError, VideoAnalysisError,
    VideoAnalysisTimeoutError, VideoConversionError,
    VideoConversionTimeoutError, analyze_video, analyze_video_quality,
    burn_subtitles, capture_screenshot, check_ffmpeg_installed,
    check_ffprobe_installed, compress_video, convert_subtitles, convert_to_hls,
    convert_video, detect_codec, download_video_from_url, embed_subtitles,
    extract_all_subtitles, extract_audio, extract_subtitle_track,
    extract_thumbnail_from_video, ffmpeg_service, generate_srt_from_vtt,
    get_bitrate, get_resolution, get_video_duration, get_video_info,
    is_text_based_subtitle, normalize_language_code, resize_video,
    start_recording_stream, stop_recording, transcode_video,
    validate_codec_support, validate_video_file, verify_ffmpeg_installation)

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
]
