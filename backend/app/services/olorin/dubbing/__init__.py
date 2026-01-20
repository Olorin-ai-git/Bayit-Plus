"""
Realtime Dubbing Service Package

Provides real-time audio dubbing from Hebrew to English/Spanish.
Target latency: <2 seconds from speech end to dubbed audio start.

Pipeline:
  Audio Stream → ElevenLabs STT (~150ms) → Translation → ElevenLabs TTS (~300ms) → Dubbed Audio
"""

from app.services.olorin.dubbing.models import DubbingMessage, DubbingMetrics
from app.services.olorin.dubbing.service import RealtimeDubbingService

__all__ = ["RealtimeDubbingService", "DubbingMessage", "DubbingMetrics"]
