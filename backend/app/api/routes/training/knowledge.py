"""Cross-video knowledge search with unified scope + per-type boost + canonical-verbatim."""

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import (
    deduct_training_credits,
    get_current_training_user,
)
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.ask_candidate import AskCandidate, CandidateCanonicalHit, CandidateSource
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.services.olorin.search.client import client_manager
from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.unified_retrieval import CanonicalHit, UnifiedResults, query_unified_corpus

logger = get_logger(__name__)
router = APIRouter(prefix="/knowledge", tags=["training-knowledge"])
KNOWLEDGE_TIERS_ORG_PLUS = {"organization", "enterprise"}
KNOWLEDGE_TIERS_ANY = KNOWLEDGE_TIERS_ORG_PLUS | {"team"}


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    max_sources: int = Field(default=5, ge=1, le=10)


class SourceOut(BaseModel):
    content_id: str
    content_title: str
    matched_text: str
    timestamp_seconds: float | None = None
    timestamp_formatted: str | None = None
    relevance_score: float


class CanonicalHitOut(BaseModel):
    canonical_id: str
    question: str
    answer: str
    boosted_score: float
    status: str


class AskResponse(BaseModel):
    answer: str
    sources: list[SourceOut]
    mode: str
    canonical_hits: list[CanonicalHitOut]
    document_hits: list[dict]
    credits_charged: int


async def _get_tier(partner_id: str) -> str:
    partner = await IntegrationPartner.find_one(IntegrationPartner.partner_id == partner_id)
    if not partner:
        return "team"
    if partner.billing_tier == "training":
        return (partner.training_config or {}).get("org_tier", "team")
    return partner.billing_tier

def _fmt_ts(seconds):
    if seconds is None:
        return None
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"

def _build_blend_prompt(question: str, unified: UnifiedResults) -> str:
    parts = []
    if unified.canonical_hits:
        parts.append("=== Team-vetted answers (prefer when directly relevant) ===")
        for h in unified.canonical_hits:
            parts.append(f"[your team's memory]\nQ: {h.question}\nA: {h.answer}")
    if unified.video_hits:
        parts.append("=== Training videos ===")
        for h in unified.video_hits:
            ts = _fmt_ts(h.timestamp_seconds)
            label = f'[Video: "{h.title}"' + (f" at {ts}]" if ts else "]")
            parts.append(f"{label}\n{h.text}")
    if unified.document_hits:
        parts.append("=== Reference documents ===")
        for h in unified.document_hits:
            page = f", p.{h.page_number}" if h.page_number is not None else ""
            parts.append(f"[Document: {h.title}{page}]\n{h.text}")
    ctx = "\n---\n".join(parts) if parts else ""
    return (
        "You are an AI assistant for a corporate training platform. "
        "Use these sources to answer. Prefer team-vetted answers when they "
        "directly match. Cite each source by its type: `your team's memory`, "
        "`[Video Title @ mm:ss]`, `[Document Name, p.N]`. If the excerpts "
        "don't contain enough information, say so clearly.\n\n"
        f"Question: {question}\n\nSources:\n---\n{ctx}\n"
    )

async def _call_claude(prompt: str) -> str:
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    resp = await client.messages.create(
        model=settings.CLAUDE_MODEL, max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return next((b.text for b in resp.content if b.type == "text"), "")

def _render_sources(unified: UnifiedResults) -> list[SourceOut]:
    return [SourceOut(
        content_id=h.content_id, content_title=h.title, matched_text=h.text,
        timestamp_seconds=h.timestamp_seconds, timestamp_formatted=_fmt_ts(h.timestamp_seconds),
        relevance_score=round(h.boosted_score, 3),
    ) for h in unified.video_hits]

def _render_canonical(hits: list[CanonicalHit]) -> list[CanonicalHitOut]:
    return [CanonicalHitOut(
        canonical_id=h.canonical_id, question=h.question, answer=h.answer,
        boosted_score=round(h.boosted_score, 3), status=h.status,
    ) for h in hits]

def _render_documents(unified: UnifiedResults) -> list[dict]:
    return [{
        "document_id": h.document_id,
        "title": h.title,
        "chunk_index": h.chunk_index,
        "matched_text": h.text,
        "page_number": h.page_number,
    } for h in unified.document_hits]

async def _record_candidate(
    *, user: TrainingUser, question: str, answer: str, mode: str,
    sources: list[SourceOut], canonical: list[CanonicalHitOut],
    credits_charged: int, scope: str,
) -> None:
    try:
        await AskCandidate(
            partner_id=user.partner_id, asker_user_id=str(user.id),
            scope=scope, question=question, answer=answer, mode=mode,
            sources=[CandidateSource(
                content_id=s.content_id, content_title=s.content_title,
                matched_text=s.matched_text, timestamp_seconds=s.timestamp_seconds,
                relevance_score=s.relevance_score,
            ) for s in sources],
            canonical_hits=[CandidateCanonicalHit(
                canonical_id=c.canonical_id, question=c.question,
                answer=c.answer, boosted_score=c.boosted_score, status=c.status,
            ) for c in canonical],
            credits_charged=credits_charged,
        ).insert()
    except Exception as exc:
        logger.warning("Candidate logging failed (non-blocking)",
                       extra={"error": str(exc), "partner_id": user.partner_id})


@router.post("/ask", response_model=AskResponse)
async def ask_knowledge(
    req: AskRequest,
    user: TrainingUser = Depends(get_current_training_user),
):
    tier = await _get_tier(user.partner_id)
    if tier not in KNOWLEDGE_TIERS_ANY:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                            detail="Ask Olorin requires at least team tier")
    scope_label = "global" if tier == "team" else "partner"

    if not client_manager.is_initialized:
        await client_manager.initialize()
    pinecone_index = client_manager.pinecone_index
    if not pinecone_index:
        raise HTTPException(status_code=502, detail="Search service unavailable")

    query_vec = await generate_embedding(req.question)
    if not query_vec:
        raise HTTPException(status_code=502, detail="Embedding service unavailable")

    unified = await query_unified_corpus(
        index=pinecone_index, query_vec=query_vec,
        partner_id=user.partner_id, tier=tier, max_sources=req.max_sources,
    )

    sources = _render_sources(unified)
    canonical_out = _render_canonical(unified.canonical_hits)
    threshold = settings.KNOWLEDGE_CANONICAL_CONFIDENCE_THRESHOLD

    if unified.canonical_hits and unified.canonical_hits[0].boosted_score >= threshold:
        mode, answer, credits = "canonical_verbatim", unified.canonical_hits[0].answer, 0
    elif unified.canonical_hits or unified.video_hits or unified.document_hits:
        _ = await deduct_training_credits("companion", user)
        try:
            answer = await _call_claude(_build_blend_prompt(req.question, unified))
        except anthropic.APIError as exc:
            logger.error("Knowledge ask AI error", extra={"error": str(exc)})
            raise HTTPException(status_code=502, detail="AI service unavailable")
        mode = "blended" if (unified.canonical_hits or unified.document_hits) else "video_only"
        credits = 1
    else:
        mode, answer, credits = "no_match", "No relevant training content found.", 0

    await _record_candidate(
        user=user, question=req.question, answer=answer, mode=mode,
        sources=sources, canonical=canonical_out, credits_charged=credits, scope=scope_label,
    )
    logger.info("Knowledge ask completed", extra={
        "partner_id": user.partner_id, "mode": mode,
        "source_count": len(sources), "credits_charged": credits,
    })
    return AskResponse(answer=answer, sources=sources, mode=mode,
                       canonical_hits=canonical_out, document_hits=_render_documents(unified),
                       credits_charged=credits)
