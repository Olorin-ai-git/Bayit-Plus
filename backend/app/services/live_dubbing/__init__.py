"""
Live Dubbing Service Module

Real-time audio dubbing pipeline for live channels:
Audio → STT → Translation → TTS

Includes:
- FFmpeg security hardening and input validation
- StreamAudioCapture for backend-side HLS audio extraction
- ChannelSTTManager for shared STT per channel (99% cost reduction)
- Redis session store for distributed sessions
- Rate limiting and quota management
"""

from app.services.live_dubbing.ffmpeg_validator import FFmpegInputValidator
from app.services.live_dubbing.stream_audio_capture import (
    StreamAudioCapture,
    StreamAudioCaptureError,
)
from app.services.live_dubbing.channel_stt_manager import (
    ChannelSTTManager,
    TranscriptMessage,
    get_channel_stt_manager,
    cleanup_channel_manager,
    get_channel_manager_stats,
)

__all__ = [
    "FFmpegInputValidator",
    "StreamAudioCapture",
    "StreamAudioCaptureError",
    "ChannelSTTManager",
    "TranscriptMessage",
    "get_channel_stt_manager",
    "cleanup_channel_manager",
    "get_channel_manager_stats",
]
