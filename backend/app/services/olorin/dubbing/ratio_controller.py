"""
Bilingual Dubbing Ratio Controller.

Progressive algorithm that adjusts Hebrew-to-English ratio
based on child proficiency. Ratio only increases (positive reinforcement).
"""

import logging
from typing import Optional

from app.core.config import settings
from app.models.child_proficiency import (
    ChildProficiency,
    ProficiencyLevel,
)

logger = logging.getLogger(__name__)


class RatioController:
    """Controls the Hebrew/English ratio for bilingual dubbing."""

    def get_target_ratio(
        self, proficiency: ChildProficiency
    ) -> float:
        """
        Get target Hebrew ratio based on proficiency level.

        Ratio boundaries:
        - beginner: 0.10 - 0.30
        - elementary: 0.20 - 0.50
        - intermediate: 0.40 - 0.70
        - advanced: 0.60 - 0.90
        """
        level_ranges = {
            ProficiencyLevel.BEGINNER: (
                settings.BILINGUAL_DUBBING_BEGINNER_MIN_RATIO,
                settings.BILINGUAL_DUBBING_BEGINNER_MAX_RATIO,
            ),
            ProficiencyLevel.ELEMENTARY: (
                settings.BILINGUAL_DUBBING_ELEMENTARY_MIN_RATIO,
                settings.BILINGUAL_DUBBING_ELEMENTARY_MAX_RATIO,
            ),
            ProficiencyLevel.INTERMEDIATE: (
                settings.BILINGUAL_DUBBING_INTERMEDIATE_MIN_RATIO,
                settings.BILINGUAL_DUBBING_INTERMEDIATE_MAX_RATIO,
            ),
            ProficiencyLevel.ADVANCED: (
                settings.BILINGUAL_DUBBING_ADVANCED_MIN_RATIO,
                settings.BILINGUAL_DUBBING_ADVANCED_MAX_RATIO,
            ),
        }

        min_ratio, max_ratio = level_ranges.get(
            proficiency.level,
            (
                settings.BILINGUAL_DUBBING_BEGINNER_MIN_RATIO,
                settings.BILINGUAL_DUBBING_BEGINNER_MAX_RATIO,
            ),
        )

        score_within_level = proficiency.overall_score
        ratio = min_ratio + (max_ratio - min_ratio) * score_within_level

        return round(max(min_ratio, min(max_ratio, ratio)), 2)

    def adjust_ratio(
        self,
        current_ratio: float,
        proficiency: ChildProficiency,
        session_accuracy: float,
    ) -> float:
        """
        Adjust ratio after a session. Only increases (positive reinforcement).

        If session accuracy > 0.7, increase ratio by adjustment step.
        If session accuracy < 0.3, keep ratio (no decrease).
        """
        if session_accuracy >= 0.7:
            new_ratio = current_ratio + settings.RATIO_ADJUSTMENT_STEP

            level_ranges = {
                ProficiencyLevel.BEGINNER: settings.BILINGUAL_DUBBING_BEGINNER_MAX_RATIO,
                ProficiencyLevel.ELEMENTARY: settings.BILINGUAL_DUBBING_ELEMENTARY_MAX_RATIO,
                ProficiencyLevel.INTERMEDIATE: settings.BILINGUAL_DUBBING_INTERMEDIATE_MAX_RATIO,
                ProficiencyLevel.ADVANCED: settings.BILINGUAL_DUBBING_ADVANCED_MAX_RATIO,
            }
            max_ratio = level_ranges.get(
                proficiency.level,
                settings.BILINGUAL_DUBBING_BEGINNER_MAX_RATIO,
            )

            new_ratio = min(new_ratio, max_ratio)

            logger.info(
                "Bilingual ratio increased",
                extra={
                    "user_id": proficiency.user_id,
                    "profile_id": proficiency.profile_id,
                    "old_ratio": current_ratio,
                    "new_ratio": new_ratio,
                    "accuracy": session_accuracy,
                },
            )
            return round(new_ratio, 2)

        return current_ratio

    def select_words_for_hebrew(
        self,
        proficiency: ChildProficiency,
        target_count: int,
    ) -> list:
        """
        Select which vocabulary words should stay in Hebrew.

        Known words always stay Hebrew, learning words may be kept
        based on mastery level.
        """
        hebrew_words = []

        for word in proficiency.vocabulary_known:
            hebrew_words.append(word.word)

        for word in proficiency.vocabulary_learning:
            if word.mastery >= 0.5:
                hebrew_words.append(word.word)

        return hebrew_words[:target_count]


ratio_controller = RatioController()
