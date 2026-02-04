"""
Comprehension Quiz Core API Routes.

Endpoints for scene-triggered comprehension questions.
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app.core.config import settings
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.comprehension import ComprehensionQuestionPublic
from app.models.comprehension_attempt import ComprehensionAttempt
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.comprehension.question_service import (
    ComprehensionQuestionService,
)
from app.services.scene_detection_service import SceneDetectionService

logger = logging.getLogger(__name__)

router = APIRouter()


def _check_comprehension_enabled():
    """Check if comprehension quiz feature is enabled."""
    if not settings.COMPREHENSION_QUIZ_ENABLED:
        raise HTTPException(
            status_code=503,
            detail="Comprehension quiz feature is currently disabled",
        )


class SceneMarkerResponse(BaseModel):
    """API response for scene marker."""

    start_time: float
    end_time: float
    cue_count: int


class SceneListResponse(BaseModel):
    """API response for scene list."""

    scenes: list[SceneMarkerResponse]


class ComprehensionSubmitRequest(BaseModel):
    """Request to submit comprehension answer."""

    selected_option: int = Field(..., ge=0, le=3)
    time_taken_ms: int = Field(..., ge=0)


class ComprehensionSubmitResponse(BaseModel):
    """Response after submitting answer."""

    is_correct: bool
    explanation: Optional[str] = None
    explanation_en: Optional[str] = None
    points_earned: int
    credits_deducted: int


@router.get("/{content_id}/question", response_model=ComprehensionQuestionPublic)
@limiter.limit(RATE_LIMITS["comprehension_question"])
async def get_comprehension_question(
    request: Request,
    content_id: str,
    scene_start: float,
    scene_end: float,
    language: str = "he",
    user: User = Depends(get_current_user),
):
    """
    Get comprehension question for scene.

    Args:
        content_id: Content ID
        scene_start: Scene start time (seconds)
        scene_end: Scene end time (seconds)
        language: Question language (he, en)
        user: Current authenticated user

    Returns:
        ComprehensionQuestionPublic: Question without correct answer

    Raises:
        HTTPException: 403 if insufficient credits
        HTTPException: 404 if question not found
        HTTPException: 503 if feature disabled
    """
    _check_comprehension_enabled()

    # Check beta credits
    if user.is_beta_user:
        # TODO: Integrate with BetaCreditService.authorize
        # For now, just check user has credits
        from app.models.beta_credit import BetaCredit

        credit_doc = await BetaCredit.find_one(
            {"user_id": str(user.id)}
        )
        if not credit_doc or credit_doc.balance < 1:
            raise HTTPException(
                status_code=403,
                detail="Insufficient credits for comprehension question",
            )

    # Get or generate question
    service = ComprehensionQuestionService()
    question = await service.get_or_generate_question(
        content_id=content_id,
        scene_start_time=scene_start,
        scene_end_time=scene_end,
        language=language,
    )

    if not question:
        raise HTTPException(
            status_code=404, detail="Question not found for scene"
        )

    # Return public question (without correct_index)
    return ComprehensionQuestionPublic.from_question(question)


@router.post("/questions/{question_id}/submit", response_model=ComprehensionSubmitResponse)
@limiter.limit(RATE_LIMITS["comprehension_submit"])
async def submit_comprehension_answer(
    request: Request,
    question_id: str,
    submit_data: ComprehensionSubmitRequest,
    user: User = Depends(get_current_user),
):
    """
    Submit answer to comprehension question.

    Args:
        question_id: Question ID
        submit_data: Answer submission data
        user: Current authenticated user

    Returns:
        ComprehensionSubmitResponse: Result with feedback

    Raises:
        HTTPException: 404 if question not found
        HTTPException: 503 if feature disabled
    """
    _check_comprehension_enabled()

    # Find question in cache
    from app.models.comprehension import ContentComprehension

    # Search all content comprehension documents for the question
    all_docs = await ContentComprehension.find_all().to_list()
    question_model = None
    content_id = None

    for doc in all_docs:
        for q in doc.questions:
            if q.question_id == question_id:
                question_model = q
                content_id = doc.content_id
                break
        if question_model:
            break

    if not question_model:
        raise HTTPException(status_code=404, detail="Question not found")

    # Check if answer is correct
    is_correct = submit_data.selected_option == question_model.correct_index

    # Calculate points
    points_earned = question_model.points if is_correct else 0

    # Deduct credits for beta users
    credits_deducted = 0
    if user.is_beta_user:
        # TODO: Integrate with BetaCreditService.deduct
        from app.models.beta_credit import BetaCredit

        credit_doc = await BetaCredit.find_one(
            {"user_id": str(user.id)}
        )
        if credit_doc:
            credit_doc.balance -= settings.CREDIT_RATE_COMPREHENSION_QUESTION
            await credit_doc.save()
            credits_deducted = settings.CREDIT_RATE_COMPREHENSION_QUESTION

    # Record attempt
    attempt = ComprehensionAttempt(
        user_id=str(user.id),
        content_id=content_id,
        question_id=question_id,
        selected_option=submit_data.selected_option,
        is_correct=is_correct,
        time_taken_ms=submit_data.time_taken_ms,
        scene_start_time=question_model.scene_start_time,
        scene_end_time=question_model.scene_end_time,
        credits_deducted=credits_deducted,
    )
    await attempt.insert()

    return ComprehensionSubmitResponse(
        is_correct=is_correct,
        explanation=question_model.explanation,
        explanation_en=question_model.explanation_en,
        points_earned=points_earned,
        credits_deducted=credits_deducted,
    )


@router.get("/{content_id}/scenes", response_model=SceneListResponse)
@limiter.limit(RATE_LIMITS["comprehension_scenes"])
async def get_content_scenes(
    request: Request,
    content_id: str,
    user: User = Depends(get_current_user),
):
    """
    Get scene markers for content.

    Args:
        content_id: Content ID
        user: Current authenticated user

    Returns:
        SceneListResponse: List of scene markers

    Raises:
        HTTPException: 503 if feature disabled
    """
    _check_comprehension_enabled()

    service = SceneDetectionService()
    scenes = await service.detect_scenes(content_id)

    return SceneListResponse(
        scenes=[
            SceneMarkerResponse(
                start_time=s.start_time,
                end_time=s.end_time,
                cue_count=s.cue_count,
            )
            for s in scenes
        ]
    )
