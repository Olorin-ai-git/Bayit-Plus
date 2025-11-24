"""
Vector Database Configuration and Models
Provides PostgreSQL + pgvector and SQLite support for RAG system.
"""

from .vector_database_config import (
    get_vector_db_config,
    initialize_vector_database,
    cleanup_vector_database,
    VectorDatabaseConfig
)

from .models import (
    VectorBase,
    DocumentCollection,
    Document,
    DocumentChunk,
    RAGDataSource,
    RAGConfiguration,
    RAGQuery,
    RAGResponse
)

__all__ = [
    "get_vector_db_config",
    "initialize_vector_database",
    "cleanup_vector_database",
    "VectorDatabaseConfig",
    "VectorBase",
    "DocumentCollection",
    "Document",
    "DocumentChunk",
    "RAGDataSource",
    "RAGConfiguration",
    "RAGQuery",
    "RAGResponse",
]

