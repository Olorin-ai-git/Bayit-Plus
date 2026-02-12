"""
Talk Back Dashboard Routes.

Parent engagement metrics and vocabulary progress per child profile.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.models.talk_back_attempt import TalkBackAttempt
from app.models.user import User
from app.services.proficiency.assessment_service import assessment_service

logger = logging.getLogger(__name__)
router = APIRouter(
    prefix="/talk-back/dashboard", tags=["talk-back-dashboard"]
)


class DashboardOverview(BaseModel):
    """Aggregated Talk Back stats for a child profile."""
    total_attempts: int
    total_shekels_earned: int
    average_accuracy: float
    hebrew_response_rate: float
    quality_distribution: dict


class AttemptHistoryItem(BaseModel):
    """Single attempt in history list."""
    attempt_id: str
    content_id: str
    point_id: str
    quality: str
    accuracy_score: float
    shekels_earned: int
    detected_language: str
    hint_used: bool
    created_at: str


class VocabularyItem(BaseModel):
    """Vocabulary word progress."""
    word: str
    transliteration: str
    translation: str
    mastery: float
    times_tested: int
    times_correct: int


@router.get("/overview")
async def get_dashboard_overview(
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
) -> DashboardOverview:
    """Get aggregated Talk Back stats for a child profile."""
    attempts = await TalkBackAttempt.find(
        {
            "user_id": str(user.id),
            "profile_id": profile_id,
        }
    ).to_list()

    if not attempts:
        return DashboardOverview(
            total_attempts=0,
            total_shekels_earned=0,
            average_accuracy=0.0,
            hebrew_response_rate=0.0,
            quality_distribution={},
        )

    total = len(attempts)
    total_shekels = sum(a.shekels_earned for a in attempts)
    avg_accuracy = sum(a.accuracy_score for a in attempts) / total
    hebrew_count = sum(1 for a in attempts if a.hebrew_ratio > 0.5)

    quality_dist: dict = {}
    for a in attempts:
        key = a.quality.value
        quality_dist[key] = quality_dist.get(key, 0) + 1

    return DashboardOverview(
        total_attempts=total,
        total_shekels_earned=total_shekels,
        average_accuracy=round(avg_accuracy, 3),
        hebrew_response_rate=round(hebrew_count / total, 3),
        quality_distribution=quality_dist,
    )


@router.get("/history")
async def get_attempt_history(
    profile_id: str = Query(...),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
) -> List[AttemptHistoryItem]:
    """Get paginated Talk Back attempt history for a child."""
    attempts = await TalkBackAttempt.find(
        {
            "user_id": str(user.id),
            "profile_id": profile_id,
        }
    ).sort(-TalkBackAttempt.created_at).skip(offset).limit(limit).to_list()

    return [
        AttemptHistoryItem(
            attempt_id=str(a.id),
            content_id=a.content_id,
            point_id=a.point_id,
            quality=a.quality.value,
            accuracy_score=a.accuracy_score,
            shekels_earned=a.shekels_earned,
            detected_language=a.detected_language,
            hint_used=a.hint_used,
            created_at=a.created_at.isoformat(),
        )
        for a in attempts
    ]


@router.get("/vocabulary")
async def get_vocabulary_progress(
    profile_id: str = Query(...),
    user: User = Depends(get_current_user),
) -> List[VocabularyItem]:
    """Get vocabulary progress from proficiency assessments."""
    prof = await assessment_service.get_or_create_proficiency(
        user_id=str(user.id),
        profile_id=profile_id,
    )

    all_words = list(prof.vocabulary_learning) + list(
        prof.vocabulary_known
    )

    return [
        VocabularyItem(
            word=w.word,
            transliteration=w.transliteration,
            translation=w.translation,
            mastery=round(w.mastery, 3),
            times_tested=w.times_tested,
            times_correct=w.times_correct,
        )
        for w in all_words
    ]
