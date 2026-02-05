"""
Comprehension Answer Submission Handler.

Handles the logic for submitting and verifying answers.
"""

from fastapi import HTTPException

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.comprehension import (
    ComprehensionQuestionModel,
    ContentComprehension,
)
from app.models.comprehension_attempt import ComprehensionAttempt
from app.models.user import User
from app.services.beta.credit_service import BetaCreditService

from .schemas import ComprehensionSubmitRequest, ComprehensionSubmitResponse

logger = get_logger(__name__)


async def handle_answer_submission(
    question_id: str,
    submit_data: ComprehensionSubmitRequest,
    user: User,
) -> ComprehensionSubmitResponse:
    """
    Process answer submission and return feedback.

    Args:
        question_id: Question ID
        submit_data: Answer submission data
        user: Current authenticated user

    Returns:
        ComprehensionSubmitResponse: Result with feedback

    Raises:
        HTTPException: 404 if question not found
    """
    # Find question using aggregation pipeline
    pipeline = [
        {"$unwind": "$questions"},
        {"$match": {"questions.question_id": question_id}},
        {"$limit": 1}
    ]

    results = await ContentComprehension.get_motor_collection().aggregate(
        pipeline
    ).to_list(length=1)

    if not results:
        raise HTTPException(status_code=404, detail="Question not found")

    result = results[0]
    content_id = result["content_id"]

    # Reconstruct question model
    question_dict = result["questions"]
    question_model = ComprehensionQuestionModel(**question_dict)

    # Check answer correctness
    is_correct = submit_data.selected_option == question_model.correct_index
    points_earned = question_model.points if is_correct else 0

    # Deduct credits for beta users
    credits_deducted = 0
    if user.is_beta_user:
        credit_service = BetaCreditService()
        await credit_service.deduct(
            user_id=str(user.id),
            feature="comprehension_question",
            usage=settings.CREDIT_RATE_COMPREHENSION_QUESTION,
            transaction_id=None
        )
        credits_deducted = int(settings.CREDIT_RATE_COMPREHENSION_QUESTION)

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
