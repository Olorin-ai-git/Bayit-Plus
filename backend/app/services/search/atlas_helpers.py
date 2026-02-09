"""Atlas Search helpers: filter builders and fallback strategies."""

import re
from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.services.search.models import ScoredResult, SearchFilters
from app.services.search.raw_serializer import raw_doc_to_dict

logger = get_logger(__name__)

# Map pipeline source names to content_type values used by raw_serializer
_SOURCE_TO_CONTENT_TYPE = {
    "vod": "vod",
    "livechannel": "live",
    "podcast": "podcast",
    "radiostation": "radio",
}


def build_content_filters(filters: SearchFilters) -> List[Dict[str, Any]]:
    """Build Atlas Search filter clauses from SearchFilters for the content collection."""
    clauses: List[Dict[str, Any]] = []
    if filters.genres:
        clauses.append({"text": {"path": "genres", "query": " ".join(filters.genres)}})
    if filters.year_min is not None or filters.year_max is not None:
        r: Dict[str, Any] = {"path": "year"}
        if filters.year_min is not None:
            r["gte"] = filters.year_min
        if filters.year_max is not None:
            r["lte"] = filters.year_max
        clauses.append({"range": r})
    if filters.rating_min is not None:
        clauses.append({"range": {"path": "avg_rating", "gte": filters.rating_min}})
    if filters.subtitle_languages:
        clauses.append({"text": {"path": "available_subtitle_languages",
                                 "query": " ".join(filters.subtitle_languages)}})
    if filters.subscription_tier:
        clauses.append({"text": {"path": "requires_subscription",
                                 "query": filters.subscription_tier}})
    if filters.is_kids_content is True:
        clauses.append({"equals": {"path": "is_kids_content", "value": True}})
    return clauses


def extract_query_from_pipeline(pipeline: List[Dict[str, Any]]) -> str:
    """Extract the original query string from an Atlas Search pipeline."""
    search_stage = pipeline[0].get("$search", {})
    compound = search_stage.get("compound", {})
    for clause in compound.get("should", []):
        for op in ("text", "phrase"):
            if op in clause:
                text = clause[op].get("query", "")
                if text:
                    return text
    return ""


def docs_to_scored(docs: List[Dict[str, Any]], source: str,
                   score_key: str = "search_score") -> List[ScoredResult]:
    """Convert raw MongoDB docs to ScoredResult list.

    Serializes each raw document through raw_doc_to_dict to ensure
    consistent API shape (``id`` instead of ``_id``, normalized fields).
    """
    content_type = _SOURCE_TO_CONTENT_TYPE.get(source, source)
    results: List[ScoredResult] = []
    for rank, doc in enumerate(docs, start=1):
        doc_id = str(doc.get("_id", ""))
        score = doc.get(score_key, 0.0)
        serialized = raw_doc_to_dict(doc, content_type)
        results.append(ScoredResult(
            content_id=doc_id, content_dict=serialized,
            atlas_score=score, atlas_rank=rank, source=source,
        ))
    return results


async def fallback_text(model, original_pipeline: List[Dict[str, Any]],
                        source: str, fetch_limit: int) -> List[ScoredResult]:
    """$text fallback when Atlas Search index is unavailable."""
    query_text = extract_query_from_pipeline(original_pipeline)
    if not query_text:
        return []

    collection = model.get_pymongo_collection()
    try:
        cursor = collection.find(
            {"$text": {"$search": query_text}},
            {"score": {"$meta": "textScore"}},
        ).sort([("score", {"$meta": "textScore"})]).limit(fetch_limit)
        docs = await cursor.to_list(length=fetch_limit)
    except Exception as exc:
        logger.warning("$text fallback failed, using $regex",
                       extra={"source": source, "error": str(exc)})
        return await fallback_regex(model, query_text, source, fetch_limit)

    return docs_to_scored(docs, source, score_key="score")


async def fallback_regex(model, query_text: str, source: str,
                         fetch_limit: int) -> List[ScoredResult]:
    """Last-resort $regex search when both $search and $text are unavailable."""
    escaped = re.escape(query_text)
    collection = model.get_pymongo_collection()
    cursor = collection.find(
        {"$or": [
            {"title": {"$regex": escaped, "$options": "i"}},
            {"title_en": {"$regex": escaped, "$options": "i"}},
            {"title_es": {"$regex": escaped, "$options": "i"}},
        ]}
    ).limit(fetch_limit)
    docs = await cursor.to_list(length=fetch_limit)
    return docs_to_scored(docs, source, score_key="_no_score")
