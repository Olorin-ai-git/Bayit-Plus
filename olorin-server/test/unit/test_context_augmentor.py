"""
Unit tests for Context Augmentor module
"""

import asyncio
from datetime import datetime
from unittest.mock import AsyncMock, Mock, patch

import pytest

from app.service.agent.rag.context_augmentor import (
    ContextAugmentationConfig,
    ContextAugmentor,
    ContextRelevanceLevel,
    KnowledgeContext,
    create_context_augmentor,
)
from app.service.agent.rag.knowledge_base import DocumentChunk, DocumentMetadata
from app.service.agent.rag.rag_orchestrator import RAGConfig, RAGOrchestrator
from app.service.agent.structured_context import (
    EntityType,
    StructuredInvestigationContext,
)


class TestContextAugmentationConfig:
    """Test context augmentation configuration"""

    def test_default_config(self):
        """Test default configuration values"""
        config = ContextAugmentationConfig()

        assert config.max_critical_chunks == 5
        assert config.max_supporting_chunks == 10
        assert config.max_background_chunks == 15
        assert config.critical_threshold == 0.9
        assert config.supporting_threshold == 0.7
        assert config.background_threshold == 0.5
        assert config.enable_domain_filtering is True
        assert config.max_context_length == 4000

    def test_custom_config(self):
        """Test custom configuration"""
        config = ContextAugmentationConfig(
            max_critical_chunks=3,
            critical_threshold=0.8,
            enable_domain_filtering=False,
            max_context_length=2000,
        )

        assert config.max_critical_chunks == 3
        assert config.critical_threshold == 0.8
        assert config.enable_domain_filtering is False
        assert config.max_context_length == 2000


class TestKnowledgeContext:
    """Test knowledge context data structure"""

    def test_empty_context(self):
        """Test empty knowledge context"""
        context = KnowledgeContext(investigation_id="test-123", domain="network")

        assert context.investigation_id == "test-123"
        assert context.domain == "network"
        assert len(context.critical_knowledge) == 0
        assert len(context.supporting_knowledge) == 0
        assert len(context.background_knowledge) == 0
        assert context.total_chunks == 0

    def test_populated_context(self):
        """Test populated knowledge context"""
        chunk1 = Mock(spec=DocumentChunk)
        chunk1.chunk_id = "chunk1"
        chunk1.content = "Critical fraud pattern"

        chunk2 = Mock(spec=DocumentChunk)
        chunk2.chunk_id = "chunk2"
        chunk2.content = "Supporting evidence"

        context = KnowledgeContext(
            investigation_id="test-123",
            domain="network",
            critical_knowledge=[chunk1],
            supporting_knowledge=[chunk2],
            total_chunks=2,
        )

        assert len(context.critical_knowledge) == 1
        assert len(context.supporting_knowledge) == 1
        assert context.total_chunks == 2


