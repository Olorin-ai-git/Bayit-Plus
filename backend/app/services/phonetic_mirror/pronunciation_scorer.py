"""Pronunciation scoring service for Hebrew phonetic mirror sessions."""

from typing import List, Optional, Tuple

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.phonetic_mirror_attempt import (
    PhonemeFeedback,
    PhonemeIssueType,
    PronunciationQuality,
)
from app.services.phonetic_mirror.text_utils import (
    classify_phoneme_issue,
    levenshtein_distance,
    normalize_hebrew,
)

logger = get_logger(__name__)


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

        normalized_transcript = normalize_hebrew(transcript)
        normalized_target = normalize_hebrew(target_phrase)

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

        distance = levenshtein_distance(heard, expected)
        max_len = max(len(heard), len(expected))
        similarity = 1.0 - (distance / max_len) if max_len > 0 else 0.0

        issue_type = classify_phoneme_issue(heard, expected, similarity)

        return similarity, issue_type

    def _determine_quality(
        self, score: float
    ) -> PronunciationQuality:
        """Map overall score to quality tier using configured thresholds."""
        if score >= settings.PRONUNCIATION_THRESHOLD_EXCELLENT:
            return PronunciationQuality.EXCELLENT
        if score >= settings.PRONUNCIATION_THRESHOLD_GOOD:
            return PronunciationQuality.GOOD
        if score >= settings.PRONUNCIATION_THRESHOLD_FAIR:
            return PronunciationQuality.FAIR
        if score >= settings.PRONUNCIATION_THRESHOLD_NEEDS_PRACTICE:
            return PronunciationQuality.NEEDS_PRACTICE
        return PronunciationQuality.NO_MATCH


pronunciation_scorer = PronunciationScoringService()
