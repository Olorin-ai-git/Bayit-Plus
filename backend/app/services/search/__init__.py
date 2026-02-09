"""
Search pipeline package.

Exports the main ``SearchPipelineService`` and a convenience factory.
All callers should use ``create_search_pipeline()`` to obtain a fully
wired service instance.
"""

from app.services.search.atlas_executor import AtlasSearchExecutor
from app.services.search.models import SearchFilters, SearchResults, SortField, SortOrder
from app.services.search.pipeline import SearchPipelineService
from app.services.search.query_analyzer import QueryAnalyzer
from app.services.search.response_formatter import ResponseFormatter
from app.services.search.result_merger import ResultMerger
from app.services.search.vector_executor import VectorSearchExecutor
from app.services.search_cache import get_cache

__all__ = [
    "SearchPipelineService",
    "SearchFilters",
    "SearchResults",
    "SortField",
    "SortOrder",
    "create_search_pipeline",
]


def create_search_pipeline() -> SearchPipelineService:
    """Create a fully-wired SearchPipelineService instance."""
    return SearchPipelineService(
        cache=get_cache(),
        query_analyzer=QueryAnalyzer(),
        atlas_executor=AtlasSearchExecutor(),
        vector_executor=VectorSearchExecutor(),
        merger=ResultMerger(),
        formatter=ResponseFormatter(),
    )
