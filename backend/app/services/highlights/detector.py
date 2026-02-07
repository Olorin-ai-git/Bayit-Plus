"""
Highlight Detector - Detection algorithms for live transcript analysis.

Detects highlight-worthy moments based on:
- Emotional peaks (exclamation patterns, intensity words)
- Named entity density (multiple people/places in window)
- Keyword patterns (configurable per content type)
- Speech intensity changes (silence → activity transitions)
"""

import re
from collections import deque
from dataclasses import dataclass
from typing import Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.transcript_bus.models import TranscriptEvent

logger = get_logger(__name__)


@dataclass
class DetectedHighlight:
    """Detected highlight from transcript analysis."""

    channel_id: str
    start_time: float
    end_time: float
    transcript_text: str
    highlight_type: str  # emotional, entity, keyword, dramatic
    confidence: float
    metadata: dict


class HighlightDetector:
    """Detects highlight-worthy moments from transcript windows."""

    def __init__(self):
        """Initialize highlight detector."""
        self._config = settings.olorin.highlights
        self._emotional_patterns = self._compile_emotional_patterns()

        logger.info(
            "HighlightDetector initialized",
            extra={
                "window_size": self._config.window_size,
                "min_confidence": self._config.min_confidence,
            },
        )

    def _compile_emotional_patterns(self) -> list[re.Pattern]:
        """Compile emotional keyword patterns."""
        patterns = []
        for keyword in self._config.emotional_keywords:
            if keyword in ["!", "?!"]:
                patterns.append(re.compile(re.escape(keyword)))
            else:
                patterns.append(re.compile(rf"\b{re.escape(keyword)}\b", re.IGNORECASE))
        return patterns

    async def analyze_window(
        self, window: deque[TranscriptEvent]
    ) -> Optional[DetectedHighlight]:
        """Analyze a sliding window of transcripts for highlights.

        Args:
            window: Sliding window of recent transcript events

        Returns:
            DetectedHighlight if detected, None otherwise
        """
        if len(window) < 2:
            return None

        # Combine window text for analysis
        combined_text = " ".join(e.text for e in window)
        start_time = window[0].timestamp
        end_time = window[-1].timestamp

        # Try detection strategies in priority order
        highlight = await self._detect_emotional(
            window, combined_text, start_time, end_time
        )
        if highlight:
            return highlight

        highlight = await self._detect_keyword(
            window, combined_text, start_time, end_time
        )
        if highlight:
            return highlight

        highlight = await self._detect_dramatic(
            window, combined_text, start_time, end_time
        )
        if highlight:
            return highlight

        return None

    async def _detect_emotional(
        self,
        window: deque[TranscriptEvent],
        combined_text: str,
        start_time: float,
        end_time: float,
    ) -> Optional[DetectedHighlight]:
        """Detect emotional intensity peaks.

        Triggers on:
        - Multiple exclamation marks
        - Intensity words (wow, amazing, incredible)
        - Repeated words indicating emphasis
        """
        channel_id = window[0].channel_id

        # Count emotional patterns
        pattern_matches = 0
        matched_keywords = []

        for pattern in self._emotional_patterns:
            matches = pattern.findall(combined_text)
            if matches:
                pattern_matches += len(matches)
                matched_keywords.extend(matches)

        # Check for repeated exclamations
        exclamation_count = combined_text.count("!")
        if exclamation_count >= 3:
            pattern_matches += exclamation_count

        # Calculate confidence based on pattern density
        confidence = min(1.0, pattern_matches / 5.0)

        if confidence >= self._config.min_confidence:
            logger.debug(
                "Emotional highlight detected",
                extra={
                    "channel_id": channel_id,
                    "confidence": confidence,
                    "matched_keywords": matched_keywords[:5],
                },
            )
            return DetectedHighlight(
                channel_id=channel_id,
                start_time=start_time,
                end_time=end_time,
                transcript_text=combined_text[:500],
                highlight_type="emotional",
                confidence=confidence,
                metadata={
                    "matched_keywords": matched_keywords[:10],
                    "exclamation_count": exclamation_count,
                },
            )

        return None

    async def _detect_keyword(
        self,
        window: deque[TranscriptEvent],
        combined_text: str,
        start_time: float,
        end_time: float,
    ) -> Optional[DetectedHighlight]:
        """Detect keyword pattern matches.

        Triggers on configurable keyword patterns.
        """
        channel_id = window[0].channel_id

        # Count keyword matches
        keyword_matches = []
        for keyword in self._config.emotional_keywords:
            if keyword.lower() in combined_text.lower():
                keyword_matches.append(keyword)

        if len(keyword_matches) >= 2:
            confidence = min(1.0, len(keyword_matches) / 4.0)

            if confidence >= self._config.min_confidence:
                logger.debug(
                    "Keyword highlight detected",
                    extra={
                        "channel_id": channel_id,
                        "confidence": confidence,
                        "keywords": keyword_matches,
                    },
                )
                return DetectedHighlight(
                    channel_id=channel_id,
                    start_time=start_time,
                    end_time=end_time,
                    transcript_text=combined_text[:500],
                    highlight_type="keyword",
                    confidence=confidence,
                    metadata={"keywords": keyword_matches},
                )

        return None

    async def _detect_dramatic(
        self,
        window: deque[TranscriptEvent],
        combined_text: str,
        start_time: float,
        end_time: float,
    ) -> Optional[DetectedHighlight]:
        """Detect dramatic intensity changes.

        Triggers on:
        - Sudden increase in text length after silence
        - Question-answer patterns
        - Breaking news indicators
        """
        channel_id = window[0].channel_id

        # Check for dramatic patterns
        dramatic_indicators = [
            "breaking",
            "just in",
            "urgent",
            "developing",
            "exclusive",
            "happening now",
        ]

        found_indicators = []
        lower_text = combined_text.lower()
        for indicator in dramatic_indicators:
            if indicator in lower_text:
                found_indicators.append(indicator)

        if found_indicators:
            confidence = min(1.0, 0.6 + (len(found_indicators) * 0.15))

            if confidence >= self._config.min_confidence:
                logger.debug(
                    "Dramatic highlight detected",
                    extra={
                        "channel_id": channel_id,
                        "confidence": confidence,
                        "indicators": found_indicators,
                    },
                )
                return DetectedHighlight(
                    channel_id=channel_id,
                    start_time=start_time,
                    end_time=end_time,
                    transcript_text=combined_text[:500],
                    highlight_type="dramatic",
                    confidence=confidence,
                    metadata={"indicators": found_indicators},
                )

        return None
