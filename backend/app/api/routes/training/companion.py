"""Training AI Companion — wraps B2C companion with training auth.

The B2C companion endpoints use get_current_active_user which requires
RS256 tokens from auth.olorin.ai. Training portal users authenticate
with HS256 JWTs that are rejected by decode_token. This module re-
exposes the same endpoint logic under training auth.
"""

import json
import uuid

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.routes.companion import (
    CompanionContextResponse,
    CompanionCulturalResponse,
    CompanionQuizResponse,
    CompanionRequest,
    CompanionVocabularyResponse,
    QuizQuestion,
    VocabularyItem,
    CulturalReference,
    _build_content_summary,
    _fetch_content,
    _get_client,
)
from app.api.routes.training.dependencies import get_current_training_user
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.training_user import TrainingUser
from app.services.training.credit_service import TrainingCreditService

logger = get_logger(__name__)
router = APIRouter(tags=["training-companion"])

_credit_svc: TrainingCreditService | None = None


def _get_credit_svc() -> TrainingCreditService:
    global _credit_svc
    if _credit_svc is None:
        _credit_svc = TrainingCreditService(settings)
    return _credit_svc


async def _deduct(user: TrainingUser, feature: str) -> None:
    svc = _get_credit_svc()
    ok, _ = await svc.deduct(partner_id=user.partner_id, feature=feature)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient AI credits.",
        )


def _transcript_excerpt(content) -> str:
    raw = getattr(content, "transcript_segments", None) or []
    if not raw:
        return ""
    return " ".join(seg.get("text", "") for seg in raw[:50]).strip()[:2000]


def _call_claude(prompt: str, content_id: str, label: str) -> dict:
    try:
        client = _get_client()
        resp = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = next((b.text for b in resp.content if b.type == "text"), "{}")
        return json.loads(raw)
    except json.JSONDecodeError:
        logger.warning("Training companion %s: invalid JSON", label,
                       extra={"content_id": content_id})
        return {}
    except anthropic.APIError as exc:
        logger.error("Training companion %s AI error", label,
                     extra={"error": str(exc)})
        raise HTTPException(status_code=502, detail="AI service unavailable")


def _base_prompt(summary: str, transcript: str) -> str:
    p = f"Based on this content:\n{summary}\n\n"
    if transcript:
        p += f"Transcript excerpt:\n{transcript}\n\n"
    return p


def _ensure_ids(items: list) -> None:
    for item in items:
        if not item.get("id"):
            item["id"] = str(uuid.uuid4())[:8]


@router.post("/context", response_model=CompanionContextResponse)
async def context(
    req: CompanionRequest,
    _user: TrainingUser = Depends(get_current_training_user),
) -> CompanionContextResponse:
    await _deduct(_user, "companion")
    content = await _fetch_content(req.content_id)
    prompt = _base_prompt(
        _build_content_summary(content), _transcript_excerpt(content),
    ) + (
        "Generate educational context. Return valid JSON:\n"
        '{"context":"2-3 sentence summary",'
        '"topics":[{"id":"id","title":"T","description":"D"}],'
        '"related_links":[{"id":"id","title":"T","url":"https://..."}]}\n'
        "Include 2-4 topics and 1-2 educational links. "
        f"Respond in {req.language}. Return ONLY JSON, no markdown."
    )
    data = _call_claude(prompt, req.content_id, "context")
    return CompanionContextResponse(**data) if data else CompanionContextResponse()


@router.post("/quiz", response_model=CompanionQuizResponse)
async def quiz(
    req: CompanionRequest,
    _user: TrainingUser = Depends(get_current_training_user),
) -> CompanionQuizResponse:
    await _deduct(_user, "companion")
    content = await _fetch_content(req.content_id)
    prompt = _base_prompt(
        _build_content_summary(content), _transcript_excerpt(content),
    ) + (
        "Generate 4 multiple-choice comprehension questions. Return JSON:\n"
        '{"questions":[{"id":"q1","question":"Q?","options":["A","B","C","D"],'
        '"correct_index":0,"explanation":"Why","category":"comprehension",'
        '"difficulty":"medium"}]}\n'
        "Mix: key concepts, details, application. "
        f"Respond in {req.language}. Return ONLY JSON, no markdown."
    )
    data = _call_claude(prompt, req.content_id, "quiz")
    qs = data.get("questions", [])
    _ensure_ids(qs)
    return CompanionQuizResponse(questions=[QuizQuestion(**q) for q in qs])


@router.post("/vocabulary", response_model=CompanionVocabularyResponse)
async def vocabulary(
    req: CompanionRequest,
    _user: TrainingUser = Depends(get_current_training_user),
) -> CompanionVocabularyResponse:
    await _deduct(_user, "companion")
    content = await _fetch_content(req.content_id)
    prompt = _base_prompt(
        _build_content_summary(content), _transcript_excerpt(content),
    ) + (
        "Generate 5-8 key vocabulary terms. Return JSON:\n"
        '{"terms":[{"id":"id","term":"T","definition":"D",'
        '"usage_example":"Example","category":"technical|conceptual"}]}\n'
        "Focus on domain-specific terminology. "
        f"Respond in {req.language}. Return ONLY JSON, no markdown."
    )
    data = _call_claude(prompt, req.content_id, "vocabulary")
    ts = data.get("terms", [])
    _ensure_ids(ts)
    return CompanionVocabularyResponse(terms=[VocabularyItem(**t) for t in ts])


@router.post("/cultural", response_model=CompanionCulturalResponse)
async def cultural(
    req: CompanionRequest,
    _user: TrainingUser = Depends(get_current_training_user),
) -> CompanionCulturalResponse:
    await _deduct(_user, "cultural")
    content = await _fetch_content(req.content_id)
    prompt = _base_prompt(_build_content_summary(content), "") + (
        "Identify 3-6 cultural references in this content. Return JSON:\n"
        '{"references":[{"id":"id","term":"T","explanation":"E",'
        '"category":"religious|historical|linguistic|social",'
        '"origin":"Background"}]}\n'
        f"Respond in {req.language}. Return ONLY JSON, no markdown."
    )
    data = _call_claude(prompt, req.content_id, "cultural")
    rs = data.get("references", [])
    _ensure_ids(rs)
    return CompanionCulturalResponse(references=[CulturalReference(**r) for r in rs])
