"""
Response formatter (Stage 4).

Applies pagination, builds the final SearchResults response,
and tracks execution timing. Maintains backward-compatible
response shape with the original UnifiedSearchService.
"""

from typing import Any, Dict, List

from app.core.logging_config import get_logger
from app.services.search.models import SearchResults, ScoredResult

logger = get_logger(__name__)


class ResponseFormatter:
    """Transforms scored results into the paginated API response."""

    def format(
        self,
        scored_results: List[ScoredResult],
        page: int,
        limit: int,
        execution_time_ms: int,
        cache_hit: bool = False,
        total_override: int | None = None,
    ) -> SearchResults:
        """
        Slice results for the requested page and build response.

        Args:
            scored_results: Fully scored and sorted results.
            page: 1-indexed page number.
            limit: Results per page.
            execution_time_ms: Total pipeline execution time.
            cache_hit: Whether this was served from cache.
            total_override: If provided, use this as the total count
                instead of len(scored_results). Used by browse queries
                that fetch a pool of results but know the true total.

        Returns:
            SearchResults matching the existing API contract.
        """
        pool_size = len(scored_results)
        total = total_override if total_override is not None else pool_size
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        page_results = scored_results[start_idx:end_idx]

        result_dicts: List[Dict[str, Any]] = [
            r.content_dict for r in page_results
        ]

        has_more = end_idx < total

        return SearchResults(
            results=result_dicts,
            total=total,
            page=page,
            page_size=limit,
            has_more=has_more,
            execution_time_ms=execution_time_ms,
            cache_hit=cache_hit,
        )
