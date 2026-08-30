"""
Olorin.ai Free Trivia Generator

Zero-friction top-of-funnel tool: paste a video URL, get an AI-generated
trivia quiz. No auth required, IP rate-limited.
Viral mechanic #3.
"""

import hashlib
import uuid
from typing import Dict, List, Optional

from fastapi import APIRouter, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core.ai_clients import ProviderOperationTimeouts, get_provider_http_client
from app.core.logging_config import get_logger
from app.models.trivia import ContentTrivia
from app.utils.video_url_utils import extract_video_title, validate_video_url

logger = get_logger(__name__)

router = APIRouter()


class FreeQuizRequest(BaseModel):
    """Request to generate a free trivia quiz."""

    video_url: str = Field(..., description="Video URL (YouTube, etc.)")


class QuizQuestion(BaseModel):
    """A single quiz question with choices."""

    question: str
    choices: List[str]
    correct_index: int = Field(ge=0, le=3)


class FreeQuizResponse(BaseModel):
    """Generated quiz."""

    quiz_id: str
    video_url: str
    title: str
    questions: List[QuizQuestion]
    share_url: str
    powered_by: str = "Olorin.ai"


class QuizViewResponse(BaseModel):
    """Shareable quiz view."""

    quiz_id: str
    title: str
    questions: List[QuizQuestion]
    powered_by: str = "Olorin.ai"


# In-memory quiz cache (single-instance MVP; production uses MongoDB)
_quiz_cache: Dict[str, FreeQuizResponse] = {}


@router.post(
    "",
    response_model=FreeQuizResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate free trivia quiz",
)
async def generate_free_quiz(
    request: FreeQuizRequest,
    http_request: Request,
) -> FreeQuizResponse:
    """Paste a video URL, get an AI trivia quiz. No auth required."""
    ok, err = validate_video_url(request.video_url)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=err,
        )

    title = await extract_video_title(request.video_url) or "Video Quiz"
    quiz_id = hashlib.md5(
        request.video_url.encode(),
    ).hexdigest()[:12]

    # Check cache first
    if quiz_id in _quiz_cache:
        return _quiz_cache[quiz_id]

    try:
        questions = await _generate_quiz_questions(
            request.video_url, title,
        )
    except Exception:
        logger.exception(
            "Quiz generation failed",
            extra={"url": request.video_url[:80]},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Quiz generation failed. Try again later.",
        )

    from app.core.config import settings
    base_url = settings.olorin.api_base_url

    quiz = FreeQuizResponse(
        quiz_id=quiz_id,
        video_url=request.video_url,
        title=title,
        questions=questions,
        share_url=f"{base_url}/v1/tools/trivia/{quiz_id}",
    )

    _quiz_cache[quiz_id] = quiz

    logger.info(
        "Free quiz generated",
        extra={
            "quiz_id": quiz_id,
            "questions": len(questions),
            "title": title[:60],
        },
    )
    return quiz


@router.get(
    "/{quiz_id}",
    response_model=QuizViewResponse,
    summary="View a shared quiz",
)
async def view_quiz(quiz_id: str) -> QuizViewResponse:
    """View a previously generated quiz. No auth required."""
    quiz = _quiz_cache.get(quiz_id)
    if not quiz:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Quiz not found or expired",
        )

    return QuizViewResponse(
        quiz_id=quiz.quiz_id,
        title=quiz.title,
        questions=quiz.questions,
    )


async def _generate_quiz_questions(
    video_url: str, title: str,
) -> List[QuizQuestion]:
    """Generate 5 quiz questions from video content via Claude."""
    from app.core.config import settings

    prompt = (
        f"Generate exactly 5 multiple-choice trivia questions about "
        f"the video titled \"{title}\" (URL: {video_url}). "
        f"Each question should have 4 choices (A-D) with one correct. "
        f"Return ONLY a JSON array of objects with keys: "
        f"question, choices (array of 4 strings), correct_index (0-3). "
        f"No explanation, no markdown, just the JSON array."
    )

    client = get_provider_http_client()
    operation_timeouts = ProviderOperationTimeouts.from_settings()
    resp = await client.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": settings.ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": "claude-haiku-4-5-20251001",
            "max_tokens": 2048,
            "messages": [{"role": "user", "content": prompt}],
        },
        timeout=operation_timeouts.anthropic_trivia,
    )
    resp.raise_for_status()
    data = resp.json()

    import json
    text = data["content"][0]["text"]
    # Extract JSON from response (may have markdown wrapping)
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    questions_raw = json.loads(text)
    return [
        QuizQuestion(
            question=q["question"],
            choices=q["choices"][:4],
            correct_index=q.get("correct_index", 0),
        )
        for q in questions_raw[:5]
    ]
