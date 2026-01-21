"""
Vector Search Service

Main service class that coordinates search operations.
"""

from typing import List, Optional

from app.models.content_embedding import (DialogueSearchQuery, SearchQuery,
                                          SemanticSearchResult)
from app.services.olorin.search.client import client_manager
from app.services.olorin.search.embedding import generate_embedding
from app.services.olorin.search.indexer import index_content, index_subtitles
from app.services.olorin.search.searcher import (dialogue_search,
                                                 semantic_search)


class VectorSearchService:
    """
    Hybrid search service combining vector and text search.

    Features:
    - Semantic search via Pinecone
    - Exact match fallback via MongoDB text index
    - Result fusion with weighted ranking
    - Timestamp deep-linking for subtitle matches
    """

    async def initialize(self) -> bool:
        """Initialize Pinecone and OpenAI clients."""
        return await client_manager.initialize()

    @property
    def _initialized(self) -> bool:
        """Check if service is initialized."""
        return client_manager.is_initialized

    async def generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate embedding vector for text."""
        return await generate_embedding(text)

    async def index_content(
        self,
        content_id: str,
        force_reindex: bool = False,
        partner_id: Optional[str] = None,
    ) -> dict:
        """Index content for semantic search."""
        return await index_content(content_id, force_reindex, partner_id)

    async def index_subtitles(
        self,
        content_id: str,
        subtitles: List[dict],
        language: Optional[str] = None,
        segment_duration: float = 30.0,
        partner_id: Optional[str] = None,
    ) -> dict:
        """
        Index subtitle segments for dialogue search.

        Args:
            content_id: Content document ID
            subtitles: List of {text, start_time, end_time} dicts
            language: Subtitle language (defaults to configured default_content_language)
            segment_duration: Group subtitles into segments of this duration
            partner_id: Optional partner ID

        Returns:
            Indexing status
        """
        return await index_subtitles(
            content_id, subtitles, language, segment_duration, partner_id
        )

    async def semantic_search(
        self,
        query: SearchQuery,
        partner_id: Optional[str] = None,
    ) -> List[SemanticSearchResult]:
        """Perform semantic search across content."""
        return await semantic_search(query, partner_id)

    async def dialogue_search(
        self,
        query: DialogueSearchQuery,
        partner_id: Optional[str] = None,
    ) -> List[SemanticSearchResult]:
        """Search specifically within dialogue/subtitles."""
        return await dialogue_search(query, partner_id)


# Singleton instance
vector_search_service = VectorSearchService()
