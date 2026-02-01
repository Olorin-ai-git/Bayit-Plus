"""
Continuous Flow Buffer Manager

Maintains dubbed audio runway to ensure zero interruptions after initial buffer.
Adapts quality based on buffer health: healthy → warning → critical.
"""

import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional

from app.core.config import settings

logger = logging.getLogger(__name__)


class BufferHealth(str, Enum):
    """Buffer health states for quality adaptation."""

    HEALTHY = "healthy"  # 8-10+ seconds ahead
    WARNING = "warning"  # 5-8 seconds ahead
    CRITICAL = "critical"  # 3-5 seconds ahead
    EMERGENCY = "emergency"  # <3 seconds ahead (should never happen)


@dataclass
class QualitySettings:
    """Quality settings adapted based on buffer health."""

    translation_provider: str  # "claude" (quality) or "google" (speed)
    tts_speaker_boost: bool  # True for clarity, False for speed
    tts_stability: float  # 0.0-1.0, lower = faster generation


def get_buffer_thresholds() -> dict[str, int]:
    """Get buffer thresholds from configuration."""
    config = settings.olorin.dubbing
    return {
        "initial": config.initial_buffer_seconds,
        "min": config.min_buffer_seconds,
        "healthy": config.healthy_buffer_seconds,
        "critical": config.critical_buffer_seconds,
    }


class BufferManager:
    """
    Maintains continuous dubbed audio flow.

    Key invariant: Processing always stays 5-10 seconds ahead of playback.
    The buffer never depletes after initial fill.
    """

    def __init__(self, session_id: str):
        """Initialize buffer manager for a dubbing session."""
        self.session_id = session_id

        # Get thresholds from config
        config = settings.olorin.dubbing
        self._initial_buffer_sec = config.initial_buffer_seconds
        self._min_buffer_sec = config.min_buffer_seconds
        self._healthy_buffer_sec = config.healthy_buffer_seconds
        self._critical_buffer_sec = config.critical_buffer_seconds

        # Timestamp tracking
        self._current_playback_time_ms: int = 0
        self._latest_processed_time_ms: int = 0
        self._playback_started: bool = False

        # Quality settings cache
        self._current_quality: Optional[QualitySettings] = None
        self._last_health: Optional[BufferHealth] = None

        logger.info(
            f"BufferManager initialized: session={session_id}, "
            f"initial={self._initial_buffer_sec}s, min={self._min_buffer_sec}s, "
            f"healthy={self._healthy_buffer_sec}s, critical={self._critical_buffer_sec}s"
        )

    @property
    def buffer_ahead_seconds(self) -> float:
        """How far ahead processing is from playback (in seconds)."""
        return (self._latest_processed_time_ms - self._current_playback_time_ms) / 1000

    @property
    def buffer_health(self) -> BufferHealth:
        """Current buffer state for quality decisions."""
        ahead = self.buffer_ahead_seconds
        if ahead >= self._healthy_buffer_sec:
            return BufferHealth.HEALTHY
        if ahead >= self._min_buffer_sec:
            return BufferHealth.WARNING
        if ahead >= self._critical_buffer_sec:
            return BufferHealth.CRITICAL
        return BufferHealth.EMERGENCY

    @property
    def playback_started(self) -> bool:
        """Whether playback has started (initial buffer filled)."""
        return self._playback_started

    def update_playback_position(self, video_time_ms: int) -> None:
        """
        Update current playback position from client sync_status.

        Args:
            video_time_ms: Current video playback position in milliseconds
        """
        self._current_playback_time_ms = video_time_ms

        # Check if initial buffer is ready to start playback
        if not self._playback_started:
            if self.buffer_ahead_seconds >= self._initial_buffer_sec:
                self._playback_started = True
                logger.info(
                    f"Playback starting: session={self.session_id}, "
                    f"buffer_ahead={self.buffer_ahead_seconds:.1f}s"
                )

        # Log health state changes
        current_health = self.buffer_health
        if current_health != self._last_health:
            logger.info(
                f"Buffer health changed: session={self.session_id}, "
                f"health={current_health.value}, ahead={self.buffer_ahead_seconds:.1f}s"
            )
            self._last_health = current_health
            # Invalidate cached quality settings
            self._current_quality = None

    def update_processed_position(self, video_timestamp_ms: int) -> None:
        """
        Update latest processed timestamp after dubbing a segment.

        Args:
            video_timestamp_ms: Video timestamp of the processed segment
        """
        if video_timestamp_ms > self._latest_processed_time_ms:
            self._latest_processed_time_ms = video_timestamp_ms

    def get_quality_settings(self) -> QualitySettings:
        """
        Get quality settings adapted to current buffer health.

        Returns:
            QualitySettings appropriate for current buffer state
        """
        # Return cached settings if health unchanged
        if self._current_quality is not None and self._last_health == self.buffer_health:
            return self._current_quality

        config = settings.olorin.dubbing
        health = self.buffer_health

        if health == BufferHealth.HEALTHY:
            self._current_quality = QualitySettings(
                translation_provider="claude" if config.prefer_claude_translation else "google",
                tts_speaker_boost=config.enable_speaker_boost,
                tts_stability=config.tts_stability_healthy,
            )
        elif health == BufferHealth.WARNING:
            self._current_quality = QualitySettings(
                translation_provider="google",  # Faster
                tts_speaker_boost=config.enable_speaker_boost,
                tts_stability=config.tts_stability_warning,
            )
        else:  # CRITICAL or EMERGENCY
            self._current_quality = QualitySettings(
                translation_provider="google",
                tts_speaker_boost=False,  # Skip for speed
                tts_stability=config.tts_stability_critical,
            )

        logger.debug(
            f"Quality settings: health={health.value}, "
            f"provider={self._current_quality.translation_provider}, "
            f"boost={self._current_quality.tts_speaker_boost}"
        )

        return self._current_quality

    def is_initial_buffer_ready(self) -> bool:
        """Check if initial buffer is filled and ready to start playback."""
        return self.buffer_ahead_seconds >= self._initial_buffer_sec

    def get_buffer_status(self) -> dict:
        """
        Get current buffer status for client reporting.

        Returns:
            Dict with buffer health and metrics
        """
        return {
            "buffer_ahead_seconds": round(self.buffer_ahead_seconds, 1),
            "buffer_health": self.buffer_health.value,
            "playback_started": self._playback_started,
            "playback_time_ms": self._current_playback_time_ms,
            "processed_time_ms": self._latest_processed_time_ms,
        }
