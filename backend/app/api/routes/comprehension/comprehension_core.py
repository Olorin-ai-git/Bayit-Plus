"""
Comprehension Quiz Core API Routes.

Endpoints for scene-triggered comprehension questions.
"""

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.config import settings
from app.core.database import db
from app.core.logging_config import get_logger
from app.core.rate_limiter import RATE_LIMITS, limiter
from app.core.security import get_current_user
from app.models.comprehension import ComprehensionQuestionPublic
from app.models.comprehension_attempt import ComprehensionAttempt
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService
from app.services.comprehension.question_service import (
    ComprehensionQuestionService,
)
from app.services.olorin.metering.service import MeteringService
from app.services.scene_detection_service import SceneDetectionService

from .schemas import (
    ComprehensionSubmitRequest,
    ComprehensionSubmitResponse,
    SceneListResponse,
    SceneMarkerResponse,
)
from .submission_handler import handle_answer_submission
from .utils import check_comprehension_enabled

logger = get_logger(__name__)

router = APIRouter()


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
    check_comprehension_enabled()

    # Check beta credits
    if user.is_beta_user:
        credit_service = BetaCreditService(
            settings=settings,
            metering_service=MeteringService(),
            db=db
        )
        authorized, balance = await credit_service.authorize(
            user_id=str(user.id),
            feature="comprehension_question",
            estimated_usage=settings.CREDIT_RATE_COMPREHENSION_QUESTION
        )
        if not authorized:
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
    check_comprehension_enabled()
    return await handle_answer_submission(question_id, submit_data, user)


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
    check_comprehension_enabled()

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