class TestContextAugmentor:
    """Test context augmentor functionality"""

    @pytest.fixture
    def mock_rag_orchestrator(self):
        """Create mock RAG orchestrator"""
        orchestrator = Mock(spec=RAGOrchestrator)
        orchestrator.knowledge_base = Mock()
        return orchestrator

    @pytest.fixture
    def mock_investigation_context(self):
        """Create mock investigation context"""
        context = Mock(spec=StructuredInvestigationContext)
        context.investigation_id = "test-investigation-123"
        context.entity_id = "test-entity-456"
        context.entity_type = EntityType.USER
        return context

    @pytest.fixture
    def sample_chunks(self):
        """Create sample document chunks"""
        chunks = []
        for i in range(5):
            chunk = Mock(spec=DocumentChunk)
            chunk.chunk_id = f"chunk-{i}"
            chunk.content = f"Sample content {i} with fraud indicators"
            chunk.document_id = f"doc-{i}"
            chunk.similarity_score = 0.8 - (i * 0.1)
            chunk.metadata = Mock(spec=DocumentMetadata)
            chunk.metadata.tags = {"network", "fraud"}
            chunk.metadata.entity_types = {"user"}
            chunk.metadata.creation_date = datetime.now()
            chunks.append(chunk)
        return chunks

    def test_init_with_default_config(self, mock_rag_orchestrator):
        """Test initialization with default configuration"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)

        assert augmentor.rag_orchestrator == mock_rag_orchestrator
        assert augmentor.knowledge_base == mock_rag_orchestrator.knowledge_base
        assert isinstance(augmentor.config, ContextAugmentationConfig)
        assert augmentor.cache_ttl_seconds == 300

    def test_init_with_custom_config(self, mock_rag_orchestrator):
        """Test initialization with custom configuration"""
        config = ContextAugmentationConfig(max_critical_chunks=3)
        augmentor = ContextAugmentor(mock_rag_orchestrator, config)

        assert augmentor.config.max_critical_chunks == 3

    @pytest.mark.asyncio
    async def test_generate_domain_queries(
        self, mock_rag_orchestrator, mock_investigation_context
    ):
        """Test domain query generation"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)

        queries = await augmentor._generate_domain_queries(
            mock_investigation_context,
            "network",
            ["Analyze IP reputation", "Detect anomalies"],
        )

        assert len(queries) > 0
        assert any("network" in query.lower() for query in queries)
        assert any("fraud" in query.lower() for query in queries)

    @pytest.mark.asyncio
    async def test_retrieve_domain_knowledge(
        self, mock_rag_orchestrator, mock_investigation_context, sample_chunks
    ):
        """Test domain knowledge retrieval"""
        mock_rag_orchestrator.knowledge_base.search_chunks = AsyncMock(
            return_value=sample_chunks
        )

        augmentor = ContextAugmentor(mock_rag_orchestrator)

        chunks = await augmentor._retrieve_domain_knowledge(
            "network fraud patterns", mock_investigation_context, "network"
        )

        assert len(chunks) == 5
        assert chunks == sample_chunks
        mock_rag_orchestrator.knowledge_base.search_chunks.assert_called_once()

    @pytest.mark.asyncio
    async def test_calculate_chunk_relevance(
        self, mock_rag_orchestrator, mock_investigation_context
    ):
        """Test chunk relevance calculation"""
        chunk = Mock(spec=DocumentChunk)
        chunk.content = "network fraud pattern analysis"
        chunk.similarity_score = 0.8
        chunk.metadata = Mock()
        chunk.metadata.tags = {"network", "fraud"}
        chunk.metadata.entity_types = {"user"}
        chunk.metadata.creation_date = datetime.now()

        augmentor = ContextAugmentor(mock_rag_orchestrator)

        relevance = await augmentor._calculate_chunk_relevance(
            chunk,
            mock_investigation_context,
            "network",
            ["network fraud patterns", "anomaly detection"],
        )

        assert 0.0 <= relevance <= 1.0
        assert relevance > 0.5  # Should be high due to matching terms

    @pytest.mark.asyncio
    async def test_categorize_knowledge_by_relevance(
        self, mock_rag_orchestrator, mock_investigation_context, sample_chunks
    ):
        """Test knowledge categorization by relevance"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)

        # Mock the relevance calculation to return predictable values
        with patch.object(augmentor, "_calculate_chunk_relevance") as mock_calc:
            mock_calc.side_effect = [
                0.95,
                0.85,
                0.75,
                0.65,
                0.45,
            ]  # Critical, high, supporting, supporting, background

            knowledge_context = await augmentor._categorize_knowledge_by_relevance(
                sample_chunks, mock_investigation_context, "network", ["test query"]
            )

        assert len(knowledge_context.critical_knowledge) == 1  # 0.95 >= 0.9
        assert (
            len(knowledge_context.supporting_knowledge) == 3
        )  # 0.85, 0.75, 0.65 >= 0.7
        assert len(knowledge_context.background_knowledge) == 0  # 0.45 < 0.5
        assert knowledge_context.total_chunks == 4

    @pytest.mark.asyncio
    async def test_inject_context_into_prompt_empty_context(
        self, mock_rag_orchestrator
    ):
        """Test prompt injection with empty context"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)

        base_prompt = "Analyze this network for fraud"
        empty_context = KnowledgeContext("test-123", "network")

        result = await augmentor.inject_context_into_prompt(base_prompt, empty_context)

        assert result == base_prompt  # Should return unchanged

    @pytest.mark.asyncio
    async def test_inject_context_into_prompt_with_knowledge(
        self, mock_rag_orchestrator, sample_chunks
    ):
        """Test prompt injection with knowledge context"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)

        knowledge_context = KnowledgeContext(
            investigation_id="test-123",
            domain="network",
            critical_knowledge=sample_chunks[:1],
            supporting_knowledge=sample_chunks[1:3],
            background_knowledge=sample_chunks[3:5],
            total_chunks=5,
            knowledge_sources={"doc-1", "doc-2"},
        )

        base_prompt = "Analyze this network for fraud"

        result = await augmentor.inject_context_into_prompt(
            base_prompt, knowledge_context
        )

        assert "INVESTIGATION KNOWLEDGE CONTEXT" in result
        assert "CRITICAL KNOWLEDGE" in result
        assert "SUPPORTING KNOWLEDGE" in result
        assert "test-123" in result
        assert "NETWORK" in result
        assert base_prompt in result

    @pytest.mark.asyncio
    async def test_augment_investigation_context_cached(
        self, mock_rag_orchestrator, mock_investigation_context
    ):
        """Test investigation context augmentation with cached result"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)

        # Pre-populate cache
        cached_context = KnowledgeContext("test-123", "network", total_chunks=3)
        cache_key = augmentor._create_context_cache_key(
            "test-investigation-123", "network", None
        )
        augmentor.context_cache[cache_key] = (cached_context, datetime.now())

        result = await augmentor.augment_investigation_context(
            mock_investigation_context, "network", None
        )

        assert result == cached_context
        assert result.total_chunks == 3

    @pytest.mark.asyncio
    async def test_augment_investigation_context_full_flow(
        self, mock_rag_orchestrator, mock_investigation_context, sample_chunks
    ):
        """Test full investigation context augmentation flow"""
        # Mock knowledge base search
        mock_rag_orchestrator.knowledge_base.search_chunks = AsyncMock(
            return_value=sample_chunks
        )

        augmentor = ContextAugmentor(mock_rag_orchestrator)

        # Mock relevance calculation
        with patch.object(augmentor, "_calculate_chunk_relevance") as mock_calc:
            mock_calc.side_effect = [0.95, 0.85, 0.75, 0.65, 0.45]

            result = await augmentor.augment_investigation_context(
                mock_investigation_context, "network", ["Analyze IP reputation"]
            )

        assert result.investigation_id == "test-investigation-123"
        assert result.domain == "network"
        assert result.entity_id == "test-entity-456"
        assert result.total_chunks > 0
        assert len(result.critical_knowledge) > 0

    @pytest.mark.asyncio
    async def test_context_cache_expiry(self, mock_rag_orchestrator):
        """Test context cache expiry mechanism"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)
        augmentor.cache_ttl_seconds = 1  # Very short TTL for testing

        # Add expired entry
        expired_context = KnowledgeContext("test-123", "network")
        expired_time = datetime.now().replace(year=2020)  # Very old timestamp
        cache_key = "expired_key"
        augmentor.context_cache[cache_key] = (expired_context, expired_time)

        # Should return None for expired cache
        result = augmentor._get_cached_context(cache_key)
        assert result is None
        assert cache_key not in augmentor.context_cache  # Should be removed

    @pytest.mark.asyncio
    async def test_clear_cache(self, mock_rag_orchestrator):
        """Test cache clearing functionality"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)

        # Add some cache entries
        augmentor.context_cache["key1"] = (Mock(), datetime.now())
        augmentor.context_cache["key2"] = (Mock(), datetime.now())

        await augmentor.clear_cache()

        assert len(augmentor.context_cache) == 0

    def test_get_cache_stats(self, mock_rag_orchestrator):
        """Test cache statistics"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)

        # Add some cache entries
        augmentor.context_cache["key1"] = (Mock(), datetime.now())
        augmentor.context_cache["key2"] = (Mock(), datetime.now())

        stats = augmentor.get_cache_stats()

        assert stats["cached_contexts"] == 2
        assert stats["cache_ttl_seconds"] == 300
        assert "max_cache_size" in stats


class TestContextAugmentorIntegration:
    """Integration tests for context augmentor"""

    @pytest.mark.asyncio
    async def test_create_context_augmentor_factory(self):
        """Test context augmentor factory function"""
        mock_orchestrator = Mock(spec=RAGOrchestrator)
        mock_orchestrator.knowledge_base = Mock()

        config = ContextAugmentationConfig(max_critical_chunks=3)

        augmentor = create_context_augmentor(mock_orchestrator, config)

        assert isinstance(augmentor, ContextAugmentor)
        assert augmentor.rag_orchestrator == mock_orchestrator
        assert augmentor.config.max_critical_chunks == 3

    @pytest.mark.asyncio
    async def test_error_handling_in_augmentation(
        self, mock_rag_orchestrator, mock_investigation_context
    ):
        """Test error handling during context augmentation"""
        # Mock knowledge base to raise exception
        mock_rag_orchestrator.knowledge_base.search_chunks = AsyncMock(
            side_effect=Exception("Search failed")
        )

        augmentor = ContextAugmentor(mock_rag_orchestrator)

        result = await augmentor.augment_investigation_context(
            mock_investigation_context, "network", None
        )

        # Should return empty context on error
        assert result.investigation_id == "test-investigation-123"
        assert result.domain == "network"
        assert result.total_chunks == 0

    @pytest.mark.asyncio
    async def test_format_knowledge_section(self, mock_rag_orchestrator, sample_chunks):
        """Test knowledge section formatting"""
        augmentor = ContextAugmentor(mock_rag_orchestrator)

        section = augmentor._format_knowledge_section(
            "CRITICAL KNOWLEDGE", sample_chunks[:2], include_confidence=True, limit=2
        )

        assert "CRITICAL KNOWLEDGE" in section
        assert "1. Sample content 0" in section
        assert "2. Sample content 1" in section
        assert "confidence:" in section
        assert "[Source:" in section


if __name__ == "__main__":
    pytest.main([__file__])
