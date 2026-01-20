"""
Bayit Voice Pipeline
ElevenLabs TTS/STT/SFX integration with configurable services.
"""

from bayit_voice.config import SimpleVoiceConfig, VoiceConfig
from bayit_voice.sfx import ElevenLabsSFXService
from bayit_voice.stt import ElevenLabsRealtimeService
from bayit_voice.tts import ElevenLabsTTSStreamingService

__version__ = "0.1.0"

__all__ = [
    "VoiceConfig",
    "SimpleVoiceConfig",
    "ElevenLabsTTSStreamingService",
    "ElevenLabsRealtimeService",
    "ElevenLabsSFXService",
]
