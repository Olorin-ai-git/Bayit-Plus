"""
Search Pipeline Service (main orchestrator).

Orchestrates the 4-stage search pipeline:
  Stage 1: Query analysis (language, intent, normalization, fuzzy config)
  Stage 2: Parallel execution (Atlas Search + Pinecone vector search)
  Stage 3: Result merging (RRF fusion, metadata boosting, dedup)
  Stage 4: Response formatting (pagination, timing, API shape)

Includes caching. Delegates suggestions and filter options to
the ``discovery`` module. Single service consumed by all callers.
"""

import asyncio
import json
import time
from typing import Any, Dict, List, Optional

from app.core.config import settings
from app.core.logging_config import get_logger
from app.services.search.atlas_executor import AtlasSearchExecutor
from app.services.search.discovery import (
    get_filter_options as _get_filter_options,
    get_suggestions as _get_suggestions,
)
from app.services.search.models import (
    ScoredResult,
    SearchFilters,
    SearchResults,
    SortField,
    SortOrder,
)
from app.services.search.query_analyzer import QueryAnalyzer
from app.services.search.response_formatter import ResponseFormatter
from app.services.search.result_merger import ResultMerger
from app.services.search.vector_executor import VectorSearchExecutor
from app.services.search_cache import SearchCacheService

logger = get_logger(__name__)


class SearchPipelineService:
    """Orchestrates the full search pipeline for all content types."""

    def __init__(
        self,
        cache: SearchCacheService,
        query_analyzer: QueryAnalyzer,
        atlas_executor: AtlasSearchExecutor,
        vector_executor: VectorSearchExecutor,
        merger: ResultMerger,
        formatter: ResponseFormatter,
    ) -> None:
        self._cache = cache
        self._analyzer = query_analyzer
        self._atlas = atlas_executor
        self._vector = vector_executor
        self._merger = merger
        self._formatter = formatter

    async def search(
        self,
        query: str,
        filters: SearchFilters,
        page: int = 1,
        limit: int = 20,
        sort_by: SortField = SortField.RELEVANCE,
        sort_order: SortOrder = SortOrder.DESC,
        user_subscription_tier: Optional[str] = None,
        no_cache: bool = False,
    ) -> SearchResults:
        """Execute the full search pipeline."""
        start_ns = time.monotonic_ns()

        filters.user_subscription_tier = user_subscription_tier

        cache_key_data = _build_cache_key(
            query, filters, page, limit, sort_by, sort_order,
        )

        if not no_cache:
            cached = await self._cache.get_cached_results(query, cache_key_data)
            if cached:
                cached["cache_hit"] = True
                return SearchResults(**cached)

        # Stage 1: Query Analysis
        analysis = self._analyzer.analyze(query)

        # Reset browse total so stale counts from prior browse
        # requests don't leak into text-search responses.
        self._atlas._browse_total = None

        # Stage 2: Parallel execution
        atlas_task = self._atlas.execute(
            analysis, filters, sort_by, sort_order, page, limit,
        )

        config = settings.olorin.search_ranking
        if sort_by == SortField.RELEVANCE and config.hybrid_search_enabled:
            vector_task = self._vector.execute(analysis, filters)
            atlas_results, vector_results = await asyncio.gather(
                atlas_task, vector_task, return_exceptions=True,
            )
            atlas_results = _safe_results(atlas_results, "atlas")
            vector_results = _safe_results(vector_results, "pinecone")
        else:
            atlas_results = _safe_results(await atlas_task, "atlas")
            vector_results: List[ScoredResult] = []

        # Stage 3: Merge and score
        merged = self._merger.merge(
            atlas_results, vector_results, query, sort_by, sort_order,
        )

        # Stage 4: Format response
        elapsed_ms = int((time.monotonic_ns() - start_ns) / 1_000_000)
        total_override = self._atlas._browse_total
        result = self._formatter.format(
            merged, page, limit, elapsed_ms,
            total_override=total_override,
        )

        # Cache
        await self._cache.cache_results(query, cache_key_data, result.model_dump())

        logger.info(
            "Search pipeline completed",
            extra={
                "query": query,
                "intent": analysis.intent.value,
                "language": analysis.language.value,
                "atlas_count": len(atlas_results),
                "vector_count": len(vector_results),
                "merged_count": len(merged),
                "page": page,
                "execution_ms": elapsed_ms,
            },
        )
        return result

    async def get_suggestions(self, query: str, limit: int = 5) -> List[str]:
        """Delegate to discovery module."""
        return await _get_suggestions(query, limit)

    async def get_filter_options(self) -> Dict[str, Any]:
        """Delegate to discovery module."""
        return await _get_filter_options()


# ------------------------------------------------------------------
# Module-level helpers
# ------------------------------------------------------------------


def _build_cache_key(
    query: str, filters: SearchFilters,
    page: int, limit: int,
    sort_by: SortField, sort_order: SortOrder,
) -> Dict[str, Any]:
    return {
        "query": query,
        "filters": json.loads(filters.model_dump_json()),
        "page": page,
        "limit": limit,
        "sort_by": sort_by.value,
        "sort_order": sort_order.value,
    }


def _safe_results(result: Any, source: str) -> List[ScoredResult]:
    """Unwrap asyncio.gather result, logging exceptions."""
    if isinstance(result, Exception):
        logger.error(
            "Search stage failed",
            extra={"source": source, "error": str(result)},
        )
        return []
    return result
