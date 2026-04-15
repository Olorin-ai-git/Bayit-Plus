"""Cross-video knowledge search: RAG across all org training content."""

import json

import anthropic
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.api.routes.training.dependencies import get_current_training_user
from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.content import Content
from app.models.integration_partner import IntegrationPartner
from app.models.training_user import TrainingUser
from app.services.olorin.search.client import client_manager
from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.pinecone_ops import safe_pinecone_query
from app.services.training.credit_service import TrainingCreditService

logger = get_logger(__name__)
router = APIRouter(prefix="/knowledge", tags=["training-knowledge"])

KNOWLEDGE_TIERS = {"organization", "enterprise"}
_credit_svc: TrainingCreditService | None = None


def _get_credit_svc() -> TrainingCreditService:
    global _credit_svc
    if _credit_svc is None:
        _credit_svc = TrainingCreditService(settings)
    return _credit_svc


class AskRequest(BaseModel):
    question: str = Field(..., min_length=3, max_length=500)
    max_sources: int = Field(default=5, ge=1, le=10)


class Source(BaseModel):
    content_id: str
    content_title: str
    matched_text: str
    timestamp_seconds: float | None = None
    timestamp_formatted: str | None = None
    relevance_score: float


class AskResponse(BaseModel):
    answer: str
    sources: list[Source]


async def _get_tier(partner_id: str) -> str:
    partner = await IntegrationPartner.find_one(
        IntegrationPartner.partner_id == partner_id
    )
    if not partner:
        return "team"
    if partner.billing_tier == "training":
        return (partner.training_config or {}).get("tier", "team")
    return partner.billing_tier


def _fmt_ts(seconds: float | None) -> str | None:
    if seconds is None:
        return None
    m, s = divmod(int(seconds), 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def _build_prompt(question: str, segments: list[dict]) -> str:
    ctx = ""
    for seg in segments:
        ts = _fmt_ts(seg.get("start_time"))
        label = f'[Video: "{seg["title"]}"'
        if ts:
            label += f" at {ts}"
        label += "]"
        ctx += f"{label}\n{seg['text']}\n---\n"

    return (
        "You are an AI assistant for a corporate training platform. "
        "Answer the employee's question using ONLY the training video "
        "excerpts provided below. Cite specific videos by title when "
        "referencing information. If the excerpts don't contain enough "
        "information to answer, say so clearly.\n\n"
        f"Question: {question}\n\n"
        f"Training video excerpts:\n---\n{ctx}\n"
        "Answer concisely, citing video titles."
    )


def _call_claude(prompt: str) -> str:
    client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
    resp = client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=1024,
        messages=[{"role": "user", "content": prompt}],
    )
    return next((b.text for b in resp.content if b.type == "text"), "")


@router.post("/ask", response_model=AskResponse)
async def ask_knowledge(
    req: AskRequest,
    user: TrainingUser = Depends(get_current_training_user),
):
    """Ask a question across all training content in the organization."""
    tier = await _get_tier(user.partner_id)
    if tier not in KNOWLEDGE_TIERS:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cross-video knowledge requires Organization tier or above",
        )

    svc = _get_credit_svc()
    ok, _ = await svc.deduct(partner_id=user.partner_id, feature="semantic_search")
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Insufficient AI credits.",
        )

    if not client_manager.is_initialized:
        await client_manager.initialize()

    query_vec = await generate_embedding(req.question)
    if not query_vec:
        raise HTTPException(status_code=502, detail="Embedding service unavailable")

    pinecone_index = client_manager.pinecone_index
    if not pinecone_index:
        raise HTTPException(status_code=502, detail="Search service unavailable")

    results = await safe_pinecone_query(
        pinecone_index,
        vector=query_vec,
        top_k=req.max_sources * 3,
        filter_dict={
            "partner_id": user.partner_id,
            "embedding_type": {"$in": ["subtitle_segment", "description"]},
        },
        include_metadata=True,
    )

    if not results or not results.matches:
        return AskResponse(answer="No relevant training content found.", sources=[])

    content_ids = list({
        m.metadata.get("content_id")
        for m in results.matches if m.metadata
    })
    contents = await Content.find({"_id": {"$in": content_ids}}).to_list()
    title_map = {str(c.id): c.title for c in contents}

    segments: list[dict] = []
    sources: list[Source] = []
    seen = set()

    for match in results.matches:
        meta = match.metadata or {}
        cid = meta.get("content_id")
        text = meta.get("text", "").strip()
        if not cid or not text:
            continue

        key = (cid, text[:80])
        if key in seen:
            continue
        seen.add(key)

        title = title_map.get(cid, cid)
        start = meta.get("start_time")

        segments.append({"title": title, "text": text, "start_time": start})
        sources.append(Source(
            content_id=cid, content_title=title, matched_text=text,
            timestamp_seconds=start, timestamp_formatted=_fmt_ts(start),
            relevance_score=round(match.score, 3),
        ))
        if len(segments) >= req.max_sources:
            break

    if not segments:
        return AskResponse(answer="No relevant training content found.", sources=[])

    try:
        prompt = _build_prompt(req.question, segments)
        answer = _call_claude(prompt)
    except anthropic.APIError as exc:
        logger.error("Knowledge ask AI error", extra={"error": str(exc)})
        raise HTTPException(status_code=502, detail="AI service unavailable")

    return AskResponse(answer=answer, sources=sources)
