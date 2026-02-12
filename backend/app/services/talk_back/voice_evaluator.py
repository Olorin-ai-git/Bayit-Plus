"""
Talk Back Voice Evaluator.

Evaluates a child's Hebrew voice response against expected answers.
Uses fuzzy matching with accent tolerance and partial credit.
"""

import logging
import re
from typing import List, Tuple

from app.models.talk_back_attempt import (
    QUALITY_SCORE_MAP,
    ResponseQuality,
)

logger = logging.getLogger(__name__)


class VoiceEvaluator:
    """Evaluates Hebrew voice responses with accent tolerance."""

    def evaluate(
        self,
        transcript: str,
        expected_responses: List[str],
        detected_language: str,
    ) -> Tuple[ResponseQuality, float, str, str]:
        """
        Evaluate a voice response against expected answers.

        Returns:
            Tuple of (quality, score, feedback_en, feedback_he)
        """
        if not transcript or not transcript.strip():
            return (
                ResponseQuality.NO_RESPONSE,
                0.0,
                "No response detected. Try again!",
                "לא זוהתה תשובה. נסה שוב!",
            )

        cleaned = self._normalize_hebrew(transcript)

        if detected_language not in ("he", "iw", "hebrew"):
            return (
                ResponseQuality.WRONG_LANGUAGE,
                0.0,
                "Try answering in Hebrew!",
                "נסה לענות בעברית!",
            )

        for expected in expected_responses:
            normalized_expected = self._normalize_hebrew(expected)

            if cleaned == normalized_expected:
                return (
                    ResponseQuality.EXACT_MATCH,
                    QUALITY_SCORE_MAP[ResponseQuality.EXACT_MATCH],
                    "Perfect answer!",
                    "תשובה מושלמת!",
                )

        for expected in expected_responses:
            normalized_expected = self._normalize_hebrew(expected)

            if self._check_root_match(cleaned, normalized_expected):
                return (
                    ResponseQuality.CORRECT_ROOT,
                    QUALITY_SCORE_MAP[ResponseQuality.CORRECT_ROOT],
                    "Almost! You got the right root word.",
                    "כמעט! מצאת את השורש הנכון.",
                )

        for expected in expected_responses:
            normalized_expected = self._normalize_hebrew(expected)

            if self._check_phonetic_similarity(
                cleaned, normalized_expected
            ):
                return (
                    ResponseQuality.CLOSE_PHONETIC,
                    QUALITY_SCORE_MAP[ResponseQuality.CLOSE_PHONETIC],
                    "Close! The pronunciation is similar.",
                    "קרוב! ההגייה דומה.",
                )

        return (
            ResponseQuality.RIGHT_LANGUAGE,
            QUALITY_SCORE_MAP[ResponseQuality.RIGHT_LANGUAGE],
            "Good try in Hebrew! The answer was different.",
            "ניסיון טוב בעברית! התשובה הייתה שונה.",
        )

    def _normalize_hebrew(self, text: str) -> str:
        """Normalize Hebrew text: remove nikud, whitespace, punctuation."""
        cleaned = re.sub(r"[\u0591-\u05C7]", "", text)
        cleaned = re.sub(r"[^\u0590-\u05FF\s]", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def _check_root_match(
        self, response: str, expected: str
    ) -> bool:
        """Check if response shares a Hebrew root with expected."""
        if len(response) < 2 or len(expected) < 2:
            return False

        resp_chars = [c for c in response if "\u0590" <= c <= "\u05FF"]
        exp_chars = [c for c in expected if "\u0590" <= c <= "\u05FF"]

        if len(resp_chars) < 3 or len(exp_chars) < 3:
            return False

        resp_root = resp_chars[:3]
        exp_root = exp_chars[:3]
        matching = sum(
            1 for a, b in zip(resp_root, exp_root) if a == b
        )
        return matching >= 2

    def _check_phonetic_similarity(
        self, response: str, expected: str
    ) -> bool:
        """Check for phonetic similarity between response and expected."""
        if not response or not expected:
            return False

        common_chars = set(response) & set(expected)
        total_chars = set(response) | set(expected)

        if not total_chars:
            return False

        similarity = len(common_chars) / len(total_chars)
        return similarity >= 0.6


voice_evaluator = VoiceEvaluator()
