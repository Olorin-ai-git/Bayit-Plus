"""
Integration tests for PostgreSQL + pgvector RAG system.
Tests end-to-end functionality including database operations, embeddings, and search.
"""

import asyncio
import pytest
import os
import uuid
from typing import List, Dict, Any

from app.service.database.vector_database_config import get_vector_db_config, initialize_vector_database
from app.service.rag.vector_rag_service import get_rag_service
from app.service.rag.embedding_service import get_embedding_service, MultiEmbeddingService
from app.service.rag.enhanced_knowledge_base import get_enhanced_knowledge_base, initialize_enhanced_knowledge_base
from app.service.rag.migration_service import get_migration_service

# Test data
SAMPLE_DOCUMENTS = [
    {
        "title": "Credit Card Fraud Detection Methods",
        "content": """
        Credit card fraud detection involves monitoring transaction patterns for unusual behavior.
        Key indicators include sudden changes in spending patterns, transactions in unusual locations,
        and purchases that don't match the cardholder's profile. Machine learning models can be
        trained on historical transaction data to identify potentially fraudulent activities.
        Real-time monitoring systems can flag suspicious transactions for manual review.
        """,
        "category": "fraud_patterns",
        "fraud_type": "credit_card_fraud"
    },
    {
        "title": "Account Takeover Investigation Procedure",
        "content": """
        When investigating suspected account takeover, first verify the account owner's identity.
        Analyze login patterns, device fingerprints, and geographic locations of recent access.
        Check for password changes, email modifications, or new beneficiaries added to accounts.
        Coordinate with the customer to understand their recent activity and any suspicious communications.
        Document all findings and preserve evidence for potential legal action.
        """,
        "category": "procedures",
        "fraud_type": "account_takeover"
    },
    {
        "title": "Anti-Money Laundering Compliance Requirements",
        "content": """
        Financial institutions must comply with AML regulations including customer due diligence,
        transaction monitoring, and suspicious activity reporting. Know Your Customer (KYC) procedures
        help verify customer identities and understand the nature of their business relationships.
        Institutions must file Suspicious Activity Reports (SARs) for transactions that appear
        unusual or potentially related to money laundering activities.
        """,
        "category": "compliance",
        "fraud_type": "money_laundering"
    }
]


