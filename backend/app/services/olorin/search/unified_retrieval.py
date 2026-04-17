"""Scope-filtered unified retrieval across canonical, document, and video vectors."""

from dataclasses import dataclass, field
from math import floor

from app.core.config import settings
from app.services.olorin.search.pinecone_ops import safe_pinecone_query


@dataclass
class CanonicalHit:
    canonical_id: str
    question: str
    answer: str
    boosted_score: float
    raw_score: float
    status: str


@dataclass
class VideoHit:
    content_id: str
    title: str
    text: str
    timestamp_seconds: float | None
    boosted_score: float
    raw_score: float


@dataclass
class DocumentHit:
    document_id: str
    title: str
    chunk_index: int
    text: str
    page_number: int | None
    boosted_score: float
    raw_score: float


@dataclass
class UnifiedResults:
    canonical_hits: list[CanonicalHit] = field(default_factory=list)
    video_hits: list[VideoHit] = field(default_factory=list)
    document_hits: list[DocumentHit] = field(default_factory=list)


def _scope_filter(partner_id: str, tier: str):
    if tier == "team":
        return "global"
    return {"$in": [f"partner:{partner_id}", "global"]}


def _top_k(tier: str) -> int:
    if tier == "team":
        return settings.KNOWLEDGE_PINECONE_TOP_K_TEAM
    return settings.KNOWLEDGE_PINECONE_TOP_K_ORG


def _canonical_boost(status: str) -> float:
    if status == "stale":
        return settings.KNOWLEDGE_STALE_BOOST
    if status == "pending_review":
        return 1.0
    return settings.KNOWLEDGE_CANONICAL_BOOST


async def query_unified_corpus(
    *,
    index,
    query_vec: list[float],
    partner_id: str,
    tier: str,
    max_sources: int,
) -> UnifiedResults:
    filter_dict = {
        "scope": _scope_filter(partner_id, tier),
        "source_type": {
            "$in": [
                "subtitle_segment",
                "description",
                "canonical_qa",
                "document_chunk",
            ]
        },
    }
    raw = await safe_pinecone_query(
        index,
        vector=query_vec,
        top_k=_top_k(tier),
        filter_dict=filter_dict,
        include_metadata=True,
    )
    result = UnifiedResults()
    if not raw or not raw.matches:
        return result

    seen_canonical: set[str] = set()
    seen_video_bin: set[tuple[str, int]] = set()
    seen_doc_chunk: set[tuple[str, int]] = set()

    for m in raw.matches:
        meta = m.metadata or {}
        stype = meta.get("source_type")
        if stype == "canonical_qa":
            cid = meta.get("canonical_id")
            if not cid or cid in seen_canonical:
                continue
            seen_canonical.add(cid)
            boost = _canonical_boost(meta.get("canonical_status", "active"))
            result.canonical_hits.append(
                CanonicalHit(
                    canonical_id=cid,
                    question=meta.get("question", ""),
                    answer=meta.get("answer", meta.get("text", "")),
                    raw_score=m.score,
                    boosted_score=m.score * boost,
                    status=meta.get("canonical_status", "active"),
                )
            )
        elif stype == "document_chunk":
            doc_id = meta.get("document_id")
            chunk_idx = meta.get("chunk_index", 0)
            key = (doc_id, chunk_idx)
            if not doc_id or key in seen_doc_chunk:
                continue
            seen_doc_chunk.add(key)
            result.document_hits.append(
                DocumentHit(
                    document_id=doc_id,
                    title=meta.get("title", doc_id),
                    chunk_index=chunk_idx,
                    text=meta.get("text", ""),
                    page_number=meta.get("page_number"),
                    raw_score=m.score,
                    boosted_score=m.score * settings.KNOWLEDGE_DOC_BOOST,
                )
            )
        else:
            # subtitle_segment or description: video-band deduplication
            content_id = meta.get("content_id")
            if not content_id:
                continue
            start = meta.get("start_time") or 0
            bin_key = (content_id, int(floor(float(start) / 30)))
            if bin_key in seen_video_bin:
                continue
            seen_video_bin.add(bin_key)
            result.video_hits.append(
                VideoHit(
                    content_id=content_id,
                    title=meta.get("title", content_id),
                    text=meta.get("text", ""),
                    timestamp_seconds=meta.get("start_time"),
                    raw_score=m.score,
                    boosted_score=m.score * 1.0,
                )
            )

    result.canonical_hits.sort(key=lambda h: h.boosted_score, reverse=True)
    result.video_hits.sort(key=lambda h: h.boosted_score, reverse=True)
    result.document_hits.sort(key=lambda h: h.boosted_score, reverse=True)

    total = max_sources
    c = result.canonical_hits[: min(total, len(result.canonical_hits))]
    remaining = total - len(c)
    v = result.video_hits[: max(0, remaining)]
    remaining -= len(v)
    d = result.document_hits[: max(0, remaining)]
    return UnifiedResults(canonical_hits=c, video_hits=v, document_hits=d)
