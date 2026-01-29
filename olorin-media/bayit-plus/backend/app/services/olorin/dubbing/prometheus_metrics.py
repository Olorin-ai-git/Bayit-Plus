"""
Prometheus Metrics for Dubbing Pipeline (P2-3)

Defines counters, gauges, and histograms for real-time dubbing monitoring.
"""

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

try:
    from prometheus_client import Counter, Gauge, Histogram

    PROMETHEUS_AVAILABLE = True
except ImportError:
    PROMETHEUS_AVAILABLE = False
    logger.warning("prometheus_client not available for dubbing metrics")

# Only define metrics if Prometheus is available
if PROMETHEUS_AVAILABLE:
    # Session lifecycle
    dubbing_sessions_total = Counter(
        "bayit_dubbing_sessions_total",
        "Total dubbing sessions started",
        ["partner_id", "status"],
    )

    dubbing_active_sessions = Gauge(
        "bayit_dubbing_active_sessions",
        "Currently active dubbing sessions",
    )

    # Latency histograms
    dubbing_stt_latency_ms = Histogram(
        "bayit_dubbing_stt_latency_ms",
        "STT processing latency in milliseconds",
        buckets=[50, 100, 150, 200, 300, 500, 750, 1000, 1500, 2000],
    )

    dubbing_translation_latency_ms = Histogram(
        "bayit_dubbing_translation_latency_ms",
        "Translation processing latency in milliseconds",
        buckets=[50, 100, 200, 300, 500, 750, 1000, 1500, 2000],
    )

    dubbing_tts_latency_ms = Histogram(
        "bayit_dubbing_tts_latency_ms",
        "TTS generation latency in milliseconds",
        buckets=[100, 200, 300, 500, 750, 1000, 1500, 2000],
    )

    dubbing_total_latency_ms = Histogram(
        "bayit_dubbing_total_latency_ms",
        "Total end-to-end dubbing latency in milliseconds",
        buckets=[200, 500, 750, 1000, 1500, 2000, 3000, 5000],
    )

    # Error tracking
    dubbing_errors_total = Counter(
        "bayit_dubbing_errors_total",
        "Total dubbing errors",
        ["error_type"],
    )

    # Queue depth
    dubbing_queue_depth = Gauge(
        "bayit_dubbing_queue_depth",
        "Current output queue depth",
    )

    # Cache metrics
    dubbing_translation_cache_hits = Counter(
        "bayit_dubbing_translation_cache_hits_total",
        "Translation cache hits",
    )

    dubbing_translation_cache_misses = Counter(
        "bayit_dubbing_translation_cache_misses_total",
        "Translation cache misses",
    )

    # Audio quality
    dubbing_audio_chunks_total = Counter(
        "bayit_dubbing_audio_chunks_total",
        "Total audio chunks processed",
    )

    dubbing_audio_quality_warnings = Counter(
        "bayit_dubbing_audio_quality_warnings_total",
        "Audio quality warnings",
        ["warning_type"],
    )


def record_session_started(partner_id: str) -> None:
    """Record a new dubbing session started."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_sessions_total.labels(
        partner_id=partner_id, status="started"
    ).inc()
    dubbing_active_sessions.inc()


def record_session_ended(
    partner_id: str, status: str = "ended"
) -> None:
    """Record a dubbing session ended."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_sessions_total.labels(
        partner_id=partner_id, status=status
    ).inc()
    dubbing_active_sessions.dec()


def record_stt_latency(latency_ms: float) -> None:
    """Record STT processing latency."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_stt_latency_ms.observe(latency_ms)


def record_translation_latency(latency_ms: float) -> None:
    """Record translation processing latency."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_translation_latency_ms.observe(latency_ms)


def record_tts_latency(latency_ms: float) -> None:
    """Record TTS generation latency."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_tts_latency_ms.observe(latency_ms)


def record_total_latency(latency_ms: float) -> None:
    """Record total end-to-end dubbing latency."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_total_latency_ms.observe(latency_ms)


def record_error(error_type: str) -> None:
    """Record a dubbing error."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_errors_total.labels(error_type=error_type).inc()


def record_queue_depth(depth: int) -> None:
    """Update current output queue depth gauge."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_queue_depth.set(depth)


def record_cache_hit() -> None:
    """Record translation cache hit."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_translation_cache_hits.inc()


def record_cache_miss() -> None:
    """Record translation cache miss."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_translation_cache_misses.inc()


def record_audio_chunk() -> None:
    """Record an audio chunk processed."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_audio_chunks_total.inc()


def record_audio_quality_warning(warning_type: str) -> None:
    """Record an audio quality warning."""
    if not PROMETHEUS_AVAILABLE:
        return
    dubbing_audio_quality_warnings.labels(
        warning_type=warning_type
    ).inc()
