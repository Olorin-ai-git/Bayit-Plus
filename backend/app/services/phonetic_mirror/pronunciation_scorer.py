"""Pronunciation scoring service for Hebrew phonetic mirror sessions."""

import logging
import re
from typing import List, Optional, Tuple

from app.models.phonetic_mirror_attempt import (
    PhonemeFeedback,
    PhonemeIssueType,
    PronunciationQuality,
)

logger = logging.getLogger(__name__)

QUALITY_THRESHOLDS = {
    PronunciationQuality.EXCELLENT: 0.9,
    PronunciationQuality.GOOD: 0.7,
    PronunciationQuality.FAIR: 0.5,
    PronunciationQuality.NEEDS_PRACTICE: 0.2,
}


class WordAlignment:
    """Alignment between a heard word and an expected word."""

    def __init__(
        self,
        heard: str,
        expected: str,
        score: float,
        issue_type: Optional[PhonemeIssueType] = None,
    ):
        self.heard = heard
        self.expected = expected
        self.score = score
        self.issue_type = issue_type


class PronunciationResult:
    """Result of a pronunciation scoring evaluation."""

    def __init__(
        self,
        overall_score: float,
        quality: PronunciationQuality,
        word_feedback: List[PhonemeFeedback],
    ):
        self.overall_score = overall_score
        self.quality = quality
        self.word_feedback = word_feedback


class PronunciationScoringService:
    """Scores Hebrew pronunciation against target phrases."""

    def score_pronunciation(
        self,
        transcript: str,
        target_phrase: str,
        detected_language: str,
    ) -> PronunciationResult:
        """Score pronunciation of transcript against target phrase."""
        if not transcript or not transcript.strip():
            return PronunciationResult(
                overall_score=0.0,
                quality=PronunciationQuality.NO_MATCH,
                word_feedback=[],
            )

        normalized_transcript = self._normalize_hebrew(transcript)
        normalized_target = self._normalize_hebrew(target_phrase)

        transcript_words = normalized_transcript.split()
        target_words = normalized_target.split()

        if not target_words:
            return PronunciationResult(
                overall_score=0.0,
                quality=PronunciationQuality.NO_MATCH,
                word_feedback=[],
            )

        alignments = self._align_words(transcript_words, target_words)

        word_feedback = []
        total_score = 0.0

        for alignment in alignments:
            feedback = PhonemeFeedback(
                word_he=alignment.expected,
                expected_transliteration=alignment.expected,
                heard_transliteration=alignment.heard,
                score=alignment.score,
                issue_type=alignment.issue_type,
            )
            word_feedback.append(feedback)
            total_score += alignment.score

        overall_score = total_score / len(alignments) if alignments else 0.0
        quality = self._determine_quality(overall_score)

        logger.info(
            "Pronunciation scored",
            extra={
                "overall_score": overall_score,
                "quality": quality.value,
                "word_count": len(alignments),
                "detected_language": detected_language,
            },
        )

        return PronunciationResult(
            overall_score=overall_score,
            quality=quality,
            word_feedback=word_feedback,
        )

    def _align_words(
        self,
        transcript_words: List[str],
        target_words: List[str],
    ) -> List[WordAlignment]:
        """Align transcript words to target words using edit distance."""
        alignments = []

        for i, target in enumerate(target_words):
            if i < len(transcript_words):
                heard = transcript_words[i]
                score, issue = self._score_word(heard, target)
                alignments.append(
                    WordAlignment(
                        heard=heard,
                        expected=target,
                        score=score,
                        issue_type=issue,
                    )
                )
            else:
                alignments.append(
                    WordAlignment(
                        heard="",
                        expected=target,
                        score=0.0,
                        issue_type=PhonemeIssueType.MISSING_SOUND,
                    )
                )

        return alignments

    def _score_word(
        self, heard: str, expected: str
    ) -> Tuple[float, Optional[PhonemeIssueType]]:
        """Score a single word pair and identify issue type."""
        if heard == expected:
            return 1.0, None

        if not heard or not expected:
            return 0.0, PhonemeIssueType.MISSING_SOUND

        distance = self._levenshtein_distance(heard, expected)
        max_len = max(len(heard), len(expected))
        similarity = 1.0 - (distance / max_len) if max_len > 0 else 0.0

        issue_type = self._classify_issue(heard, expected, similarity)

        return similarity, issue_type

    def _classify_issue(
        self,
        heard: str,
        expected: str,
        similarity: float,
    ) -> Optional[PhonemeIssueType]:
        """Classify the type of pronunciation issue."""
        if similarity >= 0.9:
            return None

        heard_chars = set(heard)
        expected_chars = set(expected)
        vowel_chars = set("\u05B0\u05B1\u05B2\u05B3\u05B4\u05B5\u05B6\u05B7\u05B8\u05B9\u05BA\u05BB")

        vowel_diff = (heard_chars ^ expected_chars) & vowel_chars
        consonant_diff = (heard_chars ^ expected_chars) - vowel_chars

        if vowel_diff and not consonant_diff:
            return PhonemeIssueType.VOWEL_SWAP

        if consonant_diff and not vowel_diff:
            return PhonemeIssueType.CONSONANT_SWAP

        if len(heard) > len(expected) + 1:
            return PhonemeIssueType.EXTRA_SOUND

        if len(heard) < len(expected) - 1:
            return PhonemeIssueType.MISSING_SOUND

        return PhonemeIssueType.STRESS_WRONG

    def _normalize_hebrew(self, text: str) -> str:
        """Normalize Hebrew text: remove nikud, whitespace, punctuation."""
        cleaned = re.sub(r"[\u0591-\u05C7]", "", text)
        cleaned = re.sub(r"[^\u0590-\u05FF\s]", "", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def _levenshtein_distance(self, s1: str, s2: str) -> int:
        """Compute Levenshtein edit distance between two strings."""
        if len(s1) < len(s2):
            return self._levenshtein_distance(s2, s1)

        previous_row = list(range(len(s2) + 1))

        for i, c1 in enumerate(s1):
            current_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = previous_row[j + 1] + 1
                deletions = current_row[j] + 1
                substitutions = previous_row[j] + (c1 != c2)
                current_row.append(min(insertions, deletions, substitutions))
            previous_row = current_row

        return previous_row[-1]

    def _determine_quality(
        self, score: float
    ) -> PronunciationQuality:
        """Map overall score to quality tier."""
        for quality, threshold in QUALITY_THRESHOLDS.items():
            if score >= threshold:
                return quality
        return PronunciationQuality.NO_MATCH


pronunciation_scorer = PronunciationScoringService()
