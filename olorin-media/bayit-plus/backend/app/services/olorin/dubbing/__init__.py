"""
Realtime Dubbing Service Package

Provides real-time audio dubbing from Hebrew to English/Spanish.
Target latency: <2 seconds from speech end to dubbed audio start.

Pipeline:
  Audio Stream → ElevenLabs STT (~150ms) → Translation → ElevenLabs TTS (~300ms) → Dubbed Audio

Includes:
  P0: Security (message size limits, auth, bounded queues, concurrency, idle timeout, validation)
  P1: Scalability (TTS pool, Redis sessions, circuit breakers, PII detection, GDPR)
  P2: Performance (parallel translation, percentiles, Prometheus, caching, compression, quality)
  P3: Enhancements (voice training, voice settings, accent selection, SSE fallback, adaptive VAD)
"""

from app.services.olorin.dubbing.models import DubbingMessage, DubbingMetrics
from app.services.olorin.dubbing.service import RealtimeDubbingService

__all__ = ["RealtimeDubbingService", "DubbingMessage", "DubbingMetrics"]
