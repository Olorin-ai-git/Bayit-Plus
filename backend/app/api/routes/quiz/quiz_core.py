"""
Quiz Core API Routes.

Endpoints for kids quiz feature including retrieval, submission, and history.
"""

import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from app.core.config import settings
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.content import Content
from app.models.profile import Profile
from app.models.quiz import ContentQuiz, QuizResponse, QuizSubmitRequest
from app.models.quiz_attempt import (
    QuizAttempt,
    QuizAttemptResponse,
    QuizHistoryResponse,
    QuizResultResponse,
)
from app.models.user import User
from app.services.quiz import QuizGenerationService, RewardService
from app.services.security_utils import validate_object_id

logger = logging.getLogger(__name__)

router = APIRouter()


def _check_quiz_enabled():
    """Check if quiz feature is enabled."""
    if not settings.QUIZ_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Quiz feature is currently disabled",
        )


def _format_quiz_response(quiz: ContentQuiz) -> QuizResponse:
    """Format quiz for API response."""
    max_points = sum(q.points for q in quiz.questions)
    return QuizResponse(
        quiz_id=str(quiz.id),
        content_id=quiz.content_id,
        content_type=quiz.content_type,
        questions=quiz.questions,
        age_group=quiz.age_group,
        language=quiz.language,
        total_questions=len(quiz.questions),
        max_points=max_points,
    )


@router.get("/health")
async def quiz_health_check():
    """Health check endpoint for quiz service."""
    return {
        "status": "healthy",
        "feature_enabled": settings.QUIZ_ENABLED,
        "rollout_percentage": settings.QUIZ_ROLLOUT_PERCENTAGE,
    }


@router.get("/{content_id}")
@limiter.limit(RATE_LIMITS.get("quiz_get", "30/minute"))
async def get_quiz(
    request: Request,
    content_id: str,
    profile_id: Optional[str] = Query(None, description="Kids profile ID"),
    language: str = Query("he", description="Quiz language"),
    current_user: User = Depends(get_current_user),
) -> QuizResponse:
    """
    Get or generate quiz for kids content.

    Requires a kids profile with is_kids_profile=true.
    Only works for content with is_kids_content=true.

    Args:
        content_id: Content item ID
        profile_id: Kids profile ID (required for quiz generation)
        language: Preferred quiz language
    """
    _check_quiz_enabled()

    validated_content_id = validate_object_id(content_id)
    content = await Content.get(validated_content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    if not content.is_kids_content:
        raise HTTPException(
            status_code=400,
            detail="Quizzes are only available for kids content",
        )

    if not profile_id:
        raise HTTPException(
            status_code=400,
            detail="Profile ID is required for quizzes",
        )

    validated_profile_id = validate_object_id(profile_id)
    profile = await Profile.get(validated_profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    if profile.user_id != str(current_user.id):
        raise HTTPException(status_code=403, detail="Profile access denied")

    if not profile.is_kids_profile:
        raise HTTPException(
            status_code=400,
            detail="Quizzes are only available for kids profiles",
        )

    generator = QuizGenerationService()
    quiz = await generator.get_or_generate_quiz(content, profile, language)

    if not quiz:
        raise HTTPException(
            status_code=404,
            detail="Could not generate quiz for this content",
        )

    logger.info(
        "Quiz retrieved",
        extra={
            "content_id": content_id,
            "profile_id": profile_id,
            "user_id": str(current_user.id),
            "question_count": len(quiz.questions),
        },
    )

    return _format_quiz_response(quiz)


@router.post("/{quiz_id}/submit")
@limiter.limit(RATE_LIMITS.get("quiz_submit", "10/minute"))
async def submit_quiz(
    request: Request,
    quiz_id: str,
    submission: QuizSubmitRequest,
    profile_id: Optional[str] = Query(None, description="Kids profile ID"),
    current_user: User = Depends(get_current_user),
) -> QuizResultResponse:
    """
    Submit quiz answers and receive score.

    Awards points and badges based on performance.
    Updates user's streak if completing on consecutive days.

    Args:
        quiz_id: Quiz document ID
        submission: Quiz answers
        profile_id: Kids profile ID
    """
    _check_quiz_enabled()

    validated_quiz_id = validate_object_id(quiz_id)
    quiz = await ContentQuiz.get(validated_quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if len(submission.answers) != len(quiz.questions):
        raise HTTPException(
            status_code=400,
            detail=f"Expected {len(quiz.questions)} answers, got {len(submission.answers)}",
        )

    validated_profile_id = None
    if profile_id:
        validated_profile_id = validate_object_id(profile_id)
        profile = await Profile.get(validated_profile_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        if profile.user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Profile access denied")

    reward_service = RewardService()
    result = await reward_service.process_quiz_result(
        user_id=str(current_user.id),
        profile_id=validated_profile_id,
        quiz=quiz,
        answers=submission.answers,
        time_taken_per_question_ms=submission.time_taken_per_question_ms,
    )

    logger.info(
        "Quiz submitted",
        extra={
            "quiz_id": quiz_id,
            "user_id": str(current_user.id),
            "profile_id": profile_id,
            "score": result["score"],
            "is_perfect": result["is_perfect"],
        },
    )

    return QuizResultResponse(**result)


@router.get("/history/me")
@limiter.limit(RATE_LIMITS.get("quiz_history", "30/minute"))
async def get_quiz_history(
    request: Request,
    profile_id: Optional[str] = Query(None, description="Filter by profile"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
) -> QuizHistoryResponse:
    """
    Get user's quiz history.

    Returns past quiz attempts with scores and statistics.
    Can be filtered by profile for family accounts.
    """
    _check_quiz_enabled()

    query = {"user_id": str(current_user.id)}

    if profile_id:
        validated_profile_id = validate_object_id(profile_id)
        profile = await Profile.get(validated_profile_id)
        if profile and profile.user_id == str(current_user.id):
            query["profile_id"] = validated_profile_id

    attempts = (
        await QuizAttempt.find(query)
        .sort([("completed_at", -1)])
        .skip(offset)
        .limit(limit)
        .to_list()
    )

    total_count = await QuizAttempt.find(query).count()

    attempt_responses = [
        QuizAttemptResponse(
            attempt_id=str(a.id),
            quiz_id=a.quiz_id,
            content_id=a.content_id,
            content_type=a.content_type,
            total_questions=a.total_questions,
            correct_answers=a.correct_answers,
            score=a.score,
            points_earned=a.points_earned,
            badges_earned=a.badges_earned,
            total_time_ms=a.total_time_ms,
            completed_at=a.completed_at,
        )
        for a in attempts
    ]

    total_points = sum(a.points_earned for a in attempts)
    perfect_count = sum(1 for a in attempts if a.is_perfect_score())
    avg_score = (
        sum(a.score for a in attempts) / len(attempts) if attempts else 0.0
    )

    return QuizHistoryResponse(
        attempts=attempt_responses,
        total_attempts=total_count,
        total_points_earned=total_points,
        perfect_scores=perfect_count,
        average_score=round(avg_score, 2),
    )
