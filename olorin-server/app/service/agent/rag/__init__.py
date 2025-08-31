"""
RAG System Package

Retrieval-Augmented Generation system for enhanced natural language processing,
knowledge retrieval, and context-aware investigation support.
"""

from .knowledge_base import (
    KnowledgeBase,
    DocumentChunk,
    DocumentMetadata,
    ChunkingStrategy,
    KnowledgeBaseConfig
)

# Note: retrieval_engine and context_augmentor modules not implemented yet
# from .retrieval_engine import (...)
# from .context_augmentor import (...)

from .rag_orchestrator import (
    RAGOrchestrator,
    RAGRequest,
    RAGResponse,
    RAGConfig,
    RAGMetrics,
    get_rag_orchestrator
)

__all__ = [
    # Knowledge Base
    "KnowledgeBase",
    "DocumentChunk",
    "DocumentMetadata", 
    "ChunkingStrategy",
    "KnowledgeBaseConfig",
    
    # RAG Orchestrator
    "RAGOrchestrator",
    "RAGRequest",
    "RAGResponse",
    "RAGConfig",
    "RAGMetrics",
    "get_rag_orchestrator"
]