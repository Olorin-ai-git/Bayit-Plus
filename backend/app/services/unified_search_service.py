"""
Backward-compatibility wrapper for the unified search service.

The search implementation has been moved to ``app.services.search``
(a modular 4-stage pipeline). This module re-exports the public
names so that existing callers (voice handlers, LLM search, chat
tool, tests, etc.) continue to work without modification.

New code should import directly from ``app.services.search``.
"""

from app.services.search.models import SearchFilters, SearchResults  # noqa: F401
from app.services.search import create_search_pipeline


class UnifiedSearchService:
    """Thin wrapper delegating to SearchPipelineService."""

    def __init__(self) -> None:
        self._pipeline = create_search_pipeline()

    async def search(self, **kwargs) -> SearchResults:
        return await self._pipeline.search(**kwargs)

    async def get_suggestions(self, query: str, limit: int = 5):
        return await self._pipeline.get_suggestions(query, limit)

    async def get_filter_options(self):
        return await self._pipeline.get_filter_options()
