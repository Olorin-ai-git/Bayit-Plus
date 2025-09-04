"""
PostgreSQL + pgvector RAG system for Olorin fraud investigation platform.
Provides vector-based document retrieval and knowledge management.
"""

from .vector_database_config import (
    get_vector_db_config, 
    initialize_vector_database,
    cleanup_vector_database
)

from .embedding_service import (
    get_embedding_service,
    initialize_embedding_service,
    EmbeddingResult
)

from .vector_rag_service import (
    get_rag_service,
    SearchResult,
    DocumentIngestResult
)

from .enhanced_knowledge_base import (
    get_enhanced_knowledge_base,
    initialize_enhanced_knowledge_base,
    KnowledgeResult
)

from .migration_service import (
    get_migration_service,
)

__all__ = [
    # Database configuration
    "get_vector_db_config",
    "initialize_vector_database", 
    "cleanup_vector_database",
    
    # Embedding services
    "get_embedding_service",
    "initialize_embedding_service",
    "EmbeddingResult",
    
    # RAG services
    "get_rag_service",
    "SearchResult",
    "DocumentIngestResult",
    
    # Knowledge base
    "get_enhanced_knowledge_base", 
    "initialize_enhanced_knowledge_base",
    "KnowledgeResult",
    
    # Migration
    "get_migration_service",
]