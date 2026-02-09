"""
Vector Search Executor (Stage 2b)

Generates embeddings and queries Pinecone for semantic similarity results.
Activated for CONCEPT_SEARCH intent or when hybrid search is enabled.
"""

from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.olorin.search.client import client_manager
from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.pinecone_ops import safe_pinecone_query
from app.services.search.models import (
    QueryAnalysis,
    SearchFilters,
    SearchIntent,
    ScoredResult,
)

logger = get_logger(__name__)


class VectorSearchExecutor:
    """Executes semantic vector search via Pinecone."""

    async def execute(
        self,
        analysis: QueryAnalysis,
        filters: SearchFilters,
    ) -> List[ScoredResult]:
        """
        Generate embedding for query and retrieve semantically similar content.

        Args:
            analysis: Output from Stage 1 query analyzer.
            filters: Search filters for content type and user context.

        Returns:
            Scored results with pinecone_score and pinecone_rank populated.
            Empty list on any failure (graceful degradation).
        """
        config = settings.olorin.search_ranking

        if not self._should_execute(analysis, config):
            return []

        embedding = await generate_embedding(analysis.normalized_query)
        if embedding is None:
            logger.warning(
                "Embedding generation failed, skipping vector search",
                extra={"query": analysis.normalized_query},
            )
            return []

        pinecone_filter = self._build_filter(filters)

        index = client_manager.pinecone_index
        if index is None:
            logger.warning("Pinecone index not available, skipping vector search")
            return []

        result = await safe_pinecone_query(
            index=index,
            vector=embedding,
            top_k=config.semantic_max_results,
            filter_dict=pinecone_filter,
            include_metadata=True,
        )

        if result is None:
            return []

        return self._map_results(result, config.semantic_min_score)

    def _should_execute(self, analysis: QueryAnalysis, config: Any) -> bool:
        """Check whether vector search should run for this query."""
        if analysis.is_empty:
            return False
        if analysis.intent == SearchIntent.CONCEPT_SEARCH:
            return True
        return config.hybrid_search_enabled

    def _build_filter(self, filters: SearchFilters) -> Optional[Dict[str, Any]]:
        """Build Pinecone metadata filter from search filters."""
        conditions: Dict[str, Any] = {}

        if filters.content_types:
            if len(filters.content_types) == 1:
                conditions["content_type"] = filters.content_types[0]
            else:
                conditions["content_type"] = {"$in": filters.content_types}

        return conditions if conditions else None

    def _map_results(
        self,
        pinecone_result: Any,
        min_score: float,
    ) -> List[ScoredResult]:
        """Convert Pinecone matches to ScoredResult objects."""
        scored: List[ScoredResult] = []
        matches = getattr(pinecone_result, "matches", []) or []

        for rank, match in enumerate(matches, start=1):
            score = getattr(match, "score", 0.0)
            if score < min_score:
                continue

            metadata = getattr(match, "metadata", {}) or {}
            content_id = metadata.get("content_id")
            if not content_id:
                continue

            scored.append(
                ScoredResult(
                    content_id=str(content_id),
                    content_dict={},
                    pinecone_score=score,
                    pinecone_rank=rank,
                    source="pinecone",
                )
            )

        logger.info(
            "Vector search completed",
            extra={
                "total_matches": len(matches),
                "filtered_results": len(scored),
                "min_score_threshold": min_score,
            },
        )

        return scored
