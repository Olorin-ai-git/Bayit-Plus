"""
Vector Database Configuration and Models
Provides PostgreSQL + pgvector and SQLite support for RAG system.
"""

from .models import (
    Document,
    DocumentChunk,
    DocumentCollection,
    RAGConfiguration,
    RAGDataSource,
    RAGQuery,
    RAGResponse,
    VectorBase,
)
from .vector_database_config import (
    VectorDatabaseConfig,
    cleanup_vector_database,
    get_vector_db_config,
    initialize_vector_database,
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
