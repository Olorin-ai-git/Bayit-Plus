"""Training AI Companion — cached, credit-aware, preview-safe.

Results are cached per (content_id, language, tab). First successful
call deducts credits and stores the result. Subsequent calls return
cached data for free. Preview mode skips credit deduction entirely.
"""

import json
import uuid
from typing import Optional

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from app.api.routes.companion import (
    CompanionContextResponse,
    CompanionCulturalResponse,
    CompanionQuizResponse,
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
# Cache: {(content_id, language, tab): response_dict}
_cache: dict[tuple[str, str, str], dict] = {}


class TrainingCompanionRequest(BaseModel):
    content_id: str
    language: str = "en"
    preview: bool = False


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


def _get_cached(
    content_id: str, language: str, tab: str,
) -> Optional[dict]:
    return _cache.get((content_id, language, tab))


def _set_cached(
    content_id: str, language: str, tab: str, data: dict,
) -> None:
    _cache[(content_id, language, tab)] = data


def _transcript_excerpt(content) -> str:
    raw = getattr(content, "transcript_segments", None) or []
    if not raw:
        return ""
    return " ".join(seg.get("text", "") for seg in raw[:50]).strip()[:2000]


def _strip_fences(raw: str) -> str:
    stripped = raw.strip()
    if stripped.startswith("```"):
        stripped = stripped.split("\n", 1)[-1]
        if stripped.endswith("```"):
            stripped = stripped[:-3].strip()
    return stripped


def _call_claude(prompt: str, content_id: str, label: str) -> dict:
    try:
        client = _get_client()
        resp = client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = next((b.text for b in resp.content if b.type == "text"), "{}")
        return json.loads(_strip_fences(raw))
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
    req: TrainingCompanionRequest,
    _user: TrainingUser = Depends(get_current_training_user),
) -> CompanionContextResponse:
    cached = _get_cached(req.content_id, req.language, "context")
    if cached:
        return CompanionContextResponse(**cached)
    if not req.preview:
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
    if data:
        _set_cached(req.content_id, req.language, "context", data)
    return CompanionContextResponse(**data) if data else CompanionContextResponse()


@router.post("/quiz", response_model=CompanionQuizResponse)
async def quiz(
    req: TrainingCompanionRequest,
    _user: TrainingUser = Depends(get_current_training_user),
) -> CompanionQuizResponse:
    cached = _get_cached(req.content_id, req.language, "quiz")
    if cached:
        return CompanionQuizResponse(**cached)
    if not req.preview:
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
    result = {"questions": [QuizQuestion(**q).model_dump() for q in qs]}
    if qs:
        _set_cached(req.content_id, req.language, "quiz", result)
    return CompanionQuizResponse(**result)


@router.post("/vocabulary", response_model=CompanionVocabularyResponse)
async def vocabulary(
    req: TrainingCompanionRequest,
    _user: TrainingUser = Depends(get_current_training_user),
) -> CompanionVocabularyResponse:
    cached = _get_cached(req.content_id, req.language, "vocabulary")
    if cached:
        return CompanionVocabularyResponse(**cached)
    if not req.preview:
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
    result = {"terms": [VocabularyItem(**t).model_dump() for t in ts]}
    if ts:
        _set_cached(req.content_id, req.language, "vocabulary", result)
    return CompanionVocabularyResponse(**result)


@router.post("/cultural", response_model=CompanionCulturalResponse)
async def cultural(
    req: TrainingCompanionRequest,
    _user: TrainingUser = Depends(get_current_training_user),
) -> CompanionCulturalResponse:
    cached = _get_cached(req.content_id, req.language, "cultural")
    if cached:
        return CompanionCulturalResponse(**cached)
    if not req.preview:
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
    result = {"references": [CulturalReference(**r).model_dump() for r in rs]}
    if rs:
        _set_cached(req.content_id, req.language, "cultural", result)
    return CompanionCulturalResponse(**result)
