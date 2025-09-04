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

# Enhanced retrieval and context augmentation modules
from .retrieval_engine import (
    RetrievalEngine,
    SearchQuery,
    SearchResult,
    SearchStrategy,
    QueryExpansionMethod,
    RetrievalEngineConfig,
    create_retrieval_engine
)

from .context_augmentor import (
    ContextAugmentor,
    KnowledgeContext,
    ContextRelevanceLevel,
    ContextAugmentationConfig,
    create_context_augmentor
)

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
    "get_rag_orchestrator",
    
    # Retrieval Engine
    "RetrievalEngine",
    "SearchQuery",
    "SearchResult",
    "SearchStrategy",
    "QueryExpansionMethod",
    "RetrievalEngineConfig",
    "create_retrieval_engine",
    
    # Context Augmentor
    "ContextAugmentor",
    "KnowledgeContext",
    "ContextRelevanceLevel",
    "ContextAugmentationConfig",
    "create_context_augmentor"
]