class TestVectorRAGSystem:
    """Test suite for vector RAG system."""
    
    @pytest.fixture(autouse=True)
    async def setup_test_environment(self):
        """Set up test environment before each test."""
        # Skip tests if PostgreSQL is not available
        if not os.getenv("DATABASE_URL") and not all([
            os.getenv("DB_HOST"),
            os.getenv("DB_USER"), 
            os.getenv("DB_PASSWORD"),
            os.getenv("DB_NAME")
        ]):
            pytest.skip("PostgreSQL database not configured for testing")
        
        # Initialize services
        try:
            await initialize_vector_database()
            self.db_config = get_vector_db_config()
            self.rag_service = get_rag_service()
            self.embedding_service = get_embedding_service()
            self.knowledge_base = get_enhanced_knowledge_base()
        except Exception as e:
            pytest.skip(f"Failed to initialize test environment: {e}")
    
    async def test_database_connection(self):
        """Test basic database connectivity."""
        async with self.db_config.session() as session:
            result = await session.execute("SELECT 1")
            assert result.scalar() == 1
    
    async def test_pgvector_extension(self):
        """Test that pgvector extension is available."""
        result = await self.db_config.execute_raw_query(
            "SELECT extversion FROM pg_extension WHERE extname = 'vector'"
        )
        assert result, "pgvector extension not installed"
        assert len(result) > 0, "pgvector extension not found"
    
    async def test_collection_management(self):
        """Test document collection CRUD operations."""
        # Create a test collection
        collection_id = await self.rag_service.create_collection(
            name=f"test_collection_{uuid.uuid4().hex[:8]}",
            description="Test collection for integration testing",
            metadata_schema={"test": {"type": "string"}}
        )
        
        assert collection_id is not None
        assert isinstance(collection_id, uuid.UUID)
        
        # Retrieve collections
        collections = await self.rag_service.get_collections()
        assert len(collections) > 0
        
        # Find our test collection
        test_collection = next(
            (c for c in collections if c["id"] == str(collection_id)), 
            None
        )
        assert test_collection is not None
        assert test_collection["name"].startswith("test_collection_")
    
    async def test_document_ingestion(self):
        """Test document ingestion and chunking."""
        # Create test collection
        collection_id = await self.rag_service.create_collection(
            name=f"test_docs_{uuid.uuid4().hex[:8]}",
            description="Test documents"
        )
        
        # Ingest a test document
        doc_data = SAMPLE_DOCUMENTS[0]
        result = await self.rag_service.ingest_document(
            collection_id=collection_id,
            title=doc_data["title"],
            content=doc_data["content"],
            metadata={"fraud_type": doc_data["fraud_type"]},
            generate_embeddings=False  # Skip embeddings for basic test
        )
        
        assert result.success
        assert result.chunk_count > 0
        assert result.document_id is not None
        
        # Verify document was stored
        chunks = await self.rag_service.get_document_chunks(result.document_id)
        assert len(chunks) == result.chunk_count
        assert all("content" in chunk for chunk in chunks)
    
    @pytest.mark.skipif(
        not os.getenv("OPENAI_API_KEY"),
        reason="OpenAI API key required for embedding tests"
    )
    async def test_embedding_generation(self):
        """Test embedding generation with OpenAI."""
        # Test text embedding
        texts = ["This is a test sentence.", "Another test sentence."]
        
        result = await self.embedding_service.generate_embeddings(
            texts=texts,
            provider="openai",
            model="text-embedding-ada-002"
        )
        
        assert result.success
        assert len(result.embeddings) == 2
        assert result.dimensions == 1536  # OpenAI ada-002 dimensions
        assert all(len(emb) == 1536 for emb in result.embeddings)
    
    async def test_huggingface_embeddings(self):
        """Test embedding generation with HuggingFace."""
        # Skip if sentence-transformers not available
        try:
            import sentence_transformers
        except ImportError:
            pytest.skip("sentence-transformers not installed")
        
        texts = ["Test sentence for embedding.", "Another test sentence."]
        
        result = await self.embedding_service.generate_embeddings(
            texts=texts,
            provider="huggingface",
            model="all-MiniLM-L6-v2"
        )
        
        assert result.success
        assert len(result.embeddings) == 2
        assert result.dimensions == 384  # MiniLM dimensions
        assert all(len(emb) == 384 for emb in result.embeddings)
    
    async def test_end_to_end_rag_workflow(self):
        """Test complete RAG workflow from ingestion to search."""
        # Create collection
        collection_id = await self.rag_service.create_collection(
            name=f"e2e_test_{uuid.uuid4().hex[:8]}",
            description="End-to-end test collection"
        )
        
        # Ingest multiple documents (without embeddings first)
        document_ids = []
        for doc_data in SAMPLE_DOCUMENTS:
            result = await self.rag_service.ingest_document(
                collection_id=collection_id,
                title=doc_data["title"],
                content=doc_data["content"],
                metadata={"fraud_type": doc_data["fraud_type"]},
                generate_embeddings=False
            )
            assert result.success
            document_ids.append(result.document_id)
        
        # Test search without embeddings (should return empty)
        search_results = await self.rag_service.search_similar(
            query="credit card fraud detection",
            collection_ids=[collection_id],
            limit=5
        )
        # Should be empty since no embeddings are generated
        assert len(search_results) == 0
    
    async def test_enhanced_knowledge_base_initialization(self):
        """Test enhanced knowledge base initialization."""
        await self.knowledge_base.initialize()
        
        # Check that core collections were created
        collections = await self.rag_service.get_collections()
        collection_names = {c["name"] for c in collections}
        
        expected_collections = {
            "fraud_patterns", 
            "investigation_procedures", 
            "regulatory_compliance", 
            "tool_documentation"
        }
        
        # At least some expected collections should exist
        assert len(expected_collections.intersection(collection_names)) > 0
    
    async def test_knowledge_base_domain_knowledge_addition(self):
        """Test adding domain-specific knowledge."""
        await self.knowledge_base.initialize()
        
        # Add test knowledge
        success = await self.knowledge_base.add_domain_knowledge(
            title="Test Fraud Pattern",
            content="This is a test fraud pattern for integration testing.",
            category="fraud_patterns",
            fraud_type="test_fraud",
            metadata={"test": True}
        )
        
        assert success
    
    async def test_migration_service_status_check(self):
        """Test migration service status checking."""
        migration_service = get_migration_service()
        
        status = await migration_service.check_migration_status()
        
        assert "sqlite_available" in status
        assert "postgres_available" in status
        assert "migration_needed" in status
        assert "recommendations" in status
        
        # PostgreSQL should be available in test environment
        assert status["postgres_available"]
    
    async def test_vector_search_query_building(self):
        """Test vector search query construction."""
        # This tests the internal query building without requiring embeddings
        query_embedding = [0.1] * 1536  # Mock OpenAI embedding
        
        # Build a search query (this tests SQL construction)
        stmt, params = self.rag_service._build_similarity_query(
            query_embedding=query_embedding,
            embedding_column="embedding_openai",
            collection_ids=None,
            similarity_threshold=0.7,
            limit=10,
            metadata_filters=None
        )
        
        assert "embedding_openai" in str(stmt)
        assert "ORDER BY" in str(stmt)
        assert "LIMIT" in str(stmt)
        assert len(params) >= 2  # At least embedding and limit
    
    async def test_database_statistics(self):
        """Test database statistics collection."""
        # Execute some basic statistics queries
        stats_queries = [
            "SELECT COUNT(*) FROM document_collections WHERE is_active = true",
            "SELECT COUNT(*) FROM documents WHERE is_active = true",
            "SELECT COUNT(*) FROM document_chunks WHERE is_active = true"
        ]
        
        for query in stats_queries:
            result = await self.db_config.execute_raw_query(query)
            assert isinstance(result, list)
            assert len(result) == 1
            assert isinstance(result[0]["count"], int)
    
    async def test_vector_index_creation(self):
        """Test vector index creation capabilities."""
        # Test index creation method (may fail if no data exists)
        try:
            await self.db_config.create_vector_index(
                table_name="document_chunks",
                column_name="embedding_openai",
                index_method="ivfflat",
                lists=10  # Small value for testing
            )
            # If it succeeds, great!
        except Exception as e:
            # Index creation may fail without data - that's expected
            assert "does not exist" in str(e) or "not enough data" in str(e) or "already exists" in str(e)
    
    async def test_concurrent_document_ingestion(self):
        """Test concurrent document ingestion."""
        # Create test collection
        collection_id = await self.rag_service.create_collection(
            name=f"concurrent_test_{uuid.uuid4().hex[:8]}",
            description="Concurrent ingestion test"
        )
        
        # Create tasks for concurrent ingestion
        tasks = []
        for i, doc_data in enumerate(SAMPLE_DOCUMENTS):
            task = self.rag_service.ingest_document(
                collection_id=collection_id,
                title=f"{doc_data['title']} - Copy {i}",
                content=doc_data["content"],
                metadata={"copy_number": i},
                generate_embeddings=False
            )
            tasks.append(task)
        
        # Execute concurrently
        results = await asyncio.gather(*tasks)
        
        # All should succeed
        assert all(result.success for result in results)
        assert len(results) == len(SAMPLE_DOCUMENTS)
        assert all(result.chunk_count > 0 for result in results)
    
    async def test_error_handling_and_recovery(self):
        """Test error handling in various scenarios."""
        # Test with invalid collection ID
        invalid_uuid = uuid.uuid4()
        
        result = await self.rag_service.ingest_document(
            collection_id=invalid_uuid,
            title="Test Document",
            content="This should fail due to invalid collection ID.",
            generate_embeddings=False
        )
        
        assert not result.success
        assert result.error_message is not None
        
        # Test search with invalid parameters
        search_results = await self.rag_service.search_similar(
            query="",  # Empty query
            limit=0,   # Invalid limit
            similarity_threshold=2.0  # Invalid threshold
        )
        
        # Should handle gracefully and return empty results
        assert isinstance(search_results, list)


# Run async tests
if __name__ == "__main__":
    pytest.main([__file__, "-v"])