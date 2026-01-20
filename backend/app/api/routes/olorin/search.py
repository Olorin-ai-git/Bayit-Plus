"""
Olorin.ai Semantic Search API

Endpoints for semantic content search with timestamp deep-linking.
"""

import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.models.integration_partner import IntegrationPartner
from app.models.content_embedding import (
    SearchQuery,
    DialogueSearchQuery,
    SemanticSearchResult,
    IndexContentRequest,
)
from app.services.olorin.vector_search_service import vector_search_service
from app.services.olorin.metering_service import metering_service
from app.api.routes.olorin.dependencies import (
    get_current_partner,
    verify_capability,
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ============================================
# Request/Response Models
# ============================================


class SemanticSearchRequest(BaseModel):
    """Request for semantic search."""

    query: str = Field(..., min_length=2, max_length=500)
    language: str = Field(default="he")
    content_types: Optional[List[str]] = Field(default=None)
    genre_ids: Optional[List[str]] = Field(default=None)
    section_ids: Optional[List[str]] = Field(default=None)
    include_timestamps: bool = Field(
        default=True,
        description="Include subtitle/dialogue matches with timestamps",
    )
    limit: int = Field(default=20, ge=1, le=100)
    min_score: float = Field(default=0.7, ge=0.0, le=1.0)


class DialogueSearchRequest(BaseModel):
    """Request for dialogue/subtitle search."""

    query: str = Field(..., min_length=2, max_length=500)
    language: str = Field(default="he")
    content_id: Optional[str] = Field(
        default=None,
        description="Limit search to specific content",
    )
    limit: int = Field(default=50, ge=1, le=200)
    min_score: float = Field(default=0.6, ge=0.0, le=1.0)


class SearchResultItem(BaseModel):
    """A single search result."""

    content_id: str
    title: str
    title_en: Optional[str] = None
    content_type: Optional[str] = None
    thumbnail_url: Optional[str] = None
    matched_text: str
    match_type: str
    relevance_score: float
    timestamp_seconds: Optional[float] = None
    timestamp_formatted: Optional[str] = None
    deep_link: Optional[str] = None  # URL with timestamp parameter


class SearchResponse(BaseModel):
    """Search response."""

    query: str
    results: List[SearchResultItem]
    total_results: int
    tokens_used: int


class IndexResponse(BaseModel):
    """Indexing response."""

    content_id: str
    status: str
    segments_indexed: int = 0
    error: Optional[str] = None


# ============================================
# Endpoints
# ============================================


@router.post(
    "/semantic",
    response_model=SearchResponse,
    summary="Semantic content search",
    description="Search content using natural language queries. Returns relevant content "
    "with optional timestamp deep-links for dialogue matches.",
)
async def semantic_search(
    request: SemanticSearchRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Perform semantic search across content."""
    # Verify capability
    await verify_capability(partner, "semantic_search")

    try:
        # Build search query
        query = SearchQuery(
            query=request.query,
            language=request.language,
            content_types=request.content_types,
            genre_ids=request.genre_ids,
            section_ids=request.section_ids,
            include_timestamps=request.include_timestamps,
            limit=request.limit,
            min_score=request.min_score,
        )

        # Perform search
        results = await vector_search_service.semantic_search(
            query=query,
            partner_id=partner.partner_id,
        )

        # Convert results
        items = []
        for r in results:
            # Build deep link with timestamp
            deep_link = None
            if r.timestamp_seconds is not None:
                deep_link = f"/watch/{r.content_id}?t={int(r.timestamp_seconds)}"

            items.append(
                SearchResultItem(
                    content_id=r.content_id,
                    title=r.title,
                    title_en=r.title_en,
                    content_type=r.content_type,
                    thumbnail_url=r.thumbnail_url,
                    matched_text=r.matched_text,
                    match_type=r.match_type,
                    relevance_score=r.relevance_score,
                    timestamp_seconds=r.timestamp_seconds,
                    timestamp_formatted=r.timestamp_formatted,
                    deep_link=deep_link,
                )
            )

        # Estimate tokens used (rough approximation)
        tokens_used = len(request.query.split()) * 2 + len(results) * 10

        # Record usage
        await metering_service.record_search_usage(
            partner_id=partner.partner_id,
            tokens_used=tokens_used,
            results_returned=len(results),
        )

        return SearchResponse(
            query=request.query,
            results=items,
            total_results=len(items),
            tokens_used=tokens_used,
        )

    except Exception as e:
        logger.error(f"Semantic search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed",
        )


@router.post(
    "/dialogue",
    response_model=SearchResponse,
    summary="Dialogue/subtitle search",
    description="Search within subtitles and dialogue. Returns matches with exact "
    "timestamps for deep-linking to specific moments.",
)
async def dialogue_search(
    request: DialogueSearchRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Search within subtitles and dialogue."""
    # Verify capability
    await verify_capability(partner, "semantic_search")

    try:
        # Build search query
        query = DialogueSearchQuery(
            query=request.query,
            language=request.language,
            content_id=request.content_id,
            limit=request.limit,
            min_score=request.min_score,
        )

        # Perform search
        results = await vector_search_service.dialogue_search(
            query=query,
            partner_id=partner.partner_id,
        )

        # Convert results
        items = []
        for r in results:
            deep_link = None
            if r.timestamp_seconds is not None:
                deep_link = f"/watch/{r.content_id}?t={int(r.timestamp_seconds)}"

            items.append(
                SearchResultItem(
                    content_id=r.content_id,
                    title=r.title,
                    title_en=r.title_en,
                    content_type=r.content_type,
                    thumbnail_url=r.thumbnail_url,
                    matched_text=r.matched_text,
                    match_type=r.match_type,
                    relevance_score=r.relevance_score,
                    timestamp_seconds=r.timestamp_seconds,
                    timestamp_formatted=r.timestamp_formatted,
                    deep_link=deep_link,
                )
            )

        # Estimate tokens
        tokens_used = len(request.query.split()) * 2 + len(results) * 10

        # Record usage
        await metering_service.record_search_usage(
            partner_id=partner.partner_id,
            tokens_used=tokens_used,
            results_returned=len(results),
        )

        return SearchResponse(
            query=request.query,
            results=items,
            total_results=len(items),
            tokens_used=tokens_used,
        )

    except Exception as e:
        logger.error(f"Dialogue search failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Search failed",
        )


@router.post(
    "/index",
    response_model=IndexResponse,
    summary="Index content for search",
    description="Index partner's content for semantic search. Call this when new "
    "content is added or updated.",
)
async def index_content(
    request: IndexContentRequest,
    partner: IntegrationPartner = Depends(get_current_partner),
):
    """Index content for semantic search."""
    # Verify capability
    await verify_capability(partner, "semantic_search")

    try:
        result = await vector_search_service.index_content(
            content_id=request.content_id,
            force_reindex=request.force_reindex,
            partner_id=partner.partner_id,
        )

        return IndexResponse(
            content_id=request.content_id,
            status=result.get("status", "failed"),
            segments_indexed=result.get("segments_indexed", 0),
            error=result.get("error"),
        )

    except Exception as e:
        logger.error(f"Content indexing failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Indexing failed",
        )
