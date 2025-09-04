"""
Unit tests for Retrieval Engine module
"""

import pytest
import asyncio
from datetime import datetime
from unittest.mock import Mock, AsyncMock, patch

from app.service.agent.rag.retrieval_engine import (
    RetrievalEngine,
    SearchQuery,
    SearchResult,
    SearchStrategy,
    QueryExpansionMethod,
    RetrievalEngineConfig,
    create_retrieval_engine
)
from app.service.agent.rag.knowledge_base import DocumentChunk, DocumentMetadata, KnowledgeBase


class TestRetrievalEngineConfig:
    """Test retrieval engine configuration"""
    
    def test_default_config(self):
        """Test default configuration values"""
        config = RetrievalEngineConfig()
        
        assert config.default_strategy == SearchStrategy.HYBRID_SEARCH
        assert config.enable_query_expansion is True
        assert config.default_expansion_method == QueryExpansionMethod.DOMAIN_SPECIFIC
        assert config.max_concurrent_searches == 5
        assert config.search_timeout_seconds == 30
        assert config.enable_result_caching is True
        assert config.cache_ttl_seconds == 300
    
    def test_custom_config(self):
        """Test custom configuration"""
        config = RetrievalEngineConfig(
            default_strategy=SearchStrategy.VECTOR_SIMILARITY,
            enable_query_expansion=False,
            max_concurrent_searches=10,
            cache_ttl_seconds=600
        )
        
        assert config.default_strategy == SearchStrategy.VECTOR_SIMILARITY
        assert config.enable_query_expansion is False
        assert config.max_concurrent_searches == 10
        assert config.cache_ttl_seconds == 600


class TestSearchQuery:
    """Test search query data structure"""
    
    def test_default_search_query(self):
        """Test default search query creation"""
        query = SearchQuery(original_query="test fraud patterns")
        
        assert query.original_query == "test fraud patterns"
        assert query.strategy == SearchStrategy.HYBRID_SEARCH
        assert query.max_results == 10
        assert query.similarity_threshold == 0.7
        assert len(query.expanded_queries) == 0
        assert query.expansion_method == QueryExpansionMethod.DOMAIN_SPECIFIC
    
    def test_custom_search_query(self):
        """Test custom search query creation"""
        query = SearchQuery(
            original_query="network anomalies",
            strategy=SearchStrategy.VECTOR_SIMILARITY,
            max_results=20,
            similarity_threshold=0.8,
            domain_filters={"network"},
            investigation_id="test-123"
        )
        
        assert query.original_query == "network anomalies"
        assert query.strategy == SearchStrategy.VECTOR_SIMILARITY
        assert query.max_results == 20
        assert query.similarity_threshold == 0.8
        assert "network" in query.domain_filters
        assert query.investigation_id == "test-123"


class TestSearchResult:
    """Test search result data structure"""
    
    def test_empty_search_result(self):
        """Test empty search result"""
        result = SearchResult()
        
        assert len(result.chunks) == 0
        assert result.search_time_ms == 0.0
        assert result.total_candidates == 0
        assert result.cache_hit is False
        assert result.query_expansion_applied is False
    
    def test_populated_search_result(self):
        """Test populated search result"""
        chunks = [Mock(spec=DocumentChunk) for _ in range(3)]
        
        result = SearchResult(
            query_id="test-query",
            chunks=chunks,
            search_time_ms=150.0,
            total_candidates=10,
            high_relevance_count=1,
            medium_relevance_count=2,
            strategy_used=SearchStrategy.HYBRID_SEARCH
        )
        
        assert len(result.chunks) == 3
        assert result.query_id == "test-query"
        assert result.search_time_ms == 150.0
        assert result.total_candidates == 10
        assert result.high_relevance_count == 1
        assert result.strategy_used == SearchStrategy.HYBRID_SEARCH


