"""
Live Dubbing Service Module

Real-time audio dubbing pipeline for live channels:
Audio → STT → Translation → TTS

Includes:
- FFmpeg security hardening and input validation
- ChannelSTTManager for shared STT per channel
- Redis session store for distributed sessions
- Rate limiting and quota management
"""

from app.services.live_dubbing.ffmpeg_validator import FFmpegInputValidator

__all__ = [
    "FFmpegInputValidator",
]
