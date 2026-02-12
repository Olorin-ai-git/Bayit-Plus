"""
Proficiency Assessment Service.

Evaluates voice responses and quiz results to track and update
a child's Hebrew proficiency level.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional

from app.core.config import settings
from app.models.child_proficiency import (
    AssessmentResult,
    ChildProficiency,
    ProficiencyLevel,
    VocabularyWord,
)

logger = logging.getLogger(__name__)

LEVEL_THRESHOLDS = {
    ProficiencyLevel.BEGINNER: (0.0, 0.25),
    ProficiencyLevel.ELEMENTARY: (0.25, 0.50),
    ProficiencyLevel.INTERMEDIATE: (0.50, 0.75),
    ProficiencyLevel.ADVANCED: (0.75, 1.0),
}

LEVEL_HEBREW_RATIO = {
    ProficiencyLevel.BEGINNER: 0.15,
    ProficiencyLevel.ELEMENTARY: 0.35,
    ProficiencyLevel.INTERMEDIATE: 0.55,
    ProficiencyLevel.ADVANCED: 0.80,
}

MAX_ASSESSMENT_HISTORY = 50


class AssessmentService:
    """Evaluates and updates child Hebrew proficiency."""

    async def get_or_create_proficiency(
        self,
        user_id: str,
        profile_id: str,
    ) -> ChildProficiency:
        """Get or create proficiency record for a child profile."""
        prof = await ChildProficiency.find_one(
            {"user_id": user_id, "profile_id": profile_id}
        )
        if prof:
            return prof

        prof = ChildProficiency(
            user_id=user_id, profile_id=profile_id
        )
        await prof.insert()
        logger.info(
            "Created proficiency record",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
            },
        )
        return prof

    async def record_assessment(
        self,
        user_id: str,
        profile_id: str,
        source: str,
        score: float,
        words_tested: int = 0,
        words_correct: int = 0,
        hebrew_ratio: float = 0.0,
    ) -> ChildProficiency:
        """Record an assessment and recalculate proficiency."""
        prof = await self.get_or_create_proficiency(
            user_id, profile_id
        )

        result = AssessmentResult(
            assessed_at=datetime.now(timezone.utc),
            source=source,
            score=score,
            words_tested=words_tested,
            words_correct=words_correct,
            hebrew_ratio=hebrew_ratio,
        )

        prof.assessment_history.append(result)
        if len(prof.assessment_history) > MAX_ASSESSMENT_HISTORY:
            prof.assessment_history = prof.assessment_history[
                -MAX_ASSESSMENT_HISTORY:
            ]

        prof.total_assessments += 1
        prof.overall_score = self._calculate_weighted_score(
            prof.assessment_history
        )
        prof.level = self._determine_level(prof.overall_score)
        prof.hebrew_ratio = LEVEL_HEBREW_RATIO.get(
            prof.level, 0.15
        )
        prof.updated_at = datetime.now(timezone.utc)
        await prof.save()

        logger.info(
            "Proficiency assessment recorded",
            extra={
                "user_id": user_id,
                "profile_id": profile_id,
                "source": source,
                "score": score,
                "level": prof.level.value,
            },
        )
        return prof

    async def update_vocabulary(
        self,
        user_id: str,
        profile_id: str,
        word: str,
        transliteration: str,
        translation: str,
        correct: bool,
    ) -> None:
        """Update vocabulary tracking for a word interaction."""
        prof = await self.get_or_create_proficiency(
            user_id, profile_id
        )
        now = datetime.now(timezone.utc)

        existing = self._find_vocab_word(prof, word)
        if existing:
            existing.times_tested += 1
            if correct:
                existing.times_correct += 1
            existing.mastery = (
                existing.times_correct / existing.times_tested
            )
            existing.last_tested = now

            if existing.mastery >= 0.8:
                self._move_to_known(prof, existing)
        else:
            new_word = VocabularyWord(
                word=word,
                transliteration=transliteration,
                translation=translation,
                mastery=1.0 if correct else 0.0,
                first_seen=now,
                last_tested=now,
                times_correct=1 if correct else 0,
                times_tested=1,
            )
            prof.vocabulary_learning.append(new_word)

        prof.updated_at = now
        await prof.save()

    def _calculate_weighted_score(
        self, history: List[AssessmentResult]
    ) -> float:
        """Calculate exponentially weighted average of recent scores."""
        if not history:
            return 0.0

        recent = history[-20:]
        total_weight = 0.0
        weighted_sum = 0.0

        for idx, result in enumerate(recent):
            weight = 1.0 + (idx * 0.1)
            weighted_sum += result.score * weight
            total_weight += weight

        return weighted_sum / total_weight if total_weight else 0.0

    def _determine_level(self, score: float) -> ProficiencyLevel:
        """Determine proficiency level from overall score."""
        for level, (low, high) in LEVEL_THRESHOLDS.items():
            if low <= score < high:
                return level
        return ProficiencyLevel.ADVANCED

    def _find_vocab_word(
        self, prof: ChildProficiency, word: str
    ) -> Optional[VocabularyWord]:
        """Find a word in learning or known vocabulary."""
        for w in prof.vocabulary_learning:
            if w.word == word:
                return w
        for w in prof.vocabulary_known:
            if w.word == word:
                return w
        return None

    def _move_to_known(
        self,
        prof: ChildProficiency,
        word: VocabularyWord,
    ) -> None:
        """Move a mastered word from learning to known."""
        prof.vocabulary_learning = [
            w for w in prof.vocabulary_learning if w.word != word.word
        ]
        if not any(w.word == word.word for w in prof.vocabulary_known):
            prof.vocabulary_known.append(word)
            prof.total_words_learned += 1


assessment_service = AssessmentService()