class TestRetrievalEngine:
    """Test retrieval engine functionality"""
    
    @pytest.fixture
    def mock_knowledge_base(self):
        """Create mock knowledge base"""
        kb = Mock(spec=KnowledgeBase)
        return kb
    
    @pytest.fixture
    def sample_chunks(self):
        """Create sample document chunks"""
        chunks = []
        for i in range(5):
            chunk = Mock(spec=DocumentChunk)
            chunk.chunk_id = f"chunk-{i}"
            chunk.content = f"Sample content {i} about fraud patterns"
            chunk.document_id = f"doc-{i}"
            chunk.similarity_score = 0.9 - (i * 0.1)
            chunk.metadata = Mock(spec=DocumentMetadata)
            chunk.metadata.tags = {"fraud", "network"}
            chunk.metadata.entity_types = {"user"}
            chunks.append(chunk)
        return chunks
    
    def test_init_with_default_config(self, mock_knowledge_base):
        """Test initialization with default configuration"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        assert engine.knowledge_base == mock_knowledge_base
        assert isinstance(engine.config, RetrievalEngineConfig)
        assert len(engine.results_cache) == 0
        assert engine.search_stats["total_searches"] == 0
    
    def test_init_with_custom_config(self, mock_knowledge_base):
        """Test initialization with custom configuration"""
        config = RetrievalEngineConfig(max_concurrent_searches=10)
        engine = RetrievalEngine(mock_knowledge_base, config)
        
        assert engine.config.max_concurrent_searches == 10
        assert engine.search_semaphore._value == 10
    
    def test_prepare_search_query_from_string(self, mock_knowledge_base):
        """Test search query preparation from string"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        query = engine._prepare_search_query(
            "test fraud patterns",
            "investigation-123",
            "network",
            max_results=20
        )
        
        assert isinstance(query, SearchQuery)
        assert query.original_query == "test fraud patterns"
        assert query.investigation_id == "investigation-123"
        assert query.domain == "network"
        assert query.max_results == 20
    
    def test_prepare_search_query_from_object(self, mock_knowledge_base):
        """Test search query preparation from SearchQuery object"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        original_query = SearchQuery(
            original_query="network anomalies",
            strategy=SearchStrategy.VECTOR_SIMILARITY
        )
        
        query = engine._prepare_search_query(
            original_query,
            "investigation-123",
            "network"
        )
        
        assert query == original_query
        assert query.investigation_id == "investigation-123"
        assert query.domain == "network"
    
    @pytest.mark.asyncio
    async def test_preprocess_query(self, mock_knowledge_base):
        """Test query preprocessing"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        query = SearchQuery(original_query="  Test Query WITH Special Characters!!! ")
        
        processed_query = await engine._preprocess_query(query)
        
        # Should have normalized query
        assert len(processed_query.expanded_queries) > 0
        processed_text = processed_query.expanded_queries[0]
        assert processed_text.strip().lower() == "test query with special characters"
    
    @pytest.mark.asyncio
    async def test_expand_query_synonyms(self, mock_knowledge_base):
        """Test query expansion with synonyms"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        query = SearchQuery(
            original_query="fraud detection",
            expansion_method=QueryExpansionMethod.SYNONYMS
        )
        
        expanded_query = await engine._expand_query(query)
        
        # Should have added synonyms
        assert len(expanded_query.expanded_queries) > 0
        assert expanded_query.query_expansion_applied is True
    
    @pytest.mark.asyncio
    async def test_expand_query_domain_specific(self, mock_knowledge_base):
        """Test domain-specific query expansion"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        query = SearchQuery(
            original_query="anomaly detection",
            domain="network",
            expansion_method=QueryExpansionMethod.DOMAIN_SPECIFIC
        )
        
        expanded_query = await engine._expand_query(query)
        
        # Should have added domain-specific terms
        assert len(expanded_query.expanded_queries) > 0
        assert any("protocol" in term or "routing" in term for term in expanded_query.expanded_queries)
    
    @pytest.mark.asyncio
    async def test_vector_similarity_search(self, mock_knowledge_base, sample_chunks):
        """Test vector similarity search"""
        mock_knowledge_base.search_chunks = AsyncMock(return_value=sample_chunks)
        
        engine = RetrievalEngine(mock_knowledge_base)
        
        query = SearchQuery(
            original_query="fraud patterns",
            strategy=SearchStrategy.VECTOR_SIMILARITY,
            max_results=3
        )
        
        result = await engine._vector_similarity_search(query)
        
        assert isinstance(result, SearchResult)
        assert len(result.chunks) <= 3
        assert result.strategy_used == SearchStrategy.VECTOR_SIMILARITY
        assert result.total_candidates > 0
        
        mock_knowledge_base.search_chunks.assert_called()
    
    @pytest.mark.asyncio
    async def test_keyword_search(self, mock_knowledge_base, sample_chunks):
        """Test keyword-based search"""
        mock_knowledge_base.search_chunks = AsyncMock(return_value=sample_chunks)
        
        engine = RetrievalEngine(mock_knowledge_base)
        
        query = SearchQuery(
            original_query="fraud patterns",
            strategy=SearchStrategy.KEYWORD_SEARCH,
            max_results=3
        )
        
        result = await engine._keyword_search(query)
        
        assert isinstance(result, SearchResult)
        assert result.strategy_used == SearchStrategy.KEYWORD_SEARCH
        
        # Check keyword scoring was applied
        for chunk in result.chunks:
            assert hasattr(chunk, 'keyword_score')
    
    @pytest.mark.asyncio
    async def test_hybrid_search(self, mock_knowledge_base, sample_chunks):
        """Test hybrid search combining strategies"""
        mock_knowledge_base.search_chunks = AsyncMock(return_value=sample_chunks)
        
        engine = RetrievalEngine(mock_knowledge_base)
        
        query = SearchQuery(
            original_query="fraud patterns",
            strategy=SearchStrategy.HYBRID_SEARCH,
            max_results=5
        )
        
        result = await engine._hybrid_search(query)
        
        assert isinstance(result, SearchResult)
        assert result.strategy_used == SearchStrategy.HYBRID_SEARCH
        
        # Should have called knowledge base multiple times (vector + keyword)
        assert mock_knowledge_base.search_chunks.call_count >= 2
        
        # Check hybrid scoring was applied
        for chunk in result.chunks:
            assert hasattr(chunk, 'hybrid_score')
    
    @pytest.mark.asyncio
    async def test_apply_search_filters(self, mock_knowledge_base):
        """Test search filters application"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        # Create chunks with different properties
        chunks = []
        for i in range(3):
            chunk = Mock(spec=DocumentChunk)
            chunk.chunk_id = f"chunk-{i}"
            chunk.similarity_score = 0.8 - (i * 0.2)  # 0.8, 0.6, 0.4
            chunk.metadata = Mock()
            chunk.metadata.tags = {"network" if i < 2 else "device"}
            chunk.metadata.entity_types = {"user"}
            chunks.append(chunk)
        
        query = SearchQuery(
            domain_filters={"network"},
            similarity_threshold=0.5
        )
        
        filtered = await engine._apply_search_filters(chunks, query)
        
        # Should filter out chunk with 0.4 similarity and device tag
        assert len(filtered) == 2
        assert all(chunk.similarity_score >= 0.5 for chunk in filtered)
    
    @pytest.mark.asyncio
    async def test_post_process_results(self, mock_knowledge_base):
        """Test results post-processing"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        chunks = []
        for i in range(3):
            chunk = Mock(spec=DocumentChunk)
            chunk.similarity_score = [0.9, 0.7, 0.5][i]
            chunks.append(chunk)
        
        result = SearchResult(
            chunks=chunks,
            query_id="test"
        )
        
        query = SearchQuery(domain="network")
        
        processed_result = await engine._post_process_results(result, query)
        
        assert processed_result.avg_relevance_score == 0.7  # (0.9 + 0.7 + 0.5) / 3
        assert processed_result.min_relevance_score == 0.5
        assert processed_result.max_relevance_score == 0.9
        assert processed_result.high_relevance_count == 1  # >= 0.8
        assert processed_result.medium_relevance_count == 1  # >= 0.6
        assert processed_result.low_relevance_count == 1  # >= 0.0
    
    def test_calculate_keyword_score(self, mock_knowledge_base):
        """Test keyword score calculation"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        content = "This is a fraud detection pattern for network analysis"
        query_terms = ["fraud", "network", "analysis", "missing"]
        
        score = engine._calculate_keyword_score(content, query_terms)
        
        assert score == 0.75  # 3 out of 4 terms match
    
    def test_deduplicate_chunks(self, mock_knowledge_base):
        """Test chunk deduplication"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        chunk1 = Mock(spec=DocumentChunk)
        chunk1.chunk_id = "chunk-1"
        
        chunk2 = Mock(spec=DocumentChunk)
        chunk2.chunk_id = "chunk-2"
        
        chunk3 = Mock(spec=DocumentChunk)
        chunk3.chunk_id = "chunk-1"  # Duplicate
        
        chunks = [chunk1, chunk2, chunk3]
        unique_chunks = engine._deduplicate_chunks(chunks)
        
        assert len(unique_chunks) == 2
        assert unique_chunks[0].chunk_id == "chunk-1"
        assert unique_chunks[1].chunk_id == "chunk-2"
    
    @pytest.mark.asyncio
    async def test_search_with_caching(self, mock_knowledge_base, sample_chunks):
        """Test search with result caching"""
        mock_knowledge_base.search_chunks = AsyncMock(return_value=sample_chunks)
        
        config = RetrievalEngineConfig(enable_result_caching=True)
        engine = RetrievalEngine(mock_knowledge_base, config)
        
        # First search - should hit knowledge base
        result1 = await engine.search("test query", "inv-123", "network")
        
        assert not result1.cache_hit
        assert engine.search_stats["cache_misses"] == 1
        
        # Second search with same parameters - should use cache
        result2 = await engine.search("test query", "inv-123", "network")
        
        assert result2.cache_hit
        assert engine.search_stats["cache_hits"] == 1
    
    @pytest.mark.asyncio
    async def test_batch_search(self, mock_knowledge_base, sample_chunks):
        """Test batch search functionality"""
        mock_knowledge_base.search_chunks = AsyncMock(return_value=sample_chunks)
        
        engine = RetrievalEngine(mock_knowledge_base)
        
        queries = ["fraud patterns", "network anomalies", "device spoofing"]
        
        results = await engine.batch_search(queries, "inv-123", "network")
        
        assert len(results) == 3
        assert all(isinstance(result, SearchResult) for result in results)
        
        # Should have made multiple knowledge base calls
        assert mock_knowledge_base.search_chunks.call_count >= 3
    
    @pytest.mark.asyncio
    async def test_search_error_handling(self, mock_knowledge_base):
        """Test search error handling"""
        mock_knowledge_base.search_chunks = AsyncMock(side_effect=Exception("Search failed"))
        
        engine = RetrievalEngine(mock_knowledge_base)
        
        result = await engine.search("test query", "inv-123", "network")
        
        # Should return empty result on error
        assert isinstance(result, SearchResult)
        assert len(result.chunks) == 0
        assert engine.search_stats["failed_searches"] == 1
    
    def test_create_cache_key(self, mock_knowledge_base):
        """Test cache key creation"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        query = SearchQuery(
            original_query="test query",
            expanded_queries=["expanded"],
            strategy=SearchStrategy.HYBRID_SEARCH,
            max_results=10
        )
        
        key1 = engine._create_cache_key(query)
        key2 = engine._create_cache_key(query)
        
        assert key1 == key2  # Same query should produce same key
        assert len(key1) == 16  # SHA256 truncated to 16 chars
    
    @pytest.mark.asyncio
    async def test_clear_cache(self, mock_knowledge_base):
        """Test cache clearing"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        # Add some cache entries
        engine.results_cache["key1"] = (Mock(), datetime.now())
        engine.results_cache["key2"] = (Mock(), datetime.now())
        
        await engine.clear_cache()
        
        assert len(engine.results_cache) == 0
    
    def test_get_performance_stats(self, mock_knowledge_base):
        """Test performance statistics"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        # Simulate some activity
        engine.search_stats["total_searches"] = 10
        engine.search_stats["successful_searches"] = 8
        engine.search_stats["cache_hits"] = 5
        engine.search_stats["cache_misses"] = 5
        
        stats = engine.get_performance_stats()
        
        assert stats["search_statistics"]["total_searches"] == 10
        assert stats["search_statistics"]["successful_searches"] == 8
        assert stats["cache_statistics"]["cache_hit_rate"] == 0.5
        assert "configuration" in stats


class TestRetrievalEngineIntegration:
    """Integration tests for retrieval engine"""
    
    @pytest.mark.asyncio
    async def test_create_retrieval_engine_factory(self):
        """Test retrieval engine factory function"""
        mock_kb = Mock(spec=KnowledgeBase)
        config = RetrievalEngineConfig(max_concurrent_searches=8)
        
        engine = create_retrieval_engine(mock_kb, config)
        
        assert isinstance(engine, RetrievalEngine)
        assert engine.knowledge_base == mock_kb
        assert engine.config.max_concurrent_searches == 8
    
    @pytest.mark.asyncio
    async def test_domain_specific_query_expansion(self, mock_knowledge_base):
        """Test domain-specific features"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        # Test network domain expansion
        network_terms = engine._expand_with_domain_terms("anomaly", "network")
        assert any("protocol" in term for term in network_terms)
        
        # Test device domain expansion
        device_terms = engine._expand_with_domain_terms("fingerprint", "device")
        assert any("spoofing" in term for term in device_terms)
    
    def test_synonym_expansion(self, mock_knowledge_base):
        """Test synonym-based query expansion"""
        engine = RetrievalEngine(mock_knowledge_base)
        
        synonyms = engine._expand_with_synonyms("fraud detection")
        
        assert len(synonyms) > 0
        # Should include synonyms for "fraud"
        assert any("scam" in syn or "deception" in syn for syn in synonyms)


if __name__ == "__main__":
    pytest.main([__file__])